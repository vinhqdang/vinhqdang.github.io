/* Reductions to max flow / min cut for Network Flow II. Pure logic (browser: window.FlowApps, Node: module.exports). */
(function (root) {
  "use strict";
  var FA = typeof require !== "undefined" && typeof module !== "undefined" ? require("./flowalgo.js") : root.FlowAlgo;
  var INF = FA.INF;

  /* ---------- bipartite matching ---------- */
  // n nodes on each side, edges = [[i,j],...] (0-based). Returns the flow network G' and an index map for the middle edges.
  function bipNet(n, edges) {
    var H = Math.max(260, 60 * n), step = n > 1 ? (H - 80) / (n - 1) : 0, nodes = [["s", 40, H / 2]], i;
    for (i = 0; i < n; i++) nodes.push([String(i + 1), 210, 40 + i * step]);
    for (i = 0; i < n; i++) nodes.push([(i + 1) + "′", 430, 40 + i * step]);
    nodes.push(["t", 600, H / 2]);
    var E = [], mid = [];
    for (i = 0; i < n; i++) E.push([0, 1 + i, 1]);
    edges.slice().sort(function (a, b) { return a[0] - b[0] || a[1] - b[1]; }).forEach(function (e) { mid.push({ e: E.length, i: e[0], j: e[1] }); E.push([1 + e[0], 1 + n + e[1], 1]); });
    for (i = 0; i < n; i++) E.push([1 + n + i, 2 * n + 1, 1]);
    return { net: FA.makeNet({ w: 640, h: H, nodes: nodes, edges: E, s: 0, t: 2 * n + 1 }), mid: mid, n: n };
  }
  function hall(bn, f) {
    var A = FA.reach(bn.net, f), n = bn.n, S = [], N = [], i;
    for (i = 0; i < n; i++) { if (A[1 + i]) S.push(i); if (A[1 + n + i]) N.push(i); }
    return { S: S, N: N, A: A };
  }

  /* ---------- edge-disjoint paths ---------- */
  function decompose(net, f) {
    var used = f.map(function () { return false; }), paths = [];
    for (;;) {
      var path = [], seen = {}, u = net.s, ok = true;
      seen[u] = 0;
      while (u !== net.t) {
        var k = -1;
        for (var e = 0; e < net.edges.length; e++) if (!used[e] && f[e] > 0 && net.edges[e].u === u) { k = e; break; }
        if (k < 0) { ok = false; break; }
        used[k] = true; path.push(k); u = net.edges[k].v;
        if (seen[u] !== undefined && u !== net.t) { path = path.slice(0, seen[u]); for (var q in seen) if (seen[q] > seen[u]) delete seen[q]; }
        else seen[u] = path.length;
      }
      if (!ok) break;
      paths.push(path);
    }
    return paths;
  }

  /* ---------- project selection (maximum weight closure) ---------- */
  // proj: {names, values, prereq:[[v,u]] meaning "v requires u", pos:[[x,y]], w,h}
  function projectNet(proj) {
    var k = proj.names.length, nodes = [["s", proj.sPos ? proj.sPos[0] : 36, proj.sPos ? proj.sPos[1] : proj.h / 2]], edges = [], i;
    for (i = 0; i < k; i++) nodes.push([proj.names[i], proj.pos[i][0], proj.pos[i][1]]);
    nodes.push(["t", proj.tPos ? proj.tPos[0] : proj.w - 36, proj.tPos ? proj.tPos[1] : proj.h / 2]);
    for (i = 0; i < k; i++) { if (proj.values[i] > 0) edges.push([0, 1 + i, proj.values[i]]); else if (proj.values[i] < 0) edges.push([1 + i, k + 1, -proj.values[i]]); }
    proj.prereq.forEach(function (p) { edges.push([1 + p[0], 1 + p[1], INF]); });
    var net = FA.makeNet({ w: proj.w, h: proj.h, nodes: nodes, edges: edges, s: 0, t: k + 1 });
    net.edges.forEach(function (e) { if (e.u === 0) e.lp = 0.6; });
    return net;
  }
  function bestClosure(proj) {
    var net = projectNet(proj), m = FA.maxFlow(net), k = proj.names.length, chosen = [], sumPos = 0, i;
    for (i = 0; i < k; i++) { chosen.push(!!m.A[1 + i]); if (proj.values[i] > 0) sumPos += proj.values[i]; }
    return { net: net, f: m.f, chosen: chosen, minCut: m.value, sumPos: sumPos, profit: sumPos - m.value, A: m.A };
  }

  /* ---------- image segmentation ---------- */
  function segmentation(W, H, a, b, p) {
    var n = W * H, nodes = [["s", 0, 0]], E = [], i, x, y;
    for (i = 0; i < n; i++) nodes.push([String(i), 0, 0]);
    nodes.push(["t", 0, 0]);
    for (i = 0; i < n; i++) { if (a[i] > 0) E.push([0, 1 + i, a[i]]); if (b[i] > 0) E.push([1 + i, n + 1, b[i]]); }
    for (y = 0; y < H; y++) for (x = 0; x < W; x++) {
      i = y * W + x;
      if (p > 0 && x + 1 < W) { E.push([1 + i, 1 + i + 1, p]); E.push([1 + i + 1, 1 + i, p]); }
      if (p > 0 && y + 1 < H) { E.push([1 + i, 1 + i + W, p]); E.push([1 + i + W, 1 + i, p]); }
    }
    var net = FA.makeNet({ nodes: nodes, edges: E, s: 0, t: n + 1 }), m = FA.maxFlow(net), fg = [];
    for (i = 0; i < n; i++) fg.push(!!m.A[1 + i]);
    return { fg: fg, cut: m.value };
  }
  function segScore(W, H, a, b, p, fg) {
    var s = 0, sep = 0, x, y, i;
    for (i = 0; i < W * H; i++) s += fg[i] ? a[i] : b[i];
    for (y = 0; y < H; y++) for (x = 0; x < W; x++) {
      i = y * W + x;
      if (x + 1 < W && fg[i] !== fg[i + 1]) sep++;
      if (y + 1 < H && fg[i] !== fg[i + W]) sep++;
    }
    return { score: s - p * sep, sep: sep, data: s };
  }

  /* ---------- baseball elimination ---------- */
  // teams: [{name,w,r}], g[i][j] games left between i and j (symmetric), z = team being tested
  function baseball(teams, g, z) {
    var n = teams.length, best = teams[z].w + teams[z].r, i, j, trivial = null;
    for (i = 0; i < n; i++) if (i !== z && teams[i].w > best) trivial = i;
    var games = [];
    for (i = 0; i < n; i++) for (j = i + 1; j < n; j++) if (i !== z && j !== z && g[i][j] > 0) games.push([i, j]);
    var others = []; for (i = 0; i < n; i++) if (i !== z) others.push(i);
    var nodes = [["s", 36, 0]], idx = {}, E = [];
    games.forEach(function (gm) { idx["g" + gm[0] + "," + gm[1]] = nodes.length; nodes.push([gm[0] + "-" + gm[1], 210, 0]); });
    others.forEach(function (x) { idx["t" + x] = nodes.length; nodes.push([teams[x].name.slice(0, 3), 430, 0]); });
    var T = nodes.length; nodes.push(["t", 604, 0]);
    games.forEach(function (gm) {
      var u = idx["g" + gm[0] + "," + gm[1]];
      E.push([0, u, g[gm[0]][gm[1]]]); E.push([u, idx["t" + gm[0]], INF]); E.push([u, idx["t" + gm[1]], INF]);
    });
    others.forEach(function (x) { E.push([idx["t" + x], T, Math.max(0, best - teams[x].w)]); });
    var H = Math.max(280, 54 * Math.max(games.length, others.length) + 40);
    var gi = 0, ti = 0;
    nodes.forEach(function (nd, k) {
      if (k === 0 || k === T) nd[2] = H / 2;
      else if (nd[1] === 210) { nd[2] = 36 + gi * ((H - 72) / Math.max(1, games.length - 1)); gi++; }
      else { nd[2] = 36 + ti * ((H - 72) / Math.max(1, others.length - 1)); ti++; }
    });
    var net = FA.makeNet({ w: 640, h: H, nodes: nodes, edges: E, s: 0, t: T });
    return { net: net, trivial: trivial, best: best, games: games, others: others, idx: idx, need: games.reduce(function (s, gm) { return s + g[gm[0]][gm[1]]; }, 0) };
  }
  // after a max flow: eliminated? and the certificate set R of teams
  function baseballResult(bb, teams, g, f) {
    var net = bb.net, val = FA.value(net, f);
    if (bb.trivial !== null) return { eliminated: true, trivial: bb.trivial };
    if (val === bb.need) return { eliminated: false };
    var A = FA.reach(net, f), R = [];
    bb.others.forEach(function (x) { if (A[bb.idx["t" + x]]) R.push(x); });
    var wins = 0, games = 0;
    R.forEach(function (x) { wins += teams[x].w; });
    for (var a = 0; a < R.length; a++) for (var c = a + 1; c < R.length; c++) games += g[R[a]][R[c]];
    return { eliminated: true, R: R, wins: wins, games: games, avg: (wins + games) / R.length, A: A };
  }

  /* ---------- circulation with demands ---------- */
  // nodes: [{name,d,x,y}] with d < 0 = supply, d > 0 = demand; edges [[u,v,c]]
  function circulation(spec) {
    var n = spec.nodes.length, nodes = spec.nodes.map(function (v) { return [v.name, v.x, v.y]; }), E = spec.edges.map(function (e) { return [e[0], e[1], e[2]]; }), sup = 0, dem = 0;
    nodes.push(["S", 36, spec.h / 2]); nodes.push(["T", spec.w - 36, spec.h / 2]);
    spec.nodes.forEach(function (v, i) {
      if (v.d < 0) { E.push([n, i, -v.d]); sup += -v.d; }
      if (v.d > 0) { E.push([i, n + 1, v.d]); dem += v.d; }
    });
    return { net: FA.makeNet({ w: spec.w, h: spec.h, nodes: nodes, edges: E, s: n, t: n + 1 }), supply: sup, demand: dem, n: n, nOrig: spec.edges.length };
  }

  var API = { bipNet: bipNet, hall: hall, decompose: decompose, projectNet: projectNet, bestClosure: bestClosure, segmentation: segmentation, segScore: segScore,
              baseball: baseball, baseballResult: baseballResult, circulation: circulation };
  if (typeof module !== "undefined" && module.exports) module.exports = API; else root.FlowApps = API;
})(typeof window !== "undefined" ? window : this);
