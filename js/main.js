/**
 * Mason Dixon Animal Emergency Hospital — shared page behavior.
 * ES module (deferred by default). Progressive enhancement on top of
 * working HTML/CSS; no build step.
 */

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const desktop = window.matchMedia("(min-width: 1024px)");

/* ---------------------------------------------------------------
   Scroll-driven state: the sticky apply bar and the photo band's
   parallax. One rAF-throttled listener for both.
   --------------------------------------------------------------- */
const initScrollState = () => {
  const callBar = document.querySelector("[data-call-bar]");
  const band = document.querySelector("[data-parallax]");
  const bandImg = band?.querySelector("img") ?? null;
  let ticking = false;

  const update = () => {
    const pastHero = window.scrollY > window.innerHeight * 0.6;
    callBar?.classList.toggle("is-visible", pastHero);

    if (bandImg && !reduceMotion && desktop.matches) {
      const rect = band.getBoundingClientRect();
      const vh = window.innerHeight;
      if (rect.bottom > 0 && rect.top < vh) {
        // -1 (band entering from bottom) … +1 (band leaving at top)
        const progress = (rect.top + rect.height / 2 - vh / 2) / (vh / 2 + rect.height / 2);
        bandImg.style.setProperty("--parallax", `${(progress * -8).toFixed(2)}%`);
      }
    } else if (bandImg) {
      bandImg.style.removeProperty("--parallax");
    }
    ticking = false;
  };

  const onScroll = () => {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(update);
  };

  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll);
  update();
};

/* ---------------------------------------------------------------
   Scroll reveals via IntersectionObserver
   --------------------------------------------------------------- */
const initReveals = () => {
  const targets = document.querySelectorAll("[data-reveal], [data-reveal-stagger]");

  if (reduceMotion || !("IntersectionObserver" in window)) {
    targets.forEach((el) => el.classList.add("is-visible"));
    return;
  }

  const STEP = 70; // ms between siblings
  const CAP = 8;   // never delay a long grid forever
  document.querySelectorAll("[data-reveal-stagger]").forEach((group) => {
    [...group.children].forEach((child, i) => {
      child.style.setProperty("--reveal-delay", `${Math.min(i, CAP) * STEP}ms`);
    });
  });

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      // Also reveal anything already scrolled past (deep links, fast flicks)
      if (entry.isIntersecting || entry.boundingClientRect.top < 0) {
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      }
    });
  }, { rootMargin: "0px 0px -10% 0px", threshold: 0.05 });

  targets.forEach((el) => observer.observe(el));
};

/* ---------------------------------------------------------------
   FAQ accordion (one open at a time, animated with grid rows)
   --------------------------------------------------------------- */
const initAccordion = () => {
  const root = document.querySelector("[data-accordion]");
  if (!root) return;
  const items = [...root.querySelectorAll(".accordion__item")];

  const setOpen = (item, open) => {
    item.classList.toggle("is-open", open);
    item.querySelector(".accordion__trigger").setAttribute("aria-expanded", String(open));
  };

  items.forEach((item) => {
    item.querySelector(".accordion__trigger").addEventListener("click", () => {
      const willOpen = !item.classList.contains("is-open");
      items.forEach((other) => { if (other !== item) setOpen(other, false); });
      setOpen(item, willOpen);
    });
  });

  // Open the first answer by default so the section never looks empty.
  if (items[0]) setOpen(items[0], true);
};

initScrollState();
initReveals();
initAccordion();
