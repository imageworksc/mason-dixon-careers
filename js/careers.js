/**
 * Mason Dixon — Careers page behavior.
 * Loaded alongside main.js / menu.js; progressive enhancement only.
 */

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ---------------------------------------------------------------
   Openings — WAI-ARIA tabs on desktop (click, arrow keys, Home/End),
   an accordion of the same postings below 900px. One shared "current"
   role; on phones it can also be none, so every posting starts closed.
   Without JS every posting shows.
   --------------------------------------------------------------- */
const initJobs = () => {
  const root = document.querySelector("[data-jobs]");
  if (!root) return;
  const desktop = window.matchMedia("(min-width: 900px)");
  const tabs = [...root.querySelectorAll('[role="tab"]')];
  const toggles = [...root.querySelectorAll(".job__toggle")];
  const panels = tabs.map((tab) => document.getElementById(tab.getAttribute("aria-controls")));
  let current = desktop.matches ? 0 : -1;

  const render = () => {
    if (desktop.matches && current < 0) current = 0;
    panels.forEach((panel, i) => {
      const on = i === current;
      panel.hidden = !on;
      tabs[i].setAttribute("aria-selected", String(on));
      tabs[i].tabIndex = on ? 0 : -1;
      toggles[i].setAttribute("aria-expanded", String(on));
      panel.setAttribute("role", desktop.matches ? "tabpanel" : "region");
      panel.setAttribute("aria-labelledby", (desktop.matches ? tabs[i] : toggles[i]).id);
    });
  };

  tabs.forEach((tab, i) => tab.addEventListener("click", () => { current = i; render(); }));

  toggles.forEach((toggle, i) => toggle.addEventListener("click", () => {
    current = current === i ? -1 : i;
    render();
    if (current === i) toggle.scrollIntoView({ block: "nearest", behavior: reduceMotion ? "auto" : "smooth" });
  }));

  root.querySelector('[role="tablist"]').addEventListener("keydown", (event) => {
    const index = tabs.indexOf(document.activeElement);
    if (index < 0) return;
    const last = tabs.length - 1;
    const next = {
      ArrowRight: index === last ? 0 : index + 1,
      ArrowDown: index === last ? 0 : index + 1,
      ArrowLeft: index === 0 ? last : index - 1,
      ArrowUp: index === 0 ? last : index - 1,
      Home: 0,
      End: last,
    }[event.key];
    if (next === undefined) return;
    event.preventDefault();
    current = next;
    render();
    tabs[next].focus();
  });

  desktop.addEventListener("change", render);
  render();
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

initJobs();
initCountUp();
