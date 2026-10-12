/**
 * Mason Dixon — Careers page behavior.
 * Loaded alongside main.js / menu.js; progressive enhancement only.
 */

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ---------------------------------------------------------------
   Openings filter — All / Full-Time / Part-Time chips
   --------------------------------------------------------------- */
const initJobFilter = () => {
  const root = document.querySelector("[data-job-filter]");
  if (!root) return;
  const buttons = [...root.querySelectorAll("button")];
  const jobs = [...document.querySelectorAll("[data-job]")];

  buttons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const filter = btn.dataset.filter;
      buttons.forEach((b) => b.setAttribute("aria-pressed", String(b === btn)));
      jobs.forEach((job) => {
        const types = job.dataset.job.split(" ");
        job.hidden = filter !== "all" && !types.includes(filter);
      });
    });
  });
};

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

initJobFilter();
initCountUp();
