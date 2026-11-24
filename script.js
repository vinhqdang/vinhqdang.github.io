// Shared: render the news list from updates.js (into any [data-updates-list]).
(function () {
  const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const updates = Array.isArray(window.siteUpdates) ? window.siteUpdates : [];

  const ICONS = {
    Publication: '<path d="M7 3h7l5 5v13H7z"/><path d="M14 3v5h5M10 13h6M10 17h6"/>',
    Research: '<path d="M9 3v6L4 19a2 2 0 0 0 2 3h12a2 2 0 0 0 2-3l-5-10V3M8 3h8"/><path d="M8 15h8"/>',
    Site: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18"/>',
    Talk: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3M8 21h8"/>'
  };
  const COLORS = {
    Publication: ["var(--accent)", "#7a4fd1"],
    Research: ["#17855a", "#2457d6"],
    Site: ["#b7791f", "#d9480f"],
    Talk: ["#c8362f", "#7a4fd1"]
  };
  const hash = (str) => { let h = 2166136261; for (const c of str) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
  const pattern = (seed) => {
    let x = seed || 1;
    const rnd = () => ((x = (Math.imul(x, 1664525) + 1013904223) >>> 0) / 4294967296);
    const pts = Array.from({ length: 9 }, () => [rnd() * 150, rnd() * 150]);
    let g = "";
    pts.forEach((p, i) => { const q = pts[(i + 1 + Math.floor(rnd() * 3)) % pts.length]; g += `<line x1="${p[0].toFixed(0)}" y1="${p[1].toFixed(0)}" x2="${q[0].toFixed(0)}" y2="${q[1].toFixed(0)}" stroke="#fff" stroke-width="1"/>`; });
    pts.forEach((p) => { g += `<circle cx="${p[0].toFixed(0)}" cy="${p[1].toFixed(0)}" r="${(2 + rnd() * 3).toFixed(1)}" fill="#fff"/>`; });
    return `<svg class="pat" viewBox="0 0 150 150" preserveAspectRatio="xMidYMid slice" aria-hidden="true">${g}</svg>`;
  };

  document.querySelectorAll("[data-updates-list]").forEach((list) => {
    const limit = Number(list.dataset.updatesLimit || updates.length);
    list.innerHTML = updates
      .slice(0, limit)
      .map((u) => {
        const external = /^https?:\/\//.test(u.href);
        const attrs = external ? ' target="_blank" rel="noreferrer"' : "";
        const [c1, c2] = COLORS[u.type] || COLORS.Publication;
        const icon = ICONS[u.type] || ICONS.Publication;
        return `<li>
          <div class="vis" style="--c1:${c1};--c2:${c2}">${pattern(hash(u.title))}<svg class="ico" viewBox="0 0 24 24" aria-hidden="true">${icon}</svg><div class="d">${esc(u.date)}</div></div>
          <div class="body">
            <span class="t">${esc(u.type)}</span>
            <h3>${esc(u.title)}</h3>
            <p>${esc(u.summary)}</p>
            <a class="cta" href="${esc(u.href)}"${attrs}>${esc(u.cta)} &rarr;</a>
          </div>
        </li>`;
      })
      .join("");
  });
})();
