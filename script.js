const revealItems = document.querySelectorAll(".reveal");

const revealObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) {
        return;
      }

      entry.target.classList.add("is-visible");
      revealObserver.unobserve(entry.target);
    });
  },
  {
    threshold: 0.16,
  }
);

revealItems.forEach((item) => revealObserver.observe(item));

const metricValues = document.querySelectorAll(".metric-value");
let metricsAnimated = false;

const animateMetric = (node) => {
  const target = Number(node.dataset.target || 0);
  const suffix = node.dataset.suffix || "";
  const duration = 1200;
  const start = performance.now();

  const tick = (now) => {
    const progress = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    const value = Math.floor(target * eased);
    node.textContent = `${value}${suffix}`;

    if (progress < 1) {
      requestAnimationFrame(tick);
    }
  };

  requestAnimationFrame(tick);
};

const metricsObserver = new IntersectionObserver(
  (entries) => {
    const [entry] = entries;

    if (!entry?.isIntersecting || metricsAnimated) {
      return;
    }

    metricsAnimated = true;
    metricValues.forEach(animateMetric);
    metricsObserver.disconnect();
  },
  { threshold: 0.3 }
);

const metricsSection = document.querySelector(".metrics");
if (metricsSection) {
  metricsObserver.observe(metricsSection);
}

const filterButtons = document.querySelectorAll(".filter-chip");
const publicationCards = document.querySelectorAll(".publication-card");

filterButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const filter = button.dataset.filter;

    filterButtons.forEach((item) => {
      item.classList.remove("is-active");
      item.setAttribute("aria-pressed", "false");
    });
    button.classList.add("is-active");
    button.setAttribute("aria-pressed", "true");

    publicationCards.forEach((card) => {
      const isVisible = filter === "all" || card.dataset.topic === filter;
      card.classList.toggle("is-hidden", !isVisible);
    });
  });
});
