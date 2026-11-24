// Theme switcher: applies the saved theme before first paint, then adds a small palette menu to the header.
(function () {
  var KEY = "vd-theme";
  var THEMES = [
    { id: "auto", name: "Auto", sw: ["#fbfaf7", "#2457d6", "#12151c"] },
    { id: "paper", name: "Paper", sw: ["#fbfaf7", "#2457d6", "#1d2330"] },
    { id: "ocean", name: "Ocean", sw: ["#eef7fb", "#0b7ea8", "#0f2a37"] },
    { id: "forest", name: "Forest", sw: ["#f3f7f0", "#2f7d4f", "#1b2a1f"] },
    { id: "sunset", name: "Sunset", sw: ["#fff6ef", "#d9480f", "#2b1d1a"] },
    { id: "orchid", name: "Orchid", sw: ["#f6f2fb", "#7048e8", "#231b33"] },
    { id: "midnight", name: "Midnight", sw: ["#12151c", "#7aa2ff", "#e8eaf0"] },
    { id: "aurora", name: "Aurora", sw: ["#0a1a1e", "#4fd1c5", "#e2f4f1"] }
  ];
  // Each theme can bring its own typeface (loaded on demand from Google Fonts; falls back to system fonts offline).
  var FONTS = {
    ocean: { fam: "Lora:ital,wght@0,400;0,500;0,600;1,400", css: '"Lora", Georgia, serif' },
    forest: { fam: "Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600", css: '"Fraunces", Georgia, serif' },
    sunset: { fam: "Merriweather:wght@400;700", css: '"Merriweather", Georgia, serif' },
    orchid: { fam: "Playfair+Display:wght@400;500;600", css: '"Playfair Display", Georgia, serif' },
    midnight: { fam: "IBM+Plex+Sans:wght@400;500;600", css: '"IBM Plex Sans", system-ui, sans-serif' },
    aurora: { fam: "Space+Grotesk:wght@400;500;600", css: '"Space Grotesk", system-ui, sans-serif' }
  };
  var root = document.documentElement;
  function setFont(id) {
    var f = FONTS[id], link = document.getElementById("vd-font");
    if (!f) { root.style.removeProperty("--serif"); if (link) link.remove(); return; }
    if (!link) { link = document.createElement("link"); link.id = "vd-font"; link.rel = "stylesheet"; document.head.appendChild(link); }
    link.href = "https://fonts.googleapis.com/css2?family=" + f.fam + "&display=swap";
    root.style.setProperty("--serif", f.css);
  }
  function read() { try { return localStorage.getItem(KEY) || "auto"; } catch (e) { return "auto"; } }
  function apply(id) {
    if (!id || id === "auto") root.removeAttribute("data-theme");
    else root.setAttribute("data-theme", id);
    setFont(id);
    try { if (!id || id === "auto") localStorage.removeItem(KEY); else localStorage.setItem(KEY, id); } catch (e) {}
    document.dispatchEvent(new CustomEvent("themechange", { detail: id }));
  }
  apply(read());

  function build() {
    var wrap = document.querySelector(".site-header .wrap");
    if (!wrap || wrap.querySelector(".theme-switch")) return;
    var box = document.createElement("div");
    box.className = "theme-switch";
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "theme-btn";
    btn.setAttribute("aria-haspopup", "true");
    btn.setAttribute("aria-expanded", "false");
    btn.setAttribute("aria-label", "Change colour theme");
    btn.innerHTML = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3a9 9 0 1 0 0 18c1.1 0 1.6-.8 1.6-1.6 0-.6-.3-1-.6-1.4-.3-.4-.5-.8-.5-1.3 0-1 .8-1.7 1.8-1.7H17a4 4 0 0 0 4-4c0-4.4-4-8-9-8z"/><circle cx="7.5" cy="11" r="1"/><circle cx="10.5" cy="7" r="1"/><circle cx="15" cy="7.5" r="1"/></svg>';
    var menu = document.createElement("div");
    menu.className = "theme-menu";
    menu.setAttribute("role", "menu");
    menu.hidden = true;
    THEMES.forEach(function (t) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "theme-opt";
      b.dataset.id = t.id;
      b.setAttribute("role", "menuitemradio");
      b.innerHTML = '<span class="sw" style="background:' + t.sw[0] + '"><i style="background:' + t.sw[1] + '"></i><i style="background:' + t.sw[2] + '"></i></span><span>' + t.name + "</span>";
      b.addEventListener("click", function () { apply(t.id); mark(); close(); });
      menu.appendChild(b);
    });
    function mark() {
      var cur = read();
      menu.querySelectorAll(".theme-opt").forEach(function (o) { o.setAttribute("aria-checked", String(o.dataset.id === cur)); });
    }
    function close() { menu.hidden = true; btn.setAttribute("aria-expanded", "false"); }
    btn.addEventListener("click", function (e) {
      e.stopPropagation();
      menu.hidden = !menu.hidden;
      btn.setAttribute("aria-expanded", String(!menu.hidden));
      mark();
    });
    document.addEventListener("click", function (e) { if (!box.contains(e.target)) close(); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") close(); });
    box.appendChild(btn);
    box.appendChild(menu);
    wrap.appendChild(box);
    mark();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", build);
  else build();
})();
