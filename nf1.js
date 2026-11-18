/* Network Flow I: flow checker, algorithm lab, "you be the algorithm", cut explorer. */
(function () {
  "use strict";
  var FA = window.FlowAlgo, FV = window.FlowViz;
  function $(id) { return document.getElementById(id); }
  function preset(id) { return FA.PRESETS.filter(function (p) { return p.id === id; })[0]; }
  function fillSelect(sel, items) {
    sel.innerHTML = "";
    items.forEach(function (it) { var o = document.createElement("option"); o.value = it.id; o.textContent = it.name; sel.appendChild(o); });
  }
  function counters(el, items) {
    el.innerHTML = items.map(function (c) {
      return '<div class="cnt ' + (c[2] || "") + '">' + c[0] + "<b>" + c[1] + "</b></div>";
    }).join("");
  }
  function nodeList(net, A, want) { return FA.setList(net, A, want) || "∅"; }

  /* ================================================================ 1. flow checker */
  function initFlow() {
    var sel = $("fl-net"), net, f;
    var view = new FV.NetView($("fl-svg"), { mode: "flow", drag: true, onMove: draw, onEdgeClick: function (e, ev, right) {
      if (right || ev.shiftKey) f[e] = Math.max(0, f[e] - 1); else f[e] = Math.min(net.edges[e].c + 3, f[e] + 1);
      draw();
    } });
    fillSelect(sel, ["lecture", "warmup"].map(preset));
    function load() { net = preset(sel.value).make(); f = FA.zeros(net.edges.length); view.setNet(net); draw(); }
    function draw() {
      var n = net.nodes.length, inn = FA.zeros(n), out = FA.zeros(n), bad = [], over = [], badge = [];
      net.edges.forEach(function (e, i) { out[e.u] += f[i]; inn[e.v] += f[i]; if (f[i] > e.c) over.push(FA.nm(net, e.u) + "→" + FA.nm(net, e.v)); });
      net.nodes.forEach(function (nd, k) {
        if (k === net.s) badge[k] = { text: "out " + out[k] };
        else if (k === net.t) badge[k] = { text: "in " + inn[k] };
        else { var ok = inn[k] === out[k]; if (!ok) bad.push(nd.name); badge[k] = { text: inn[k] + (ok ? " = " : " ≠ ") + out[k], bad: !ok }; }
      });
      view.draw({ f: f, badge: badge });
      var v = FA.value(net, f), vd = $("fl-verdict");
      if (!over.length && !bad.length) {
        vd.className = "verdict ok";
        vd.innerHTML = "✓ A valid flow of value <b>" + v + "</b>." + (f.some(function (x) { return x > 0; }) ? "" : " (The zero flow is always valid.)");
      } else {
        vd.className = "verdict no";
        vd.innerHTML = "✗ Not a flow yet. " + (over.length ? "Over capacity: <b>" + over.join(", ") + "</b>. " : "") + (bad.length ? "Conservation fails at <b>" + bad.join(", ") + "</b>." : "");
      }
      counters($("fl-cnt"), [["Value of flow", v, !over.length && !bad.length ? "good" : "bad"]]);
    }
    sel.addEventListener("change", load);
    $("fl-reset").addEventListener("click", function () { f = FA.zeros(net.edges.length); draw(); });
    $("fl-max").addEventListener("click", function () {
      var m = FA.maxFlow(net); f = m.f.slice(); draw();
      $("fl-verdict").innerHTML += " This is a <b>maximum</b> flow: no valid flow in this network has a larger value.";
    });
    load();
  }

  /* ================================================================ 2. algorithm lab */
  var ALGOS = [
    { id: "ff-dfs", name: "Ford–Fulkerson, arbitrary path (DFS)", si: 0, run: function (n) { return FA.runFF(n, "dfs"); },
      info: "<h4>Ford–Fulkerson (slides 12–23)</h4><p>Start from the zero flow; while the residual network has an s→t path, push the bottleneck amount along it. Here the path is whatever a depth-first search finds first. It always ends with a maximum flow, but the number of augmentations can be as large as the flow value: <b>O(mnC)</b> in total.</p>" },
    { id: "ff-thin", name: "Ford–Fulkerson, worst-case path (adversary)", si: 1, run: function (n) { return FA.runFF(n, "thin"); },
      info: "<h4>Unlucky Ford–Fulkerson (slide 39)</h4><p>Same algorithm, but an adversary always picks the augmenting path with the <i>smallest</i> bottleneck. On the exponential trap this sends one unit at a time: <b>2C</b> augmentations for an input whose size only grows like log C. So Ford–Fulkerson with arbitrary paths is not polynomial in the input size.</p>" },
    { id: "ff-bfs", name: "Shortest augmenting path (BFS)", si: 2, run: function (n) { return FA.runFF(n, "bfs"); },
      info: "<h4>Shortest augmenting path, Edmonds–Karp (slides 49–57)</h4><p>Always augment along a path with the fewest edges, found by BFS. Distances from s never decrease, and every augmentation saturates a <i>critical</i> arc, so there are at most <b>mn</b> augmentations: <b>O(m²n)</b> overall, independent of the capacities.</p>" },
    { id: "ff-fat", name: "Fattest augmenting path", si: 3, run: function (n) { return FA.runFF(n, "fat"); },
      info: "<h4>Fattest path (slides 41–42)</h4><p>Augment along the path with the largest bottleneck. Each augmentation removes at least a 1/m fraction of the remaining gap to the maximum flow, giving <b>O(m log(mC))</b> augmentations.</p>" },
    { id: "scaling", name: "Capacity scaling", si: 4, run: function (n) { return FA.runScaling(n); },
      info: "<h4>Capacity scaling (slides 43–47)</h4><p>Keep a parameter Δ, a power of 2. Only look at residual arcs with capacity ≥ Δ (faded arcs are ignored), so every path pushes at least Δ. When no such path exists, halve Δ. At most 2m augmentations per phase and about log C phases: <b>O(m² log C)</b>.</p>" },
    { id: "dinitz", name: "Dinitz (level graph + blocking flow)", si: 5, run: function (n) { return FA.runDinitz(n); },
      info: "<h4>Dinitz (slides 59–72)</h4><p>Each <i>phase</i>: BFS gives every node a level L; keep only arcs from level i to i+1 (the green level graph). Then repeat <b>advance</b> (follow a level arc), <b>retreat</b> (delete a dead end), and <b>augment</b> (when you reach t) until s is stuck. After each phase the distance to t strictly increases, so there are at most n−1 phases of O(mn) each: <b>O(mn²)</b>.</p>" },
    { id: "greedy", name: "Greedy, no undo (fails!)", si: -1, run: function (n) { return FA.runGreedy(n); },
      info: "<h4>Why greedy fails (slides 12–19)</h4><p>Greedy keeps adding flow along paths of unsaturated edges and never decreases flow on an edge. It can get stuck below the maximum. The fix is the <b>residual network</b>: its backward arcs let an algorithm undo an earlier choice. Compare the right-hand view at the end.</p>" }
  ];

  function initLab() {
    var net, steps, algo = ALGOS[0], C = 8;
    var flowView = new FV.NetView($("lab-flow"), { mode: "flow", drag: true, onMove: function () { resView.redraw(); } });
    var resView = new FV.NetView($("lab-res"), { mode: "residual", drag: true, onMove: function () { flowView.redraw(); } });
    var player = new FV.Player($("lab-player"), onStep);
    var netSel = $("lab-net"), algoSel = $("lab-algo");
    fillSelect(netSel, FA.PRESETS); fillSelect(algoSel, ALGOS);
    algoSel.value = algo.id;

    function build(fresh) {
      var p = preset(netSel.value);
      $("lab-c-wrap").hidden = p.id !== "expo"; $("lab-new").hidden = p.id !== "random";
      if (fresh || !net || net.__id !== p.id || p.id === "expo") { net = p.id === "expo" ? FA.expo(C) : p.make(); net.__id = p.id; }
      $("lab-desc").textContent = p.desc;
      flowView.setNet(net); resView.setNet(net);
      run();
    }
    function run() {
      algo = ALGOS.filter(function (a) { return a.id === algoSel.value; })[0];
      steps = algo.run(net);
      $("lab-info").innerHTML = algo.info;
      player.load(steps); buildLog(); buildScore();
    }
    function onStep(st, i) {
      flowView.draw(st); resView.draw(st);
      var n = $("lab-narr"); n.className = "narr k-" + st.kind; n.innerHTML = st.text;
      var c = [["Flow value", st.val, st.kind === "done" ? "good" : ""], ["Augmentations", st.aug]];
      if (algo.id === "dinitz") c.push(["Phase", st.phase]);
      if (algo.id === "scaling") c.push(["Δ", st.delta || "–"]);
      if (st.kind === "stuck") c[0][2] = "bad";
      counters($("lab-cnt"), c);
      [].forEach.call($("lab-log").querySelectorAll("tr[data-n]"), function (tr) { tr.classList.toggle("cur", +tr.getAttribute("data-n") === st.aug); });
    }
    function buildLog() {
      var rows = ['<tr><th>#</th><th>Augmenting path</th><th class="num">Bottleneck</th><th class="num">Flow value</th></tr>'], k = 0;
      steps.forEach(function (st, i) {
        if (st.kind !== "augment") return;
        k++;
        rows.push('<tr data-n="' + k + '" data-i="' + i + '" style="cursor:pointer"><td>' + k + "</td><td>" + FA.pathText(net, st.flash) + '</td><td class="num">' + st.bott + '</td><td class="num">' + st.val + "</td></tr>");
      });
      if (!k) rows.push('<tr><td colspan="4" class="muted">No augmentations yet.</td></tr>');
      var t = $("lab-log"); t.innerHTML = rows.join("");
      [].forEach.call(t.querySelectorAll("tr[data-i]"), function (tr) { tr.addEventListener("click", function () { player.pause(); player.go(+tr.getAttribute("data-i")); }); });
    }
    function buildScore() {
      var rows = FA.scoreboard(net), mx = 1;
      rows.forEach(function (r) { mx = Math.max(mx, r.aug); });
      var h = '<tr><th>Algorithm</th><th>Augmentations</th><th class="num">Phases</th><th class="num">Max flow found</th></tr>';
      rows.forEach(function (r, i) {
        var on = algo.si === i;
        h += '<tr data-si="' + i + '" class="' + (on ? "cur" : "") + '" style="cursor:pointer"><td>' + r.name + (on ? " ◀" : "") + '</td><td style="min-width:150px"><b>' + r.aug + '</b><span class="bar" style="width:' + Math.max(2, 100 * r.aug / mx) + '%"></span></td><td class="num">' + (r.phases || "–") + '</td><td class="num">' + r.value + (r.ok ? " ✓" : " ✗") + "</td></tr>";
      });
      var t = $("lab-score"); t.innerHTML = h;
      [].forEach.call(t.querySelectorAll("tr[data-si]"), function (tr) {
        tr.addEventListener("click", function () {
          var a = ALGOS.filter(function (x) { return x.si === +tr.getAttribute("data-si"); })[0];
          algoSel.value = a.id; run(); $("lab").scrollIntoView({ behavior: "smooth" });
        });
      });
    }
    netSel.addEventListener("change", function () { build(true); });
    algoSel.addEventListener("change", run);
    $("lab-c").addEventListener("input", function () { C = +this.value; $("lab-c-out").textContent = C; build(true); });
    $("lab-new").addEventListener("click", function () { build(true); });
    build(true);
  }

  /* ================================================================ 3. you be the algorithm */
  function initPlay() {
    var sel = $("pl-net"), net, f, path, nodes, aug, hist, finished, cutState, msg, msgKind, rows;
    var flowView = new FV.NetView($("pl-flow"), { mode: "flow", drag: true, onNodeClick: click, onMove: function () { resView.redraw(); } });
    var resView = new FV.NetView($("pl-res"), { mode: "residual", drag: true, onNodeClick: click, onMove: function () { flowView.redraw(); } });
    fillSelect(sel, ["lecture", "warmup", "greedy", "phases"].map(preset));

    function load() {
      net = preset(sel.value).make(); f = FA.zeros(net.edges.length); path = []; nodes = [net.s]; aug = 0; hist = []; finished = false; cutState = null;
      rows = FA.scoreboard(net);
      flowView.setNet(net); resView.setNet(net);
      say("info", "Click a node next to <b>s</b> in the residual network (right) to start your path. Or press <i>Hint</i>.");
      draw();
    }
    function say(kind, html) { msg = html; msgKind = kind; }
    function draw() {
      var st = { f: f, path: path };
      if (cutState) { st.cutA = cutState; st.cutE = FA.cutEdgeIds(net, cutState); }
      flowView.draw(st); resView.draw(st);
      var n = $("pl-narr"); n.className = "narr " + (msgKind === "good" ? "k-augment" : msgKind === "bad" ? "k-stuck" : msgKind === "path" ? "k-find" : ""); n.innerHTML = msg;
      var complete = nodes[nodes.length - 1] === net.t && path.length > 0;
      $("pl-aug").disabled = !complete || finished;
      $("pl-undo").disabled = !hist.length;
      counters($("pl-cnt"), [["Flow value", FA.value(net, f), finished ? "good" : ""], ["Augmentations", aug]]);
    }
    function pathMsg() {
      var complete = nodes[nodes.length - 1] === net.t;
      var txt = path.length ? FA.pathText(net, path) : FA.nm(net, net.s);
      if (complete) say("path", "Path <b>" + txt + "</b> reaches t. Bottleneck = <b>" + FA.bottleneck(net, f, path) + "</b>. Press <i>Augment</i>.");
      else say("path", "Path so far: <b>" + txt + "</b>. Click the next node (you can also go backward along a dashed arc).");
    }
    function click(v) {
      if (finished) return;
      var last = nodes[nodes.length - 1];
      if (nodes[nodes.length - 1] === net.t && v !== net.t && nodes.indexOf(v) < 0) { say("bad", "Your path already reaches t. Press <i>Augment</i>, or click an earlier node to cut the path back."); draw(); return; }
      var at = nodes.indexOf(v);
      if (at >= 0) { nodes = nodes.slice(0, at + 1); path = path.slice(0, at); pathMsg(); draw(); return; }
      var adj = FA.residualAdj(net, f), best = -1;
      adj[last].forEach(function (a) { if (FA.arcTo(net, a) === v && (best < 0 || FA.arcRes(net, f, a) > FA.arcRes(net, f, best))) best = a; });
      if (best < 0) { say("bad", "There is no residual arc from <b>" + FA.nm(net, last) + "</b> to <b>" + FA.nm(net, v) + "</b>: that edge is saturated, or the edge points the other way and carries no flow to undo."); draw(); return; }
      path.push(best); nodes.push(v); pathMsg(); draw();
    }
    function finish() {
      finished = true; cutState = FA.reach(net, f);
      var fat = rows[3].aug, bfs = rows[2].aug, din = rows[5].aug;
      say("good", "No augmenting path is left: <b>t</b> is unreachable from s in G<sub>f</sub>. You found a <b>maximum flow of value " + FA.value(net, f) + "</b> in <b>" + aug + "</b> augmentations. " +
        "(Shortest path needs " + bfs + ", fattest path " + fat + ", Dinitz " + din + ".) The shaded set A is everything reachable from s; the red edges leaving it form a minimum cut of capacity " + FA.cutCap(net, cutState) + ".");
    }
    $("pl-aug").addEventListener("click", function () {
      if ($("pl-aug").disabled) return;
      var b = FA.bottleneck(net, f, path); hist.push({ f: f.slice(), aug: aug });
      FA.augment(net, f, path, b); aug++; path = []; nodes = [net.s];
      if (!FA.findPath(net, f, "bfs")) finish();
      else say("good", "Augmented by " + b + ". Flow value is now <b>" + FA.value(net, f) + "</b>. Choose the next path.");
      draw();
    });
    $("pl-undo").addEventListener("click", function () {
      var h = hist.pop(); if (!h) return; f = h.f; aug = h.aug; path = []; nodes = [net.s]; finished = false; cutState = null;
      say("info", "Undone. Choose a path again."); draw();
    });
    $("pl-clear").addEventListener("click", function () { path = []; nodes = [net.s]; say("info", "Path cleared."); draw(); });
    $("pl-hint").addEventListener("click", function () {
      if (finished) return;
      var p = FA.findPath(net, f, "bfs");
      if (!p) { finish(); draw(); return; }
      path = p; nodes = [net.s]; p.forEach(function (a) { nodes.push(FA.arcTo(net, a)); }); pathMsg(); draw();
    });
    $("pl-stuck").addEventListener("click", function () {
      if (finished) return;
      var p = FA.findPath(net, f, "bfs");
      if (p) { say("bad", "Not yet. There is still an augmenting path, for example <b>" + FA.pathText(net, p) + "</b>. Look for dashed (backward) arcs too."); draw(); }
      else { finish(); draw(); }
    });
    $("pl-reset").addEventListener("click", load);
    sel.addEventListener("change", load);
    load();
  }

  /* ================================================================ 4. cuts */
  function initCuts() {
    var sel = $("cu-net"), kSlider = $("cu-k"), net, f, A, flows, cuts, K, interior;
    var view = new FV.NetView($("cu-svg"), { mode: "flow", drag: true, onNodeClick: toggle, onMove: draw });
    fillSelect(sel, ["lecture", "warmup", "greedy", "phases"].map(preset));

    function load() {
      net = preset(sel.value).make();
      var steps = FA.runFF(net, "bfs");
      flows = [FA.zeros(net.edges.length)];
      steps.forEach(function (s) { if (s.kind === "augment") flows.push(s.f); });
      K = flows.length - 1; kSlider.max = K; kSlider.value = K;
      interior = []; net.nodes.forEach(function (n, i) { if (i !== net.s && i !== net.t) interior.push(i); });
      cuts = [];
      for (var m = 0; m < (1 << interior.length); m++) {
        var a = net.nodes.map(function () { return false; }); a[net.s] = true;
        interior.forEach(function (v, j) { if (m & (1 << j)) a[v] = true; });
        cuts.push({ m: m, cap: FA.cutCap(net, a) });
      }
      cuts.sort(function (x, y) { return x.cap - y.cap || x.m - y.m; });
      view.setNet(net); reset(); setK();
    }
    function reset() { A = net.nodes.map(function () { return false; }); A[net.s] = true; draw(); }
    function setK() { var k = +kSlider.value; f = flows[k]; $("cu-kout").textContent = k + " (of " + K + ")"; draw(); }
    function mask() { var m = 0; interior.forEach(function (v, j) { if (A[v]) m |= 1 << j; }); return m; }
    function toggle(i) { if (i === net.s || i === net.t) return; A[i] = !A[i]; draw(); }
    function setA(a) { A = a.slice(); draw(); }
    function draw() {
      if (!net || !f) return;
      var ce = FA.cutEdgeIds(net, A), val = FA.value(net, f), cap = 0, fo = 0, fi = 0, rowsF = "", rowsB = "";
      var maxF = FA.maxFlow(net).value;
      net.edges.forEach(function (e, i) {
        if (A[e.u] && !A[e.v]) { cap += e.c; fo += f[i]; rowsF += "<tr><td>" + FA.nm(net, e.u) + " → " + FA.nm(net, e.v) + '</td><td class="num">' + e.c + '</td><td class="num">' + f[i] + "</td></tr>"; }
        else if (!A[e.u] && A[e.v]) { fi += f[i]; rowsB += "<tr><td>" + FA.nm(net, e.u) + " → " + FA.nm(net, e.v) + '</td><td class="num">–</td><td class="num">' + f[i] + "</td></tr>"; }
      });
      view.draw({ f: f, cutA: A, cutE: ce });
      var html = "<p style='margin:0 0 6px'><b>A</b> = {" + nodeList(net, A, true) + "} &nbsp; <b>B</b> = {" + nodeList(net, A, false) + "}</p>";
      html += '<table class="sb"><tr><th>Edge A → B</th><th class="num">capacity</th><th class="num">flow</th></tr>' + (rowsF || '<tr><td colspan="3" class="muted">none</td></tr>') +
        '<tr><td><b>total</b></td><td class="num"><b>' + cap + '</b></td><td class="num"><b>' + fo + "</b></td></tr>" +
        (rowsB ? '<tr><th colspan="3">Edge B → A (flow coming back)</th></tr>' + rowsB + '<tr><td><b>total</b></td><td></td><td class="num"><b>' + fi + "</b></td></tr>" : "") + "</table>";
      html += '<div class="verdict info"><b>Net flow across the cut</b> = ' + fo + (rowsB ? " − " + fi : "") + " = <b>" + (fo - fi) + "</b> = flow value " + val + ". It is the same for every cut (flow value lemma, slide 26).</div>";
      var tinA = A[net.t];
      html += '<div class="verdict ' + (cap === maxF && val === maxF ? "ok" : cap >= val ? "info" : "no") + '"><b>Capacity of the cut = ' + cap + "</b>" +
        (cap > val ? " &gt; " + val + ": the cut has slack." : cap === val ? " = flow value " + val + ": every edge A→B is full and every edge B→A is empty." : "") +
        (val === maxF && cap === maxF ? " <b>This is a minimum cut and the flow is maximum.</b>" : "") + "</div>";
      $("cu-info").innerHTML = html;
      plot(cap, val, maxF);
    }
    function plot(cap, val, maxF) {
      var W = 700, H = 150, pad = 26, N = cuts.length, bw = (W - 2 * pad) / N, mx = cuts[N - 1].cap, me = mask(), minCap = cuts[0].cap, h = "";
      function y(v) { return H - 22 - (H - 40) * v / mx; }
      cuts.forEach(function (c, i) {
        var cls = c.m === me ? "bar me" : c.cap === minCap ? "bar min" : "bar";
        h += '<rect class="' + cls + '" x="' + (pad + i * bw) + '" y="' + y(c.cap) + '" width="' + Math.max(1, bw - (N < 80 ? 1.5 : 0)) + '" height="' + (H - 22 - y(c.cap)) + '"></rect>';
      });
      h += '<line class="fl" x1="' + pad + '" x2="' + (W - pad) + '" y1="' + y(val) + '" y2="' + y(val) + '"></line>';
      h += '<text class="fl-t" x="' + (W - pad) + '" y="' + (y(val) - 4) + '" text-anchor="end">flow value = ' + val + "</text>";
      h += '<text x="' + pad + '" y="' + (H - 6) + '">smallest cut: ' + minCap + "</text><text x=\"" + (W - pad) + '" y="' + (H - 6) + '" text-anchor="end">largest cut: ' + mx + "</text>";
      h += '<text x="' + (W / 2) + '" y="' + (H - 6) + '" text-anchor="middle">' + N + " cuts · orange = your cut · red = minimum cuts</text>";
      $("cu-plot").innerHTML = h;
      $("cu-plot-note").textContent = val === minCap ? "the flow touches the smallest cut: it is maximum" : "gap between the flow and the smallest cut: " + (minCap - val);
    }
    sel.addEventListener("change", load);
    kSlider.addEventListener("input", setK);
    $("cu-clear").addEventListener("click", reset);
    $("cu-min").addEventListener("click", function () {
      var m = cuts[0].m, a = net.nodes.map(function () { return false; }); a[net.s] = true;
      interior.forEach(function (v, j) { if (m & (1 << j)) a[v] = true; }); setA(a);
    });
    $("cu-bfs").addEventListener("click", function () {
      var r = FA.reach(net, f);
      if (r[net.t]) { $("cu-info").innerHTML = '<div class="verdict no">In the residual network of this flow, <b>t is still reachable</b> from s, so there is an augmenting path and the flow is not maximum yet. Slide the flow up to its maximum, then try again.</div>' + $("cu-info").innerHTML; return; }
      setA(r);
    });
    load();
  }

  initFlow(); initLab(); initPlay(); initCuts();
})();
