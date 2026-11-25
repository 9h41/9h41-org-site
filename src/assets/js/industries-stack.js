(() => {
  const section = document.querySelector(".industries.industries-stack");
  if (!section) return;
  const pinnedInner = section.querySelector(".industries-inner");
  const stickyTrack = section.querySelector(".industry-stack-wrap");
  if (!pinnedInner || !stickyTrack) return;

  const media = window.matchMedia("(max-width: 1024px)");
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const cards = Array.from(section.querySelectorAll(".stack-card"));
  if (cards.length === 0) return;

  let rafId = 0;

  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);

  function render() {
    rafId = 0;

    if (media.matches || prefersReducedMotion.matches) {
      cards.forEach((card, index) => {
        card.style.transform = `translate3d(0, ${index * 34}px, 0)`;
        card.classList.remove("is-covered");
        card.classList.add("is-active");
      });
      return;
    }

    const stickyTop = 126;
    const trackOffset = 74;
    const start = section.offsetTop + trackOffset - stickyTop;
    const stickyDistance = Math.max(
      1,
      pinnedInner.offsetHeight - stickyTrack.offsetHeight - stickyTop
    );
    const sectionProgress = clamp((window.scrollY - start) / stickyDistance, 0, 1);

    const spread = 510;
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
    const cardHeight = cards[0]?.offsetHeight || stickyTrack.offsetHeight || 482;
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
