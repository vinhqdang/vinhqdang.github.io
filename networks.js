/* Networks and the Internet: graph playground, scales of networks, tracert/TTL, Internet growth. */
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
  const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const dur = (ms) => (reduce ? 0 : ms);

  /* ======================================================= 1. GRAPH */
  const ring = (n, cx, cy, rx, ry, prefix = "N", start = 1, a0 = -Math.PI / 2) =>
    Array.from({ length: n }, (_, i) => [prefix + (start + i), Math.round(cx + rx * Math.cos(a0 + (2 * Math.PI * i) / n)), Math.round(cy + ry * Math.sin(a0 + (2 * Math.PI * i) / n))]);
  const GP = {
    lecture: { label: "Lecture example: N1–N4, arcs a1–a5",
      hint: "The network from the lecture. Try the route question: starting at N3, can we get to N2? Switch the click mode to break links and see how the answer changes.",
      nodes: [["N1", 150, 80], ["N2", 490, 80], ["N3", 150, 280], ["N4", 490, 280]],
      links: [["N1", "N2"], ["N1", "N3"], ["N2", "N3"], ["N2", "N4"], ["N3", "N4"]], q: ["N3", "N2"] },
    star: { label: "Star (everything through one hub)",
      hint: "A star: every node connects only to N1. Simple, but what happens when the hub fails?",
      nodes: [["N1", 320, 180], ...ring(5, 320, 180, 230, 130, "N", 2)],
      links: [["N1", "N2"], ["N1", "N3"], ["N1", "N4"], ["N1", "N5"], ["N1", "N6"]], q: ["N2", "N5"] },
    ring: { label: "Ring",
      hint: "A ring has two routes between any pair of nodes. Break one link, then a second: when does the ring split?",
      nodes: ring(6, 320, 180, 230, 130), links: [["N1", "N2"], ["N2", "N3"], ["N3", "N4"], ["N4", "N5"], ["N5", "N6"], ["N6", "N1"]], q: ["N1", "N4"] },
    mesh: { label: "Full mesh (every node linked to every other)",
      hint: "A full mesh is the most robust and the most expensive: n nodes need n(n−1)/2 links. Break links and watch the number of routes drop.",
      nodes: ring(5, 320, 180, 200, 135),
      links: [["N1", "N2"], ["N1", "N3"], ["N1", "N4"], ["N1", "N5"], ["N2", "N3"], ["N2", "N4"], ["N2", "N5"], ["N3", "N4"], ["N3", "N5"], ["N4", "N5"]], q: ["N1", "N4"] },
    chain: { label: "Chain",
      hint: "A chain has no redundancy at all: every middle node and every link is a single point of failure. Add links to make it robust.",
      nodes: [["N1", 80, 180], ["N2", 200, 120], ["N3", 320, 240], ["N4", 440, 120], ["N5", 560, 180]],
      links: [["N1", "N2"], ["N2", "N3"], ["N3", "N4"], ["N4", "N5"]], q: ["N1", "N5"] },
  };

  const G = { nodes: [], links: [] };
  let gMode = "move", gPending = null, gDrag = null, gPath = null, gPreset = "lecture";
  const gsvg = $("#g-svg");
  const nodeById = (id) => G.nodes.find((n) => n.id === id);

  function loadGraph(key) {
    gPreset = key;
    const p = GP[key];
    G.nodes = p.nodes.map(([id, x, y]) => ({ id, x, y, down: false }));
    G.links = p.links.map(([a, b], i) => ({ id: "a" + (i + 1), a, b, down: false }));
    gPending = null;
    fillSelects(p.q);
    $("#g-crit-note").textContent = "";
    renderGraph();
  }

  function fillSelects(q) {
    const opts = G.nodes.map((n) => `<option value="${n.id}">${n.id}</option>`).join("");
    const f = $("#g-from"), t = $("#g-to");
    const pf = f.value, pt = t.value;
    f.innerHTML = opts; t.innerHTML = opts;
    if (q) { f.value = q[0]; t.value = q[1]; }
    else { if (nodeById(pf)) f.value = pf; if (nodeById(pt)) t.value = pt; else if (G.nodes.length > 1) t.value = G.nodes[1].id; }
  }

  const upAdj = (skipNode, skipLink) => {
    const adj = new Map();
    G.nodes.filter((n) => !n.down && n.id !== skipNode).forEach((n) => adj.set(n.id, []));
    G.links.filter((l) => !l.down && l.id !== skipLink && adj.has(l.a) && adj.has(l.b)).forEach((l) => {
      adj.get(l.a).push({ to: l.b, link: l.id }); adj.get(l.b).push({ to: l.a, link: l.id });
    });
    return adj;
  };
  function components(skipNode, skipLink) {
    const adj = upAdj(skipNode, skipLink), seen = new Set(); let c = 0;
    for (const id of adj.keys()) {
      if (seen.has(id)) continue;
      c++; const st = [id]; seen.add(id);
      while (st.length) for (const { to } of adj.get(st.pop())) if (!seen.has(to)) { seen.add(to); st.push(to); }
    }
    return c;
  }
  function shortest(from, to) {
    const adj = upAdj(); if (!adj.has(from) || !adj.has(to)) return null;
    const prev = new Map([[from, null]]), q = [from];
    while (q.length) {
      const u = q.shift(); if (u === to) break;
      for (const { to: v, link } of adj.get(u)) if (!prev.has(v)) { prev.set(v, { u, link }); q.push(v); }
    }
    if (!prev.has(to)) return null;
    const nodes = [to], links = [];
    for (let c = to; prev.get(c); c = prev.get(c).u) { nodes.unshift(prev.get(c).u); links.unshift(prev.get(c).link); }
    return { nodes, links };
  }
  function countRoutes(from, to, limit = 500) {
    const adj = upAdj(); if (!adj.has(from) || !adj.has(to)) return 0;
    let n = 0; const seen = new Set([from]);
    (function dfs(u) { if (n >= limit) return; if (u === to) { n++; return; }
      for (const { to: v } of adj.get(u)) if (!seen.has(v)) { seen.add(v); dfs(v); seen.delete(v); } })(from);
    return n;
  }

  function criticalSets() {
    const c0 = components(), nodes = new Set(), links = new Set();
    const deg = (id) => G.links.filter((l) => !l.down && (l.a === id || l.b === id)).length;
    G.nodes.filter((n) => !n.down).forEach((n) => { if (components(n.id) > c0 - (deg(n.id) === 0 ? 1 : 0)) nodes.add(n.id); });
    G.links.filter((l) => !l.down).forEach((l) => { if (components(null, l.id) > c0) links.add(l.id); });
    return { nodes, links, c0 };
  }

  function renderGraph() {
    const crit = $("#g-crit").checked ? criticalSets() : null;
    const onPath = gPath ? { n: new Set(gPath.nodes), l: new Set(gPath.links) } : { n: new Set(), l: new Set() };
    gsvg.innerHTML = "";
    G.links.forEach((l) => {
      const A = nodeById(l.a), B = nodeById(l.b);
      const g = el("g", { class: "glink" + (l.down ? " down" : "") + (onPath.l.has(l.id) ? " onpath" : "") + (crit && crit.links.has(l.id) ? " crit" : "") });
      g.append(el("line", { x1: A.x, y1: A.y, x2: B.x, y2: B.y, class: "vis" }));
      g.append(el("line", { x1: A.x, y1: A.y, x2: B.x, y2: B.y, class: "hit", "data-kind": "link", "data-id": l.id }));
      const mx = (A.x + B.x) / 2, my = (A.y + B.y) / 2;
      g.append(el("rect", { x: mx - 14, y: my - 9, width: 28, height: 18, rx: 6, class: "lbg" }));
      g.append(el("text", { x: mx, y: my + 4, "text-anchor": "middle", class: "llabel" }, l.id));
      if (l.down) g.append(el("text", { x: mx, y: my - 14, "text-anchor": "middle", class: "x" }, "✗"));
      gsvg.append(g);
    });
    G.nodes.forEach((n) => {
      const g = el("g", { class: "gnode" + (n.down ? " down" : "") + (onPath.n.has(n.id) ? " onpath" : "") + (gPending === n.id ? " pending" : ""), "data-kind": "node", "data-id": n.id });
      if (crit && crit.nodes.has(n.id)) g.append(el("circle", { cx: n.x, cy: n.y, r: 32, class: "critring" }));
      g.append(el("circle", { cx: n.x, cy: n.y, r: 24 }));
      g.append(el("text", { x: n.x, y: n.y + 5, "text-anchor": "middle" }, n.id));
      if (n.down) g.append(el("text", { x: n.x + 22, y: n.y - 20, class: "x" }, "✗"));
      gsvg.append(g);
    });
    if (crit) {
      const n = crit.nodes.size, l = crit.links.size;
      $("#g-crit-note").textContent = n + l === 0
        ? "No single node or link can split this network: it has redundancy."
        : `Dashed orange = if it fails, the network splits. ${n} node${n === 1 ? "" : "s"} and ${l} link${l === 1 ? "" : "s"} are critical.`;
    } else $("#g-crit-note").textContent = "";
    renderRoute(); renderMath();
  }

  function renderRoute() {
    const from = $("#g-from").value, to = $("#g-to").value, out = $("#g-route");
    gPath = null;
    if (!from || !to) { out.textContent = ""; return; }
    if (from === to) { out.className = "verdictline"; out.textContent = "Pick two different nodes."; return; }
    const p = shortest(from, to);
    if (p) {
      gPath = p;
      const n = countRoutes(from, to);
      out.className = "verdictline yes";
      out.innerHTML = `<b>Yes.</b> ${p.nodes.join(" → ")} (${p.links.length} hop${p.links.length === 1 ? "" : "s"}). ${n} different route${n === 1 ? "" : "s"} without repeating a node${n === 1 ? ": no redundancy" : ""}.`;
    } else {
      const nf = nodeById(from), nt = nodeById(to);
      out.className = "verdictline no";
      out.innerHTML = nf.down || nt.down ? `<b>No.</b> ${nf.down ? from : to} has failed.` : `<b>No.</b> There is no path: the network is split into ${components()} separate parts.`;
    }
    // re-draw highlight only (cheap)
    $$("#g-svg .glink").forEach((g, i) => g.classList.toggle("onpath", !!gPath && gPath.links.includes(G.links[i].id)));
    $$("#g-svg .gnode").forEach((g) => g.classList.toggle("onpath", !!gPath && gPath.nodes.includes(g.dataset.id)));
  }

  function renderMath() {
    const N = G.nodes.map((n) => (n.down ? `<s>${n.id}</s>` : n.id)).join(", ");
    const A = G.links.map((l) => (l.down ? `<s>${l.id}</s>` : l.id)).join(", ");
    const lines = G.links.map((l) => `${l.id} = &lt;${l.a},${l.b}&gt;`).map((s, i) => (G.links[i].down ? `<s>${s}</s>` : s)).join("\n");
    $("#g-math").innerHTML = `N = { ${N} }\nA = { ${A} }\n\n${lines}${G.links.length ? "" : "(no arcs)"}`;
  }

  function svgPoint(e) {
    const pt = gsvg.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY;
    return pt.matrixTransform(gsvg.getScreenCTM().inverse());
  }
  function nextLinkId() { return "a" + (G.links.reduce((m, l) => Math.max(m, Number(l.id.slice(1))), 0) + 1); }
  function nextNodeId() { return "N" + (G.nodes.reduce((m, n) => Math.max(m, Number(n.id.slice(1))), 0) + 1); }

  const GHINT = {
    move: "Drag nodes to rearrange them. The network is the same graph however you draw it.",
    link: "Click one node, then another, to add a link. Click an existing link to remove it.",
    fail: "Click a node or a link to make it fail (✗), and click it again to repair it.",
  };

  function initGraph() {
    $("#g-preset").innerHTML = Object.entries(GP).map(([k, p]) => `<option value="${k}">${esc(p.label)}</option>`).join("");
    $("#g-preset").addEventListener("change", (e) => { loadGraph(e.target.value); $("#g-hint").textContent = GP[gPreset].hint + " " + GHINT[gMode]; });
    $("#g-reset").addEventListener("click", () => loadGraph(gPreset));
    $("#g-addnode").addEventListener("click", () => {
      if (G.nodes.length >= 12) return;
      const id = nextNodeId();
      G.nodes.push({ id, x: 60 + Math.round(Math.random() * 520), y: 40 + Math.round(Math.random() * 280), down: false });
      fillSelects(); renderGraph();
    });
    $$('input[name="g-mode"]').forEach((r) => r.addEventListener("change", () => {
      if (r.checked) { gMode = r.value; gPending = null; $("#g-hint").textContent = GP[gPreset].hint + " " + GHINT[gMode]; renderGraph(); }
    }));
    $("#g-from").addEventListener("change", renderGraph);
    $("#g-to").addEventListener("change", renderGraph);
    $("#g-crit").addEventListener("change", renderGraph);

    gsvg.addEventListener("pointerdown", (e) => {
      const t = e.target.closest("[data-kind]"); if (!t) return;
      const id = t.dataset.id;
      if (t.dataset.kind === "node") {
        const n = nodeById(id);
        if (gMode === "move") { const p = svgPoint(e); gDrag = { id, dx: n.x - p.x, dy: n.y - p.y }; gsvg.setPointerCapture(e.pointerId); }
        else if (gMode === "link") {
          if (!gPending) gPending = id;
          else if (gPending === id) gPending = null;
          else {
            const dup = G.links.some((l) => (l.a === gPending && l.b === id) || (l.a === id && l.b === gPending));
            if (!dup) G.links.push({ id: nextLinkId(), a: gPending, b: id, down: false });
            gPending = null;
          }
        } else { n.down = !n.down; }
      } else {
        if (gMode === "fail") { const l = G.links.find((x) => x.id === id); l.down = !l.down; }
        else if (gMode === "link") G.links = G.links.filter((x) => x.id !== id);
      }
      renderGraph();
    });
    gsvg.addEventListener("pointermove", (e) => {
      if (!gDrag) return;
      const p = svgPoint(e), n = nodeById(gDrag.id);
      n.x = Math.max(30, Math.min(610, Math.round(p.x + gDrag.dx))); n.y = Math.max(30, Math.min(330, Math.round(p.y + gDrag.dy)));
      renderGraph();
    });
    const end = () => { gDrag = null; };
    gsvg.addEventListener("pointerup", end); gsvg.addEventListener("pointercancel", end);
    loadGraph("lecture");
    $("#g-hint").textContent = GP.lecture.hint + " " + GHINT.move;
  }

  /* ===================================================== 2. SCALES */
  const SCALE_NAMES = ["LAN", "MAN", "WAN", "Internet"];
  const CAPTIONS = [
    { t: "Local Area Network (LAN)", d: "Connected nodes, typically in the same building: your home, a coffee shop sharing Wi-Fi, the university.",
      list: ["<b>Client/server:</b> the server does all the managing: application and device access, and network traffic.", "<b>Peer-to-peer:</b> each device acts as both client and server."], reach: "one building", made: "devices" },
    { t: "Metropolitan Area Network (MAN)", d: "A connected set of nodes that usually spans several buildings in the same city, or a collection of cities.",
      list: ["Example from the lecture: <b>EaSTMAN</b>, the Edinburgh and Stirling MAN, connects several universities and colleges.", "Each campus is itself a LAN."], reach: "a city (10–100 km)", made: "many LANs" },
    { t: "Wide Area Network (WAN)", d: "A connected set of nodes that usually spans a country or countries, or even continents.",
      list: ["Lots of LANs form MANs; lots of MANs form WANs.", "EaSTMAN is part of <b>JANET</b>, the UK academic network. Reaching a site like Google goes via the national gateway (London in the lecture), then out to the Internet."], reach: "a country or continent", made: "many MANs" },
    { t: "The Internet", d: "A collection of networks: a WAN of WANs, with no single owner or centre. It began as ARPANET in the late 1960s.",
      list: ["Your university or ISP network joins others at exchange points, so a message can cross many networks.", "The Internet is <b>not</b> just “the web”: the WWW is one service that runs on it."], reach: "the world", made: "many WANs" },
  ];

  const sSvg = $("#s-svg");
  let sScale = 0, sBusy = false;

  const lanScene = (mode) => {
    const icons = [["💻", "Laptop"], ["📱", "Phone"], ["🖨️", "Printer"], ["🖥️", "Server"], ["📺", "Smart TV"], ["🌡️", "Sensor"]];
    const cx = 350, cy = 170;
    const nodes = icons.map(([ic, label], i) => {
      const a = -Math.PI / 2 + (2 * Math.PI * i) / 6;
      return { id: label, x: Math.round(cx + 210 * Math.cos(a)), y: Math.round(cy + 125 * Math.sin(a)), icon: ic, label, r: 30, server: mode === "cs" && label === "Server" };
    });
    const links = [];
    let path;
    if (mode === "cs") {
      nodes.push({ id: "Router", x: cx, y: cy, icon: "📡", label: "Wi-Fi router / switch", r: 30, hub: true });
      nodes.slice(0, 6).forEach((n) => links.push([n.id, "Router"]));
      path = ["Laptop", "Router", "Server"];
    } else {
      for (let i = 0; i < 6; i++) links.push([nodes[i].id, nodes[(i + 1) % 6].id]);
      [[0, 3], [1, 4], [2, 5]].forEach(([a, b]) => links.push([nodes[a].id, nodes[b].id]));
      path = ["Laptop", "Printer"];
    }
    return { nodes, links, path, note: mode === "cs" ? "Everything goes through the router; the server holds the shared services." : "Devices talk to each other directly; no machine is in charge." };
  };
  const SCENES = [
    lanScene,
    () => ({
      nodes: [
        { id: "H", x: 350, y: 170, icon: "◎", label: "MAN fibre ring", r: 26, hub: true },
        { id: "U1", x: 140, y: 80, label: "University A", sub: "a LAN", r: 52, cloud: true },
        { id: "U2", x: 560, y: 80, label: "University B", sub: "a LAN", r: 52, cloud: true },
        { id: "C", x: 140, y: 260, label: "College", sub: "a LAN", r: 52, cloud: true },
        { id: "R", x: 560, y: 260, label: "Research institute", sub: "a LAN", r: 52, cloud: true },
      ],
      links: [["U1", "H"], ["U2", "H"], ["C", "H"], ["R", "H"]], path: ["U1", "H", "R"], note: "Several campuses, each its own LAN, joined across a city.",
    }),
    () => ({
      nodes: [
        { id: "A", x: 110, y: 90, label: "City A", sub: "a MAN", r: 52, cloud: true },
        { id: "B", x: 350, y: 60, label: "City B", sub: "a MAN", r: 52, cloud: true },
        { id: "C", x: 590, y: 110, label: "City C", sub: "a MAN", r: 52, cloud: true },
        { id: "G", x: 350, y: 250, label: "National gateway", sub: "to the Internet", r: 52, cloud: true, hub: true },
      ],
      links: [["A", "B", "300 km"], ["B", "C", "450 km"], ["A", "G", "600 km"], ["B", "G", "500 km"], ["C", "G", "700 km"]], path: ["A", "G"], note: "Long-distance links join the cities into one national network.",
    }),
    () => ({
      nodes: [
        { id: "W1", x: 100, y: 170, label: "Your university’s WAN", sub: "academic network", r: 56, cloud: true },
        { id: "X1", x: 230, y: 90, label: "IX", icon: "", r: 16, ix: true },
        { id: "I1", x: 340, y: 60, label: "ISP 1", sub: "a WAN", r: 46, cloud: true },
        { id: "I2", x: 340, y: 280, label: "ISP 2", sub: "a WAN", r: 46, cloud: true },
        { id: "X2", x: 450, y: 170, label: "IX", icon: "", r: 16, ix: true },
        { id: "O", x: 600, y: 80, label: "Another country’s WAN", sub: "", r: 52, cloud: true },
        { id: "S", x: 600, y: 270, label: "Cloud provider", sub: "web servers", r: 52, cloud: true },
      ],
      links: [["W1", "X1"], ["X1", "I1"], ["W1", "I2"], ["I1", "X2"], ["I2", "X2"], ["X2", "O"], ["X2", "S"], ["I2", "S"]], path: ["W1", "X1", "I1", "X2", "S"],
      note: "Networks of networks meet at exchange points (IX).",
    }),
  ];

  function drawScale() {
    const sc = SCENES[sScale]($('input[name="s-lan"]:checked').value);
    sSvg.innerHTML = "";
    const pos = Object.fromEntries(sc.nodes.map((n) => [n.id, n]));
    sc.links.forEach(([a, b, label]) => {
      const A = pos[a], B = pos[b];
      sSvg.append(el("line", { x1: A.x, y1: A.y, x2: B.x, y2: B.y, class: "slink" }));
      if (label) sSvg.append(el("text", { x: (A.x + B.x) / 2, y: (A.y + B.y) / 2 - 5, "text-anchor": "middle", class: "slabel" }, label));
    });
    sc.nodes.forEach((n) => {
      const g = el("g", { class: "snode" + (n.cloud ? " cloud" : "") + (n.server ? " server" : "") + (n.ix ? " ix" : "") });
      if (n.ix) { g.append(el("rect", { x: n.x - 16, y: n.y - 16, width: 32, height: 32, rx: 6 })); g.append(el("text", { x: n.x, y: n.y + 4, "text-anchor": "middle", class: "ixt" }, "IX")); }
      else {
        g.append(el("circle", { cx: n.x, cy: n.y, r: n.r }));
        if (n.icon) g.append(el("text", { x: n.x, y: n.y + 8, "text-anchor": "middle", class: "emo" }, n.icon));
        else if (n.cloud) {
          const w = n.label.split(" "), mid = Math.ceil(w.length / 2);
          const lines = n.label.length > 13 ? [w.slice(0, mid).join(" "), w.slice(mid).join(" ")] : [n.label];
          const y0 = n.y - (n.sub ? 4 : -2) - (lines.length - 1) * 8;
          lines.forEach((t, k) => g.append(el("text", { x: n.x, y: y0 + k * 15, "text-anchor": "middle", class: "cl-t" }, t)));
          if (n.sub) g.append(el("text", { x: n.x, y: y0 + lines.length * 15 + 2, "text-anchor": "middle", class: "cl-s" }, n.sub.length > 22 ? n.sub.slice(0, n.sub.lastIndexOf(" ", 22)) : n.sub));
        }
        if (!n.cloud) g.append(el("text", { x: n.x, y: n.y + n.r + 16, "text-anchor": "middle", class: "dev-l" }, n.label));
        if (n.server) g.append(el("text", { x: n.x, y: n.y - n.r - 6, "text-anchor": "middle", class: "badge-t" }, "SERVER"));
      }
      sSvg.append(g);
    });
    sSvg.append(el("circle", { r: 7, class: "sdot", cx: -20, cy: -20, id: "s-dot" }));
    const c = CAPTIONS[sScale];
    $("#s-card").innerHTML = `<h3 class="card-title">${c.t}</h3><p class="cap-d">${c.d}</p><ul class="cap-l">${c.list.map((x) => `<li>${x}</li>`).join("")}</ul>
      <p class="cap-m"><b>Typical reach:</b> ${c.reach}<br><b>Made of:</b> ${c.made}</p><p class="muted small-text">${esc(sc.note)}</p>`;
    $("#s-lanmode").style.visibility = sScale === 0 ? "visible" : "hidden";
    $("#s-range").setAttribute("aria-valuetext", SCALE_NAMES[sScale]);
    $$("#s-labels span").forEach((s, i) => s.classList.toggle("on", i === sScale));
    return sc;
  }

  async function sendScale() {
    if (sBusy) return; sBusy = true;
    const sc = drawScale(), pos = Object.fromEntries(sc.nodes.map((n) => [n.id, n]));
    const dot = $("#s-dot");
    const pts = sc.path.map((id) => pos[id]);
    dot.setAttribute("cx", pts[0].x); dot.setAttribute("cy", pts[0].y);
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1], b = pts[i], d = dur(650), t0 = performance.now();
      if (!d) { dot.setAttribute("cx", b.x); dot.setAttribute("cy", b.y); continue; }
      await new Promise((res) => {
        const f = (now) => { const k = Math.min(1, (now - t0) / d); dot.setAttribute("cx", a.x + (b.x - a.x) * k); dot.setAttribute("cy", a.y + (b.y - a.y) * k); k < 1 ? requestAnimationFrame(f) : res(); };
        requestAnimationFrame(f);
      });
    }
    await sleep(dur(500));
    dot.setAttribute("cx", -20); dot.setAttribute("cy", -20);
    sBusy = false;
  }

  function initScales() {
    $("#s-labels").innerHTML = SCALE_NAMES.map((n) => `<span>${n}</span>`).join("");
    $("#s-range").addEventListener("input", (e) => { sScale = Number(e.target.value); drawScale(); });
    $$('input[name="s-lan"]').forEach((r) => r.addEventListener("change", drawScale));
    $("#s-send").addEventListener("click", sendScale);
    drawScale();
  }

  /* ================================================== 3. TRACEROUTE */
  const TRACES = {
    near: { name: "web.example.net", hops: [
      { n: "Your laptop", ip: "192.168.1.20", rtt: 0 }, { n: "Home router", ip: "192.168.1.1", rtt: 1 },
      { n: "ISP edge router", ip: "203.0.113.1", rtt: 6 }, { n: "City network (MAN)", ip: "203.0.113.33", rtt: 8 },
      { n: "Web server", ip: "198.51.100.25", rtt: 9, dest: true }] },
    far: { name: "www.example.org", hops: [
      { n: "Your laptop", ip: "192.168.1.20", rtt: 0 }, { n: "Home router", ip: "192.168.1.1", rtt: 1 },
      { n: "ISP edge router", ip: "203.0.113.1", rtt: 7 }, { n: "City network (MAN)", ip: "203.0.113.33", rtt: 9 },
      { n: "National backbone (WAN)", ip: "198.51.100.5", rtt: 14 }, { n: "National gateway", ip: "198.51.100.77", rtt: 18 },
      { n: "Undersea-cable router", ip: "192.0.2.9", rtt: 0, timeout: true }, { n: "Overseas backbone", ip: "192.0.2.41", rtt: 148 },
      { n: "Overseas ISP", ip: "192.0.2.97", rtt: 152 }, { n: "Content network edge", ip: "203.0.113.201", rtt: 155 },
      { n: "Web server", ip: "198.51.100.80", rtt: 156, dest: true }] },
  };
  const tsvg = $("#t-svg");
  let tKey = "near", tTtl = 0, tBusy = false, tLines = [];

  const jitter = (rtt, hop, k) => Math.max(1, Math.round(rtt + [0, 1, -1][k] * (1 + (hop % 3)) * (rtt > 50 ? 2 : 0.6)));
  function drawTrace(probeAt = null, label = "", activeHop = -1) {
    const T = TRACES[tKey], n = T.hops.length, W = Math.max(760, n * 92 + 40), x0 = 60, x1 = W - 60;
    tsvg.setAttribute("viewBox", `0 0 ${W} 190`); tsvg.style.minWidth = W + "px";
    const xs = T.hops.map((_, i) => x0 + ((x1 - x0) * i) / (n - 1));
    tsvg.innerHTML = "";
    for (let i = 1; i < n; i++) tsvg.append(el("line", { x1: xs[i - 1], y1: 80, x2: xs[i], y2: 80, class: "tline" }));
    T.hops.forEach((h, i) => {
      const found = i <= tTtl && i > 0 && tLines.length >= i, g = el("g", { class: "tnode" + (found ? " found" : "") + (i === activeHop ? " active" : "") + (h.timeout && found ? " silent" : "") });
      g.append(el("circle", { cx: xs[i], cy: 80, r: 16 }));
      g.append(el("text", { x: xs[i], y: 85, "text-anchor": "middle", class: "hn" }, i === 0 ? "★" : String(i)));
      const words = h.n.split(" "), half = Math.ceil(words.length / 2);
      g.append(el("text", { x: xs[i], y: 118, "text-anchor": "middle", class: "hl" }, words.slice(0, half).join(" ")));
      g.append(el("text", { x: xs[i], y: 131, "text-anchor": "middle", class: "hl" }, words.slice(half).join(" ")));
      if (found) g.append(el("text", { x: xs[i], y: 148, "text-anchor": "middle", class: "hip" }, h.timeout ? "* * *" : h.ip));
      tsvg.append(g);
    });
    if (probeAt != null) {
      const g = el("g", { class: "probe" });
      g.append(el("rect", { x: probeAt - 22, y: 44, width: 44, height: 20, rx: 10 }));
      g.append(el("text", { x: probeAt, y: 58, "text-anchor": "middle" }, label));
      tsvg.append(g);
    }
    return xs;
  }

  function termText() {
    const T = TRACES[tKey];
    let s = `Tracing route to ${T.name}\nover a maximum of 30 hops:\n\n`;
    s += tLines.join("\n");
    if (tLines.length && T.hops[tLines.length].dest && tTtl >= tLines.length) s += "\n\nTrace complete.";
    return s;
  }

  async function traceStep() {
    const T = TRACES[tKey];
    if (tBusy || tTtl >= T.hops.length - 1) return;
    tBusy = true;
    tTtl++;
    const hop = T.hops[tTtl];
    let xs = drawTrace();
    const fwd = tTtl;
    for (let i = 1; i <= fwd; i++) {
      const ttl = fwd - (i - 1);
      xs = drawTrace(null);
      $("#t-narr").innerHTML = `Probe ${fwd} leaves with <b>TTL = ${fwd}</b>.` + (i > 1 ? ` Router ${i - 1} subtracts 1, leaving TTL = ${ttl}.` : "");
      const a = xs[i - 1], b = xs[i], d = dur(320), t0 = performance.now();
      await new Promise((res) => {
        const f = (now) => { const k = d ? Math.min(1, (now - t0) / d) : 1; drawTrace(a + (b - a) * k, "TTL " + Math.max(0, ttl), i === fwd ? -1 : -1); k < 1 ? requestAnimationFrame(f) : res(); };
        requestAnimationFrame(f);
      });
    }
    const rtts = [0, 1, 2].map((k) => jitter(hop.rtt, tTtl, k));
    if (hop.timeout) {
      tLines.push(String(tTtl).padStart(3) + "     *        *        *     Request timed out.");
      $("#t-narr").innerHTML = `TTL reaches 0 at hop ${tTtl}, but this router is configured not to answer (many firewalls drop these replies). tracert prints <code>*</code> and carries on: the trace is not broken, the node is just silent.`;
    } else if (hop.dest) {
      tLines.push(String(tTtl).padStart(3) + rtts.map((r) => String(r).padStart(5) + " ms").join(" ") + "  " + hop.ip);
      $("#t-narr").innerHTML = `The probe reaches <b>${esc(hop.n)}</b> with TTL still above 0, so the destination itself replies. The route is complete: <b>${tTtl} hops</b>.`;
    } else {
      tLines.push(String(tTtl).padStart(3) + rtts.map((r) => String(r).padStart(5) + " ms").join(" ") + "  " + hop.ip);
      $("#t-narr").innerHTML = `At <b>${esc(hop.n)}</b> the TTL reaches 0, so the router discards the packet and sends back “time exceeded”. Its reply reveals its address, <code>${hop.ip}</code>. Next, probe ${tTtl + 1} will go one hop further.`;
    }
    drawTrace(null, "", tTtl);
    $("#t-term").textContent = termText();
    tBusy = false;
    if (tTtl >= T.hops.length - 1) { $("#t-step").disabled = true; $("#t-run").disabled = true; }
  }
  function traceReset() {
    tTtl = 0; tLines = []; tBusy = false;
    drawTrace();
    $("#t-term").textContent = `Tracing route to ${TRACES[tKey].name}\nover a maximum of 30 hops:\n`;
    $("#t-narr").innerHTML = "Press <b>Send next probe</b>. The first probe has TTL = 1, so it dies at the first router and reveals it.";
    $("#t-step").disabled = false; $("#t-run").disabled = false;
  }
  function initTrace() {
    $("#t-dest").addEventListener("change", (e) => { tKey = e.target.value; traceReset(); });
    $("#t-step").addEventListener("click", traceStep);
    $("#t-reset").addEventListener("click", traceReset);
    $("#t-run").addEventListener("click", async () => {
      const T = TRACES[tKey];
      while (tTtl < T.hops.length - 1) { await traceStep(); await sleep(dur(250)); }
    });
    traceReset();
  }

  /* ============================================== 4. GROWTH & ACCESS */
  function initGrowth() {
    const svg = $("#grow-svg");
    const X0 = 100, X1 = 700, Y0 = 20, Y1 = 270, yr0 = 1975, yr1 = 2016, lo = 1.3, hi = 9.3;
    const X = (y) => X0 + ((y - yr0) / (yr1 - yr0)) * (X1 - X0);
    const Y = (v) => Y1 - ((Math.log10(v) - lo) / (hi - lo)) * (Y1 - Y0);
    const ticks = [[2, "100"], [3, "1,000"], [4, "10,000"], [5, "100,000"], [6, "1 million"], [7, "10 million"], [8, "100 million"], [9, "1 billion"]];
    ticks.forEach(([e, t]) => {
      svg.append(el("line", { x1: X0, x2: X1, y1: Y(10 ** e), y2: Y(10 ** e), class: "gridl" }));
      svg.append(el("text", { x: X0 - 8, y: Y(10 ** e) + 4, "text-anchor": "end", class: "axl" }, t));
    });
    [1980, 1990, 2000, 2010].forEach((y) => {
      svg.append(el("line", { x1: X(y), x2: X(y), y1: Y0, y2: Y1, class: "gridl v" }));
      svg.append(el("text", { x: X(y), y: Y1 + 18, "text-anchor": "middle", class: "axl" }, y));
    });
    const pts = [[1977, 111, "111"], [1984, 1000, "1,000"], [1992, 1e6, "1 million"], [2001, 162.5e6, "150–175 million"], [2014, 1e9, "1 billion"]];
    svg.append(el("polyline", { points: pts.map(([y, v]) => `${X(y)},${Y(v)}`).join(" "), class: "growline" }));
    svg.append(el("line", { x1: X(2001), x2: X(2001), y1: Y(175e6), y2: Y(150e6), class: "errbar" }));
    const place = [[10, 20, "start"], [10, 20, "start"], [10, 20, "start"], [-12, -10, "end"], [-12, -12, "end"]];
    pts.forEach(([y, v, l], i) => {
      const [dx, dy, anchor] = place[i];
      const g = el("g", { class: "gpt" });
      g.append(el("circle", { cx: X(y), cy: Y(v), r: 5 }));
      g.append(el("title", {}, `${y}: ${l} hosts`));
      g.append(el("text", { x: X(y) + dx, y: Y(v) + dy, "text-anchor": anchor, class: "pl" }, `${y}: ${l}`));
      svg.append(g);
    });
    svg.append(el("text", { x: 14, y: 150, class: "axt", transform: "rotate(-90 14 150)", "text-anchor": "middle" }, "hosts (log scale)"));

    const REG = [["Africa", 47.1, 1340598447, 631940772], ["Asia", 59.5, 4294516659, 2555636255], ["Europe", 87.2, 834995197, 727848547], ["Latin America / Caribbean", 71.5, 654287232, 467817332],
      ["Middle East", 70.8, 260991690, 184856813], ["North America", 90.3, 368869647, 332908868], ["Oceania / Australia", 67.7, 42690838, 28917600]];
    $("#pen-bars").innerHTML = REG.concat([["World", 63.2, 7796949710, 4929926187]]).map(([n, p, pop, users]) => `
      <div class="bar-row${n === "World" ? " world" : ""}"><span class="bn">${n}</span>
        <div class="bt"><div class="bf" style="width:${p}%"></div></div>
        <span class="bv">${p}%</span>
        <span class="bs">${(users / 1e6).toFixed(0)}M of ${(pop / 1e6).toFixed(0)}M people</span></div>`).join("");
  }

  initGraph(); initScales(); initTrace(); initGrowth();
})();
