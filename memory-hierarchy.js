/* Memory hierarchy simulator.
   Model: reads only. Address space 256 words = 64 blocks of 4 words (one cache line = one block).
   L1 (2/4/8 lines), L2 8, L3 16, RAM 32 lines, SSD holds everything. LRU replacement.
   A request goes down until it hits; the block is then copied up through every level above. */
(() => {
  "use strict";

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

  const BLOCKS = 64, WORDS = 256;
  const GHZ = 3; // cycles per ns
  const LV = {
    l1: { name: "L1", lat: 4, size: 4 },
    l2: { name: "L2", lat: 12, size: 8 },
    l3: { name: "L3", lat: 40, size: 16 },
    ram: { name: "RAM", lat: 250, size: 32 },
    ssd: { name: "SSD", lat: 150000, size: BLOCKS },
  };
  const IDEAL = LV.l1.lat;
  const SPEEDS = [0.25, 0.5, 1, 2, 4, Infinity];
  const CFG = { l1Size: 4, l1Map: "fa", caches: true, prefetch: false };

  /* ---------------------------------------------------------- formatting */
  const nf = (n) => Math.round(n).toLocaleString("en-US");
  function fmtSeconds(s) {
    if (s < 1) return s.toFixed(2) + " s";
    if (s < 60) return (s < 10 ? s.toFixed(1) : Math.round(s)) + " s";
    if (s < 3600) return (s / 60).toFixed(1) + " min";
    if (s < 86400) return (s / 3600).toFixed(1) + " hours";
    if (s < 86400 * 365) return (s / 86400).toFixed(1) + " days";
    return (s / 86400 / 365).toFixed(1) + " years";
  }
  function fmtNs(ns) {
    if (ns < 1000) return (ns < 10 ? ns.toFixed(1) : Math.round(ns)) + " ns";
    if (ns < 1e6) return (ns / 1000).toFixed(ns < 1e4 ? 1 : 0) + " µs";
    if (ns < 1e9) return (ns / 1e6).toFixed(1) + " ms";
    return (ns / 1e9).toFixed(2) + " s";
  }
  const valueAt = (a) => (a * 37 + 11) & 255;

  /* --------------------------------------------------------------- state */
  const mkSlots = (n) => Array.from({ length: n }, () => ({ b: null, last: 0, pf: false }));
  const zero = () => ({ n: 0, served: { l1: 0, l2: 0, l3: 0, ram: 0, ssd: 0 }, cycles: 0, ideal: 0, cold: 0, cap: 0, conf: 0, pf: 0, pfUse: 0 });
  let st;
  function newState() {
    LV.l1.size = CFG.l1Size;
    st = {
      lv: { l1: mkSlots(CFG.l1Size), l2: mkSlots(LV.l2.size), l3: mkSlots(LV.l3.size),
        // RAM starts loaded with blocks 0..31, as if the program and its data had just been loaded
        ram: Array.from({ length: LV.ram.size }, (_, i) => ({ b: i, last: i + 1, pf: false })) },
      shadow: mkSlots(CFG.l1Size), seen: new Set(), tick: LV.ram.size, stats: zero(), strip: [], reg: null, lastEv: null,
    };
  }

  const find = (id, b) => {
    const L = st.lv[id];
    if (id === "l1" && CFG.l1Map === "dm") { const i = b % L.length; return L[i].b === b ? i : -1; }
    return L.findIndex((s) => s.b === b);
  };
  function install(id, b, pf) {
    const L = st.lv[id];
    let i;
    if (id === "l1" && CFG.l1Map === "dm") i = b % L.length;
    else {
      i = L.findIndex((s) => s.b == null);
      if (i < 0) { i = 0; for (let k = 1; k < L.length; k++) if (L[k].last < L[i].last) i = k; }
    }
    const evicted = L[i].b;
    L[i] = { b, last: ++st.tick, pf: !!pf };
    return { slot: i, evicted };
  }

  /* One memory read. Mutates the caches and the counters, returns what happened. */
  function access(addr) {
    const b = addr >> 2;
    const ev = { addr, b, path: [], installs: [], pf: null, kind: null, usedPrefetch: false };
    const order = CFG.caches ? ["l1", "l2", "l3", "ram"] : ["ram"];
    let served = null;
    for (const id of order) {
      const i = find(id, b);
      if (i >= 0) {
        const s = st.lv[id][i];
        s.last = ++st.tick;
        if (s.pf) { st.stats.pfUse++; s.pf = false; ev.usedPrefetch = true; }
        ev.path.push({ id, hit: true, slot: i });
        served = id;
        break;
      }
      ev.path.push({ id, hit: false });
    }
    if (!served) { ev.path.push({ id: "ssd", hit: true }); served = "ssd"; }
    ev.served = served;

    if (CFG.caches) {
      const sh = st.shadow;
      const si = sh.findIndex((s) => s.b === b);
      const shHit = si >= 0;
      if (shHit) sh[si].last = ++st.tick;
      else {
        let j = sh.findIndex((s) => s.b == null);
        if (j < 0) { j = 0; for (let k = 1; k < sh.length; k++) if (sh[k].last < sh[j].last) j = k; }
        sh[j] = { b, last: ++st.tick, pf: false };
      }
      if (served !== "l1") {
        ev.kind = !st.seen.has(b) ? "cold" : shHit ? "conflict" : "capacity";
        st.stats[{ cold: "cold", conflict: "conf", capacity: "cap" }[ev.kind]]++;
      }
      st.seen.add(b);
    }

    const above = served === "ssd" ? order : order.slice(0, order.indexOf(served));
    for (const id of above.slice().reverse()) ev.installs.push({ id, ...install(id, b, false) });

    if (CFG.prefetch && CFG.caches && served !== "l1" && b + 1 < BLOCKS) {
      const nb = b + 1, done = [];
      for (const id of ["ram", "l3", "l2", "l1"]) if (find(id, nb) < 0) { install(id, nb, true); done.push(id); }
      if (done.length) { ev.pf = { b: nb, levels: done }; st.stats.pf++; }
    }

    ev.cycles = LV[served].lat;
    const s = st.stats;
    s.n++; s.served[served]++; s.cycles += ev.cycles; s.ideal += IDEAL;
    st.strip.push({ served, addr, cycles: ev.cycles });
    if (st.strip.length > 80) st.strip.shift();
    st.reg = { addr, val: valueAt(addr) };
    st.lastEv = ev;
    return ev;
  }

  /* ------------------------------------------------------------ patterns */
  function rng(seed) { let t = seed >>> 0; return () => { t = (t + 0x6d2b79f5) >>> 0; let r = Math.imul(t ^ (t >>> 15), 1 | t); r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r; return ((r ^ (r >>> 14)) >>> 0) / 4294967296; }; }
  const PATTERNS = {
    seq: { label: "Scan an array in order", n: () => 64,
      desc: "Read consecutive words, like summing an array. Each block is fetched once and then used four times, so expect about 75% L1 hits (spatial locality).",
      gen: (n) => Array.from({ length: n }, (_, i) => i % WORDS) },
    same: { label: "Read one variable repeatedly", n: () => 32,
      desc: "Read the same word again and again, like a loop counter. After the first miss every access is an L1 hit (temporal locality).",
      gen: (n) => Array.from({ length: n }, () => 100) },
    loop: { label: "Loop over a working set", n: (c) => Math.min(600, c.w * 4 * 3),
      desc: "Read a set of W blocks in order, over and over, like repeated passes over a data set. Later passes are served by the smallest level that can hold the whole set. Slide the size up and watch each level give up in turn. A set bigger than a level makes that level useless (every pass evicts what the next one needs).",
      gen: (n, c) => Array.from({ length: n }, (_, i) => i % (c.w * 4)) },
    stride: { label: "Jump through memory with a stride", n: () => 64,
      desc: "Read every S-th word. At a stride of 4 words or more, every access lands in a new block, so spatial locality is lost and every access misses L1 the first time.",
      gen: (n, c) => Array.from({ length: n }, (_, i) => (i * c.stride) % WORDS) },
    random: { label: "Random access inside RAM (linked list, hash table)", n: () => 128,
      desc: "Read unpredictable addresses among the first 128 words (the part of memory that is loaded in RAM). Little is reused and nothing can be predicted: expect mostly misses, and prefetching will not help.",
      gen: (n) => { const r = rng(12345); return Array.from({ length: n }, () => Math.floor(r() * 128)); } },
    randall: { label: "Random access over everything (bigger than RAM)", n: () => 128,
      desc: "Read random addresses across all 256 words. Half of the blocks are not in RAM, so many reads are page faults served by the SSD: a very expensive way to run a program.",
      gen: (n) => { const r = rng(777); return Array.from({ length: n }, () => Math.floor(r() * WORDS)); } },
    rowmajor: { label: "16×8 table, row by row", n: () => 128,
      desc: "A table of 16 rows × 8 columns, stored row after row. Visiting it row by row reads memory in order: good spatial locality. Compare with the next pattern.",
      gen: () => { const a = []; for (let r = 0; r < 16; r++) for (let c = 0; c < 8; c++) a.push(r * 8 + c); return a; } },
    colmajor: { label: "16×8 table, column by column", n: () => 128,
      desc: "The same 128 reads, but visiting column by column jumps 8 words each time, touching 16 different blocks before it comes back to the first. Same work, different order: compare the average cost per access.",
      gen: () => { const a = []; for (let c = 0; c < 8; c++) for (let r = 0; r < 16; r++) a.push(r * 8 + c); return a; } },
    custom: { label: "My own list of addresses", n: () => 16,
      desc: "Type any addresses from 0 to 255. Try reading words 0, 1, 2, 3 (one block) and then 100, 100, 100.",
      gen: () => ($("#custom").value.split(/[\s,;]+/).map(Number).filter((x) => Number.isInteger(x) && x >= 0 && x < WORDS)) },
  };

  /* ------------------------------------------------------------- engine */
  let epoch = 0, running = false, abort = false, busy = false, speedIdx = 2;
  let seq = null, cur = 0, runStart = null;
  const speed = () => SPEEDS[speedIdx];
  const turbo = () => speed() === Infinity;
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const hier = $("#hier"), chip = $("#chip");
  const patCfg = () => ({ w: Number($("#w").value), stride: Math.max(1, Number($("#stride").value) || 1) });

  function ensureSeq() {
    if (!seq || cur >= seq.length) {
      const n = Math.max(1, Math.min(2000, Number($("#n").value) || 1));
      const p = PATTERNS[$("#pattern").value];
      seq = p.gen(n, patCfg());
      if (!seq.length) seq = [0];
      cur = 0;
    }
  }
  function invalidateSeq() { seq = null; cur = 0; }

  const lvEl = (id) => $(`.level[data-level="${id}"]`);
  const centerOf = (el) => {
    const h = hier.getBoundingClientRect(), r = el.getBoundingClientRect();
    return { x: r.left - h.left + r.width / 2, y: r.top - h.top + r.height / 2 };
  };
  async function hop(from, to, cls, text, dx) {
    const dur = reduceMotion || turbo() ? 0 : 420 / speed();
    if (!dur) return;
    const a = centerOf(lvEl(from)), b = centerOf(lvEl(to));
    chip.className = "chip " + cls;
    chip.textContent = text;
    chip.style.transition = "none";
    chip.style.left = a.x + dx + "px"; chip.style.top = a.y + "px"; chip.style.opacity = "1";
    void chip.offsetWidth;
    chip.style.transition = `left ${dur}ms ease-in-out, top ${dur}ms ease-in-out`;
    chip.style.left = b.x + dx + "px"; chip.style.top = b.y + "px";
    await sleep(dur + 30);
  }
  const pause = (ms) => sleep(reduceMotion || turbo() ? 0 : ms / speed());

  function clearMarks() {
    $$(".level.checking").forEach((n) => n.classList.remove("checking"));
    $$(".verdict").forEach((n) => { n.textContent = ""; n.className = "verdict"; });
    chip.style.opacity = "0";
  }

  async function playEvent(ev, my) {
    clearMarks();
    $("#req-text").textContent = `read word ${ev.addr} (block ${ev.b})`;
    let prev = "cpu";
    for (const p of ev.path) {
      lvEl(p.id).classList.add("checking");
      await hop(prev, p.id, "req", `word ${ev.addr}`, -64);
      if (my !== epoch) return;
      const vd = $(`#vd-${p.id}`);
      vd.textContent = p.id === "ssd" ? "FOUND" : p.hit ? "HIT" : "MISS";
      vd.className = "verdict " + (p.hit ? "hit" : "miss");
      await pause(p.hit ? 260 : 200);
      if (my !== epoch) return;
      prev = p.id;
    }
    chip.style.opacity = "0";
    // data travels back up, being copied into every level above
    for (const ins of ev.installs) {
      await hop(prev, ins.id, "resp", `block ${ev.b}`, 64);
      if (my !== epoch) return;
      renderLevel(ins.id, ins.slot);
      prev = ins.id;
    }
    await hop(prev, "cpu", "resp", `${valueAt(ev.addr)}`, 64);
    if (my !== epoch) return;
    chip.style.opacity = "0";
  }

  async function doAccess(addr) {
    if (busy) return;
    busy = true; renderControls();
    const my = epoch;
    const ev = access(addr);
    await playEvent(ev, my);
    if (my !== epoch) return;
    busy = false;
    renderAll();
    narrate(ev);
    renderControls();
  }

  async function run() {
    if (running) { abort = true; return; }
    if (busy) return;
    ensureSeq();
    running = true; abort = false; renderControls();
    const my = epoch;
    runStart = JSON.parse(JSON.stringify(st.stats));
    let k = 0;
    while (cur < seq.length && !abort && my === epoch) {
      const addr = seq[cur++];
      if (turbo()) {
        access(addr);
        if (++k % 150 === 0) { renderAll(); await sleep(0); }
      } else {
        busy = true;
        const ev = access(addr);
        await playEvent(ev, my);
        if (my !== epoch) return;
        busy = false;
        renderAll(); narrate(ev);
        await pause(150);
      }
    }
    if (my !== epoch) return;
    running = false; busy = false;
    renderAll();
    if (st.lastEv) narrate(st.lastEv);
    finishRun(cur >= seq.length);
    renderControls();
  }

  async function stepOnce() {
    if (busy || running) return;
    ensureSeq();
    const addr = seq[cur++];
    await doAccess(addr);
  }

  function finishRun(complete) {
    if (!runStart) return;
    const d = st.stats, r = runStart;
    const n = d.n - r.n, hits = d.served.l1 - r.served.l1, cycles = d.cycles - r.cycles;
    if (n <= 0) return;
    const rate = CFG.caches ? (hits / n) * 100 : null;
    let txt = `${complete ? "Run finished" : "Paused"}: ${n} accesses, `;
    txt += rate == null ? "caches off, " : `L1 hit rate ${rate.toFixed(0)}%, `;
    txt += `average ${(cycles / n).toFixed(1)} cycles per access.`;
    const pr = $("#predict").value;
    if (pr && rate != null && complete) {
      const actual = rate > 80 ? "high" : rate < 20 ? "low" : "mid";
      const names = { high: "mostly hits", mid: "in between", low: "mostly misses" };
      txt += pr === actual ? ` You predicted “${names[pr]}”: correct.` : ` You predicted “${names[pr]}”, but it was “${names[actual]}”. Why? Look at the access pattern and the L1 size.`;
    }
    $("#verdict-run").textContent = txt;
  }

  function resetAll(msg) {
    epoch++; running = false; busy = false; abort = true;
    newState(); invalidateSeq(); runStart = null;
    clearMarks();
    $("#verdict-run").textContent = "";
    $("#req-text").textContent = "idle";
    $("#narr").innerHTML = msg || "The caches are empty (a <b>cold</b> machine). RAM holds blocks 0–31, as if the program had just been loaded; blocks 32–63 exist only on the SSD.";
    renderAll(); renderControls();
  }

  /* ------------------------------------------------------------ narrative */
  function narrate(ev) {
    const N = { l1: "L1", l2: "L2", l3: "L3", ram: "RAM", ssd: "the SSD" };
    const b = ev.b;
    let t = `Read word ${ev.addr} (block ${b}, words ${b * 4}–${b * 4 + 3}). `;
    if (!CFG.caches) t += "Caches are switched off, so the CPU asks RAM directly. ";
    t += ev.path.filter((p) => p.id !== "ssd").map((p) => `${N[p.id]} ${p.hit ? "hit" : "miss"}`).join(" → ");
    if (ev.served === "ssd") t += (ev.path.length > 1 ? " → " : "") + "not in RAM either: <b>page fault</b>, read from the SSD";
    t += ". ";
    const ratio = ev.cycles / IDEAL;
    t += `<b>Cost: ${nf(ev.cycles)} cycles</b>${ev.served === "l1" ? " (the best case)" : ` (${ratio >= 10 ? Math.round(ratio) : ratio.toFixed(1)}× an L1 hit)`}. `;
    if (ev.installs.length) {
      t += "The whole block was copied up into " + ev.installs.map((i) => N[i.id] + (i.evicted != null ? ` (evicting block ${i.evicted})` : "")).join(", ") + ". ";
    }
    if (ev.served === "l1") t += ev.usedPrefetch ? "It was already in L1 because the <b>prefetcher</b> fetched it earlier. " : "It was already in the closest cache: locality at work. ";
    if (ev.kind === "cold") t += "<b>Cold miss</b>: this block had never been used before, so it could not have been cached. ";
    if (ev.kind === "capacity") t += "<b>Capacity miss</b>: this block was used before, but L1 is too small to keep everything the program needs. ";
    if (ev.kind === "conflict") t += "<b>Conflict miss</b>: L1 has room elsewhere, but the direct-mapped rule forces this block into a slot that holds another block. ";
    if (ev.pf) t += `The prefetcher also fetched block ${ev.pf.b} in advance (assuming you will read in order). `;
    $("#narr").innerHTML = t;
  }

  /* ------------------------------------------------------------ rendering */
  function renderLevel(id, flashSlot) {
    const L = st.lv[id];
    const box = $(`#cells-${id}`);
    box.innerHTML = L.map((s, i) =>
      `<span class="cell${s.b == null ? " empty" : ""}${s.pf ? " pf" : ""}${i === flashSlot ? " flash" : ""}" title="slot ${i}${s.pf ? " (prefetched)" : ""}">${s.b == null ? "" : s.b}</span>`).join("");
    if (flashSlot != null) setTimeout(() => $$(".cell.flash", box).forEach((c) => c.classList.remove("flash")), 700);
  }

  function renderMap() {
    $$("#mapgrid .mcell").forEach((c) => {
      const b = Number(c.dataset.b);
      let lvl = "ssd";
      for (const id of ["l1", "l2", "l3", "ram"]) if (find(id, b) >= 0) { lvl = id; break; }
      c.className = "mcell c-" + lvl;
      c.title = `Block ${b} (words ${b * 4}–${b * 4 + 3}): fastest copy is in ${lvl === "ssd" ? "storage only" : LV[lvl].name}`;
    });
  }

  function renderStats() {
    const s = st.stats, n = s.n;
    $("#s-hit").textContent = !CFG.caches ? "off" : n ? Math.round((s.served.l1 / n) * 100) + "%" : "—";
    $("#s-amat").textContent = n ? (s.cycles / n < 100 ? (s.cycles / n).toFixed(1) : nf(s.cycles / n)) + " cycles" : "—";
    $("#s-wait").textContent = n ? Math.round((1 - s.ideal / s.cycles) * 100) + "%" : "—";
    $("#s-stack").innerHTML = n ? ["l1", "l2", "l3", "ram", "ssd"].filter((k) => s.served[k]).map((k) =>
      `<span class="seg c-${k}" style="flex:${s.served[k]}" title="${LV[k].name}: ${s.served[k]} accesses">${s.served[k] / n > 0.07 ? LV[k].name : ""}</span>`).join("") : "";
    const noCache = n * LV.ram.lat;
    const rows = [
      ["Accesses", nf(n)],
      ...["l1", "l2", "l3", "ram", "ssd"].map((k) => [`Served by ${k === "ssd" ? "the SSD (page faults)" : LV[k].name}`, `${nf(s.served[k])}${n ? ` (${Math.round((s.served[k] / n) * 100)}%)` : ""}`]),
      ["L1 misses: cold / capacity / conflict", CFG.caches ? `${s.cold} / ${s.cap} / ${s.conf}` : "n/a"],
      ["Total time", n ? `${nf(s.cycles)} cycles ≈ ${fmtNs(s.cycles / GHZ)}` : "—"],
      ["…at human scale (1 cycle = 1 s)", n ? fmtSeconds(s.cycles) : "—"],
      ["If every access were an L1 hit", n ? `${nf(s.ideal)} cycles` : "—"],
      ["Slow-down vs that ideal", n ? `${(s.cycles / s.ideal).toFixed(1)}×` : "—"],
      ["Speed-up from the caches vs going straight to RAM", n && CFG.caches ? `${(noCache / s.cycles).toFixed(1)}×` : "—"],
      ["Prefetches issued / useful", CFG.prefetch ? `${s.pf} / ${s.pfUse}` : "off"],
    ];
    $("#s-list").innerHTML = rows.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join("");
  }

  function renderStrip() {
    $("#strip").innerHTML = st.strip.map((x) =>
      `<span class="sq c-${x.served}" title="word ${x.addr}: served by ${LV[x.served].name} (${nf(x.cycles)} cycles)"></span>`).join("");
  }

  function renderMeta() {
    $("#meta-l1").textContent = `${CFG.l1Size} lines · ${LV.l1.lat} cycles${CFG.l1Map === "dm" ? " · slot = block mod " + CFG.l1Size : ""}`;
    $("#meta-l2").textContent = `${LV.l2.size} lines · ${LV.l2.lat} cycles`;
    $("#meta-l3").textContent = `${LV.l3.size} lines · ${LV.l3.lat} cycles`;
    $("#meta-ram").textContent = `${LV.ram.size} lines · ${LV.ram.lat} cycles`;
    $("#meta-ssd").textContent = `${LV.ssd.size} blocks · ${nf(LV.ssd.lat)} cycles`;
    $$(".level").forEach((l) => l.classList.toggle("off", !CFG.caches && ["l1", "l2", "l3"].includes(l.dataset.level)));
  }

  function renderAll() {
    ["l1", "l2", "l3", "ram"].forEach((id) => renderLevel(id));
    renderMeta(); renderMap(); renderStats(); renderStrip();
    $("#reg-r1").textContent = st.reg ? `${st.reg.val}` : "—";
    if (!busy) { clearMarks(); if (!st.lastEv) $("#req-text").textContent = "idle"; }
  }

  function renderControls() {
    const lock = running || busy;
    $("#btn-run").textContent = running ? "⏸ Pause" : "▶ Run";
    $("#btn-run").disabled = busy && !running;
    $("#btn-step").disabled = lock;
    $("#btn-reset").disabled = false;
    $("#btn-clear-stats").disabled = lock;
    $("#btn-read").disabled = lock;
    $$("#mapgrid .mcell").forEach((c) => (c.disabled = lock));
    ["pattern", "w", "stride", "n", "custom", "cfg-caches", "cfg-prefetch", "cfg-l1", "cfg-map"].forEach((id) => { $("#" + id).disabled = lock; });
  }

  /* ------------------------------------------------------ static sections */
  function buildLatency() {
    const human = $("#human").checked;
    $("#lat-th").textContent = human ? "Human scale (1 cycle = 1 s)" : "Real time (3 GHz)";
    const rows = [
      ["Registers", "about 128 bytes", 1],
      ["L1 cache", "32–64 KB per core", 4],
      ["L2 cache", "256 KB – 8 MB", 12],
      ["L3 cache", "4 – 50 MB, shared by cores", 40],
      ["RAM", "8 – 64 GB", 250],
      ["SSD", "256 GB – 4 TB", 150000],
    ];
    const max = Math.log10(150000);
    $("#lat-body").innerHTML = rows.map(([n, size, c]) => `
      <tr><td><b>${n}</b></td><td>${size}</td><td>${nf(c)}</td>
      <td>${human ? fmtSeconds(c) : fmtNs(c / GHZ)}</td>
      <td><span class="lbar" style="width:${Math.max(2, (Math.log10(c) / max) * 100)}%"></span></td></tr>`).join("");
  }

  function buildBus() {
    const f = Number($("#f").value);
    $("#f-out").textContent = f + "%";
    const n = 10;
    const hasD = (i) => Math.floor(((i + 1) * f) / 100) > Math.floor((i * f) / 100);
    const D = Array.from({ length: n }, (_, i) => hasD(i));
    const k = D.filter(Boolean).length;
    let single = "";
    for (let i = 0; i < n; i++) single += `<span class="blk bi">I</span>` + (D[i] ? `<span class="blk bd">D</span>` : "");
    const lane1 = Array.from({ length: n }, () => `<span class="blk bi">I</span>`).join("");
    const lane2 = D.map((d) => (d ? `<span class="blk bd">D</span>` : `<span class="blk bx"></span>`)).join("");
    $("#bus-compare").innerHTML = `
      <div class="bus-row"><span class="bl">Shared bus (Von Neumann)</span><div class="lane">${single}</div><span class="bt">${n + k} trips</span></div>
      <div class="bus-row"><span class="bl">Separate paths (Harvard-style)</span><div class="lane two"><div>${lane1}</div><div>${lane2}</div></div><span class="bt">${n} trips</span></div>
      <p class="muted small-text">${k === 0 ? "No instruction touches data, so nothing competes for the bus." : `Instructions and data queue for the same bus, so ${n} instructions take ${n + k} bus trips instead of ${n}: <b>${(((n + k) / n - 1) * 100).toFixed(0)}% slower</b> before memory latency is even counted.`}</p>`;
  }

  /* -------------------------------------------------------------- wiring */
  function onPatternChange() {
    const key = $("#pattern").value, p = PATTERNS[key];
    $("#wrap-w").hidden = key !== "loop";
    $("#wrap-s").hidden = key !== "stride";
    $("#wrap-custom").hidden = key !== "custom";
    $("#n").value = p.n(patCfg());
    $("#n").disabled = false;
    const w = Number($("#w").value);
    $("#pattern-desc").textContent = p.desc + (key === "loop" ? ` Working set now: ${w} blocks = ${w * 4} words.` : "");
    invalidateSeq();
  }

  function init() {
    $("#pattern").innerHTML = Object.entries(PATTERNS).map(([k, p]) => `<option value="${k}">${esc(p.label)}</option>`).join("");
    $("#mapgrid").innerHTML = Array.from({ length: BLOCKS }, (_, b) => `<button type="button" class="mcell" data-b="${b}" aria-label="Block ${b}">${b}</button>`).join("");
    $("#map-legend").innerHTML = ["l1", "l2", "l3", "ram", "ssd"].map((k) => `<span><i class="sq c-${k}"></i>${k === "ssd" ? "storage only" : LV[k].name}</span>`).join("");
    $("#strip-legend").innerHTML = ["l1", "l2", "l3", "ram", "ssd"].map((k) => `<span><i class="sq c-${k}"></i>served by ${LV[k].name}</span>`).join("");

    $("#pattern").addEventListener("change", onPatternChange);
    $("#w").addEventListener("input", () => { $("#w-out").textContent = $("#w").value; onPatternChange(); });
    $("#stride").addEventListener("change", () => { invalidateSeq(); });
    $("#n").addEventListener("change", invalidateSeq);
    $("#custom").addEventListener("change", invalidateSeq);
    $("#btn-run").addEventListener("click", run);
    $("#btn-step").addEventListener("click", stepOnce);
    $("#btn-reset").addEventListener("click", () => resetAll());
    $("#btn-clear-stats").addEventListener("click", () => {
      st.stats = zero(); st.strip = []; runStart = null; invalidateSeq();
      $("#verdict-run").textContent = "";
      $("#narr").innerHTML = "Counters cleared, but the caches still hold their data (a <b>warm</b> machine). Run again and compare.";
      renderAll();
    });
    $("#speed").addEventListener("input", (e) => {
      speedIdx = Number(e.target.value);
      $("#speed-label").textContent = turbo() ? "Max" : speed() + "×";
    });
    const cfgChange = () => {
      CFG.caches = $("#cfg-caches").checked;
      CFG.prefetch = $("#cfg-prefetch").checked;
      CFG.l1Size = Number($("#cfg-l1").value);
      CFG.l1Map = $("#cfg-map").value;
      resetAll("Settings changed, so the machine was reset to empty. " + (CFG.caches ? "" : "<b>Caches are off:</b> every read goes to RAM (or the SSD)."));
    };
    ["cfg-caches", "cfg-prefetch", "cfg-l1", "cfg-map"].forEach((id) => $("#" + id).addEventListener("change", cfgChange));

    $("#mapgrid").addEventListener("click", (e) => {
      const c = e.target.closest(".mcell");
      if (c && !running && !busy) { const a = Number(c.dataset.b) * 4; $("#addr-in").value = a; doAccess(a); }
    });
    const readManual = () => {
      const a = Math.max(0, Math.min(WORDS - 1, Math.round(Number($("#addr-in").value) || 0)));
      $("#addr-in").value = a;
      $("#addr-info").textContent = `block ${a >> 2}, word ${a & 3} in the block`;
      if (!running && !busy) doAccess(a);
    };
    $("#btn-read").addEventListener("click", readManual);
    $("#addr-in").addEventListener("keydown", (e) => { if (e.key === "Enter") readManual(); });

    $("#human").addEventListener("change", buildLatency);
    $("#f").addEventListener("input", buildBus);
    window.addEventListener("resize", () => {});

    newState();
    buildLatency(); buildBus();
    onPatternChange();
    renderAll(); renderControls();
  }

  window.__mh = { access, get state() { return st; }, CFG, newState, PATTERNS, resetAll };
  init();
})();
