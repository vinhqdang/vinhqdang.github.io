// Shared: render the news list from updates.js (into any [data-updates-list]).
(function () {
  const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const updates = Array.isArray(window.siteUpdates) ? window.siteUpdates : [];

  document.querySelectorAll("[data-updates-list]").forEach((list) => {
    const limit = Number(list.dataset.updatesLimit || updates.length);
    list.innerHTML = updates
      .slice(0, limit)
      .map((u) => {
        const external = /^https?:\/\//.test(u.href);
        const attrs = external ? ' target="_blank" rel="noreferrer"' : "";
        return `<li>
          <div class="d">${esc(u.date)}</div>
          <div>
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
