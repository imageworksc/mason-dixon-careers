/**
 * Mason Dixon — Careers page behavior.
 * Loaded alongside main.js / menu.js; progressive enhancement only.
 */

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ---------------------------------------------------------------
   Donated-services stat — counts up once when it scrolls into view
   --------------------------------------------------------------- */
const initCountUp = () => {
  const el = document.querySelector("[data-count]");
  if (!el || reduceMotion || !("IntersectionObserver" in window)) return;
  const target = Number(el.dataset.count);
  const format = (n) => `$${Math.round(n).toLocaleString("en-US")}`;
  const DURATION = 1800;

  const run = () => {
    const start = performance.now();
    const tick = (now) => {
      const t = Math.min((now - start) / DURATION, 1);
      const eased = 1 - Math.pow(1 - t, 4);
      el.textContent = format(target * eased);
      if (t < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };

  const observer = new IntersectionObserver(([entry]) => {
    if (!entry.isIntersecting) return;
    observer.disconnect();
    run();
  }, { threshold: 0.5 });
  observer.observe(el);
};

initCountUp();
