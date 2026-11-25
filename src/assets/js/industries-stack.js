(() => {
  const section = document.querySelector(".industries.industries-stack");
  if (!section) return;
  const pinnedInner = section.querySelector(".industries-inner");
  const stickyTrack = section.querySelector(".industry-stack-wrap");
  if (!pinnedInner || !stickyTrack) return;

  const media = window.matchMedia("(max-width: 768px)");
  const phone = window.matchMedia("(max-width: 768px)"); // phones: scroll-effects.js turns the cards in
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const cards = Array.from(section.querySelectorAll(".stack-card"));
  if (cards.length === 0) return;

  let rafId = 0;

  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);

  function render() {
    rafId = 0;

    if (phone.matches) return;
    if (media.matches || prefersReducedMotion.matches) {
      cards.forEach((card, index) => {
        card.style.transform = `translate3d(0, ${index * 34}px, 0)`;
        card.classList.remove("is-covered");
        card.classList.add("is-active");
      });
      return;
    }

    // the home page may be zoomed (scaled 1440px design): CSS lengths are multiplied by z on screen
    const z = parseFloat(getComputedStyle(section.closest(".page-content") || section).zoom) || 1;
    const stickyTop = 126 * z;
    const trackOffset = (parseFloat(getComputedStyle(stickyTrack).marginTop) || 74) * z;
    const start = section.getBoundingClientRect().top + window.scrollY + trackOffset - stickyTop;
    const stickyDistance = Math.max(
      1,
      pinnedInner.getBoundingClientRect().height - stickyTrack.getBoundingClientRect().height - stickyTop
    );
    const sectionProgress = clamp((window.scrollY - start) / stickyDistance, 0, 1);

    const spread = 509;
    const stackedGap = 0;
    const ys = [];

    cards.forEach((card, index) => {
      const localProgress = clamp(sectionProgress * (cards.length + 0.15) - index, 0, 1);
      const eased = easeOutCubic(localProgress);
      const startY = index * spread;
      const endY = index * stackedGap;
      const y = startY + (endY - startY) * eased;
      ys[index] = y;
      card.style.transform = `translate3d(0, ${y.toFixed(2)}px, 0)`;
    });

    // Fade text on cards that are currently covered by a card above.
    const cardHeight = (cards[0]?.getBoundingClientRect().height || 482 * z) / z;
    cards.forEach((card, index) => {
      let covered = false;
      for (let j = index + 1; j < cards.length; j += 1) {
        const overlap = ys[index] + cardHeight - ys[j];
        if (overlap > 60) {
          covered = true;
          break;
        }
      }
      card.classList.toggle("is-covered", covered);
      card.classList.toggle("is-active", !covered);
    });
  }

  function requestRender() {
    if (rafId) return;
    rafId = window.requestAnimationFrame(render);
  }

  window.addEventListener("scroll", requestRender, { passive: true });
  window.addEventListener("resize", requestRender);
  media.addEventListener("change", requestRender);
  prefersReducedMotion.addEventListener("change", requestRender);
  requestRender();
})();
