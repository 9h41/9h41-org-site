// Phone-only scroll effects, measured on the Wix site (390px wide):
// - header pinned and transparent, slides away when scrolling down, comes back after scrolling up;
// - home: service numbers grow in, industry cards turn in on their vertical axis, figures grow in,
//   each scrubbed by the element's position in the viewport (f = its top / viewport height).
(() => {
  const phone = window.matchMedia("(max-width: 768px)");
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
  const header = document.querySelector(".site-header");
  const nums = [...document.querySelectorAll(".page-home .services-steps .step-num")];
  const cards = [...document.querySelectorAll(".page-home .stack-card")];
  const figures = [...document.querySelectorAll(".page-home .figures-grid strong")];

  const clamp01 = (v) => Math.min(1, Math.max(0, v));
  const topRatio = (el) => el.getBoundingClientRect().top / window.innerHeight;

  // header: hidden past 500px while going down, shown again after 150px back up
  let lastY = window.scrollY;
  let lowest = lastY;
  function updateHeader() {
    const y = window.scrollY;
    if (y > lastY) lowest = y;
    if (y <= 500 || lowest - y >= 150) header.classList.remove("header-hidden");
    else if (y > lastY) header.classList.add("header-hidden");
    lastY = y;
  }

  function scrub() {
    for (const el of nums) {
      const p = clamp01((0.96 - topRatio(el)) / 0.5);
      el.style.transform = `translateY(${(21 * (1 - p)).toFixed(1)}px) scale(${(0.37 + 0.63 * p).toFixed(3)})`;
    }
    for (const el of cards) {
      const p = clamp01((0.95 - topRatio(el)) / 0.37);
      el.style.transform = `perspective(800px) rotateY(${(120 * (1 - p)).toFixed(1)}deg)`;
    }
    for (const el of figures) {
      const p = clamp01((1.1 - topRatio(el)) / 0.3) ** 1.8;
      el.style.transform = `scale(${(0.4 + 0.6 * p).toFixed(3)})`;
    }
  }

  function clear() {
    header?.classList.remove("header-hidden");
    for (const el of [...nums, ...figures]) el.style.transform = "";
    for (const el of cards) el.style.transform = "";
  }

  let raf = 0;
  function frame() {
    raf = 0;
    if (!phone.matches || reduced.matches) return clear();
    if (header) updateHeader();
    scrub();
  }
  const request = () => { if (!raf) raf = requestAnimationFrame(frame); };

  window.addEventListener("scroll", request, { passive: true });
  window.addEventListener("resize", request);
  phone.addEventListener("change", request);
  request();
})();
