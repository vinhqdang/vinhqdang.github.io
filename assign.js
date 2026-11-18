/* Assignment problem: successive shortest path with compatible prices (Network Flow III).
   Pure logic: browser window.Assign, Node module.exports.
   Notation follows the lecture: reduced cost c^p(x,y) = p(x) + c(x,y) - p(y);
   prices are compatible with matching M when c^p(x,y) >= 0 for (x,y) not in M and c^p(x,y) = 0 for (x,y) in M. */
(function (root) {
  "use strict";
  var INF = 1e9;
  function zeros(n) { var a = []; for (var i = 0; i < n; i++) a.push(0); return a; }
  function ys(i) { return i + "′"; }

  function reduced(c, px, py) {
    return c.map(function (row, x) { return row.map(function (v, y) { return px[x] + v - py[y]; }); });
  }
  function compatible(c, px, py, match) {
    for (var x = 0; x < c.length; x++) for (var y = 0; y < c.length; y++) {
      var r = px[x] + c[x][y] - py[y];
      if (match[x] === y ? r !== 0 : r < 0) return false;
    }
    return true;
  }
  function totalCost(c, match) {
    var s = 0; match.forEach(function (y, x) { if (y >= 0) s += c[x][y]; }); return s;
  }

  /* brute force minimum cost perfect matching (n <= 8) */
  function brute(c) {
    var n = c.length, best = INF, bestM = null, used = [], cur = [];
    (function go(x, s) {
      if (s >= best) return;
      if (x === n) { best = s; bestM = cur.slice(); return; }
      for (var y = 0; y < n; y++) if (!used[y]) { used[y] = true; cur[x] = y; go(x + 1, s + c[x][y]); used[y] = false; }
    })(0, 0);
    return { cost: best, match: bestM };
  }

  function solve(c) {
    var n = c.length, match = [], matchY = [], px = zeros(n), py = zeros(n), steps = [], k, x, y, i;
    for (i = 0; i < n; i++) { match.push(-1); matchY.push(-1); }
    function snap(kind, text, extra) {
      var s = { kind: kind, text: text, match: match.slice(), px: px.slice(), py: py.slice(), size: match.filter(function (v) { return v >= 0; }).length, cost: totalCost(c, match), iter: k + 1 };
      if (extra) for (var q in extra) s[q] = extra[q];
      steps.push(s); return s;
    }
    k = -1;
    snap("init", "Start with the empty matching M = ∅ and all prices p = 0, so the reduced costs equal the original costs. These prices are compatible with M: every c<sup>p</sup>(x,y) ≥ 0, and there are no matched edges yet.");
    for (k = 0; k < n; k++) {
      var dx = [], dy = [], doneX = [], doneY = [], prevY = [], prevX = [];
      for (i = 0; i < n; i++) { dx.push(match[i] < 0 ? 0 : INF); dy.push(INF); doneX.push(false); doneY.push(false); prevY.push(-1); prevX.push(-1); }
      snap("iter", "<b>Iteration " + (k + 1) + " of " + n + ".</b> Find a <b>shortest alternating path</b> from any unmatched x to any unmatched y, using reduced costs (all ≥ 0, so Dijkstra works). Unmatched x start at distance 0; edges x→y that are not in M cost c<sup>p</sup>(x,y); matched edges are used backwards y→x at cost 0.", { dx: dx.slice(), dy: dy.slice(), doneX: doneX.slice(), doneY: doneY.slice() });
      for (;;) {
        var bu = null, bd = INF;
        for (i = 0; i < n; i++) {
          if (!doneX[i] && dx[i] < bd) { bd = dx[i]; bu = { side: "x", i: i }; }
          if (!doneY[i] && dy[i] < bd) { bd = dy[i]; bu = { side: "y", i: i }; }
        }
        if (!bu) break;
        var msg;
        if (bu.side === "x") {
          doneX[bu.i] = true;
          for (y = 0; y < n; y++) if (match[bu.i] !== y) {
            var nd = dx[bu.i] + px[bu.i] + c[bu.i][y] - py[y];
            if (nd < dy[y]) { dy[y] = nd; prevY[y] = bu.i; }
          }
          msg = "Settle <b>" + bu.i + "</b> at distance " + dx[bu.i] + ". Relax every edge " + bu.i + " → y′ that is not in M: d(y′) = min(d(y′), d(" + bu.i + ") + c<sup>p</sup>(" + bu.i + ",y′)).";
        } else {
          doneY[bu.i] = true;
          if (matchY[bu.i] >= 0) {
            var xm = matchY[bu.i];
            if (dy[bu.i] < dx[xm]) { dx[xm] = dy[bu.i]; prevX[xm] = bu.i; }
            msg = "Settle <b>" + ys(bu.i) + "</b> at distance " + dy[bu.i] + ". It is matched to " + xm + ", so follow the matched edge backwards at reduced cost 0: d(" + xm + ") ≤ " + dy[bu.i] + ".";
          } else {
            msg = "Settle <b>" + ys(bu.i) + "</b> at distance " + dy[bu.i] + ". It is unmatched: a path can end here (edge y′→t costs 0).";
          }
        }
        snap("settle", msg, { dx: dx.slice(), dy: dy.slice(), doneX: doneX.slice(), doneY: doneY.slice(), cur: bu });
      }
      // best unmatched y
      var yEnd = -1;
      for (y = 0; y < n; y++) if (matchY[y] < 0 && (yEnd < 0 || dy[y] < dy[yEnd])) yEnd = y;
      // reconstruct alternating path
      var nodes = [{ side: "y", i: yEnd }], addE = [], remE = [], cy = yEnd, cx;
      for (;;) {
        cx = prevY[cy]; nodes.unshift({ side: "x", i: cx }); addE.push([cx, cy]);
        if (match[cx] < 0) break;
        cy = match[cx]; nodes.unshift({ side: "y", i: cy }); remE.push([cx, cy]);
      }
      var pc = 0; addE.forEach(function (e) { pc += c[e[0]][e[1]]; }); remE.forEach(function (e) { pc -= c[e[0]][e[1]]; });
      var ptxt = nodes.map(function (nd) { return nd.side === "x" ? String(nd.i) : ys(nd.i); }).join(" → ");
      snap("path", "Shortest alternating path: <b>" + ptxt + "</b>. Its true cost is what we pay for the new edges minus what we get back for the removed ones: " +
        addE.map(function (e) { return c[e[0]][e[1]]; }).join(" + ") + (remE.length ? " − (" + remE.map(function (e) { return c[e[0]][e[1]]; }).join(" + ") + ")" : "") + " = <b>" + pc + "</b>. Distance to the end node " + ys(yEnd) + " = " + dy[yEnd] + ".",
        { dx: dx.slice(), dy: dy.slice(), doneX: doneX.slice(), doneY: doneY.slice(), path: nodes, addE: addE, remE: remE, pathCost: pc });
      // augment
      remE.forEach(function (e) { match[e[0]] = -1; matchY[e[1]] = -1; });
      addE.forEach(function (e) { match[e[0]] = e[1]; matchY[e[1]] = e[0]; });
      snap("augment", "Augment: add the " + addE.length + " new edge" + (addE.length > 1 ? "s" : "") + (remE.length ? " and remove the " + remE.length + " matched edge" + (remE.length > 1 ? "s" : "") : "") + ". Matching size " + (k + 1) + ", total cost " + totalCost(c, match) + ".",
        { dx: dx.slice(), dy: dy.slice(), flash: { addE: addE, remE: remE } });
      // prices
      var oldx = px.slice(), oldy = py.slice();
      for (i = 0; i < n; i++) { px[i] += dx[i]; py[i] += dy[i]; }
      var ok = compatible(c, px, py, match);
      snap("prices", "Update the prices: <b>p′ = p + d</b> (add each node’s distance to its price). Lemmas 1–3 of the lecture guarantee that the new prices are compatible with the new matching: every unmatched edge still has c<sup>p</sup> ≥ 0 and every matched edge has c<sup>p</sup> = 0." + (ok ? " ✓ (checked)" : " ✗"),
        { dx: dx.slice(), dy: dy.slice(), oldx: oldx, oldy: oldy, compat: ok });
    }
    var tot = totalCost(c, match), sp = 0, sq = 0;
    for (i = 0; i < n; i++) { sp += px[i]; sq += py[i]; }
    k = n - 1;
    snap("done", "<b>Done: a perfect matching of cost " + tot + ".</b> The prices are compatible with it, so every matched edge has reduced cost 0 and no matching can beat it (Observation 2): the matching is a minimum-cost assignment. Check: Σ p(y′) − Σ p(x) = " + sq + " − " + sp + " = " + (sq - sp) + " = cost.", { certificate: { sumY: sq, sumX: sp } });
    return steps;
  }

  var API = { solve: solve, brute: brute, reduced: reduced, compatible: compatible, totalCost: totalCost, INF: INF };
  if (typeof module !== "undefined" && module.exports) module.exports = API; else root.Assign = API;
})(typeof window !== "undefined" ? window : this);
