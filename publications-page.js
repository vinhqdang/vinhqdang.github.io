// Publications page: search, filter by type / theme / year, sort. Reads ?topic= from the URL.
(function () {
  const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const pubs = (window.sitePublications || []).map((p) => ({ ...p, topics: window.topicsOf(p) }));
  const list = document.querySelector("[data-pubs-list]");
  if (!list) return;

  const q = document.querySelector("#q");
  const fType = document.querySelector("#f-type");
  const fTopic = document.querySelector("#f-topic");
  const fSort = document.querySelector("#f-sort");
  const countEl = document.querySelector("[data-pubs-count]");

  const types = [...new Set(pubs.map((p) => p.type))];
  fType.innerHTML = '<option value="">All types</option>' + types.map((t) => `<option>${esc(t)}</option>`).join("");
  fTopic.innerHTML =
    '<option value="">All themes</option>' +
    window.siteTopics.map((t) => `<option value="${t.id}">${esc(t.label)}</option>`).join("");

  const wanted = new URLSearchParams(location.search).get("topic");
  if (wanted && window.siteTopics.some((t) => t.id === wanted)) fTopic.value = wanted;

  // Only show indexing facts that are confirmed; unconfirmed values are omitted (see methodology note).
  const badges = (p) => {
    const out = [];
    const wos = p.wos || "";
    if (/^(scie|esci|ssci)/i.test(wos)) out.push(`<span class="badge good">WoS ${esc(wos)}</span>`);
    const sc = p.scopus || "";
    const m = sc.match(/^(\d+)(st|nd|rd|th) percentile(?: \(([^)]*)\))?/i);
    if (m) out.push(`<span class="badge good" title="Scopus CiteScore percentile${m[3] ? " – " + esc(m[3]) : ""}">Scopus ${m[1]}${m[2]} pct.</span>`);
    else if (/^indexed/i.test(sc)) out.push('<span class="badge">Scopus indexed</span>');
    const sj = (p.scimago || "").match(/^Q[1-4]/);
    if (sj) out.push(`<span class="badge${sj[0] === "Q1" ? " good" : ""}">SJR ${esc(p.scimago)}</span>`);
    return out.length ? `<div class="badges">${out.join("")}</div>` : "";
  };

  const paint = () => {
    const needle = q.value.trim().toLowerCase();
    let items = pubs.filter((p) =>
      (!fType.value || p.type === fType.value) &&
      (!fTopic.value || p.topics.includes(fTopic.value)) &&
      (!needle || (p.title + " " + p.venue + " " + p.year).toLowerCase().includes(needle))
    );

    const s = fSort.value;
    items.sort((a, b) =>
      s === "title" ? a.title.localeCompare(b.title)
      : s === "year-asc" ? a.year - b.year
      : b.year - a.year
    );

    list.innerHTML = items.length
      ? items.map((p) => {
          const title = p.href ? `<a href="${esc(p.href)}" target="_blank" rel="noreferrer">${esc(p.title)}</a>` : esc(p.title);
          return `<article class="pub">
            <div class="yr">${esc(p.year)}</div>
            <div>
              <h3>${title}</h3>
              <div class="meta">${esc(p.venue)} · ${esc(p.type)}</div>
              ${badges(p)}
            </div>
          </article>`;
        }).join("")
      : '<p class="empty">No publications match these filters.</p>';

    countEl.textContent = `Showing ${items.length} of ${pubs.length} publications.`;
  };

  [q, fType, fTopic, fSort].forEach((el) => el.addEventListener("input", paint));
  paint();
})();
