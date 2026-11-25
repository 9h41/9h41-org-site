(() => {
  const cards = Array.from(document.querySelectorAll(".services-steps .step-card"));
  const nums = cards.map((card) => card.querySelector(".step-num")).filter(Boolean);
  if (!cards.length || !nums.length) return;

  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
  if (reduced.matches) {
    cards.forEach((card) => card.classList.add("num-in"));
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.closest(".step-card")?.classList.add("num-in");
        observer.unobserve(entry.target);
      });
    },
    {
      root: null,
      threshold: 0.6,
      rootMargin: "0px 0px -18% 0px",
    }
  );

  nums.forEach((num, index) => {
    num.parentElement?.style.setProperty("--num-delay", `${index * 70}ms`);
    observer.observe(num);
  });
})();
