/* Max-flow algorithms that record every step, for the Algorithm Design visualisations.
   Pure logic, no DOM. Works in the browser (window.FlowAlgo) and in Node (module.exports).

   Residual arcs: for edge e (u -> v, capacity c, flow f)
     arc 2e   : u -> v with residual capacity c - f   (forward)
     arc 2e+1 : v -> u with residual capacity f       (backward, "undo")
*/
(function (root) {
  "use strict";
  var INF = 1e9;

  /* ---------- model ---------- */
  function makeNet(spec) {
    return {
      nodes: spec.nodes.map(function (n) { return { name: n[0], x: n[1], y: n[2] }; }),
      edges: spec.edges.map(function (e) { return { u: e[0], v: e[1], c: e[2] }; }),
      s: spec.s || 0,
      t: spec.t === undefined ? spec.nodes.length - 1 : spec.t,
      w: spec.w || 640,
      h: spec.h || 300
    };
  }
  function cloneNet(net) {
    return {
      nodes: net.nodes.map(function (n) { return { name: n.name, x: n.x, y: n.y }; }),
      edges: net.edges.map(function (e) { return { u: e.u, v: e.v, c: e.c }; }),
      s: net.s, t: net.t, w: net.w, h: net.h
    };
  }
  function zeros(n) { var a = new Array(n); for (var i = 0; i < n; i++) a[i] = 0; return a; }
  function nm(net, i) { return net.nodes[i].name; }

  function value(net, f) {
    var v = 0;
    net.edges.forEach(function (e, i) { if (e.u === net.s) v += f[i]; if (e.v === net.s) v -= f[i]; });
    return v;
  }
  function arcRes(net, f, a) { var e = a >> 1; return (a & 1) ? f[e] : net.edges[e].c - f[e]; }
  function arcFrom(net, a) { var e = net.edges[a >> 1]; return (a & 1) ? e.v : e.u; }
  function arcTo(net, a) { var e = net.edges[a >> 1]; return (a & 1) ? e.u : e.v; }
  function residualAdj(net, f) {
    var adj = net.nodes.map(function () { return []; });
    net.edges.forEach(function (e, i) {
      if (e.c - f[i] > 0) adj[e.u].push(2 * i);
      if (f[i] > 0) adj[e.v].push(2 * i + 1);
    });
    return adj;
  }
  function bottleneck(net, f, path) {
    var b = INF; path.forEach(function (a) { b = Math.min(b, arcRes(net, f, a)); }); return b;
  }
  function augment(net, f, path, b) {
    path.forEach(function (a) { if (a & 1) f[a >> 1] -= b; else f[a >> 1] += b; });
  }
  function pathText(net, path) {
    if (!path || !path.length) return "";
    var s = nm(net, arcFrom(net, path[0]));
    path.forEach(function (a) { s += (a & 1 ? " ⇠ " : " → ") + nm(net, arcTo(net, a)); });
    return s;
  }
  function pathHasBackward(path) { return path.some(function (a) { return a & 1; }); }

  /* ---------- reachability, cuts ---------- */
  function reach(net, f, minR) {
    minR = minR || 1;
    var adj = residualAdj(net, f), seen = net.nodes.map(function () { return false; });
    seen[net.s] = true; var q = [net.s];
    for (var h = 0; h < q.length; h++) {
      adj[q[h]].forEach(function (a) {
        if (arcRes(net, f, a) < minR) return;
        var v = arcTo(net, a); if (!seen[v]) { seen[v] = true; q.push(v); }
      });
    }
    return seen;
  }
  function cutEdgeIds(net, A) {
    var r = []; net.edges.forEach(function (e, i) { if (A[e.u] && !A[e.v]) r.push(i); }); return r;
  }
  function cutCap(net, A) {
    var c = 0; cutEdgeIds(net, A).forEach(function (i) { c += net.edges[i].c; }); return c;
  }
  function netFlowAcross(net, f, A) {
    var x = 0;
    net.edges.forEach(function (e, i) { if (A[e.u] && !A[e.v]) x += f[i]; else if (!A[e.u] && A[e.v]) x -= f[i]; });
    return x;
  }
  function setList(net, A, want) {
    var r = []; net.nodes.forEach(function (n, i) { if (!!A[i] === want) r.push(n.name); }); return r.join(", ");
  }

  /* ---------- path finding in the residual network ---------- */
  function rebuild(net, prev, t) {
    var path = [], v = t;
    while (prev[v] >= 0) { path.unshift(prev[v]); v = arcFrom(net, prev[v]); }
    return path;
  }
  /* rule: 'bfs' shortest | 'dfs' arbitrary | 'fat' largest bottleneck | 'thin' smallest bottleneck (adversary) */
  function findPath(net, f, rule, minR) {
    minR = minR || 1;
    var adj = residualAdj(net, f), n = net.nodes.length, s = net.s, t = net.t, i, h;
    function ok(a) { return arcRes(net, f, a) >= minR; }
    var prev = new Array(n);
    if (rule === "bfs") {
      for (i = 0; i < n; i++) prev[i] = -2;
      prev[s] = -1; var q = [s];
      for (h = 0; h < q.length; h++) {
        var u = q[h], L = adj[u];
        for (i = 0; i < L.length; i++) {
          var a = L[i]; if (!ok(a)) continue;
          var v = arcTo(net, a); if (prev[v] !== -2) continue;
          prev[v] = a; if (v === t) return rebuild(net, prev, t); q.push(v);
        }
      }
      return null;
    }
    if (rule === "dfs") {
      for (i = 0; i < n; i++) prev[i] = -2;
      prev[s] = -1;
      var found = false;
      (function go(u) {
        if (u === t) { found = true; return; }
        var L = adj[u];
        for (var k = 0; k < L.length && !found; k++) {
          var a2 = L[k]; if (!ok(a2)) continue;
          var v2 = arcTo(net, a2); if (prev[v2] !== -2) continue;
          prev[v2] = a2; go(v2);
        }
      })(s);
      return found ? rebuild(net, prev, t) : null;
    }
    if (rule === "fat") {
      var best = zeros(n), done = new Array(n);
      for (i = 0; i < n; i++) { prev[i] = -2; done[i] = false; }
      best[s] = INF; prev[s] = -1;
      for (;;) {
        var u2 = -1;
        for (i = 0; i < n; i++) if (!done[i] && prev[i] !== -2 && (u2 < 0 || best[i] > best[u2])) u2 = i;
        if (u2 < 0 || u2 === t) break;
        done[u2] = true;
        adj[u2].forEach(function (a3) {
          if (!ok(a3)) return;
          var v3 = arcTo(net, a3), w = Math.min(best[u2], arcRes(net, f, a3));
          if (!done[v3] && w > best[v3]) { best[v3] = w; prev[v3] = a3; }
        });
      }
      return prev[t] === -2 ? null : rebuild(net, prev, t);
    }
    if (rule === "thin") {
      var bestPath = null, bestB = INF + 1, count = 0, onp = new Array(n), cur = [];
      for (i = 0; i < n; i++) onp[i] = false;
      onp[s] = true;
      (function go2(u3) {
        if (count > 20000) return;
        if (u3 === t) {
          count++;
          var b = bottleneck(net, f, cur);
          if (b < bestB) { bestB = b; bestPath = cur.slice(); }
          return;
        }
        adj[u3].forEach(function (a4) {
          if (!ok(a4)) return;
          var v4 = arcTo(net, a4); if (onp[v4]) return;
          onp[v4] = true; cur.push(a4); go2(v4); cur.pop(); onp[v4] = false;
        });
      })(s);
      return bestPath || findPath(net, f, "dfs", minR);
    }
    throw new Error("unknown rule " + rule);
  }

  function levelsFromS(net, f) {
    var adj = residualAdj(net, f), lvl = net.nodes.map(function () { return -1; });
    lvl[net.s] = 0; var q = [net.s];
    for (var h = 0; h < q.length; h++) {
      adj[q[h]].forEach(function (a) {
        var v = arcTo(net, a); if (lvl[v] < 0) { lvl[v] = lvl[q[h]] + 1; q.push(v); }
      });
    }
    return lvl;
  }

  /* ---------- silent max flow (Dinitz) for the reductions ---------- */
  function maxFlow(net) {
    var f = zeros(net.edges.length);
    for (;;) {
      var lvl = levelsFromS(net, f);
      if (lvl[net.t] < 0) break;
      var adj = residualAdj(net, f), it = net.nodes.map(function () { return 0; });
      var stack = [], u = net.s;
      for (;;) {
        if (u === net.t) {
          var b = bottleneck(net, f, stack); augment(net, f, stack, b);
          stack = []; u = net.s; continue;
        }
        var moved = false;
        while (it[u] < adj[u].length) {
          var a = adj[u][it[u]];
          if (arcRes(net, f, a) > 0 && lvl[arcTo(net, a)] === lvl[u] + 1) { stack.push(a); u = arcTo(net, a); moved = true; break; }
          it[u]++;
        }
        if (!moved) {
          if (u === net.s) break;
          var back = stack.pop(); u = arcFrom(net, back); it[u]++;
        }
      }
    }
    return { f: f, value: value(net, f), A: reach(net, f) };
  }

  /* ---------- step recording ---------- */
  function Rec(net) {
    this.net = net; this.f = zeros(net.edges.length); this.steps = []; this.aug = 0; this.phase = 0;
  }
  Rec.prototype.push = function (kind, text, extra) {
    var s = { kind: kind, text: text, f: this.f.slice(), val: value(this.net, this.f), aug: this.aug, phase: this.phase };
    if (extra) for (var k in extra) s[k] = extra[k];
    this.steps.push(s); return s;
  };
  function doneStep(rec, why) {
    var net = rec.net, A = reach(net, rec.f), cap = cutCap(net, A);
    rec.push("done",
      why + " The nodes reachable from <b>s</b> in the residual network form <b>A = {" + setList(net, A, true) + "}</b>; every edge from A to B = {" + setList(net, A, false) +
      "} is saturated, so cap(A,B) = <b>" + cap + "</b> = flow value <b>" + value(net, rec.f) + "</b>. By the max-flow min-cut theorem, the flow is maximum and (A,B) is a minimum cut.",
      { cutA: A, cutE: cutEdgeIds(net, A) });
  }

  var RULE_NAME = { dfs: "arbitrary path (DFS)", bfs: "shortest path (BFS)", fat: "fattest path", thin: "worst-case path (adversary)" };

  function runFF(net, rule) {
    var rec = new Rec(net);
    rec.push("init", "Start with the zero flow. The residual network G<sub>f</sub> equals G. Rule for choosing augmenting paths: <b>" + RULE_NAME[rule] + "</b>.");
    for (;;) {
      var path = findPath(net, rec.f, rule);
      if (!path) { doneStep(rec, "No augmenting path: <b>t</b> cannot be reached from <b>s</b> in G<sub>f</sub>."); break; }
      var b = bottleneck(net, rec.f, path);
      rec.push("find", "Augmenting path <b>" + pathText(net, path) + "</b>. Bottleneck = <b>" + b + "</b>." +
        (pathHasBackward(path) ? " It uses a backward arc (⇠): it <i>undoes</i> part of an earlier decision." : ""), { path: path, bott: b });
      augment(net, rec.f, path, b); rec.aug++;
      rec.push("augment", "Augment by " + b + ". Flow value is now <b>" + value(net, rec.f) + "</b> (" + rec.aug + " augmentation" + (rec.aug > 1 ? "s" : "") + " so far).", { flash: path, bott: b });
    }
    return rec.steps;
  }

  function runScaling(net) {
    var rec = new Rec(net), C = 0, i;
    net.edges.forEach(function (e) { if (e.c < INF) C = Math.max(C, e.c); });
    var D = 1; while (D * 2 <= C) D *= 2;
    rec.push("init", "Start with the zero flow. Largest capacity C = " + C + ", so start with scaling parameter Δ = " + D + " (largest power of 2 ≤ C).");
    for (; D >= 1; D = Math.floor(D / 2)) {
      rec.phase++;
      rec.push("scale", "<b>Δ = " + D + "</b>. Look only at residual arcs with capacity ≥ " + D + " (the Δ-residual network G<sub>f</sub>(Δ)); the other arcs are faded. Any path found here has bottleneck ≥ " + D + ".", { delta: D });
      for (;;) {
        var path = findPath(net, rec.f, "bfs", D);
        if (!path) {
          rec.push("scaleEnd", "No augmenting path in G<sub>f</sub>(" + D + ")." + (D > 1 ? " Halve Δ." : " Δ = 1, so G<sub>f</sub>(1) = G<sub>f</sub>: no augmenting path at all."), { delta: D });
          break;
        }
        var b = bottleneck(net, rec.f, path);
        rec.push("find", "Δ = " + D + ": path <b>" + pathText(net, path) + "</b>, bottleneck <b>" + b + "</b> (≥ Δ).", { path: path, bott: b, delta: D });
        augment(net, rec.f, path, b); rec.aug++;
        rec.push("augment", "Augment by " + b + ". Flow value is now <b>" + value(net, rec.f) + "</b>.", { flash: path, delta: D, bott: b });
      }
    }
    doneStep(rec, "Δ = 1 phase finished with no augmenting path.");
    return rec.steps;
  }

  function runDinitz(net) {
    var rec = new Rec(net), f = rec.f, s = net.s, t = net.t;
    rec.push("init", "Start with the zero flow. Dinitz works in <b>phases</b>. Each phase builds the <b>level graph</b> (BFS layers of the residual network) and pushes a <i>blocking flow</i> through it.");
    for (;;) {
      var lvl = levelsFromS(net, f);
      if (lvl[t] < 0) { doneStep(rec, "BFS cannot reach <b>t</b>: no augmenting path remains."); break; }
      rec.phase++;
      rec.push("level", "<b>Phase " + rec.phase + ".</b> BFS from s labels each node with its distance. Distance to t = <b>" + lvl[t] +
        "</b>. The level graph keeps only residual arcs that go from level <i>i</i> to level <i>i+1</i> (bold); all others are faded.", { level: lvl.slice(), lg: true });
      var dead = net.nodes.map(function () { return false; }), stack = [], u = s;
      for (;;) {
        var adj = residualAdj(net, f);
        if (u === t) {
          var b = bottleneck(net, f, stack), p = stack.slice();
          augment(net, f, p, b); rec.aug++;
          rec.push("augment", "Reached <b>t</b> along " + pathText(net, p) + ". Augment by <b>" + b + "</b>: flow value <b>" + value(net, f) + "</b>. Saturated arcs leave the level graph; restart from s.",
            { level: lvl.slice(), lg: true, dead: dead.slice(), flash: p, bott: b });
          stack = []; u = s; continue;
        }
        var nxt = -1;
        for (var k = 0; k < adj[u].length; k++) {
          var a = adj[u][k], v = arcTo(net, a);
          if (arcRes(net, f, a) > 0 && lvl[v] === lvl[u] + 1 && !dead[v] && (lvl[v] <= lvl[t])) { nxt = a; break; }
        }
        if (nxt >= 0) {
          stack.push(nxt); u = arcTo(net, nxt);
          rec.push("advance", u === t ? "<b>Advance</b> to t: found a path " + pathText(net, stack) + "." : "<b>Advance</b> along an arc of the level graph to " + nm(net, u) + ".",
            { level: lvl.slice(), lg: true, dead: dead.slice(), cur: stack.slice() });
        } else {
          if (u === s) {
            rec.push("phaseEnd", "Stuck at <b>s</b>: the blocking flow is complete. Every s→t path in the level graph now has a saturated arc. Distance to t will strictly increase in the next phase.",
              { level: lvl.slice(), lg: true, dead: dead.slice() });
            break;
          }
          dead[u] = true;
          var back = stack.pop(); var prevNode = arcFrom(net, back);
          rec.push("retreat", "<b>Retreat</b>: " + nm(net, u) + " has no outgoing level-graph arc left. Delete " + nm(net, u) + " and go back to " + nm(net, prevNode) + ".",
            { level: lvl.slice(), lg: true, dead: dead.slice(), cur: stack.slice(), killed: u });
          u = prevNode;
        }
      }
    }
    return rec.steps;
  }

  function runGreedy(net) {
    var rec = new Rec(net), f = rec.f, M = maxFlow(net).value;
    rec.push("init", "<b>Greedy</b>: repeatedly find an s→t path whose edges all have f(e) &lt; c(e), and push flow along it. Flow on an edge is <b>never decreased</b>.");
    for (;;) {
      var adj = net.nodes.map(function () { return []; }), seen = net.nodes.map(function () { return false; }), prev = net.nodes.map(function () { return -1; });
      net.edges.forEach(function (e, i) { if (f[i] < e.c) adj[e.u].push(2 * i); });
      var found = false; seen[net.s] = true;
      (function go(u) {
        if (u === net.t) { found = true; return; }
        for (var i = 0; i < adj[u].length && !found; i++) {
          var a = adj[u][i], v = arcTo(net, a); if (seen[v]) continue;
          seen[v] = true; prev[v] = a; go(v);
        }
      })(net.s);
      if (!found) break;
      var path = rebuild(net, prev, net.t), b = bottleneck(net, f, path);
      rec.push("find", "Greedy picks <b>" + pathText(net, path) + "</b>; bottleneck <b>" + b + "</b>.", { path: path, bott: b });
      augment(net, f, path, b); rec.aug++;
      rec.push("augment", "Flow value is now <b>" + value(net, f) + "</b>.", { flash: path, bott: b });
    }
    var v = value(net, f), extra = findPath(net, f, "bfs");
    if (v < M) {
      rec.push("stuck", "Greedy is stuck at <b>" + v + "</b>, but the maximum flow is <b>" + M + "</b>." +
        (extra ? " The residual network (right) still has the augmenting path <b>" + pathText(net, extra) + "</b>, which needs a backward arc. Greedy has no way to undo a bad decision." : ""),
        { path: extra || undefined, bad: true });
    } else {
      doneStep(rec, "Greedy happens to reach the maximum here.");
    }
    return rec.steps;
  }

  /* ---------- scoreboard ---------- */
  function scoreboard(net) {
    var rows = [], M = maxFlow(net).value;
    [["Ford–Fulkerson, arbitrary path (DFS)", function () { return runFF(net, "dfs"); }],
     ["Ford–Fulkerson, worst-case path", function () { return runFF(net, "thin"); }],
     ["Shortest augmenting path (BFS)", function () { return runFF(net, "bfs"); }],
     ["Fattest augmenting path", function () { return runFF(net, "fat"); }],
     ["Capacity scaling", function () { return runScaling(net); }],
     ["Dinitz (level graph)", function () { return runDinitz(net); }]].forEach(function (a) {
      var st = a[1](), last = st[st.length - 1];
      rows.push({ name: a[0], aug: last.aug, phases: last.phase, value: last.val, ok: last.val === M });
    });
    return rows;
  }

  /* ---------- presets ---------- */
  function lecture() {
    // 3 x 2 grid between s and t, in the style of the lecture slides
    return makeNet({
      w: 640, h: 330,
      nodes: [["s", 40, 165], ["a", 200, 55], ["b", 200, 165], ["c", 200, 275], ["d", 400, 55], ["e", 400, 165], ["f", 400, 275], ["t", 600, 165]],
      edges: [[0, 1, 10], [0, 2, 5], [0, 3, 15], [1, 4, 9], [1, 2, 4], [1, 5, 15], [2, 5, 8], [3, 2, 4], [3, 6, 16], [4, 7, 10], [4, 5, 15], [5, 7, 10], [6, 5, 6], [6, 7, 10]]
    });
  }
  function warmup() {
    return makeNet({
      w: 640, h: 260,
      nodes: [["s", 60, 130], ["a", 250, 45], ["b", 250, 215], ["t", 580, 130]],
      edges: [[0, 1, 3], [0, 2, 2], [1, 2, 1], [1, 3, 2], [2, 3, 3]]
    });
  }
  function greedyTrap() {
    return makeNet({
      w: 640, h: 280,
      nodes: [["s", 70, 215], ["v", 70, 50], ["w", 570, 215], ["t", 570, 50]],
      edges: [[0, 1, 2], [0, 2, 2], [1, 2, 1], [1, 3, 2], [2, 3, 2]],
      t: 3
    });
  }
  function expo(C) {
    C = C || 8;
    return makeNet({
      w: 640, h: 300,
      nodes: [["s", 320, 35], ["v", 130, 150], ["w", 510, 150], ["t", 320, 265]],
      edges: [[0, 1, C], [0, 2, C], [1, 2, 1], [1, 3, C], [2, 3, C]]
    });
  }
  function phases() {
    // found by search: Dinitz needs 4 phases because the shortest s-t distance grows 1 -> 2 -> 3 -> 4
    return makeNet({
      w: 640, h: 300,
      nodes: [["s", 40, 150], ["a", 190, 250], ["b", 330, 60], ["c", 470, 235], ["t", 600, 150]],
      edges: [[0, 4, 1], [0, 2, 1], [0, 1, 3], [1, 2, 3], [2, 4, 2], [2, 3, 1], [3, 4, 2]]
    });
  }
  function randomNet(seed, nLayers, width) {
    var x = seed || 1;
    function rnd() { x = (x * 1664525 + 1013904223) % 4294967296; return x / 4294967296; }
    nLayers = nLayers || 3; width = width || 3;
    var nodes = [["s", 40, 150]], layers = [[0]], id = 1, i, j;
    for (i = 0; i < nLayers; i++) {
      var L = [], cnt = 2 + Math.floor(rnd() * (width - 1));
      for (j = 0; j < cnt; j++) {
        nodes.push([String.fromCharCode(97 + id - 1), 40 + (i + 1) * (560 / (nLayers + 1)), 40 + (j + 0.5) * (240 / cnt)]);
        L.push(id++);
      }
      layers.push(L);
    }
    nodes.push(["t", 600, 150]); var t = id; layers.push([t]);
    var edges = [], has = {};
    function add(u, v) { var k = u + "," + v; if (has[k]) return; has[k] = 1; edges.push([u, v, 1 + Math.floor(rnd() * 9)]); }
    for (i = 0; i + 1 < layers.length; i++) {
      layers[i + 1].forEach(function (v) { add(layers[i][Math.floor(rnd() * layers[i].length)], v); });
      layers[i].forEach(function (u) { add(u, layers[i + 1][Math.floor(rnd() * layers[i + 1].length)]); });
      layers[i].forEach(function (u) { layers[i + 1].forEach(function (v) { if (rnd() < 0.3) add(u, v); }); });
    }
    return makeNet({ w: 640, h: 300, nodes: nodes, edges: edges, s: 0, t: t });
  }

  var PRESETS = [
    { id: "lecture", name: "Lecture-style network (8 nodes)", make: lecture,
      desc: "A network in the style of the lecture slides: three rows between s and t. Try every algorithm on it and compare." },
    { id: "warmup", name: "Warm-up (4 nodes)", make: warmup,
      desc: "The smallest interesting network. Maximum flow is 5; follow each augmentation by hand first." },
    { id: "greedy", name: "Greedy trap (lecture slide 19)", make: greedyTrap,
      desc: "The unique max flow sends nothing on v→w, but greedy picks s→v→w→t first and can never take it back. Run “Greedy”, then Ford–Fulkerson." },
    { id: "expo", name: "Exponential trap (lecture slide 39)", make: function () { return expo(8); },
      desc: "The middle edge has capacity 1. With unlucky path choices every augmentation pushes a single unit, so the number of augmentations is 2C. Change C below." },
    { id: "phases", name: "Growing path lengths (for Dinitz)", make: phases,
      desc: "The shortest s–t path gets longer after every phase (1, 2, 3, 4 edges). Watch the level graph change phase by phase." },
    { id: "random", name: "Random network", make: function () { return randomNet(Math.floor(Math.random() * 99999) + 1); },
      desc: "A random layered network. Press the button again for a new one." }
  ];

  var API = {
    INF: INF, makeNet: makeNet, cloneNet: cloneNet, zeros: zeros, nm: nm, value: value, arcRes: arcRes, arcFrom: arcFrom, arcTo: arcTo,
    residualAdj: residualAdj, bottleneck: bottleneck, augment: augment, pathText: pathText, reach: reach, cutEdgeIds: cutEdgeIds, cutCap: cutCap,
    netFlowAcross: netFlowAcross, setList: setList, findPath: findPath, levelsFromS: levelsFromS, maxFlow: maxFlow,
    runFF: runFF, runScaling: runScaling, runDinitz: runDinitz, runGreedy: runGreedy, scoreboard: scoreboard,
    expo: expo, randomNet: randomNet, PRESETS: PRESETS, lecture: lecture, warmup: warmup, phases: phases, greedyTrap: greedyTrap
  };
  if (typeof module !== "undefined" && module.exports) module.exports = API; else root.FlowAlgo = API;
})(typeof window !== "undefined" ? window : this);
