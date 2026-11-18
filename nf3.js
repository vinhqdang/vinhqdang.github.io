/* Network Flow III: the assignment problem and successive shortest paths. */
(function () {
  "use strict";
  var AS = window.Assign, FV = window.FlowViz;
  function $(id) { return document.getElementById(id); }
  function counters(el, items) { el.innerHTML = items.map(function (c) { return '<div class="cnt ' + (c[2] || "") + '">' + c[0] + "<b>" + c[1] + "</b></div>"; }).join(""); }
  function ys(i) { return i + "′"; }
  function fact(k) { var r = 1; for (var i = 2; i <= k; i++) r *= i; return r; }

  var PRE = [
    { id: "lec", name: "Lecture example (3 × 3, slide 3)", c: [[15, 7, 3], [5, 6, 2], [9, 4, 1]] },
    { id: "four", name: "A 4 × 4 example", c: [[9, 11, 14, 11], [6, 15, 13, 13], [12, 13, 6, 8], [11, 9, 10, 12]] },
    { id: "five", name: "A 5 × 5 example", c: [[9, 2, 7, 8, 4], [6, 4, 3, 7, 5], [5, 8, 1, 8, 2], [7, 6, 9, 4, 3], [3, 5, 8, 6, 9]] },
    { id: "rand", name: "Random costs (choose the size)", random: true }
  ];
  var C, n, picks, edit = false, opt, steps, px = [], py = [];
  var player = new FV.Player($("ss-player"), onStep);

  function randomC(k) { var c = []; for (var i = 0; i < k; i++) { c.push([]); for (var j = 0; j < k; j++) c[i].push(1 + Math.floor(Math.random() * 15)); } return c; }
  function select(id) {
    var p = PRE.filter(function (q) { return q.id === id; })[0];
    $("as-n-wrap").hidden = !p.random; $("as-new").hidden = !p.random;
    C = p.random ? randomC(+$("as-n").value) : p.c.map(function (r) { return r.slice(); });
    changed();
  }
  function changed() {
    n = C.length; picks = []; for (var i = 0; i < n; i++) picks.push(-1);
    opt = AS.brute(C); steps = AS.solve(C);
    px = []; py = []; for (i = 0; i < n; i++) { px.push(0); py.push(0); }
    drawProblem(); drawPrices(); buildGraph(); player.load(steps);
  }

  /* ---------------------------------------------------------------- 1. problem */
  function header(extra) {
    var h = "<tr><th></th>"; for (var j = 0; j < n; j++) h += "<th>" + ys(j) + (extra ? extra(j) : "") + "</th>"; return h + "</tr>";
  }
  function drawProblem() {
    var h = header(), x, y;
    for (x = 0; x < n; x++) {
      h += "<tr><th>" + x + "</th>";
      for (y = 0; y < n; y++) {
        if (edit) h += '<td><input type="number" min="0" max="99" value="' + C[x][y] + '" data-x="' + x + '" data-y="' + y + '" /></td>';
        else h += '<td class="cell' + (picks[x] === y ? " pick" : "") + '" data-x="' + x + '" data-y="' + y + '" tabindex="0">' + C[x][y] + "</td>";
      }
      h += "</tr>";
    }
    $("as-mx").innerHTML = h;
    var total = 0, done = 0, list = [];
    picks.forEach(function (y, x) { if (y >= 0) { total += C[x][y]; done++; list.push(x + " → " + ys(y) + " (" + C[x][y] + ")"); } });
    var html = "<h4>Your assignment</h4><p>" + (list.join("<br>") || "<span class='muted'>Click a cell in each row.</span>") + "</p>";
    if (done) html += "<p>Cost so far: <b>" + total + "</b> (" + done + " of " + n + " rows)</p>";
    if (done === n) {
      var ok = total === opt.cost;
      html += '<div class="verdict ' + (ok ? "ok" : "info") + '">' + (ok ? "✓ A perfect matching of cost <b>" + total + "</b>, the minimum. No assignment is cheaper." : "A perfect matching of cost " + total + ". Can you find a cheaper one?") + "</div>";
    }
    if ($("as-best").getAttribute("data-shown") === "1" && done === n && total === opt.cost) html += "<p class='small-text muted'>Found by checking all " + fact(n) + " assignments.</p>";
    html += "<p class='small-text muted'>Brute force checks n! = " + fact(n) + " assignments for n = " + n + ", and 2.4 × 10<sup>18</sup> for n = 20. Section 3 needs only about n³.</p>";
    $("as-info").innerHTML = html;
  }
  $("as-mx").addEventListener("click", function (ev) {
    var td = ev.target.closest("td.cell"); if (!td) return;
    var x = +td.getAttribute("data-x"), y = +td.getAttribute("data-y");
    if (picks[x] === y) picks[x] = -1;
    else { for (var r = 0; r < n; r++) if (picks[r] === y) picks[r] = -1; picks[x] = y; }
    $("as-best").removeAttribute("data-shown"); drawProblem();
  });
  $("as-mx").addEventListener("keydown", function (ev) { if ((ev.key === "Enter" || ev.key === " ") && ev.target.classList.contains("cell")) { ev.preventDefault(); ev.target.click(); } });
  $("as-mx").addEventListener("change", function (ev) {
    var t = ev.target; if (t.tagName !== "INPUT") return;
    C[+t.getAttribute("data-x")][+t.getAttribute("data-y")] = Math.max(0, Math.min(99, Math.floor(+t.value || 0)));
    var keep = edit; changed(); edit = keep; drawProblem();
  });
  $("as-edit").addEventListener("change", function () { edit = this.checked; drawProblem(); });
  $("as-clear").addEventListener("click", function () { picks = picks.map(function () { return -1; }); $("as-best").removeAttribute("data-shown"); drawProblem(); });
  $("as-best").addEventListener("click", function () { picks = opt.match.slice(); this.setAttribute("data-shown", "1"); drawProblem(); });
  $("as-pre").innerHTML = PRE.map(function (p) { return '<option value="' + p.id + '">' + p.name + "</option>"; }).join("");
  $("as-pre").addEventListener("change", function () { select(this.value); });
  $("as-n").addEventListener("change", function () { select("rand"); });
  $("as-new").addEventListener("click", function () { select("rand"); });

  /* ---------------------------------------------------------------- 2. prices */
  function drawPrices() {
    var R = AS.reduced(C, px, py), x, y, h = "<tr><th></th><th class='pin'>p(x)</th>";
    for (y = 0; y < n; y++) h += "<th>" + ys(y) + "</th>";
    h += "</tr>";
    var optSet = {}; opt.match.forEach(function (yy, xx) { optSet[xx + "," + yy] = true; });
    for (x = 0; x < n; x++) {
      h += "<tr><th>" + x + '</th><td class="pin"><input type="number" value="' + px[x] + '" data-px="' + x + '" /></td>';
      for (y = 0; y < n; y++) h += '<td class="cell static' + (optSet[x + "," + y] ? " opt" : "") + (R[x][y] < 0 ? " neg" : "") + (R[x][y] === 0 ? " tight" : "") + '"><b>' + R[x][y] + "</b><small>" + C[x][y] + "</small></td>";
      h += "</tr>";
    }
    h += "<tr><th class='pin'>p(y′)</th><td></td>";
    for (y = 0; y < n; y++) h += '<td class="pin"><input type="number" value="' + py[y] + '" data-py="' + y + '" /></td>';
    h += "</tr>";
    $("pr-mx").innerHTML = h;
    var sx = px.reduce(function (a, b) { return a + b; }, 0), sy = py.reduce(function (a, b) { return a + b; }, 0), bR = AS.brute(R);
    var same = bR.match.join() === opt.match.join(), shift = sx - sy;
    var allNonNeg = R.every(function (r) { return r.every(function (v) { return v >= 0; }); });
    var zeroOnOpt = opt.match.every(function (yy, xx) { return R[xx][yy] === 0; });
    var info = "<h4>Same optimal cells</h4><p class='small-text'>Optimal matching for the original costs: " + opt.match.map(function (yy, xx) { return xx + "→" + ys(yy); }).join(", ") + " (cost <b>" + opt.cost + "</b>).</p>";
    info += "<p class='small-text'>Optimal matching for the reduced costs: " + bR.match.map(function (yy, xx) { return xx + "→" + ys(yy); }).join(", ") + " (cost <b>" + bR.cost + "</b>) " + (same ? "<b>(the same)</b>" : "(a different one of equal cost)") + ".</p>";
    info += "<p class='small-text'>Every perfect matching changes by Σp(x) − Σp(y′) = " + sx + " − " + sy + " = <b>" + shift + "</b>. Here " + bR.cost + " − " + opt.cost + " = " + (bR.cost - opt.cost) + " ✓</p>";
    if (allNonNeg && zeroOnOpt) info += '<div class="verdict ok"><b>Compatible prices.</b> Every c<sup>p</sup> ≥ 0 and the optimal matching has c<sup>p</sup> = 0 on all its cells: it costs 0 and nothing can cost less. This is the optimality certificate (Observation 2, slide 17). Also Σp(y′) − Σp(x) = ' + (sy - sx) + ' = optimal cost.</div>';
    else info += '<div class="verdict info">' + (allNonNeg ? "All reduced costs are ≥ 0, but not all optimal cells are 0 yet." : "Some reduced costs are negative (red).") + " Not a certificate yet. Try the buttons above.</div>";
    $("pr-info").innerHTML = info;
  }
  $("pr-mx").addEventListener("change", function (ev) {
    var t = ev.target; if (t.tagName !== "INPUT") return; var v = Math.floor(+t.value || 0);
    if (t.getAttribute("data-px") !== null) px[+t.getAttribute("data-px")] = v; else py[+t.getAttribute("data-py")] = v;
    drawPrices();
  });
  $("pr-zero").addEventListener("click", function () { px = px.map(function () { return 0; }); py = py.map(function () { return 0; }); drawPrices(); });
  $("pr-rows").addEventListener("click", function () { py = py.map(function () { return 0; }); px = C.map(function (r) { return -Math.min.apply(null, r); }); drawPrices(); });
  $("pr-final").addEventListener("click", function () { var l = steps[steps.length - 1]; px = l.px.slice(); py = l.py.slice(); drawPrices(); });

  /* ---------------------------------------------------------------- 3. successive shortest paths */
  var svg = $("ss-svg"), gE, gN, eEls, xEls, yEls, tPx = [], tPy = [];
  function buildGraph() {
    var H = Math.max(260, 62 * n + 30), step = n > 1 ? (H - 80) / (n - 1) : 0, x, y;
    svg.setAttribute("viewBox", "0 0 520 " + H); svg.classList.add("nv"); svg.innerHTML = "";
    gE = FV.svg("g", null, svg); gN = FV.svg("g", null, svg); eEls = [];
    function Y(i) { return 40 + i * step; }
    for (x = 0; x < n; x++) { eEls.push([]); for (y = 0; y < n; y++) eEls[x].push(FV.svg("line", { x1: 130, y1: Y(x), x2: 390, y2: Y(y), "class": "as-e" }, gE)); }
    xEls = []; yEls = [];
    function node(side, i, cx) {
      var g = FV.svg("g", { "class": "as-n" }, gN), c = FV.svg("circle", { cx: cx, cy: Y(i), r: 17 }, g);
      var t = FV.svg("text", { x: cx, y: Y(i), dy: "0.35em", "text-anchor": "middle", "class": "as-name" }, g); t.textContent = side === "x" ? i : ys(i);
      var p = FV.svg("text", { x: side === "x" ? cx - 26 : cx + 26, y: Y(i), dy: "0.35em", "text-anchor": side === "x" ? "end" : "start", "class": "as-p" }, g);
      var d = FV.svg("text", { x: cx, y: Y(i) - 24, "text-anchor": "middle", "class": "as-d" }, g);
      return { g: g, p: p, d: d };
    }
    for (x = 0; x < n; x++) { xEls.push(node("x", x, 130)); yEls.push(node("y", x, 390)); }
  }
  function onStep(st) {
    var R = AS.reduced(C, st.px, st.py), x, y, isPathAdd = {}, isPathRem = {}, edges = st.addE || (st.flash && st.flash.addE) || [], rem = st.remE || (st.flash && st.flash.remE) || [];
    edges.forEach(function (e) { isPathAdd[e[0] + "," + e[1]] = true; }); rem.forEach(function (e) { isPathRem[e[0] + "," + e[1]] = true; });
    var showPath = st.kind === "path" || st.kind === "augment";
    for (x = 0; x < n; x++) for (y = 0; y < n; y++) {
      var cls = "as-e";
      if (st.match[x] === y) cls += " m";
      else if (R[x][y] === 0) cls += " tight";
      if (showPath && isPathAdd[x + "," + y]) cls += " add";
      if (showPath && isPathRem[x + "," + y] && st.kind === "path") cls += " rm";
      eEls[x][y].setAttribute("class", cls);
    }
    var pn = {}; (st.path || []).forEach(function (nd) { pn[nd.side + nd.i] = true; });
    function inf(v) { return v >= AS.INF ? "∞" : v; }
    for (x = 0; x < n; x++) {
      var mx = st.match[x] >= 0, my = st.match.indexOf(x) >= 0;
      xEls[x].g.setAttribute("class", "as-n X" + (mx ? " matched" : "") + (st.doneX && st.doneX[x] ? " settled" : "") + (pn["x" + x] && showPath ? " onpath" : "") + (st.cur && st.cur.side === "x" && st.cur.i === x && st.kind === "settle" ? " cur" : ""));
      yEls[x].g.setAttribute("class", "as-n Y" + (my ? " matched" : "") + (st.doneY && st.doneY[x] ? " settled" : "") + (pn["y" + x] && showPath ? " onpath" : "") + (st.cur && st.cur.side === "y" && st.cur.i === x && st.kind === "settle" ? " cur" : ""));
      xEls[x].p.textContent = "p=" + st.px[x]; yEls[x].p.textContent = "p=" + st.py[x];
      xEls[x].d.textContent = st.dx && st.kind !== "prices" ? "d=" + inf(st.dx[x]) : ""; yEls[x].d.textContent = st.dy && st.kind !== "prices" ? "d=" + inf(st.dy[x]) : "";
    }
    /* table */
    var h = "<tr><th></th>"; for (y = 0; y < n; y++) h += "<th>" + ys(y) + "<small class='pp'>p=" + st.py[y] + "</small></th>"; h += "</tr>";
    for (x = 0; x < n; x++) {
      h += "<tr><th>" + x + "<small class='pp'>p=" + st.px[x] + "</small></th>";
      for (y = 0; y < n; y++) {
        var c = "cell static" + (st.match[x] === y ? " m" : "") + (R[x][y] === 0 ? " tight" : "") + (R[x][y] < 0 ? " neg" : "") + (showPath && isPathAdd[x + "," + y] ? " padd" : "") + (showPath && st.kind === "path" && isPathRem[x + "," + y] ? " prem" : "");
        h += '<td class="' + c + '"><b>' + R[x][y] + "</b><small>" + C[x][y] + "</small></td>";
      }
      h += "</tr>";
    }
    $("ss-mx").innerHTML = h;
    var nr = $("ss-narr"); nr.className = "narr k-" + (st.kind === "path" ? "find" : st.kind === "augment" ? "augment" : st.kind === "done" ? "done" : st.kind === "settle" ? "advance" : st.kind === "prices" ? "level" : ""); nr.innerHTML = st.text;
    var cs = [["Matching size", st.size + " of " + n, st.kind === "done" ? "good" : ""], ["Iteration", st.kind === "init" ? 0 : st.iter], ["Cost of matching", st.cost]];
    if (st.kind === "path") cs.push(["Cost of this path", st.pathCost]);
    counters($("ss-cnt"), cs);
  }

  select("lec");
})();
