/* Network Flow II: reductions to max flow and min cut. */
(function () {
  "use strict";
  var FA = window.FlowAlgo, AP = window.FlowApps, FV = window.FlowViz;
  function $(id) { return document.getElementById(id); }
  function fillSelect(sel, items) {
    sel.innerHTML = "";
    items.forEach(function (it) { var o = document.createElement("option"); o.value = it.id; o.textContent = it.name; sel.appendChild(o); });
  }
  function counters(el, items) {
    el.innerHTML = items.map(function (c) { return '<div class="cnt ' + (c[2] || "") + '">' + c[0] + "<b>" + c[1] + "</b></div>"; }).join("");
  }
  function lastOf(a) { return a[a.length - 1]; }
  function svgEl(tag, attrs, parent) { return FV.svg(tag, attrs, parent); }
  function hasBack(path) { return (path || []).some(function (a) { return a & 1; }); }

  /* ================================================================ 1. matching */
  var BIP = [
    { id: "rematch", name: "A perfect matching that needs re-matching (4 + 4)", n: 4, edges: [[0, 0], [0, 1], [1, 0], [2, 1], [2, 2], [3, 2], [3, 3]],
      desc: "A perfect matching exists, but the shortest-path augmentations first make choices that the last augmentation has to undo, along a long alternating path." },
    { id: "hall", name: "No perfect matching: a Hall violation (slide 15)", n: 5, edges: [[0, 0], [0, 1], [1, 1], [1, 4], [2, 2], [2, 3], [3, 1], [4, 4]],
      desc: "Nodes 2, 4 and 5 of L only know 2′ and 5′ between them. No perfect matching can exist, and the min cut finds exactly this set." },
    { id: "complete", name: "Complete bipartite graph K4,4", n: 4, edges: (function () { var e = []; for (var i = 0; i < 4; i++) for (var j = 0; j < 4; j++) e.push([i, j]); return e; })(),
      desc: "Every left node can be matched to every right node. Easy, but watch the number of augmentations." },
    { id: "random", name: "Random graph (5 + 5)", n: 5, random: true, desc: "A random bipartite graph. Press “Graph” again for another." }
  ];
  function BipView(svg, onToggle) { this.svg = svg; this.onToggle = onToggle; this.pending = null; this.n = 0; this.edges = []; }
  BipView.prototype.set = function (n, edges, bn) {
    var self = this, svg = this.svg; this.n = n; this.edges = edges; this.bn = bn; this.pending = null;
    var H = bn.net.h, step = n > 1 ? (H - 80) / (n - 1) : 0;
    svg.setAttribute("viewBox", "0 0 520 " + H); svg.classList.add("nv"); svg.innerHTML = "";
    this.gE = svgEl("g", null, svg); this.gN = svgEl("g", null, svg);
    function y(i) { return 40 + i * step; }
    this.eEls = bn.mid.map(function (m) {
      var g = svgEl("g", { "class": "bp-e" }, self.gE);
      var l = svgEl("line", { x1: 110, y1: y(m.i), x2: 410, y2: y(m.j) }, g);
      var hit = svgEl("line", { x1: 110, y1: y(m.i), x2: 410, y2: y(m.j), "class": "bp-hit" }, g);
      hit.addEventListener("click", function () { self.onToggle(m.i, m.j); });
      return { g: g, l: l, m: m };
    });
    this.nL = []; this.nR = [];
    for (var i = 0; i < n; i++) (function (i) {
      [["L", 110, String(i + 1)], ["R", 410, (i + 1) + "′"]].forEach(function (d) {
        var g = svgEl("g", { "class": "bp-n " + d[0] }, self.gN);
        svgEl("circle", { cx: d[1], cy: y(i), r: 17 }, g);
        var t = svgEl("text", { x: d[1], y: y(i), dy: "0.35em", "text-anchor": "middle" }, g); t.textContent = d[2];
        g.addEventListener("click", function () {
          if (d[0] === "L") self.pending = self.pending === i ? null : i;
          else if (self.pending !== null) { var p = self.pending; self.pending = null; self.onToggle(p, i); return; }
          self.draw(self.st);
        });
        (d[0] === "L" ? self.nL : self.nR).push(g);
      });
    })(i);
    this.draw({});
  };
  BipView.prototype.draw = function (st) {
    st = st || {}; this.st = st; var bn = this.bn, f = st.f || FA.zeros(bn.net.edges.length), n = this.n, pathAdd = {}, pathRm = {}, self = this;
    (st.path || st.cur || st.flash || []).forEach(function (a) { if (a & 1) pathRm[a >> 1] = true; else pathAdd[a >> 1] = true; });
    this.eEls.forEach(function (o) {
      var cls = "bp-e";
      if (f[o.m.e] === 1) cls += " m";
      if (pathAdd[o.m.e] || pathRm[o.m.e]) cls += pathRm[o.m.e] ? " rm" : " add";
      o.g.setAttribute("class", cls);
    });
    var hS = {}, hN = {};
    if (st.hall) { st.hall.S.forEach(function (i) { hS[i] = true; }); st.hall.N.forEach(function (j) { hN[j] = true; }); }
    for (var i = 0; i < n; i++) {
      var mL = f[i] === 1, mR = f[n + bn.mid.length + i] === 1;
      this.nL[i].setAttribute("class", "bp-n L" + (mL ? " matched" : "") + (hS[i] ? " hallS" : "") + (this.pending === i ? " pend" : ""));
      this.nR[i].setAttribute("class", "bp-n R" + (mR ? " matched" : "") + (hN[i] ? " hallN" : ""));
    }
  };

  function initMatch() {
    var sel = $("mt-net"), algoSel = $("mt-algo"), cur, n, edges, bn, steps, player;
    var bip = new BipView($("mt-bip"), function (i, j) {
      var k = -1; edges.forEach(function (e, idx) { if (e[0] === i && e[1] === j) k = idx; });
      if (k >= 0) edges.splice(k, 1); else edges.push([i, j]);
      rebuild();
    });
    var flow = new FV.NetView($("mt-flow"), { mode: "flow" });
    player = new FV.Player($("mt-player"), onStep);
    fillSelect(sel, BIP);
    function randomEdges(n) { var e = []; for (var i = 0; i < n; i++) for (var j = 0; j < n; j++) if (Math.random() < 0.38) e.push([i, j]); return e; }
    function load() {
      cur = BIP.filter(function (p) { return p.id === sel.value; })[0]; n = cur.n;
      edges = cur.random ? randomEdges(n) : cur.edges.map(function (e) { return e.slice(); });
      $("mt-desc").textContent = cur.desc; rebuild();
    }
    function rebuild() {
      bn = AP.bipNet(n, edges); flow.setNet(bn.net); bip.set(n, edges, bn);
      steps = algoSel.value === "dinitz" ? FA.runDinitz(bn.net) : FA.runFF(bn.net, "bfs");
      player.load(steps);
    }
    function onStep(st) {
      var s2 = Object.assign({}, st);
      if (st.kind === "done" && st.val < n) s2.hall = AP.hall(bn, st.f);
      flow.draw(st); bip.draw(s2);
      var extra = "";
      if ((st.kind === "find" || st.kind === "advance") && hasBack(st.path || st.cur)) extra = " <br><b>Alternating path:</b> the new edges (orange, solid) join the matching; the matched edges it passes backwards (orange, dashed) leave it. Net effect: the matching grows by one.";
      if (st.kind === "done") {
        if (st.val === n) extra = " <br><b>Perfect matching:</b> all " + n + " left nodes are matched.";
        else {
          var h = s2.hall, Sn = h.S.map(function (i) { return i + 1; }).join(", "), Nn = h.N.map(function (j) { return (j + 1) + "′"; }).join(", ") || "none";
          extra = " <br><b>Hall violator:</b> the left nodes reachable from s are S = {" + Sn + "} (|S| = " + h.S.length + "). Their neighbours are all reachable too and already matched: N(S) = {" + Nn + "} (|N(S)| = " + h.N.length + "). Since |N(S)| &lt; |S|, no perfect matching exists.";
        }
      }
      var nr = $("mt-narr"); nr.className = "narr k-" + st.kind; nr.innerHTML = st.text + extra;
      counters($("mt-cnt"), [["Matching size", st.val, st.kind === "done" ? (st.val === n ? "good" : "bad") : ""], ["Augmentations", st.aug]].concat(algoSel.value === "dinitz" ? [["Phase", st.phase]] : []));
    }
    sel.addEventListener("change", load); algoSel.addEventListener("change", rebuild);
    $("mt-clear").addEventListener("click", function () { edges.length = 0; rebuild(); });
    load();
  }

  /* ================================================================ 2. edge-disjoint paths */
  var COLORS = ["#2457d6", "#17855a", "#d9560b", "#7a4fd1", "#c8362f", "#b7791f"];
  function mk(nodes, edges, h) { return FA.makeNet({ w: 640, h: h || 300, nodes: nodes, edges: edges }); }
  var EP = [
    { id: "two", name: "Three sources, two exits", make: function () {
      return mk([["s", 40, 150], ["a", 200, 55], ["b", 200, 150], ["c", 200, 245], ["d", 400, 90], ["e", 400, 210], ["t", 600, 150]],
        [[0, 1, 1], [0, 2, 1], [0, 3, 1], [1, 4, 1], [2, 4, 1], [2, 5, 1], [3, 5, 1], [4, 6, 1], [5, 6, 1]]); } },
    { id: "three", name: "Three disjoint routes", make: function () {
      return mk([["s", 40, 150], ["1", 190, 50], ["2", 190, 150], ["3", 190, 250], ["4", 400, 60], ["5", 400, 150], ["6", 400, 240], ["t", 600, 150]],
        [[0, 1, 1], [0, 2, 1], [0, 3, 1], [1, 4, 1], [2, 4, 1], [2, 5, 1], [3, 5, 1], [3, 6, 1], [4, 7, 1], [5, 7, 1], [6, 7, 1], [4, 5, 1]]); } },
    { id: "bridge", name: "Two clusters joined by three edges", make: function () {
      return mk([["s", 40, 150], ["a", 150, 70], ["b", 150, 230], ["c", 270, 150], ["d", 370, 55], ["e", 370, 150], ["f", 370, 245], ["g", 490, 150], ["t", 600, 150]],
        [[0, 1, 1], [0, 2, 1], [1, 2, 1], [1, 3, 1], [2, 3, 1], [1, 4, 1], [3, 5, 1], [2, 6, 1], [4, 7, 1], [5, 7, 1], [6, 7, 1], [4, 8, 1], [7, 8, 1], [5, 4, 1]]); } }
  ];
  function initPaths() {
    var sel = $("ep-net"), net, m, paths, removed, mode = "paths";
    var view = new FV.NetView($("ep-svg"), { mode: "flow", drag: true, onMove: draw, onEdgeClick: function (e) {
      if (mode !== "break") return; removed[e] = !removed[e]; if (!removed[e]) delete removed[e]; draw();
    } });
    fillSelect(sel, EP);
    function load() {
      net = EP.filter(function (p) { return p.id === sel.value; })[0].make();
      m = FA.maxFlow(net); paths = AP.decompose(net, m.f); removed = {};
      view.setNet(net); draw();
    }
    function reachable() {
      var seen = net.nodes.map(function () { return false; }); seen[net.s] = true; var q = [net.s];
      for (var h = 0; h < q.length; h++) net.edges.forEach(function (e, i) { if (e.u === q[h] && !removed[i] && !seen[e.v]) { seen[e.v] = true; q.push(e.v); } });
      return seen;
    }
    function draw() {
      var info = $("ep-info"), z = FA.zeros(net.edges.length);
      $("ep-min").hidden = mode !== "break"; $("ep-reset").hidden = mode !== "break";
      if (mode === "paths") {
        var col = {}, lab = {};
        paths.forEach(function (p, k) { p.forEach(function (e) { col[e] = COLORS[k % COLORS.length]; lab[e] = "P" + (k + 1); }); });
        view.draw({ f: m.f, edgeColor: col, edgeLabel: function (e) { return lab[e] || ""; } });
        $("ep-hint").textContent = "each colour is one path";
        var h = "<h4>Max flow = " + m.value + "</h4><p>There are exactly <b>" + paths.length + "</b> edge-disjoint paths from s to t, one per unit of flow:</p><ul style='margin:0 0 8px;padding-left:1.1em'>";
        paths.forEach(function (p, k) {
          var txt = FA.nm(net, net.s); p.forEach(function (e) { txt += " → " + FA.nm(net, net.edges[e].v); });
          h += '<li><b style="color:' + COLORS[k % COLORS.length] + '">P' + (k + 1) + "</b> " + txt + "</li>";
        });
        h += "</ul><p class='small-text muted'>No more than " + m.value + " are possible: every edge has capacity 1, and the min cut below has " + FA.cutEdgeIds(net, m.A).length + " edges.</p>";
        info.innerHTML = h;
      } else {
        var R = reachable(), k = Object.keys(removed).length, bad = R[net.t];
        view.draw({ f: z, removed: removed, cutA: R, edgeLabel: function () { return ""; } });
        $("ep-hint").textContent = "click an edge to remove it";
        var min = m.value;
        info.innerHTML = "<h4>Disconnect t from s</h4><p>Edges removed: <b>" + k + "</b></p>" +
          '<div class="verdict ' + (bad ? "no" : k === min ? "ok" : "info") + '">' +
          (bad ? "t is still reachable from s. Keep cutting." : (k === min ? "Disconnected with <b>" + k + "</b> edges, the minimum possible: it equals the number of disjoint paths (" + min + ")." : k < min ? "Impossible: with fewer edges than disjoint paths, some path survives." : "Disconnected with " + k + " edges, but " + min + " is enough. Can you do it with " + min + "?")) + "</div>" +
          "<p class='small-text muted'>Menger’s theorem: the fewest edges that separate t from s = the most edge-disjoint paths = <b>" + min + "</b>. The shaded nodes are those s can still reach.</p>";
      }
    }
    sel.addEventListener("change", load);
    [].forEach.call(document.querySelectorAll("input[name=ep-mode]"), function (r) { r.addEventListener("change", function () { mode = r.value; draw(); }); });
    $("ep-reset").addEventListener("click", function () { removed = {}; draw(); });
    $("ep-min").addEventListener("click", function () { removed = {}; FA.cutEdgeIds(net, m.A).forEach(function (e) { removed[e] = true; }); draw(); });
    load();
  }

  /* ================================================================ 3. project selection */
  function mineSpec() {
    var names = ["a1", "a2", "a3", "a4", "b1", "b2", "b3", "c1", "c2"], pos = [[180, 40], [290, 40], [400, 40], [510, 40], [235, 150], [345, 150], [455, 150], [290, 260], [400, 260]];
    return { names: names, values: [-2, -2, -2, -2, -3, -3, -3, 14, 3], pos: pos, w: 640, h: 380, sPos: [34, 340], tPos: [340, 92],
      prereq: [[4, 0], [4, 1], [5, 1], [5, 2], [6, 2], [6, 3], [7, 4], [7, 5], [8, 5], [8, 6]],
      note: "Open-pit mine (slide 68). Digging a block means removing the two blocks above it first. Top blocks are rock (cost), the two deepest hold ore." };
  }
  function softwareSpec() {
    return { names: ["App", "Back", "UI", "Stats", "Lake", "Mkt"], values: [10, -5, -3, 4, -6, 3],
      pos: [[170, 60], [320, 60], [470, 60], [170, 250], [320, 250], [470, 200]], w: 640, h: 310,
      prereq: [[0, 1], [0, 2], [3, 1], [3, 4]],
      note: "Software projects: App needs Back (backend) and UI; Stats needs Back and Lake (data lake). Marketing needs nothing." };
  }
  var PJ = [{ id: "mine", name: "Open-pit mine (slide 68)", make: mineSpec }, { id: "soft", name: "Software projects", make: softwareSpec }];
  function initClosure() {
    var sel = $("pj-net"), spec, net, chosen, solved, best, sumPos;
    var view = new FV.NetView($("pj-svg"), { mode: "flow", drag: true, onMove: draw, onNodeClick: function (i) {
      var k = spec.names.length; if (i === 0 || i === k + 1) return; chosen[i - 1] = !chosen[i - 1]; solved = false; draw();
    } });
    fillSelect(sel, PJ);
    function load() {
      spec = PJ.filter(function (p) { return p.id === sel.value; })[0].make();
      net = AP.projectNet(spec); best = AP.bestClosure(spec); chosen = spec.names.map(function () { return false; }); solved = false;
      sumPos = best.sumPos; view.setNet(net); draw();
    }
    function draw() {
      var k = spec.names.length, A = net.nodes.map(function () { return false; }), badE = {}, profit = 0, viol = [], i;
      A[0] = true; for (i = 0; i < k; i++) if (chosen[i]) { A[1 + i] = true; profit += spec.values[i]; }
      net.edges.forEach(function (e, ei) { if (e.c >= FA.INF && A[e.u] && !A[e.v]) { badE[ei] = true; viol.push(spec.names[e.u - 1] + " needs " + spec.names[e.v - 1]); } });
      var badge = net.nodes.map(function (n, ix) { return ix === 0 || ix === k + 1 ? "" : { text: (spec.values[ix - 1] > 0 ? "+" : "−") + Math.abs(spec.values[ix - 1]) }; });
      view.draw({ f: solved ? best.f : FA.zeros(net.edges.length), cutA: A, badE: badE, badge: badge, cutE: FA.cutEdgeIds(net, A).filter(function (e) { return net.edges[e].c < FA.INF; }),
        edgeLabel: function (e) { var c = net.edges[e].c; if (c >= FA.INF) return ""; return solved ? best.f[e] + "/" + FV.cap(c) : FV.cap(c); } });
      var cap = FA.cutCap(net, A), valid = !viol.length, h = "<h4>" + spec.note.split(".")[0] + "</h4>";
      h += "<p>Chosen: <b>" + (spec.names.filter(function (n, j) { return chosen[j]; }).join(", ") || "nothing") + "</b></p>";
      h += '<div class="verdict ' + (valid ? "ok" : "no") + '">' + (valid ? "✓ Legal selection (every prerequisite is chosen)." : "✗ Illegal: " + viol.join("; ") + ". The infinite edge leaving A is cut.") + "</div>";
      h += "<p>Profit of your selection: <b>" + profit + "</b></p>";
      if (valid) h += "<p class='small-text'>Check: sum of all profits (" + sumPos + ") − cap(A,B) (" + cap + ") = <b>" + (sumPos - cap) + "</b> = profit ✓</p>";
      if (solved) h += '<div class="verdict info"><b>Max flow = min cut = ' + best.minCut + ".</b> Best possible profit = " + sumPos + " − " + best.minCut + " = <b>" + best.profit + "</b>" + (valid && profit === best.profit ? " — your selection is optimal." : ".") + "</div>";
      else h += "<p class='small-text muted'>Try to beat the obvious choices, then press <i>Solve</i>.</p>";
      $("pj-info").innerHTML = h;
    }
    $("pj-solve").addEventListener("click", function () { chosen = best.chosen.slice(); solved = true; draw(); });
    $("pj-clear").addEventListener("click", function () { chosen = chosen.map(function () { return false; }); solved = false; draw(); });
    sel.addEventListener("change", load);
    load();
  }

  /* ================================================================ 4. segmentation */
  function initSegment() {
    var W = 7, H = 7, seed = 7, a, b, p = 3, noise = 5;
    function genImage() {
      var s = seed; function rnd() { s = (s * 1664525 + 1013904223) % 4294967296; return s / 4294967296; }
      a = []; b = [];
      for (var y = 0; y < H; y++) for (var x = 0; x < W; x++) {
        var d = Math.sqrt((x - 3) * (x - 3) + (y - 3) * (y - 3)), base = d < 2.4 ? 0.86 : 0.14;
        var v = Math.max(0, Math.min(1, base + (rnd() - 0.5) * (noise / 10) * 1.7));
        a.push(Math.round(10 * v)); b.push(10 - Math.round(10 * v));
      }
    }
    function grid(svg, cell, fg, bounds) {
      var S = 30; svg.setAttribute("viewBox", "0 0 " + (W * S + 4) + " " + (H * S + 4)); svg.innerHTML = ""; svg.classList.add("nv");
      for (var y = 0; y < H; y++) for (var x = 0; x < W; x++) {
        var i = y * W + x, c = cell(i), r = svgEl("rect", { x: 2 + x * S, y: 2 + y * S, width: S, height: S, fill: c.fill, stroke: "var(--card)", "stroke-width": 1 }, svg);
        if (c.text !== undefined && c.text !== "") { var t = svgEl("text", { x: 2 + x * S + S / 2, y: 2 + y * S + S / 2, dy: "0.35em", "text-anchor": "middle", "class": "px-t", fill: c.tc || "#fff" }, svg); t.textContent = c.text; }
      }
      if (bounds) for (y = 0; y < H; y++) for (x = 0; x < W; x++) {
        i = y * W + x;
        if (x + 1 < W && fg[i] !== fg[i + 1]) svgEl("line", { x1: 2 + (x + 1) * S, y1: 2 + y * S, x2: 2 + (x + 1) * S, y2: 2 + (y + 1) * S, "class": "px-b" }, svg);
        if (y + 1 < H && fg[i] !== fg[i + W]) svgEl("line", { x1: 2 + x * S, y1: 2 + (y + 1) * S, x2: 2 + (x + 1) * S, y2: 2 + (y + 1) * S, "class": "px-b" }, svg);
      }
    }
    function draw() {
      var n = W * H, i, px = [];
      for (i = 0; i < n; i++) px.push(a[i] > b[i]);
      var seg = AP.segmentation(W, H, a, b, p), sPx = AP.segScore(W, H, a, b, p, px), sCut = AP.segScore(W, H, a, b, p, seg.fg);
      grid($("sg-img"), function (i) { var g = Math.round(235 * a[i] / 10 + 10); return { fill: "rgb(" + g + "," + g + "," + g + ")", text: String(a[i]), tc: a[i] > 5 ? "#222" : "#fff" }; });
      function lab(fg) { return function (i) { return { fill: fg[i] ? "var(--accent)" : "var(--line)", text: fg[i] ? "F" : "", tc: "#fff" }; }; }
      grid($("sg-px"), lab(px), px, true); grid($("sg-cut"), lab(seg.fg), seg.fg, true);
      var h = "<tr><th>Labelling</th><th class='num'>Σ likelihoods</th><th class='num'>label changes</th><th class='num'>score = Σ − p × changes</th></tr>";
      h += "<tr><td>Pixel by pixel</td><td class='num'>" + sPx.data + "</td><td class='num'>" + sPx.sep + "</td><td class='num'><b>" + sPx.score + "</b></td></tr>";
      h += "<tr class='cur'><td>Minimum cut</td><td class='num'>" + sCut.data + "</td><td class='num'>" + sCut.sep + "</td><td class='num'><b>" + sCut.score + "</b> " + (sCut.score >= sPx.score ? "✓ best possible" : "") + "</td></tr>";
      h += "<tr><td colspan='4' class='muted' style='font-size:13px'>With p = " + p + ", the cut value is " + seg.cut + " and Σ(a<sub>i</sub> + b<sub>i</sub>) = " + (10 * n) + ", so the best score is " + (10 * n) + " − " + seg.cut + " = " + (10 * n - seg.cut) + ".</td></tr>";
      $("sg-tab").innerHTML = h;
    }
    $("sg-p").addEventListener("input", function () { p = +this.value; $("sg-pout").textContent = p; draw(); });
    $("sg-noise").addEventListener("input", function () { noise = +this.value; $("sg-nout").textContent = noise; genImage(); draw(); });
    $("sg-new").addEventListener("click", function () { seed = Math.floor(Math.random() * 1e6) + 1; genImage(); draw(); });
    genImage(); draw();
  }

  /* ================================================================ 5. baseball */
  var LECTURE = {
    teams: [{ name: "Atlanta", ab: "ATL", w: 83 }, { name: "Philly", ab: "PHI", w: 80 }, { name: "New York", ab: "NYM", w: 78 }, { name: "Montreal", ab: "MON", w: 77 }],
    g: [[0, 1, 6, 1], [1, 0, 0, 2], [6, 0, 0, 0], [1, 2, 0, 0]]
  };
  function initBaseball() {
    var data, z = 1, steps, player, bb;
    var view = new FV.NetView($("bb-svg"), { mode: "flow", drag: true, onMove: function () { view.redraw(); } });
    player = new FV.Player($("bb-player"), onStep);
    function clone() { return { teams: LECTURE.teams.map(function (t) { return { name: t.name, ab: t.ab, w: t.w }; }), g: LECTURE.g.map(function (r) { return r.slice(); }) }; }
    function teamsWithR() { return data.teams.map(function (t, i) { return { name: t.ab, w: t.w, r: data.g[i].reduce(function (a, b) { return a + b; }, 0) }; }); }
    function selOpts() { var s = $("bb-team"); s.innerHTML = ""; data.teams.forEach(function (t, i) { var o = document.createElement("option"); o.value = i; o.textContent = t.name; s.appendChild(o); }); s.value = z; }
    function table() {
      var T = teamsWithR(), h = "<tr><th>i</th><th>Team</th><th class='num'>wins w</th><th class='num'>left r</th>";
      data.teams.forEach(function (t, j) { h += "<th class='num'>" + t.ab + "</th>"; });
      h += "<th class='num'>can reach</th></tr>";
      data.teams.forEach(function (t, i) {
        h += "<tr" + (i === z ? " class='cur'" : "") + "><td>" + i + "</td><td><b>" + t.name + "</b></td><td class='num'><input type='number' min='0' max='200' value='" + t.w + "' data-w='" + i + "' style='width:4em'></td><td class='num'>" + T[i].r + "</td>";
        data.teams.forEach(function (u, j) { h += i === j ? "<td class='num muted'>–</td>" : "<td class='num'><input type='number' min='0' max='9' value='" + data.g[i][j] + "' data-g='" + i + "," + j + "' style='width:3em'></td>"; });
        h += "<td class='num'>" + (t.w + T[i].r) + "</td></tr>";
      });
      $("bb-tab").innerHTML = h;
    }
    function build() {
      var T = teamsWithR(); table();
      bb = AP.baseball(T, data.g, z); view.setNet(bb.net);
      var info = "<h4>Can " + data.teams[z].name + " win?</h4><p>If it wins all its " + T[z].r + " remaining games it ends with <b>" + bb.best + "</b> wins. Every other team must finish with at most that many.</p>";
      var cap = ""; bb.others.forEach(function (x) { cap += data.teams[x].ab + ": " + Math.max(0, bb.best - T[x].w) + (T[x].w > bb.best ? " (already above!)" : "") + " &nbsp; "; });
      info += "<p class='small-text'>Wins each team may still collect: " + cap + "</p><p class='small-text muted'>Games to divide among the others: " + bb.need + ".</p>";
      $("bb-info").innerHTML = info;
      var res;
      if (bb.trivial !== null) {
        steps = [{ kind: "done", f: FA.zeros(bb.net.edges.length), val: 0, aug: 0, phase: 0, text: "<b>Trivially eliminated.</b> " + data.teams[bb.trivial].name + " already has " + data.teams[bb.trivial].w + " wins, more than " + data.teams[z].name + " can reach (" + bb.best + "). The capacity of " + data.teams[bb.trivial].ab + " → t would be negative." }];
      } else {
        steps = FA.runFF(bb.net, "bfs"); var last = lastOf(steps);
        res = AP.baseballResult(bb, T, data.g, last.f);
        if (!res.eliminated) last.text = "<b>" + data.teams[z].name + " is not eliminated.</b> The max flow is " + last.val + " = " + bb.need + " (all games left): every edge out of s is saturated. Reading the flow on game → team edges tells you who wins each game in a scenario where " + data.teams[z].name + " finishes first or tied.";
        else {
          var names = res.R.map(function (x) { return data.teams[x].name; });
          last.text = "<b>" + data.teams[z].name + " is eliminated.</b> The max flow is only " + last.val + " of " + bb.need + " games: some edge out of s cannot be saturated. The teams reachable from s in the residual network are R = {" + names.join(", ") + "}. " +
            "Together they already have " + res.wins + " wins and still play " + res.games + " games among themselves, so they will hold " + (res.wins + res.games) + " wins between them: on average " + (Math.round(res.avg * 100) / 100) + " each. " +
            "That is more than " + bb.best + ", so one of them finishes above " + data.teams[z].name + "'s best case.";
        }
      }
      player.load(steps); player.go(steps.length - 1);
    }
    function onStep(st) {
      view.draw(st);
      var n = $("bb-narr"); n.className = "narr k-" + st.kind; n.innerHTML = st.text;
    }
    $("bb-team").addEventListener("change", function () { z = +this.value; build(); });
    $("bb-reset").addEventListener("click", function () { data = clone(); z = 1; selOpts(); build(); });
    $("bb-tab").addEventListener("change", function (ev) {
      var t = ev.target, v = Math.max(0, Math.floor(+t.value || 0));
      if (t.getAttribute("data-w") !== null) data.teams[+t.getAttribute("data-w")].w = v;
      else if (t.getAttribute("data-g") !== null) { var ij = t.getAttribute("data-g").split(",").map(Number); data.g[ij[0]][ij[1]] = data.g[ij[1]][ij[0]] = Math.min(9, v); }
      build();
    });
    data = clone(); selOpts(); build();
  }

  /* ================================================================ 6. circulation */
  function initCirc() {
    var cap = 3, steps, c, player;
    var view = new FV.NetView($("ci-svg"), { mode: "flow", drag: true, onMove: function () { view.redraw(); } });
    player = new FV.Player($("ci-player"), onStep);
    function spec() {
      return { w: 640, h: 300, nodes: [{ name: "a", d: -4, x: 130, y: 70 }, { name: "b", d: -2, x: 130, y: 230 }, { name: "e", d: 0, x: 320, y: 150 }, { name: "c", d: 3, x: 500, y: 70 }, { name: "d", d: 3, x: 500, y: 230 }],
        edges: [[0, 2, 5], [1, 2, 3], [2, 3, 4], [2, 4, cap], [0, 3, 1]] };
    }
    function build() {
      var sp = spec(); c = AP.circulation(sp); view.setNet(c.net);
      steps = FA.runFF(c.net, "bfs"); var last = lastOf(steps), ok = last.val === c.demand && c.supply === c.demand;
      last.text = ok ? "<b>Feasible circulation.</b> The max flow is " + last.val + " = total demand " + c.demand + ": every edge out of S and into T is saturated, and the flow on the original edges is a valid way to ship everything."
        : "<b>No feasible circulation.</b> The max flow is only " + last.val + " but the total demand is " + c.demand + ". The shaded nodes (reachable from S in the residual network) show where the capacity runs out: not everything that must reach T can get there.";
      c.badge = c.net.nodes.map(function (n, i) { if (i >= c.n) return ""; var d = sp.nodes[i].d; return d < 0 ? { text: "supply " + (-d) } : d > 0 ? { text: "demand " + d } : ""; });
      player.load(steps); player.go(steps.length - 1);
    }
    function onStep(st) {
      view.draw(Object.assign({ badge: c.badge }, st));
      var n = $("ci-narr"); n.className = "narr k-" + st.kind; n.innerHTML = st.text;
    }
    $("ci-cap").addEventListener("input", function () { cap = +this.value; $("ci-out").textContent = cap; build(); });
    build();
  }

  initMatch(); initPaths(); initClosure(); initSegment(); initBaseball(); initCirc();
})();
