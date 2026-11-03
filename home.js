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
