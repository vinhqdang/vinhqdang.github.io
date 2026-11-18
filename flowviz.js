/* SVG drawing of flow networks + a step player. Depends on flowalgo.js (window.FlowAlgo). */
(function (root) {
  "use strict";
  var FA = root.FlowAlgo, NS = "http://www.w3.org/2000/svg", R = 18;

  function svg(tag, attrs, parent) {
    var e = document.createElementNS(NS, tag);
    if (attrs) for (var k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }
  function cap(c) { return c >= FA.INF ? "∞" : String(c); }

  /* ---------------------------------------------------------------- NetView */
  function NetView(el, opts) {
    this.svg = el; this.opts = opts || {}; this.mode = this.opts.mode || "flow";
    this.net = null; this.st = {};
    el.classList.add("nv", "nv-" + this.mode);
  }
  NetView.prototype.setNet = function (net) {
    var self = this, svgEl = this.svg;
    this.net = net;
    svgEl.setAttribute("viewBox", "0 0 " + net.w + " " + net.h);
    svgEl.innerHTML = "";
    this.gRegion = svg("g", { "class": "nv-region" }, svgEl);
    this.gEdges = svg("g", null, svgEl);
    this.gNodes = svg("g", null, svgEl);
    this.region = net.nodes.map(function () { return svg("circle", { r: 40, "class": "nv-reg" }, self.gRegion); });
    this.items = [];
    var count = this.mode === "flow" ? net.edges.length : net.edges.length * 2, i;
    for (i = 0; i < count; i++) this.items.push(this.makeItem(i));
    this.nodeEls = net.nodes.map(function (n, k) { return self.makeNode(k); });
    this.draw(this.st);
  };

  NetView.prototype.makeItem = function (i) {
    var g = svg("g", { "class": "nv-e" }, this.gEdges), o = { g: g };
    var self = this;
    if (this.mode === "flow") {
      o.track = svg("line", { "class": "nv-track" }, g);
      o.fill = svg("line", { "class": "nv-fill" }, g);
      o.head = svg("polygon", { "class": "nv-head" }, g);
      o.lbg = svg("rect", { "class": "nv-lbg", rx: 4 }, g);
      o.txt = svg("text", { "class": "nv-lab", "text-anchor": "middle" }, g);
      o.hit = svg("line", { "class": "nv-hit" }, g);
      o.title = svg("title", null, o.hit);
      o.hit.addEventListener("click", function (ev) { if (self.opts.onEdgeClick) self.opts.onEdgeClick(i, ev); });
      o.hit.addEventListener("contextmenu", function (ev) { if (self.opts.onEdgeClick) { ev.preventDefault(); self.opts.onEdgeClick(i, ev, true); } });
    } else {
      o.path = svg("path", { "class": "nv-arc" }, g);
      o.head = svg("polygon", { "class": "nv-head" }, g);
      o.lbg = svg("rect", { "class": "nv-lbg", rx: 4 }, g);
      o.txt = svg("text", { "class": "nv-lab", "text-anchor": "middle" }, g);
      o.hit = svg("path", { "class": "nv-hit", fill: "none" }, g);
      o.hit.addEventListener("click", function (ev) { if (self.opts.onArcClick) self.opts.onArcClick(i, ev); });
    }
    return o;
  };

  NetView.prototype.makeNode = function (k) {
    var self = this, n = this.net.nodes[k];
    var g = svg("g", { "class": "nv-n" }, this.gNodes);
    var o = { g: g };
    o.c = svg("circle", { r: R }, g);
    o.t = svg("text", { "text-anchor": "middle", dy: "0.35em", "class": "nv-name" }, g);
    o.t.textContent = n.name;
    o.b = svg("text", { "text-anchor": "middle", "class": "nv-badge" }, g);
    o.bb = svg("title", null, g);
    var down = null;
    g.addEventListener("pointerdown", function (ev) {
      down = { x: ev.clientX, y: ev.clientY, moved: false };
      if (self.opts.drag) { g.setPointerCapture(ev.pointerId); g.classList.add("grab"); }
      ev.preventDefault();
    });
    g.addEventListener("pointermove", function (ev) {
      if (!down || !self.opts.drag) return;
      if (Math.abs(ev.clientX - down.x) + Math.abs(ev.clientY - down.y) > 4) down.moved = true;
      if (!down.moved) return;
      var pt = self.svg.createSVGPoint(); pt.x = ev.clientX; pt.y = ev.clientY;
      var m = self.svg.getScreenCTM(); if (!m) return;
      var p = pt.matrixTransform(m.inverse());
      n.x = Math.max(R + 2, Math.min(self.net.w - R - 2, p.x)); n.y = Math.max(R + 2, Math.min(self.net.h - R - 2, p.y));
      self.draw(self.st);
      if (self.opts.onMove) self.opts.onMove();
    });
    function up() {
      if (down && !down.moved && self.opts.onNodeClick) self.opts.onNodeClick(k);
      down = null; g.classList.remove("grab");
    }
    g.addEventListener("pointerup", up);
    g.addEventListener("pointercancel", function () { down = null; g.classList.remove("grab"); });
    return o;
  };

  function unit(dx, dy) { var l = Math.sqrt(dx * dx + dy * dy) || 1; return [dx / l, dy / l]; }
  function headPoints(x, y, dx, dy) {
    var s = 10, px = -dy, py = dx;
    return (x) + "," + (y) + " " + (x - dx * s + px * s * 0.5) + "," + (y - dy * s + py * s * 0.5) + " " + (x - dx * s - px * s * 0.5) + "," + (y - dy * s - py * s * 0.5);
  }
  function setCls(el, map) {
    var base = el.getAttribute("data-base");
    if (base === null) { base = el.getAttribute("class") || ""; el.setAttribute("data-base", base); }
    var c = base; for (var k in map) if (map[k]) c += " " + k;
    el.setAttribute("class", c);
  }

  NetView.prototype.redraw = function () { this.draw(this.st); };

  NetView.prototype.draw = function (st) {
    st = st || {}; this.st = st;
    var net = this.net; if (!net) return;
    var f = st.f || FA.zeros(net.edges.length), self = this, i;
    var pathE = {}, pathA = {}, flashE = {}, cutE = {};
    (st.path || st.cur || []).forEach(function (a) { pathA[a] = true; pathE[a >> 1] = true; });
    (st.flash || []).forEach(function (a) { flashE[a >> 1] = true; });
    (st.cutE || []).forEach(function (e) { cutE[e] = true; });
    var dead = st.dead || [], lvl = st.level || null;

    /* cut region */
    this.region.forEach(function (c, k) {
      var on = st.cutA && st.cutA[k];
      c.setAttribute("cx", net.nodes[k].x); c.setAttribute("cy", net.nodes[k].y);
      c.style.display = on ? "" : "none";
    });

    if (this.mode === "flow") {
      net.edges.forEach(function (e, k) {
        var o = self.items[k], a = net.nodes[e.u], b = net.nodes[e.v];
        var d = unit(b.x - a.x, b.y - a.y);
        var x1 = a.x + d[0] * R, y1 = a.y + d[1] * R, x2 = b.x - d[0] * (R + 3), y2 = b.y - d[1] * (R + 3);
        var L = Math.sqrt((x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1));
        [o.track, o.fill, o.hit].forEach(function (l) { l.setAttribute("x1", x1); l.setAttribute("y1", y1); l.setAttribute("x2", x2); l.setAttribute("y2", y2); });
        var frac = e.c >= FA.INF ? (f[k] > 0 ? 1 : 0) : Math.min(1, f[k] / e.c);
        o.fill.setAttribute("stroke-dasharray", (L * frac) + " " + (L * 2));
        o.head.setAttribute("points", headPoints(x2 + d[0] * 3, y2 + d[1] * 3, d[0], d[1]));
        var lp = e.lp === undefined ? 0.5 : e.lp, mx = x1 + (x2 - x1) * lp, my = y1 + (y2 - y1) * lp;
        var label = st.edgeLabel ? st.edgeLabel(k) : f[k] + "/" + cap(e.c);
        o.txt.textContent = label; o.txt.setAttribute("x", mx); o.txt.setAttribute("y", my + 4);
        var w = label === "" ? 0 : Math.max(24, label.length * 7.4 + 8);
        o.lbg.setAttribute("x", mx - w / 2); o.lbg.setAttribute("y", my - 9); o.lbg.setAttribute("width", w); o.lbg.setAttribute("height", label === "" ? 0 : 18);
        o.title.textContent = nmEdge(net, k) + ": flow " + f[k] + " of capacity " + cap(e.c);
        var over = f[k] > e.c, sat = f[k] === e.c && e.c < FA.INF && e.c > 0;
        var cls = { sat: sat, over: over, hot: pathE[k], flash: flashE[k], cut: cutE[k], empty: f[k] === 0, removed: st.removed && st.removed[k], bad: st.badE && st.badE[k] };
        setCls(o.g, cls);
        var col = st.edgeColor && st.edgeColor[k] ? st.edgeColor[k] : "";
        o.fill.style.stroke = col; o.head.style.fill = col;
        if (self.opts.onEdgeClick) o.g.classList.add("clickable");
      });
    } else {
      var maxC = 1; net.edges.forEach(function (e) { if (e.c < FA.INF) maxC = Math.max(maxC, e.c); });
      for (i = 0; i < this.items.length; i++) {
        (function (a) {
          var o = self.items[a], e = net.edges[a >> 1], back = a & 1, r = back ? f[a >> 1] : e.c - f[a >> 1];
          var u = back ? e.v : e.u, v = back ? e.u : e.v, A = net.nodes[u], B = net.nodes[v];
          var hide = r <= 0;
          var d0 = unit(B.x - A.x, B.y - A.y), nx = -d0[1], ny = d0[0];
          var mx = (A.x + B.x) / 2, my = (A.y + B.y) / 2, bend = 15;
          var cx = mx + nx * bend * 2, cy = my + ny * bend * 2;
          var s1 = unit(cx - A.x, cy - A.y), s2 = unit(cx - B.x, cy - B.y);
          var x1 = A.x + s1[0] * R, y1 = A.y + s1[1] * R, x2 = B.x + s2[0] * (R + 3), y2 = B.y + s2[1] * (R + 3);
          var dpath = "M" + x1 + "," + y1 + " Q" + cx + "," + cy + " " + x2 + "," + y2;
          o.path.setAttribute("d", dpath); o.hit.setAttribute("d", dpath);
          var td = unit(x2 - cx, y2 - cy);
          o.head.setAttribute("points", headPoints(x2 - td[0] * 0 + td[0] * 3, y2 + td[1] * 3, td[0], td[1]));
          var lx = (x1 + 2 * cx + x2) / 4 + nx * 7, ly = (y1 + 2 * cy + y2) / 4 + ny * 7;
          var label = String(r);
          o.txt.textContent = label; o.txt.setAttribute("x", lx); o.txt.setAttribute("y", ly + 4);
          var w = Math.max(18, label.length * 7.4 + 6);
          o.lbg.setAttribute("x", lx - w / 2); o.lbg.setAttribute("y", ly - 8); o.lbg.setAttribute("width", w); o.lbg.setAttribute("height", 16);
          var dim = false;
          if (st.delta && r < st.delta) dim = true;
          if (st.lg && lvl) { if (!(lvl[v] === lvl[u] + 1 && lvl[u] >= 0)) dim = true; }
          if (dead[u] || dead[v]) dim = true;
          var lgOn = st.lg && lvl && lvl[v] === lvl[u] + 1 && !dead[u] && !dead[v];
          setCls(o.g, { gone: hide, back: back, hot: !!pathA[a] && !hide, dim: dim && !pathA[a], lg: lgOn && !dim,
                        sat: false, clickable: !!self.opts.onArcClick });
          o.hit.style.pointerEvents = hide ? "none" : "";
        })(i);
      }
    }

    /* nodes */
    net.nodes.forEach(function (n, k) {
      var o = self.nodeEls[k];
      o.g.setAttribute("transform", "translate(" + n.x + "," + n.y + ")");
      var inCur = st.curNodes && st.curNodes[k];
      if (!inCur && st.cur && st.cur.length) {
        st.cur.forEach(function (a) { if (FA.arcTo(net, a) === k || FA.arcFrom(net, a) === k) inCur = true; });
      }
      if (!inCur && st.path) st.path.forEach(function (a) { if (FA.arcTo(net, a) === k || FA.arcFrom(net, a) === k) inCur = true; });
      setCls(o.g, { s: k === net.s, t: k === net.t, inA: st.cutA && st.cutA[k], dead: dead[k], cur: inCur, clickable: !!self.opts.onNodeClick, grabbable: !!self.opts.drag });
      var b = st.badge && st.badge[k], bt = "";
      if (b) bt = typeof b === "string" ? b : b.text;
      else if (lvl && lvl[k] >= 0) bt = "L" + lvl[k];
      o.b.textContent = bt; o.b.setAttribute("y", -R - 6);
      o.b.setAttribute("class", "nv-badge" + (b && b.bad ? " bad" : ""));
      o.bb.textContent = "";
    });
  };

  function nmEdge(net, k) { return FA.nm(net, net.edges[k].u) + " → " + FA.nm(net, net.edges[k].v); }

  /* ----------------------------------------------------------------- Player */
  function Player(container, onStep) {
    var self = this;
    this.root = container; this.steps = []; this.i = 0; this.timer = null; this.onStep = onStep;
    container.classList.add("player");
    container.setAttribute("tabindex", "0");
    container.innerHTML =
      '<button class="btn small" data-a="first" title="First step" aria-label="First step">⏮</button>' +
      '<button class="btn small" data-a="prev" title="Previous (←)" aria-label="Previous step">◀</button>' +
      '<button class="btn small btn-primary" data-a="play" title="Play / pause (space)">▶ Play</button>' +
      '<button class="btn small" data-a="next" title="Next (→)" aria-label="Next step">▶|</button>' +
      '<button class="btn small" data-a="last" title="Run to the end" aria-label="Run to the end">⏭</button>' +
      '<input type="range" min="0" max="0" value="0" aria-label="Step" />' +
      '<span class="count" aria-live="polite"></span>' +
      '<label class="field inline">Speed <select data-a="speed"><option value="1400">slow</option><option value="800" selected>normal</option><option value="350">fast</option><option value="90">very fast</option></select></label>';
    this.btn = {};
    [].forEach.call(container.querySelectorAll("button"), function (b) { self.btn[b.getAttribute("data-a")] = b; b.addEventListener("click", function () { self.act(b.getAttribute("data-a")); }); });
    this.range = container.querySelector("input[type=range]");
    this.count = container.querySelector(".count");
    this.speed = container.querySelector("select");
    this.range.addEventListener("input", function () { self.pause(); self.go(+self.range.value); });
    container.addEventListener("keydown", function (ev) {
      if (ev.target.tagName === "SELECT" || ev.target.tagName === "INPUT") return;
      if (ev.key === "ArrowRight") { ev.preventDefault(); self.act("next"); }
      else if (ev.key === "ArrowLeft") { ev.preventDefault(); self.act("prev"); }
      else if (ev.key === " ") { ev.preventDefault(); self.act("play"); }
    });
  }
  Player.prototype.act = function (a) {
    if (a === "first") { this.pause(); this.go(0); }
    else if (a === "prev") { this.pause(); this.go(this.i - 1); }
    else if (a === "next") { this.pause(); this.go(this.i + 1); }
    else if (a === "last") { this.pause(); this.go(this.steps.length - 1); }
    else if (a === "play") { if (this.timer) this.pause(); else this.play(); }
  };
  Player.prototype.load = function (steps) { this.pause(); this.steps = steps; this.range.max = Math.max(0, steps.length - 1); this.go(0); };
  Player.prototype.go = function (i) {
    i = Math.max(0, Math.min(this.steps.length - 1, i)); this.i = i;
    this.range.value = i;
    this.count.textContent = "Step " + (i + 1) + " / " + this.steps.length;
    this.btn.first.disabled = this.btn.prev.disabled = i === 0;
    this.btn.next.disabled = this.btn.last.disabled = i >= this.steps.length - 1;
    if (this.onStep && this.steps.length) this.onStep(this.steps[i], i, this.steps);
  };
  Player.prototype.play = function () {
    var self = this;
    if (this.i >= this.steps.length - 1) this.go(0);
    this.btn.play.textContent = "⏸ Pause";
    var tick = function () {
      if (self.i >= self.steps.length - 1) { self.pause(); return; }
      self.go(self.i + 1);
      self.timer = setTimeout(tick, +self.speed.value);
    };
    this.timer = setTimeout(tick, 150);
  };
  Player.prototype.pause = function () {
    if (this.timer) clearTimeout(this.timer); this.timer = null;
    this.btn.play.textContent = "▶ Play";
  };

  root.FlowViz = { NetView: NetView, Player: Player, svg: svg, cap: cap, R: R };
})(window);
