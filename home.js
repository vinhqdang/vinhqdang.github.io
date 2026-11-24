// Home page: live counts from publications.js (themes, stats, publications-per-year chart).
(function () {
  const pubs = Array.isArray(window.sitePublications) ? window.sitePublications : [];
  if (!pubs.length) return;

  const set = (sel, text) => document.querySelectorAll(sel).forEach((n) => (n.textContent = text));
  set("[data-pub-count]", pubs.length);

  const years = pubs.map((p) => Number(p.year)).filter(Boolean);
  const min = Math.min(...years), max = Math.max(...years);
  set("[data-year-span]", `${min}–${max}`);

  // theme counts
  const counts = {};
  pubs.forEach((p) => window.topicsOf(p).forEach((id) => (counts[id] = (counts[id] || 0) + 1)));
  document.querySelectorAll("[data-theme-count]").forEach((n) => {
    const c = counts[n.dataset.themeCount] || 0;
    n.textContent = `${c} publication${c === 1 ? "" : "s"} →`;
  });

  // publications per year
  const chart = document.querySelector("[data-year-chart]");
  if (chart) {
    const byYear = {};
    years.forEach((y) => (byYear[y] = (byYear[y] || 0) + 1));
    const top = Math.max(...Object.values(byYear));
    let html = "";
    for (let y = min; y <= max; y++) {
      const n = byYear[y] || 0;
      html += `<div class="col" title="${y}: ${n}"><span class="n">${n}</span><div class="bar" style="height:${Math.round((n / top) * 100)}px"></div><span class="y">${String(y).slice(2) === "" ? y : "’" + String(y).slice(2)}</span></div>`;
    }
    chart.innerHTML = html;
  }
})();

// Decorative network drawn behind the hero (colours follow the active theme through CSS).
(function () {
  const host = document.querySelector("[data-hero-art]");
  if (!host) return;
  let seed = 7;
  const rnd = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296);
  const W = 1200, H = 520, N = 46;
  const pts = Array.from({ length: N }, () => ({ x: rnd() * W, y: rnd() * H, r: 1.6 + rnd() * 3.2 }));
  let edges = "", nodes = "";
  pts.forEach((p, i) => {
    const near = pts.map((q, j) => ({ j, d: Math.hypot(p.x - q.x, p.y - q.y) })).filter((o) => o.j > i && o.d < 190).sort((a, b) => a.d - b.d).slice(0, 2);
    near.forEach((o) => { edges += `<line class="edge" x1="${p.x.toFixed(0)}" y1="${p.y.toFixed(0)}" x2="${pts[o.j].x.toFixed(0)}" y2="${pts[o.j].y.toFixed(0)}"/>`; });
    nodes += `<circle class="node${p.r > 3.6 ? " big" : ""}" cx="${p.x.toFixed(0)}" cy="${p.y.toFixed(0)}" r="${p.r.toFixed(1)}"/>`;
  });
  host.innerHTML = `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice">${edges}${nodes}</svg>`;
})();
