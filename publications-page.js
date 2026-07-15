const badgeClass = (value) => {
  const v = (value || "").toLowerCase();

  const percentileMatch = v.match(/^(\d+)(st|nd|rd|th) percentile/);
  if (percentileMatch) {
    const pct = Number(percentileMatch[1]);
    if (pct >= 75) return "badge-good";
    if (pct >= 40) return "badge-mid";
    return "badge-low";
  }

  if (v.startsWith("q1") || v === "scie" || v === "indexed" || v.startsWith("book series")) {
    return "badge-good";
  }
  if (v.startsWith("q2") || v.startsWith("q3") || v === "esci" || v.includes("ssci")) {
    return "badge-mid";
  }
  if (v.startsWith("q4") || v === "not confirmed" || v === "uncertain" || v === "not covered" || v.startsWith("discontinued")) {
    return "badge-low";
  }
  return "badge-neutral";
};

const renderPublications = () => {
  const rows = Array.isArray(window.sitePublications) ? window.sitePublications.slice() : [];
  const tbody = document.querySelector("[data-pubs-body]");
  const countEl = document.querySelector("[data-pubs-count]");
  const table = document.querySelector("[data-pubs-table]");

  if (!tbody || !table) {
    return;
  }

  let sortKey = "year";
  let sortDir = "desc";
  let activeFilter = "all";

  const paint = () => {
    let items = rows.slice();

    if (activeFilter !== "all") {
      items = items.filter((row) => row.type === activeFilter);
    }

    items.sort((a, b) => {
      const av = (a[sortKey] || "").toString().toLowerCase();
      const bv = (b[sortKey] || "").toString().toLowerCase();
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    });

    tbody.innerHTML = items
      .map((row) => {
        const titleCell = row.href
          ? `<a href="${row.href}" target="_blank" rel="noreferrer">${row.title}</a>`
          : row.title;

        return `
          <tr>
            <td>${row.year || ""}</td>
            <td class="pubs-title">${titleCell}</td>
            <td>${row.venue}</td>
            <td>${row.type}</td>
            <td><span class="badge ${badgeClass(row.wos)}">${row.wos}</span></td>
            <td><span class="badge ${badgeClass(row.scopus)}">${row.scopus}</span></td>
            <td><span class="badge ${badgeClass(row.scimago)}">${row.scimago}</span></td>
          </tr>
        `;
      })
      .join("");

    if (countEl) {
      countEl.textContent = `Showing ${items.length} of ${rows.length} publications.`;
    }
  };

  table.querySelectorAll("th[data-sort]").forEach((th) => {
    th.addEventListener("click", () => {
      const key = th.dataset.sort;

      if (sortKey === key) {
        sortDir = sortDir === "asc" ? "desc" : "asc";
      } else {
        sortKey = key;
        sortDir = key === "year" ? "desc" : "asc";
      }

      table.querySelectorAll("th[data-sort]").forEach((other) => other.removeAttribute("aria-sort"));
      th.setAttribute("aria-sort", sortDir === "asc" ? "ascending" : "descending");

      paint();
    });
  });

  document.querySelectorAll(".publication-filters .filter-chip").forEach((button) => {
    button.addEventListener("click", () => {
      activeFilter = button.dataset.filter;

      document.querySelectorAll(".publication-filters .filter-chip").forEach((item) => {
        item.classList.remove("is-active");
        item.setAttribute("aria-pressed", "false");
      });
      button.classList.add("is-active");
      button.setAttribute("aria-pressed", "true");

      paint();
    });
  });

  paint();
};

renderPublications();
