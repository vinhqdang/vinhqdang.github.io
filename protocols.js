/* Network protocols: protocol stack + encapsulation, packet vs circuit switching, IPv4/IPv6, HTTP + portals. */
(() => {
  "use strict";

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const NS = "http://www.w3.org/2000/svg";
  const el = (tag, attrs = {}, text) => {
    const e = document.createElementNS(NS, tag);
    for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
    if (text != null) e.textContent = text;
    return e;
  };
  const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const dur = (ms) => (reduce ? 0 : ms);
  const hex = (n, w = 2) => n.toString(16).toUpperCase().padStart(w, "0");

  /* ============================================================ 1. STACK */
  const LAYERS = [
    { id: "app", name: "Application", proto: "HTTP" },
    { id: "tcp", name: "Transport", proto: "TCP" },
    { id: "ip", name: "Internet", proto: "IP" },
    { id: "link", name: "Link / physical", proto: "Ethernet · Wi-Fi · fibre" },
  ];
  const ST_STAGES = [
    "Ready", "Application: data", "TCP adds its header", "IP adds its header", "Link adds a frame",
    "Bits cross the wire", "Link strips the frame", "IP strips its header", "TCP checks and strips", "Application receives",
  ];
  const DEF = { src: [192, 0, 2, 10], dst: [203, 0, 113, 80] };
  const parseIp4 = (s) => {
    const m = String(s).trim().match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
    if (!m) return null;
    const b = m.slice(1).map(Number);
    return b.every((x) => x <= 255) ? b : null;
  };
  function inetChecksum(bytes) {
    let sum = 0;
    for (let i = 0; i < bytes.length; i += 2) sum += (bytes[i] << 8) | (bytes[i + 1] ?? 0);
    while (sum >> 16) sum = (sum & 0xffff) + (sum >> 16);
    return ~sum & 0xffff;
  }
  function crc32(bytes) {
    let c, crc = 0xffffffff;
    for (const b of bytes) { c = (crc ^ b) & 0xff; for (let k = 0; k < 8; k++) c = c & 1 ? (c >>> 1) ^ 0xedb88320 : c >>> 1; crc = (crc >>> 8) ^ c; }
    return (crc ^ 0xffffffff) >>> 0;
  }

  let stStage = 0, stBusy = false, stData = null;

  function buildPacket() {
    const msg = $("#st-msg").value || " ";
    const payload = [...new TextEncoder().encode(msg)];
    const srcIn = parseIp4($("#st-src").value), dstIn = parseIp4($("#st-dst").value);
    $("#st-src").classList.toggle("bad", !srcIn); $("#st-dst").classList.toggle("bad", !dstIn);
    const src = srcIn || DEF.src, dst = dstIn || DEF.dst;
    const dport = Math.max(1, Math.min(65535, Number($("#st-port").value) || 80));
    const sport = 49321;
    const seq = Math.max(0, Math.min(999999, Number($("#st-seq").value) || 0));
    const tcp = [sport >> 8, sport & 255, dport >> 8, dport & 255, (seq >>> 24) & 255, (seq >>> 16) & 255, (seq >>> 8) & 255, seq & 255, 0, 0, 0, 0, 0x50, 0x18, 0xff, 0xff, 0, 0, 0, 0];
    const pseudo = [...src, ...dst, 0, 6, ((20 + payload.length) >> 8) & 255, (20 + payload.length) & 255];
    const ck = inetChecksum([...pseudo, ...tcp, ...payload]);
    tcp[16] = ck >> 8; tcp[17] = ck & 255;
    const total = 20 + 20 + payload.length;
    const ip = [0x45, 0, total >> 8, total & 255, 0, 1, 0x40, 0, 64, 6, 0, 0, ...src, ...dst];
    const ipck = inetChecksum(ip); ip[10] = ipck >> 8; ip[11] = ipck & 255;
    const frameHdr = [0x02, 0x00, 0x5e, 0x10, 0x00, 0x02, 0x02, 0x00, 0x5e, 0x10, 0x00, 0x01, 0x08, 0x00];
    const body = [...frameHdr, ...ip, ...tcp, ...payload];
    const fcs = crc32(body);
    const frame = [...body, (fcs >>> 24) & 255, (fcs >>> 16) & 255, (fcs >>> 8) & 255, fcs & 255];
    return { msg, payload, src, dst, sport, dport, seq, tcp, ck, ip, frame, pseudo };
  }

  function stView(stage, d, corrupt) {
    const dots = (a) => a.join(".");
    const ttl = stage >= 6 ? 60 : 64;
    const pay = corrupt && stage >= 6 ? [...d.payload] : d.payload;
    if (corrupt && stage >= 6) pay[0] ^= 1;
    const payTxt = esc(new TextDecoder().decode(new Uint8Array(pay)));
    let html = `<div class="pk data"><span class="hd">Data (${d.payload.length} bytes)</span><code>${payTxt}</code></div>`;
    const sizes = { data: d.payload.length, tcp: 0, ip: 0, frame: 0 };
    if (stage >= 2 && stage <= 7) {
      sizes.tcp = 20;
      html = `<div class="pk tcp"><span class="hd">TCP header · 20 bytes</span>
        <span class="fields">source port ${d.sport} · destination port ${d.dport} · <b>sequence ${d.seq}</b> · <b>checksum 0x${hex(d.ck, 4)}</b></span>${html}</div>`;
    }
    if (stage >= 3 && stage <= 6) {
      sizes.ip = 20;
      html = `<div class="pk ip"><span class="hd">IP header · 20 bytes</span>
        <span class="fields">version 4 · <b>source ${dots(d.src)}</b> · <b>destination ${dots(d.dst)}</b> · TTL ${ttl} · protocol 6 (TCP)</span>${html}</div>`;
    }
    if (stage >= 4 && stage <= 5) {
      sizes.frame = 18;
      html = `<div class="pk frame"><span class="hd">Frame header · 14 bytes</span><span class="fields">hardware addresses of the next hop · type IPv4</span>${html}<span class="tl">trailer (FCS) · 4 bytes</span></div>`;
    }
    if (stage === 0) html = `<p class="muted small-text">Nothing sent yet.</p>`;
    const total = sizes.data + sizes.tcp + sizes.ip + sizes.frame;
    return { html, total, overhead: sizes.tcp + sizes.ip + sizes.frame, payLen: sizes.data };
  }

  function stNarr(stage, d, corrupt) {
    const dots = (a) => a.join(".");
    const okSum = !corrupt;
    const N = {
      0: "Choose a message and press <b>Next step</b>. The packet will be built layer by layer on computer A, cross the physical link, and be taken apart on computer B.",
      1: `The <b>application</b> (a web browser) has a message: <code>${esc(d.msg)}</code> (${d.payload.length} bytes). It knows nothing about cables. It just hands the message to the layer below, expecting it to arrive at the application on the other computer: a <b>virtual link</b>.`,
      2: `<b>TCP</b> wraps the data in a header. The ports (${d.sport} → ${d.dport}) say which programs are talking. The <b>sequence number</b> (${d.seq}) lets the receiver reassemble packets in the right order. The <b>checksum</b> (0x${hex(d.ck, 4)}) lets it detect damage.`,
      3: `<b>IP</b> adds its own header: the <b>source</b> (${dots(d.src)}) and <b>destination</b> (${dots(d.dst)}) addresses, 4 bytes each, so routers can pass the packet from node to node. TTL 64 limits its life (the number <code>tracert</code> plays with). IP will <i>not</i> repair lost, damaged or out-of-order packets.`,
      4: `The <b>link layer</b> (Ethernet or Wi-Fi) adds a frame header with the hardware address of the next hop, and a trailer that detects errors on this one link. The packet is now ${d.frame.length} bytes for a ${d.payload.length}-byte message.`,
      5: `The bits cross the <b>physical link</b>: electrical pulses on a cable, light in fibre or radio waves. This is the only layer where the computers are really connected. The raw bytes are shown below.`,
      6: `The receiving link layer checks the trailer, finds the frame intact and strips it off. ${corrupt ? "<b>But while the packet crossed a router, a faulty memory chip flipped one bit of the data</b> (the link check cannot see that: it happened between hops)." : "The packet crossed 4 routers on the way, each subtracting 1 from the TTL (64 → 60)."}`,
      7: `<b>IP</b> checks that the destination address (${dots(d.dst)}) is this machine, then strips its header and hands the TCP segment up. It does no checking of the data.`,
      8: okSum
        ? `<b>TCP</b> recomputes the checksum over the segment: it matches, so the data is intact. The sequence number (${d.seq}) says where it belongs; TCP strips its header and passes the data up (and would send an acknowledgement).`
        : `<b>TCP</b> recomputes the checksum and it <b>does not match</b>: the data was damaged. TCP silently drops the segment. No acknowledgement goes back, so the sender will time out and <b>retransmit</b>. This is the “error detection and correction” TCP adds on top of IP.`,
      9: okSum ? `The <b>application</b> receives <code>${esc(d.msg)}</code>. It looks as if the two programs talked directly: that is the virtual link, built from all the layers beneath.`
        : "Nothing is delivered to the application yet. After the retransmission timeout, TCP will send the segment again.",
    };
    return N[stage];
  }

  function hexDump(bytes) {
    const rows = [];
    for (let i = 0; i < bytes.length; i += 16) rows.push(`${hex(i, 4)}  ${bytes.slice(i, i + 16).map((b) => hex(b)).join(" ")}`);
    return rows.join("\n");
  }

  function stRender() {
    const d = stData || buildPacket();
    const corrupt = $("#st-corrupt").checked;
    const grid = $("#st-grid");
    // active cells
    const active = { 1: ["A", "app"], 2: ["A", "tcp"], 3: ["A", "ip"], 4: ["A", "link"], 6: ["B", "link"], 7: ["B", "ip"], 8: ["B", "tcp"], 9: ["B", "app"] }[stStage];
    $$(".lyr", grid).forEach((c) => c.classList.toggle("active", !!active && c.dataset.host === active[0] && c.dataset.l === active[1]));
    const laneOn = { 7: "ip", 8: "tcp", 9: "app", 5: "link" }[stStage];
    $$(".lane", grid).forEach((c) => c.classList.toggle("on", c.dataset.l === laneOn));
    $$(".lane.phys .packet-dot", grid).forEach((c) => c.classList.toggle("go", stStage === 5));
    $("#st-title").textContent = ST_STAGES[stStage] + (stStage ? `  (${stStage}/9)` : "");
    $("#st-narr").innerHTML = stNarr(stStage, d, corrupt);
    const v = stView(stStage, d, corrupt);
    $("#st-pkt").innerHTML = stStage === 9 ? `<div class="pk data"><span class="hd">Message delivered</span><code>${corrupt ? "(nothing)" : esc(d.msg)}</code></div>` : stStage === 8 && corrupt ? `<div class="pk drop"><span class="hd">Checksum mismatch: segment dropped</span></div>` : v.html;
    $("#st-size").innerHTML = stStage === 0 ? "" : stStage >= 5 && stStage <= 5
      ? `<pre class="hexd">${hexDump(d.frame)}</pre>The whole frame: ${d.frame.length} bytes on the wire.`
      : `Size: <b>${v.total} bytes</b> = ${v.payLen} bytes of message + <b>${v.overhead} bytes of headers</b> (${v.total ? Math.round((v.overhead / v.total) * 100) : 0}% overhead).`;
    $("#st-stage").textContent = "";
    $("#st-step").disabled = stBusy || stStage >= 9;
    $("#st-run").disabled = stBusy || stStage >= 9;
  }

  function stStep() {
    if (stStage >= 9) return;
    if (stStage === 0) stData = buildPacket();
    stStage++;
    stRender();
  }
  function stReset() { stStage = 0; stData = null; stBusy = false; stRender(); }

  function initStack() {
    $("#st-grid").innerHTML =
      `<div class="gh">Computer A (client)</div><div class="gh mid">virtual links</div><div class="gh">Computer B (server)</div>` +
      LAYERS.map((l) => {
        const phys = l.id === "link";
        return `<div class="lyr" data-host="A" data-l="${l.id}"><b>${l.name}</b><small>${l.proto}</small></div>
          <div class="lane${phys ? " phys" : ""}" data-l="${l.id}">${phys ? '<span class="lbl">physical link</span><span class="packet-dot"></span>' : `<span class="lbl">${l.proto} ↔ ${l.proto}</span>`}</div>
          <div class="lyr" data-host="B" data-l="${l.id}"><b>${l.name}</b><small>${l.proto}</small></div>`;
      }).join("");
    ["st-msg", "st-src", "st-dst", "st-port", "st-seq", "st-corrupt"].forEach((id) => $("#" + id).addEventListener("input", () => { stReset(); }));
    $("#st-step").addEventListener("click", stStep);
    $("#st-reset").addEventListener("click", stReset);
    $("#st-run").addEventListener("click", async () => {
      if (stBusy) return; stBusy = true;
      if (stStage >= 9) { stStage = 0; stData = null; }
      while (stStage < 9) { if (stStage === 0) stData = buildPacket(); stStage++; stRender(); await sleep(dur(1300)); }
      stBusy = false; stRender();
    });
    stRender();
  }

  /* ===================================================== 2. SWITCHING SIM */
  const SN = { A: [50, 190, "Sender"], R1: [210, 100], R2: [210, 280], R3: [380, 50], R4: [380, 190], R5: [380, 330], R6: [550, 115], R7: [550, 265], B: [765, 190, "Receiver"] };
  const SL = [["A", "R1", 1], ["A", "R2", 1], ["R1", "R3", 1], ["R1", "R4", 2], ["R2", "R4", 1], ["R2", "R5", 4], ["R3", "R6", 2], ["R4", "R6", 1], ["R4", "R7", 1], ["R5", "R7", 1], ["R6", "B", 1], ["R7", "B", 1]]
    .map(([a, b, d]) => ({ id: a + "-" + b, a, b, d, up: true }));
  const TICK_MS = 600, SPEEDS = [0.5, 1, 2, 4], WINDOW = 6, TIMEOUT = 16, MAX_TICKS = 700;
  const pos = (id) => SN[id];
  const linkOf = (u, v) => SL.find((l) => (l.a === u && l.b === v) || (l.a === v && l.b === u));
  const rngMake = (seed) => { let t = seed >>> 0; return () => { t = (t + 0x6d2b79f5) >>> 0; let r = Math.imul(t ^ (t >>> 15), 1 | t); r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r; return ((r ^ (r >>> 14)) >>> 0) / 4294967296; }; };
  const hue = (seq) => `hsl(${(seq * 53) % 360} 70% 48%)`;

  let sim = null, runCount = 0, simSpeed = 1, lastFrame = performance.now(), distCache = null;
  const ssvg = $("#sw-svg");

  function nbrs(u) { return SL.filter((l) => l.up && (l.a === u || l.b === u)).map((l) => ({ to: l.a === u ? l.b : l.a, l })); }
  function dijkstra(target, blocked) {
    const dist = Object.fromEntries(Object.keys(SN).map((k) => [k, Infinity])); dist[target] = 0;
    const prev = {}, todo = new Set(Object.keys(SN));
    while (todo.size) {
      let u = null; for (const k of todo) if (u == null || dist[k] < dist[u]) u = k;
      todo.delete(u); if (dist[u] === Infinity) break;
      for (const { to, l } of nbrs(u)) {
        if (blocked && blocked.has(l.id)) continue;
        if (dist[u] + l.d < dist[to]) { dist[to] = dist[u] + l.d; prev[to] = u; }
      }
    }
    return { dist, prev };
  }
  const distToB = () => (distCache ||= dijkstra("B").dist);

  const qkey = (u, v) => u + ">" + v;
  const queue = (u, v) => (sim.queues[qkey(u, v)] ||= []);

  function newSim() {
    runCount++;
    const mode = $('input[name="sw-mode"]:checked').value;
    const msg = ($("#sw-msg").value || "HELLO").toUpperCase();
    const chunk = Number($("#sw-chunk").value);
    const text = msg.slice(0, 24 * chunk);
    const chunks = []; for (let i = 0; i < text.length; i += chunk) chunks.push(text.slice(i, i + chunk));
    return {
      t: 0, acc: 0, running: false, done: false, started: false, stopAt: null, mode, tcpOn: $("#sw-tcp").checked && mode === "packet",
      loss: Number($("#sw-loss").value) / 100, bg: Number($("#sw-bg").value), rng: rngMake(runCount * 9973 + 7),
      chunks, N: chunks.length, pkts: [], queues: {}, uid: 1, recv: {}, order: [], maxSeen: -1, next: 0,
      sent: {}, sentAt: {}, acked: {}, tries: {}, acks: [], used: new Set(), routes: new Set(), effects: [],
      stats: { sent: 0, lost: 0, retx: 0, ooo: 0, dup: 0 }, log: [], circuit: null, reserved: new Set(), finishedAt: null, summary: "",
    };
  }
  const slog = (msg) => { sim.log.unshift(`t=${sim.t}: ${msg}`); sim.log = sim.log.slice(0, 9); };

  function nextHop(u, p) {
    const dist = distToB(); let best = null;
    for (const { to, l } of nbrs(u)) {
      if (!(dist[to] < dist[u])) continue;
      const c = l.d + dist[to] + queue(u, to).length * 2 + sim.rng() * 6; // spreads traffic over near-equal routes
      if (!best || c < best.c) best = { to, c };
    }
    return best ? best.to : null;
  }
  function enqueue(u, p) {
    const nh = nextHop(u, p);
    if (!nh) { sim.pkts = sim.pkts.filter((x) => x !== p); if (!p.bg) { sim.stats.lost++; slog(`packet ${p.seq + 1} had no route from ${u} and was dropped`); } return; }
    p.state = "queued"; p.at = u; queue(u, nh).push(p);
  }

  function spawn(seq, retx) {
    const p = { id: sim.uid++, seq, chunk: sim.chunks[seq], bg: false, retx: !!retx, state: "queued", route: ["A"], at: "A",
      dieAt: sim.rng() < sim.loss ? Math.floor(sim.rng() * 3) : -1 };
    sim.pkts.push(p);
    if (retx) sim.stats.retx++; else sim.stats.sent++;
    sim.sent[seq] = true; sim.sentAt[seq] = sim.t; sim.tries[seq] = (sim.tries[seq] || 0) + 1;
    enqueue("A", p);
  }

  function receive(p) {
    const s = sim.stats;
    sim.routes.add(p.route.join(">"));
    if (sim.firstAt == null) sim.firstAt = sim.t;
    const dup = sim.recv[p.seq] != null;
    if (dup) { s.dup++; slog(`duplicate of packet ${p.seq + 1} arrived and was ignored`); }
    else {
      sim.recv[p.seq] = p.chunk; sim.order.push(p.seq);
      if (p.seq < sim.maxSeen) { s.ooo++; slog(`packet ${p.seq + 1} arrived <b>late</b> (after packet ${sim.maxSeen + 1}): out of order`); }
      sim.maxSeen = Math.max(sim.maxSeen, p.seq);
    }
    if (sim.tcpOn) {
      const back = dijkstra("A").dist.B;
      if (isFinite(back)) sim.acks.push({ seq: p.seq, at: sim.t + back });
    }
  }

  function cutEffects(id, note) {
    const l = SL.find((x) => x.id === id);
    // in-flight packets on that link are lost; queued packets are re-routed
    for (const p of sim.pkts.slice()) {
      if (p.state === "flight" && ((p.from === l.a && p.to === l.b) || (p.from === l.b && p.to === l.a))) { killPacket(p, "was on the cut link"); }
    }
    for (const k of [qkey(l.a, l.b), qkey(l.b, l.a)]) {
      const q = sim.queues[k]; if (!q || !q.length) continue;
      const u = k.split(">")[0]; sim.queues[k] = [];
      q.forEach((p) => enqueue(u, p));
    }
    if (sim.circuit && ["setup", "open", "closing"].includes(sim.circuit.phase) && sim.circuit.links.includes(id)) {
      sim.circuit.phase = "failed";
      sim.pkts.filter((p) => p.state === "circ").forEach((p) => killPacket(p, "was on the broken circuit"));
      sim.running = false; sim.done = true; sim.finishedAt = sim.t;
      slog("<b>the circuit is broken</b>: every packet on it is gone"); finishSummary();
    }
  }
  function killPacket(p, why) {
    sim.pkts = sim.pkts.filter((x) => x !== p);
    if (!p.bg) { sim.stats.lost++; slog(`packet ${p.seq + 1} ${why} and was lost`); sim.effects.push({ x: p.x ?? 0, y: p.y ?? 0, t: sim.t }); }
  }

  function toggleLink(id) {
    const l = SL.find((x) => x.id === id); l.up = !l.up; distCache = null;
    if (sim) { slog(`link ${l.a}–${l.b} ${l.up ? "repaired" : "<b>cut</b>"}`); if (!l.up) cutEffects(id); }
    renderSim();
  }

  function circuitInit() {
    const k = sim.bg;
    const ids = SL.map((l) => l.id);
    for (let i = 0; i < k * 2; i++) sim.reserved.add(ids[Math.floor(sim.rng() * ids.length)]);
    const { dist, prev } = dijkstra("A", sim.reserved);
    if (!isFinite(dist.B)) { sim.circuit = { phase: "busy", path: [], links: [], cum: [0], pd: 0 }; slog("<b>Busy signal</b>: no free circuit between sender and receiver"); sim.done = true; sim.finishedAt = 0; finishSummary(); return; }
    const path = ["B"]; while (path[0] !== "A") path.unshift(prev[path[0]]);
    const links = path.slice(1).map((v, i) => linkOf(path[i], v).id);
    const cum = [0]; links.forEach((id, i) => cum.push(cum[i] + SL.find((l) => l.id === id).d));
    sim.circuit = { phase: "setup", path, links, cum, pd: cum[cum.length - 1] };
    slog(`setting up a circuit ${path.join(" → ")} (signalling takes ${2 * cum[cum.length - 1]} ticks)`);
  }

  function simTick() {
    const S = sim; S.t++;
    const t = S.t;
    // arrivals
    for (const p of S.pkts.slice()) {
      if ((p.state === "flight" || p.state === "circ") && p.arrive <= t) {
        if (p.lost) { S.pkts = S.pkts.filter((x) => x !== p); if (!p.bg) { S.stats.lost++; slog(`packet ${p.seq + 1} was <b>lost</b> between ${p.from} and ${p.to}`); } continue; }
        if (p.state === "circ" || p.to === "B") { S.pkts = S.pkts.filter((x) => x !== p); if (!p.bg) receive(p); continue; }
        p.route.push(p.to); p.prev = p.to; enqueue(p.to, p); // still travelling: stays in S.pkts
      }
    }
    if (S.mode === "circuit") circuitTick(); else senderTick();
    // background cross traffic (packet mode)
    if (S.mode === "packet" && S.bg > 0 && S.rng() < S.bg * 0.45) {
      const from = ["R1", "R2", "R3", "R4", "R5"][Math.floor(S.rng() * 5)];
      const p = { id: S.uid++, seq: -1, bg: true, state: "queued", route: [from], at: from }; S.pkts.push(p); enqueue(from, p);
    }
    // transmission
    if (S.mode === "packet") {
      for (const k of Object.keys(S.queues)) {
        const q = S.queues[k]; if (!q.length) continue;
        const [u, v] = k.split(">"); const l = linkOf(u, v);
        if (!l.up) continue;
        const p = q.shift();
        p.state = "flight"; p.from = u; p.to = v; p.t0 = t; p.arrive = t + l.d; p.prev = u;
        p.lost = !p.bg && p.dieAt === p.route.length - 1;
        if (!p.bg) S.used.add(l.id);
      }
    }
    // TCP acks
    if (S.tcpOn) {
      S.acks = S.acks.filter((a) => { if (a.at <= t) { S.acked[a.seq] = true; return false; } return true; });
    }
    checkDone();
    if (S.stopAt != null && S.t >= S.stopAt) { S.running = false; S.stopAt = null; }
  }

  function senderTick() {
    const S = sim, t = S.t;
    if (!S.tcpOn) { if (S.next < S.N) spawn(S.next++, false); return; }
    for (let seq = 0; seq < S.N; seq++) {
      if (S.sent[seq] && !S.acked[seq] && t - S.sentAt[seq] >= TIMEOUT && !S.gaveUp) {
        if (S.tries[seq] >= 8) { S.gaveUp = true; slog(`TCP gives up on packet ${seq + 1} after 8 tries: <b>connection failed</b>`); continue; }
        slog(`no acknowledgement for packet ${seq + 1}: TCP <b>retransmits</b> it`); spawn(seq, true);
      }
    }
    if (S.gaveUp) return;
    let inflight = 0; for (let i = 0; i < S.N; i++) if (S.sent[i] && !S.acked[i]) inflight++;
    let n = 0;
    while (inflight < WINDOW && S.next < S.N && n < 2) { spawn(S.next++, false); inflight++; n++; }
  }

  function circuitTick() {
    const S = sim, c = S.circuit, t = S.t;
    if (!c || ["failed", "busy", "done"].includes(c.phase)) return;
    if (c.phase === "setup" && t >= 2 * c.pd) { c.phase = "open"; c.openAt = t; slog("circuit is <b>open</b>: the line is reserved, data can flow"); }
    else if (c.phase === "open") {
      if (S.next < S.N) {
        const seq = S.next++;
        const legs = c.links.map((id, i) => ({ from: c.path[i], to: c.path[i + 1], t0: t + c.cum[i], t1: t + c.cum[i + 1] }));
        const p = { id: S.uid++, seq, chunk: S.chunks[seq], bg: false, state: "circ", legs, route: c.path.slice(), arrive: t + c.pd, at: "A" };
        S.pkts.push(p); S.stats.sent++; c.links.forEach((id) => S.used.add(id));
      }
      if (S.next >= S.N && !S.pkts.some((p) => p.state === "circ")) { c.phase = "closing"; c.closeAt = t; slog("all data delivered: tearing the circuit down"); }
    } else if (c.phase === "closing" && t >= c.closeAt + c.pd) { c.phase = "done"; }
  }

  function checkDone() {
    const S = sim;
    if (S.done) return;
    let done = false;
    if (S.mode === "circuit") done = S.circuit && S.circuit.phase === "done";
    else if (S.tcpOn) {
      const all = Array.from({ length: S.N }, (_, i) => S.acked[i]).every(Boolean);
      done = all || S.gaveUp;
    } else done = S.next >= S.N && !S.pkts.some((p) => !p.bg);
    if (S.t >= MAX_TICKS) done = true;
    if (done) { S.done = true; S.running = false; S.finishedAt = S.t; slog("<b>finished</b>"); finishSummary(); }
  }

  const delivered = () => Object.keys(sim.recv).length;
  function appText() {
    if (!sim) return "—";
    if (sim.mode === "packet" && !sim.tcpOn) return sim.order.map((s) => sim.recv[s]).join("") || "—";
    let s = "", i = 0; while (sim.recv[i] != null) s += sim.recv[i++]; return s || "—";
  }

  function finishSummary() {
    const S = sim, st = S.stats, n = S.N, got = delivered();
    let t = "";
    if (S.mode === "circuit") {
      const c = S.circuit;
      if (c.phase === "busy") t = "<b>Circuit switching refused the call:</b> every path had a link reserved by someone else. A circuit needs the whole path free, so a busy network means no service at all.";
      else if (c.phase === "failed") t = `<b>The call dropped.</b> One cut link on the reserved path destroyed the connection. ${got} of ${n} packets arrived. The sender must set up a whole new circuit and start again.`;
      else t = `<b>Delivered ${got}/${n} in order</b> in ${S.finishedAt} ticks. ${2 * c.pd} ticks went on <i>setting up</i> before any data moved. One dedicated path was used (${S.used.size} of ${SL.length} links); the others sat idle, and the reserved links were unavailable to anyone else, even when quiet.`;
    } else if (S.tcpOn) {
      t = S.gaveUp ? `<b>TCP gave up.</b> ${got}/${n} packets arrived; the connection failed.` : `<b>Delivered ${got}/${n} in order</b> in ${S.finishedAt} ticks. ${st.retx} retransmission${st.retx === 1 ? "" : "s"} repaired ${st.lost} lost packet${st.lost === 1 ? "" : "s"}; ${st.ooo} arrived out of order and were put back in sequence. Packets used ${S.routes.size} different route${S.routes.size === 1 ? "" : "s"}.`;
    } else {
      t = `<b>${got} of ${n} packets arrived</b> (${st.lost} lost, ${st.ooo} out of order). With plain IP nobody repairs that: the application sees ${got === n && st.ooo === 0 ? "the message intact (lucky!)" : "a damaged message"}. Packets used ${S.routes.size} different route${S.routes.size === 1 ? "" : "s"}. Try again with TCP.`;
    }
    S.summary = t;
  }

  /* ---------- rendering ---------- */
  function buildSimSvg() {
    ssvg.innerHTML = "";
    const gl = el("g", { id: "sw-links" });
    SL.forEach((l) => {
      const A = pos(l.a), B = pos(l.b);
      const g = el("g", { class: "swlink", "data-id": l.id });
      g.append(el("line", { x1: A[0], y1: A[1], x2: B[0], y2: B[1], class: "vis" }));
      g.append(el("line", { x1: A[0], y1: A[1], x2: B[0], y2: B[1], class: "hit", "data-id": l.id }));
      g.append(el("text", { x: (A[0] + B[0]) / 2, y: (A[1] + B[1]) / 2 - 6, "text-anchor": "middle", class: "dl" }, String(l.d)));
      g.append(el("text", { x: (A[0] + B[0]) / 2, y: (A[1] + B[1]) / 2 + 5, "text-anchor": "middle", class: "xx" }, ""));
      gl.append(g);
    });
    ssvg.append(gl);
    Object.entries(SN).forEach(([id, [x, y, label]]) => {
      const host = !!label;
      const g = el("g", { class: "swnode" + (host ? " host" : "") });
      if (host) g.append(el("rect", { x: x - 30, y: y - 26, width: 60, height: 52, rx: 12 })); else g.append(el("circle", { cx: x, cy: y, r: 20 }));
      g.append(el("text", { x, y: y + 5, "text-anchor": "middle" }, host ? (id === "A" ? "💻" : "🖥️") : id));
      if (host) g.append(el("text", { x, y: y + 44, "text-anchor": "middle", class: "nl" }, label));
      ssvg.append(g);
    });
    ssvg.append(el("g", { id: "sw-dyn" }));
  }

  function renderSim(simT) {
    const S = sim;
    const t = simT ?? (S ? S.t : 0);
    $$(".swlink").forEach((g) => {
      const l = SL.find((x) => x.id === g.dataset.id);
      const inCirc = S && S.circuit && S.circuit.links.includes(l.id) && ["setup", "open", "closing"].includes(S.circuit.phase);
      g.classList.toggle("down", !l.up);
      g.classList.toggle("used", !!S && S.used.has(l.id) && !inCirc);
      g.classList.toggle("circ", !!inCirc);
      g.classList.toggle("busy", !!S && S.reserved.has(l.id));
      $(".xx", g).textContent = l.up ? "" : "✗";
    });
    const dyn = $("#sw-dyn"); dyn.innerHTML = "";
    if (S) {
      // queue badges
      for (const [k, q] of Object.entries(S.queues)) if (q.length) {
        const [u, v] = k.split(">"), A = pos(u), B = pos(v);
        const f = 0.22; dyn.append(el("text", { x: A[0] + (B[0] - A[0]) * f, y: A[1] + (B[1] - A[1]) * f - 8, "text-anchor": "middle", class: "qb" }, "⏳" + q.length));
      }
      // circuit setup pulse
      const c = S.circuit;
      if (c && c.phase === "setup" && c.pd) {
        const k = Math.min(1, t / (2 * c.pd)), along = k < 0.5 ? k * 2 : 1 - (k - 0.5) * 2, dpos = along * c.pd;
        let i = 0; while (i < c.cum.length - 2 && dpos > c.cum[i + 1]) i++;
        const a = pos(c.path[i]), b = pos(c.path[i + 1]), f = (dpos - c.cum[i]) / (c.cum[i + 1] - c.cum[i] || 1);
        dyn.append(el("circle", { cx: a[0] + (b[0] - a[0]) * f, cy: a[1] + (b[1] - a[1]) * f, r: 8, class: "pulse" }));
        dyn.append(el("text", { x: 410, y: 372, "text-anchor": "middle", class: "stat-t" }, k < 0.5 ? "dialling: reserving every link on the path…" : "path reserved: waiting for confirmation…"));
      }
      if (c && c.phase === "busy") dyn.append(el("text", { x: 410, y: 372, "text-anchor": "middle", class: "stat-t bad" }, "BUSY: no free path"));
      if (c && c.phase === "failed") dyn.append(el("text", { x: 410, y: 372, "text-anchor": "middle", class: "stat-t bad" }, "CALL DROPPED"));
      for (const p of S.pkts) {
        let x, y, fade = 1;
        if (p.state === "flight") {
          const a = pos(p.from), b = pos(p.to), k = Math.max(0, Math.min(1, (t - p.t0) / (p.arrive - p.t0)));
          x = a[0] + (b[0] - a[0]) * k; y = a[1] + (b[1] - a[1]) * k; if (p.lost && k > 0.5) fade = Math.max(0, 1 - (k - 0.5) * 2);
        } else if (p.state === "circ") {
          const leg = p.legs.find((l) => t < l.t1) || p.legs[p.legs.length - 1];
          if (t < p.legs[0].t0) continue;
          const a = pos(leg.from), b = pos(leg.to), k = Math.max(0, Math.min(1, (t - leg.t0) / (leg.t1 - leg.t0)));
          x = a[0] + (b[0] - a[0]) * k; y = a[1] + (b[1] - a[1]) * k;
        } else continue;
        p.x = x; p.y = y;
        if (p.bg) { dyn.append(el("circle", { cx: x, cy: y, r: 5, class: "bgp", opacity: fade })); continue; }
        const g = el("g", { opacity: fade, class: "dp" + (p.retx ? " retx" : "") });
        g.append(el("rect", { x: x - 11, y: y - 8, width: 22, height: 16, rx: 5, fill: hue(p.seq) }));
        g.append(el("text", { x, y: y + 4, "text-anchor": "middle" }, String(p.seq + 1)));
        g.append(el("title", {}, `packet ${p.seq + 1}: “${p.chunk}”`));
        dyn.append(g);
      }
    }
    renderPanels();
  }

  function renderPanels() {
    const S = sim;
    const N = S ? S.N : 0;
    $("#sw-slots").innerHTML = S ? Array.from({ length: N }, (_, i) => {
      const got = S.recv[i] != null;
      let inOrder = false; if (got && (S.tcpOn || S.mode === "circuit")) { inOrder = true; for (let j = 0; j < i; j++) if (S.recv[j] == null) inOrder = false; }
      return `<span class="slot${got ? " got" : ""}${inOrder ? " ord" : ""}" style="${got ? `--c:${hue(i)}` : ""}"><i>${i + 1}</i><b>${got ? esc(S.recv[i]) : "·"}</b></span>`;
    }).join("") : "";
    $("#sw-app").textContent = appText();
    $("#sw-appnote").textContent = !S ? "" : S.mode === "packet" && !S.tcpOn
      ? "Plain IP: the application gets packets in the order they arrive, with any missing ones simply absent."
      : S.mode === "circuit" ? "A circuit delivers an in-order stream, so nothing needs reordering." : "TCP holds back packets until the earlier ones have arrived, so the application sees an in-order stream.";
    $("#sw-log").innerHTML = S ? S.log.map((l) => `<li>${l}</li>`).join("") : "";
    const rows = S ? [
      ["Time", `${S.t} tick${S.t === 1 ? "" : "s"}${S.done ? " (finished)" : ""}`],
      ["Packets in message", String(S.N)],
      ["First data arrived at", S.firstAt != null ? `tick ${S.firstAt}` : "—"],
      ["Delivered to receiver", `${delivered()} of ${S.N}`],
      ["Packets lost", String(S.stats.lost)],
      ["Retransmissions (TCP)", S.tcpOn ? String(S.stats.retx) : "off"],
      ["Arrived out of order", S.mode === "circuit" ? "0 (one path)" : String(S.stats.ooo)],
      ["Different routes used", S.mode === "circuit" ? (S.circuit && S.circuit.path.length ? "1 (reserved)" : "0") : String(S.routes.size)],
      ["Links carrying data", `${S.used.size} of ${SL.length}`],
    ] : [];
    $("#sw-stats").innerHTML = rows.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join("");
    $("#sw-summary").innerHTML = S && S.summary ? S.summary : "";
    $("#sw-summary").style.display = S && S.summary ? "block" : "none";
    const circ = $('input[name="sw-mode"]:checked').value === "circuit";
    $("#sw-tcp").disabled = circ; $("#sw-tcp-wrap").classList.toggle("dis", circ);
    $("#sw-pause").textContent = S && S.running ? "⏸ Pause" : S && S.started && !S.done ? "▶ Resume" : "⏸ Pause";
    $("#sw-pause").disabled = !S || !S.started || S.done;
    $("#sw-tick").disabled = !!S && S.running;
  }

  function startSim() {
    distCache = null;
    sim = newSim(); sim.started = true; sim.running = true;
    if (sim.mode === "circuit") circuitInit();
    else slog(`sending ${sim.N} packet${sim.N === 1 ? "" : "s"}${sim.tcpOn ? " with TCP" : " with plain IP"}`);
    lastFrame = performance.now();
    renderSim();
  }
  function resetSim() { sim = null; distCache = null; SL.forEach((l) => (l.up = true)); renderSim(); }

  function frame(now) {
    const dt = now - lastFrame; lastFrame = now;
    if (sim && sim.running && !sim.done) {
      sim.acc += (dt * simSpeed) / TICK_MS;
      while (sim.acc >= 1 && sim.running && !sim.done) { sim.acc -= 1; simTick(); }
      if (!sim.running || sim.done) sim.acc = 0;
    }
    if (sim) renderSim(sim.t + (sim.running ? sim.acc : 0));
    requestAnimationFrame(frame);
  }

  function initSim() {
    buildSimSvg();
    ssvg.addEventListener("click", (e) => { const t = e.target.closest(".hit"); if (t) toggleLink(t.dataset.id); });
    $("#sw-send").addEventListener("click", startSim);
    $("#sw-reset").addEventListener("click", resetSim);
    $("#sw-pause").addEventListener("click", () => { if (sim && sim.started && !sim.done) { sim.running = !sim.running; lastFrame = performance.now(); } });
    $("#sw-tick").addEventListener("click", () => {
      if (!sim || sim.done || !sim.started) startSim();
      sim.running = true; sim.stopAt = sim.t + 1; lastFrame = performance.now();
    });
    $("#sw-loss").addEventListener("input", (e) => { $("#sw-loss-o").textContent = e.target.value + "%"; if (sim) sim.loss = Number(e.target.value) / 100; });
    $("#sw-bg").addEventListener("input", (e) => { $("#sw-bg-o").textContent = e.target.value; if (sim && sim.mode === "packet") sim.bg = Number(e.target.value); });
    $("#sw-speed").addEventListener("input", (e) => { simSpeed = SPEEDS[Number(e.target.value)]; $("#sw-speed-o").textContent = simSpeed + "×"; });
    $$('input[name="sw-mode"]').forEach((r) => r.addEventListener("change", () => { if (sim && !sim.done) resetSim(); renderPanels(); }));
    $("#sw-tcp").addEventListener("change", () => { if (sim && !sim.done) resetSim(); });
    ["sw-msg", "sw-chunk"].forEach((id) => $("#" + id).addEventListener("change", () => { if (sim && !sim.done) resetSim(); }));
    renderSim();
    requestAnimationFrame(frame);
  }

  /* ================================================== 3. IP ADDRESSES */
  function parseIp6(s) {
    s = String(s).trim().toLowerCase();
    if (!/^[0-9a-f:]+$/.test(s) || s.split("::").length > 2) return null;
    let groups;
    if (s.includes("::")) {
      const [a, b] = s.split("::"), A = a ? a.split(":") : [], B = b ? b.split(":") : [];
      if (A.length + B.length > 7) return null;
      groups = [...A, ...Array(8 - A.length - B.length).fill("0"), ...B];
    } else groups = s.split(":");
    if (groups.length !== 8 || !groups.every((g) => /^[0-9a-f]{1,4}$/.test(g))) return null;
    return groups.map((g) => parseInt(g, 16));
  }
  function compress6(g) {
    const h = g.map((x) => x.toString(16));
    let best = { s: -1, l: 0 }, cur = { s: -1, l: 0 };
    g.forEach((x, i) => { if (x === 0) { if (cur.s < 0) cur = { s: i, l: 1 }; else cur.l++; if (cur.l > best.l) best = { ...cur }; } else cur = { s: -1, l: 0 }; });
    if (best.l < 2) return h.join(":");
    return (h.slice(0, best.s).join(":") + "::" + h.slice(best.s + best.l).join(":"));
  }
  const bigFmt = (b) => b.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  function initAddr() {
    const POP = 7800000000n;
    const upd4 = () => {
      const b = parseIp4($("#ip4").value);
      $("#ip4").classList.toggle("bad", !b);
      if (!b) { $("#ip4-bytes").innerHTML = ""; $("#ip4-note").textContent = "Enter four numbers from 0 to 255 separated by dots."; return; }
      $("#ip4-bytes").innerHTML = b.map((x) => `<div class="by"><span class="dec">${x}</span><span class="bin">${x.toString(2).padStart(8, "0")}</span></div>`).join("");
      const n = ((b[0] << 24) | (b[1] << 16) | (b[2] << 8) | b[3]) >>> 0;
      $("#ip4-note").innerHTML = `4 bytes. As one 32-bit number this is <b>${n.toLocaleString("en-US")}</b> out of 4,294,967,296 possible addresses.`;
    };
    const upd6 = () => {
      const g = parseIp6($("#ip6").value);
      $("#ip6").classList.toggle("bad", !g);
      if (!g) { $("#ip6-bytes").innerHTML = ""; $("#ip6-note").textContent = "Enter eight groups of up to four hex digits, e.g. 2001:db8::1"; return; }
      $("#ip6-bytes").innerHTML = g.map((x) => `<div class="by"><span class="dec">${x.toString(16).padStart(4, "0")}</span><span class="bin">${x.toString(2).padStart(16, "0").replace(/(\d{4})(?=\d)/g, "$1 ")}</span></div>`).join("");
      $("#ip6-note").innerHTML = `16 bytes. Shortened: <code>${compress6(g)}</code>. Leading zeros can be dropped, and one run of all-zero groups can become <code>::</code>.`;
    };
    $("#ip4").addEventListener("input", upd4); $("#ip6").addEventListener("input", upd6);
    $("#ip6-rand").addEventListener("click", () => {
      const r = () => Math.floor(Math.random() * 65536);
      const g = [0x2001, 0x0db8, r(), 0, 0, r() % 3 ? 0 : r(), r(), r()];
      $("#ip6").value = g.map((x) => x.toString(16).padStart(4, "0")).join(":"); upd6();
    });
    upd4(); upd6();
    const v4 = 2n ** 32n, v6 = 2n ** 128n;
    const per = v6 / POP, perStr = per.toString();
    $("#addr-bars").innerHTML = `
      <div class="ab"><span class="an">World population (2020)</span><div class="at"><div class="af pop" style="width:100%"></div></div><span class="av">7.8 billion</span></div>
      <div class="ab"><span class="an">IPv4 addresses</span><div class="at"><div class="af v4" style="width:${Number((v4 * 100n) / (POP * 1n))}%"></div></div><span class="av">${bigFmt(v4)}</span></div>
      <div class="ab"><span class="an">IPv6 addresses</span><div class="at"><div class="af v6" style="width:100%"></div><span class="over">…off the scale →</span></div><span class="av">${bigFmt(v6)}</span></div>`;
    $("#addr-note").innerHTML = `IPv4 has about <b>0.55 addresses per person</b>, which is not enough for everyone’s phone, laptop and watch, so we must move to IPv6. IPv6 has 2<sup>128</sup> addresses: roughly <b>${(Number(per) / 10 ** (perStr.length - 1)).toFixed(1)} × 10<sup>${perStr.length - 1}</sup></b> for every person alive.`;
  }

  /* ========================================================== 4. HTTP */
  const STATUS = {
    200: { t: "OK", hdr: ["Content-Type: text/html", "Content-Length: 1024"], body: "<html>…the page you asked for…</html>", page: "Welcome. This is the page you asked for.", cls: "ok" },
    301: { t: "Moved Permanently", hdr: ["Location: (the new address)"], body: "", page: "The page has moved. The browser follows the new address automatically.", cls: "warn" },
    403: { t: "Forbidden", hdr: ["Content-Type: text/html"], body: "<h1>403 Forbidden</h1>", page: "The server understood the request but will not let you have this page.", cls: "bad" },
    404: { t: "Not Found", hdr: ["Content-Type: text/html"], body: "<h1>404 Not Found</h1>", page: "The server is working, but there is no such file at that location.", cls: "bad" },
    408: { t: "Request Timeout", hdr: ["Connection: close"], body: "", page: "The server gave up waiting for the request to arrive.", cls: "bad" },
    418: { t: "I'm a teapot", hdr: ["Content-Type: text/plain"], body: "Short and stout.", page: "The server refuses to brew coffee because it is, permanently, a teapot. (A joke code from 1998, but real.)", cls: "warn" },
    500: { t: "Internal Server Error", hdr: ["Content-Type: text/html"], body: "<h1>500 Server Error</h1>", page: "Something went wrong inside the server. It is not your fault.", cls: "bad" },
  };
  const KNOWN = { http: "Hypertext Transfer Protocol: the simple client–server protocol of the web.", https: "HTTP carried over an encrypted connection (TLS).", ftp: "File Transfer Protocol: for moving files between machines.", smtp: "Simple Mail Transfer Protocol: for sending email (not usually typed as a URL)." };
  let htStep = 0, htBusy = false;

  function parseUrl(s) {
    const m = String(s).trim().match(/^([a-z][a-z0-9+.-]*):\/\/([^\/:?#]+)(:\d+)?(\/[^?#]*)?(\?[^#]*)?(#.*)?$/i);
    return m ? { proto: m[1].toLowerCase(), host: m[2], port: m[3] || "", path: m[4] || "/", query: m[5] || "", frag: m[6] || "" } : null;
  }
  function renderUrl() {
    const u = parseUrl($("#url-in").value);
    $("#url-in").classList.toggle("bad", !u);
    if (!u) { $("#url-view").innerHTML = ""; $("#url-note").textContent = "A URL looks like protocol://machine/file, for example http://www.example.com/index.html"; return; }
    $("#url-view").innerHTML = `
      <span class="seg p"><b>${esc(u.proto)}</b><small>protocol</small></span><span class="sep">://</span>
      <span class="seg h"><b>${esc(u.host)}</b><small>name of the machine</small></span>
      ${u.port ? `<span class="seg x"><b>${esc(u.port)}</b><small>port</small></span>` : ""}
      <span class="seg f"><b>${esc(u.path)}</b><small>file location on that machine</small></span>
      ${u.query ? `<span class="seg x"><b>${esc(u.query)}</b><small>query</small></span>` : ""}`;
    $("#url-note").textContent = KNOWN[u.proto] || `“${u.proto}” is not one of the protocols covered in the lecture.`;
    htRender();
  }
  const reqInfo = () => { const u = parseUrl($("#url-in").value); return u && /^https?$/.test(u.proto) ? u : { host: "www.example.com", path: "/docs/index.html", proto: "http", port: "" }; };

  function htMessages() {
    const u = reqInfo(), code = Number($("#ht-status").value), s = STATUS[code];
    const ip = "203.0.113.80";
    return [
      { dir: "c", label: `DNS lookup: ${u.host}`, note: "extra step", title: "Look up the machine’s address", raw: `Question: what is the IP address of ${u.host}?\nAnswer:   ${ip}`, browser: "Finding the server…", note2: "Not on the lecture slide: the browser first converts the name to an IP address with DNS. Only then can it connect." },
      { dir: "r", label: `Connect ${u.host}`, title: "Connect <domain name>", raw: `TCP connection request to ${ip}:${u.port ? u.port.slice(1) : u.proto === "https" ? 443 : 80}`, browser: "Connecting…" },
      { dir: "l", label: "Accept connection", title: "Accept connection", raw: "Connection accepted", browser: "Connected." },
      { dir: "r", label: `Get ${u.path}`, title: "Get <filename>", raw: `GET ${u.path} HTTP/1.1\nHost: ${u.host}\nAccept: text/html`, browser: "Waiting for the page…" },
      { dir: "l", label: `Data (${code})`, title: `Data: ${code} ${s.t}`, raw: `HTTP/1.1 ${code} ${s.t}\n${s.hdr.join("\n")}${s.body ? "\n\n" + s.body : ""}`, browser: null, status: code },
      { dir: "r", label: "Disconnect", title: "Disconnect", raw: "Client closes the connection", browser: null },
      { dir: "l", label: "Disconnect", title: "Disconnect", raw: "Server closes the connection", browser: null },
    ];
  }
  function htRender() {
    const msgs = htMessages(), svg = $("#ht-svg");
    svg.innerHTML = "";
    const xc = 90, xs = 470;
    [[xc, "Client", "(Browser)"], [xs, "Server", "(Web Server)"]].forEach(([x, a, b]) => {
      svg.append(el("rect", { x: x - 55, y: 8, width: 110, height: 44, rx: 10, class: "ll-box" }));
      svg.append(el("text", { x, y: 27, "text-anchor": "middle", class: "ll-t" }, a)); svg.append(el("text", { x, y: 43, "text-anchor": "middle", class: "ll-s" }, b));
      svg.append(el("line", { x1: x, y1: 52, x2: x, y2: 322, class: "life" }));
    });
    msgs.forEach((m, i) => {
      const y = 82 + i * 38, shown = i < htStep, cur = i === htStep - 1;
      const g = el("g", { class: "hmsg" + (shown ? " shown" : "") + (cur ? " cur" : "") + (m.note ? " extra" : "") });
      if (i === 0) {
        g.append(el("rect", { x: xc - 6, y: y - 14, width: 250, height: 24, rx: 12, class: "note-bg" }));
        g.append(el("text", { x: xc + 12, y: y + 2, class: "ml" }, m.label));
      } else {
        const x1 = m.dir === "r" ? xc : xs, x2 = m.dir === "r" ? xs : xc;
        g.append(el("line", { x1, y1: y, x2: x2 + (m.dir === "r" ? -8 : 8), y2: y, class: "arrow" }));
        g.append(el("polygon", { points: m.dir === "r" ? `${xs},${y} ${xs - 9},${y - 5} ${xs - 9},${y + 5}` : `${xc},${y} ${xc + 9},${y - 5} ${xc + 9},${y + 5}`, class: "ah" }));
        g.append(el("text", { x: (xc + xs) / 2, y: y - 6, "text-anchor": "middle", class: "ml" }, m.label));
      }
      svg.append(g);
    });
    const cur = msgs[Math.max(0, htStep - 1)];
    $("#ht-title").textContent = htStep === 0 ? "Ready" : cur.title;
    $("#ht-raw").textContent = htStep === 0 ? "Press “Next message” to follow a web request." : cur.raw + (cur.note2 ? "\n\n# " + cur.note2 : "");
    // browser view: last known
    let b = "Press <b>Next message</b>.";
    if (htStep > 0) {
      const dataIdx = 4, st = STATUS[Number($("#ht-status").value)];
      if (htStep > dataIdx) b = `<div class="bv ${st.cls}"><span class="code">${$("#ht-status").value}</span><b>${st.t}</b><p>${esc(st.page)}</p></div>`;
      else b = `<div class="bv wait">${esc(cur.browser || "")}</div>`;
    }
    $("#ht-browser").innerHTML = b;
    $("#ht-step").disabled = htBusy || htStep >= msgs.length;
    $("#ht-run").disabled = htBusy || htStep >= msgs.length;
  }
  function initHttp() {
    $("#ht-status").innerHTML = Object.entries(STATUS).map(([c, s]) => `<option value="${c}">${c} ${s.t}</option>`).join("");
    $("#ht-status").value = "200";
    $("#url-in").addEventListener("input", () => { htStep = 0; renderUrl(); });
    $("#ht-status").addEventListener("change", htRender);
    $("#ht-step").addEventListener("click", () => { htStep++; htRender(); });
    $("#ht-reset").addEventListener("click", () => { htStep = 0; htBusy = false; htRender(); });
    $("#ht-run").addEventListener("click", async () => {
      if (htBusy) return; htBusy = true; if (htStep >= 7) htStep = 0;
      while (htStep < 7) { htStep++; htRender(); await sleep(dur(1100)); }
      htBusy = false; htRender();
    });
    renderUrl(); htRender();
  }

  /* ------------------------- portal ------------------------- */
  const PN = { B: [70, 150, "Browser", "client"], P: [300, 150, "Portal", "web server"], C: [540, 50, "Client", "database"], Pay: [540, 150, "Payment", "system"], S: [540, 250, "Stock", "database"] };
  let poStep = 0, poBusy = false;
  function poSteps() {
    const oos = $("#po-stock").checked, dec = $("#po-pay").checked;
    const L = [];
    L.push({ from: "B", to: "P", label: "POST /checkout", t: "The browser sends an HTTP request", n: "The customer presses <b>Buy</b>. The browser sends an ordinary HTTP request to the web server: <code>POST /checkout</code> with item 42. There is no file called “checkout”; the request is a <i>question for the portal</i>." });
    L.push({ from: "P", to: "C", label: "who is this?", t: "Portal asks the Client database", n: "The portal looks up the customer in the <b>client database</b>: name, delivery address and saved details. The browser knows nothing about this." });
    L.push({ from: "P", to: "S", label: oos ? "item 42 in stock?" : "item 42 in stock?", t: "Portal asks the Stock database", n: oos ? "The <b>stock database</b> answers: <b>0 left</b>. The portal stops here: no payment will be taken." : "The <b>stock database</b> answers: 12 left. Good." });
    if (!oos) {
      L.push({ from: "P", to: "Pay", label: "charge 49.00", t: "Portal sends the payment", n: dec ? "The <b>payment system</b> says the card was <b>declined</b>. The portal stops: nothing is reserved." : "The <b>payment system</b> approves the card. The portal still has not told the customer anything." });
      if (!dec) L.push({ from: "P", to: "S", label: "reserve · record order", t: "Portal updates the databases", n: "Payment succeeded, so the portal updates the <b>stock database</b> (reserve one item) and the <b>client database</b> (add the order to the customer’s history)." });
    }
    L.push({ from: "P", to: "B", label: "HTML page", t: "Portal builds the page and replies", n: "The portal <b>generates a web page dynamically</b> from what it learned. No two customers get the same page. It travels back as an ordinary HTTP response.", final: true });
    return L;
  }
  function poRender() {
    const steps = poSteps(), svg = $("#po-svg");
    svg.innerHTML = "";
    const cur = steps[poStep - 1];
    steps.forEach((s, i) => {
      const A = PN[s.from], B = PN[s.to], shown = i < poStep;
      const g = el("g", { class: "pmsg" + (shown ? " shown" : "") + (i === poStep - 1 ? " cur" : "") });
      g.append(el("line", { x1: A[0] + (B[0] > A[0] ? 42 : -42), y1: A[1] + (i % 2 ? 6 : -6), x2: B[0] + (B[0] > A[0] ? -42 : 42), y2: B[1] + (i % 2 ? 6 : -6), class: "arrow" }));
      g.append(el("text", { x: (A[0] + B[0]) / 2, y: (A[1] + B[1]) / 2 + (A[1] === B[1] ? (i % 2 ? 22 : -10) : -4), "text-anchor": "middle", class: "ml" }, s.label));
      svg.append(g);
    });
    Object.entries(PN).forEach(([id, [x, y, a, b]]) => {
      const act = cur && (cur.from === id || cur.to === id);
      const g = el("g", { class: "pnode" + (act ? " act" : "") + (id === "P" ? " portal" : "") });
      g.append(el("rect", { x: x - 42, y: y - 28, width: 84, height: 56, rx: 12 }));
      g.append(el("text", { x, y: y - 2, "text-anchor": "middle", class: "pt" }, a)); g.append(el("text", { x, y: y + 15, "text-anchor": "middle", class: "ps" }, b));
      svg.append(g);
    });
    $("#po-title").textContent = poStep === 0 ? "Ready" : cur.t;
    $("#po-narr").innerHTML = poStep === 0 ? "Press <b>Next step</b> to follow a purchase. The server is a <b>portal</b>: it controls the client database, payment and stock database, and builds pages on the fly." : cur.n;
    let page = '<div class="bv wait">No page yet.</div>';
    if (cur && cur.final) {
      const oos = $("#po-stock").checked, dec = $("#po-pay").checked;
      page = oos ? '<div class="bv bad"><span class="code">✖</span><b>Sorry, item 42 is out of stock</b><p>You have not been charged.</p></div>'
        : dec ? '<div class="bv bad"><span class="code">✖</span><b>Payment declined</b><p>Please try another card. Nothing has been reserved.</p></div>'
        : '<div class="bv ok"><span class="code">✔</span><b>Thank you! Order #1042 confirmed</b><p>Delivery to the address on your account. Generated just now, only for you.</p></div>';
    }
    $("#po-browser").innerHTML = page;
    $("#po-step").disabled = poBusy || poStep >= steps.length; $("#po-run").disabled = poBusy || poStep >= steps.length;
  }
  function initPortal() {
    $("#po-step").addEventListener("click", () => { poStep++; poRender(); });
    $("#po-reset").addEventListener("click", () => { poStep = 0; poBusy = false; poRender(); });
    ["po-stock", "po-pay"].forEach((id) => $("#" + id).addEventListener("change", () => { poStep = 0; poRender(); }));
    $("#po-run").addEventListener("click", async () => {
      if (poBusy) return; poBusy = true; const n = poSteps().length; if (poStep >= n) poStep = 0;
      while (poStep < n) { poStep++; poRender(); await sleep(dur(1200)); }
      poBusy = false; poRender();
    });
    poRender();
  }

  initStack(); initSim(); initAddr(); initHttp(); initPortal();
  window.__proto = { get sim() { return sim; }, startSim, simTick, SL, buildPacket, inetChecksum, toggleLink, resetSim, parseIp6, compress6 };
})();
