/**
 * Mason Dixon Animal Emergency Hospital — Option A behavior.
 * ES module (deferred by default). Progressive enhancement on top of
 * working HTML/CSS; no build step.
 */

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const desktop = window.matchMedia("(min-width: 1024px)");

/* ---------------------------------------------------------------
   Scroll-driven state: sticky call bar, and the
   why-us photo band's parallax. One rAF-throttled listener for all.
   --------------------------------------------------------------- */
const initScrollState = () => {
  const callBar = document.querySelector("[data-call-bar]");
  const payPill = document.querySelector("[data-pay-pill]");
  const band = document.querySelector("[data-parallax]");
  const bandImg = band?.querySelector("img") ?? null;
  let ticking = false;

  const update = () => {
    const y = window.scrollY;
    const pastHero = y > window.innerHeight * 0.6;
    callBar?.classList.toggle("is-visible", pastHero);
    payPill?.classList.toggle("is-raised", pastHero);

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
   Financing badge — on screen from the start, after a short beat so
   it reads as arriving rather than being part of the first paint.
   --------------------------------------------------------------- */
const initPayPill = () => {
  const pill = document.querySelector("[data-pay-pill]");
  if (!pill) return;
  const show = () => pill.classList.add("is-visible");
  if (reduceMotion) show();
  else window.setTimeout(show, 600);
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
   Process timeline — a stop is "done" once it has scrolled past
   about three-quarters of the way down the viewport. Stops that finish
   on the same scroll are staggered so they complete one after another.
   --------------------------------------------------------------- */
const initProcess = () => {
  const steps = [...document.querySelectorAll(".steps .step")];
  if (!steps.length) return;
  let ticking = false;

  const update = () => {
    ticking = false;
    const line = window.innerHeight * 0.75;
    let fresh = 0;
    steps.forEach((step, i) => {
      const node = step.querySelector(".step__node");
      const done = node.getBoundingClientRect().top < line;
      if (done && !step.classList.contains("is-done")) {
        const delay = `${fresh * 0.9}s`;
        step.style.setProperty("--d", delay);
        steps[i - 1]?.style.setProperty("--dl", delay);
        fresh += 1;
      }
      step.classList.toggle("is-done", done);
      steps[i - 1]?.classList.toggle("is-linked", done); // the line above fills once this stop is reached
    });
  };
  const request = () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } };

  window.addEventListener("scroll", request, { passive: true });
  window.addEventListener("resize", request);
  update();
};

/* ---------------------------------------------------------------
   Team carousel — native scroll-snap + looping prev/next arrows
   --------------------------------------------------------------- */
const initCarousel = () => {
  const carousel = document.querySelector("[data-carousel]");
  if (!carousel) return;
  const prev = document.querySelector("[data-carousel-prev]");
  const next = document.querySelector("[data-carousel-next]");

  const step = () => {
    const card = carousel.querySelector(".spot");
    const gap = parseFloat(getComputedStyle(carousel.querySelector(".spotlight__track")).columnGap) || 0;
    return card ? card.getBoundingClientRect().width + gap : carousel.clientWidth * 0.8;
  };
  // Loops: past the last card it returns to the first, and back from the first to the last
  const scrollByStep = (dir) => {
    const max = carousel.scrollWidth - carousel.clientWidth;
    const behavior = reduceMotion ? "auto" : "smooth";
    if (dir > 0 && carousel.scrollLeft >= max - 2) carousel.scrollTo({ left: 0, behavior });
    else if (dir < 0 && carousel.scrollLeft <= 2) carousel.scrollTo({ left: max, behavior });
    else carousel.scrollBy({ left: dir * step(), behavior });
  };

  prev?.addEventListener("click", () => scrollByStep(-1));
  next?.addEventListener("click", () => scrollByStep(1));
};

/* ---------------------------------------------------------------
   Reviews — one slide at a time (a Google review, a thank-you card or
   a gift), dots to switch. Every slide's photo is one element that
   lives in the section's backdrop and travels to the featured box
   beside the copy when its slide is shown; the photo that was featured
   travels back into the backdrop.
   --------------------------------------------------------------- */
const initReviews = () => {
  const root = document.querySelector("[data-reviews]");
  const section = root?.closest(".reviews");
  if (!root || !section) return;
  const slidesBox = root.querySelector(".reviews__slides");
  const slides = [...root.querySelectorAll(".review")];
  const photos = slides.map((slide) => document.getElementById(slide.dataset.photo));
  const slot = root.querySelector("[data-reviews-slot]");
  const dotsBox = root.querySelector("[data-reviews-dots]");
  if (!slot || !dotsBox || slides.length < 2 || photos.some((photo) => !photo)) return;

  root.classList.add("is-enhanced");
  const FEATURED_TILT = -3; // deg — straightened, but still a pinned snapshot
  const FIT = 0.94;         // leave room for the tilt's corners
  let current = -1;

  // Position of an element relative to the section, ignoring transforms
  // (so it stays correct while a reveal animation is running)
  const offsetIn = (el, ancestor) => {
    let x = 0, y = 0;
    for (let n = el; n && n !== ancestor; n = n.offsetParent) { x += n.offsetLeft; y += n.offsetTop; }
    return { x, y };
  };

  // Transform that carries a backdrop photo into the featured box, as large as
  // fits. Photos that were shot sideways (data-upright) are turned upright first.
  const featuredTransform = (photo) => {
    const upright = Number(photo.dataset.upright) || 0;
    const sideways = upright % 180 !== 0;
    const w = sideways ? photo.offsetHeight : photo.offsetWidth;
    const h = sideways ? photo.offsetWidth : photo.offsetHeight;
    const scale = Math.min((slot.offsetWidth * FIT) / w, (slot.offsetHeight * FIT) / h);
    const at = offsetIn(slot, section);
    const dx = at.x + slot.offsetWidth / 2 - (photo.offsetLeft + photo.offsetWidth / 2);
    const dy = at.y + slot.offsetHeight / 2 - (photo.offsetTop + photo.offsetHeight / 2);
    return `translate(${dx.toFixed(1)}px, ${dy.toFixed(1)}px) rotate(${upright + FEATURED_TILT}deg) scale(${scale.toFixed(4)})`;
  };

  // Recompute the featured photo's spot without animating (resize, fonts loading)
  const settle = () => {
    const photo = photos[current];
    if (!photo) return;
    photo.style.transition = "none";
    photo.style.transform = featuredTransform(photo);
    photo.getBoundingClientRect(); // flush so the jump isn't animated
    photo.style.transition = "";
  };

  const dots = slides.map((_, i) => {
    const dot = document.createElement("button");
    dot.type = "button";
    dot.className = "reviews__dot";
    dot.setAttribute("aria-label", `Show ${i + 1} of ${slides.length}`);
    dot.setAttribute("aria-controls", slides[i].id);
    dot.addEventListener("click", () => show(i, true));
    dotsBox.append(dot);
    return dot;
  });

  const show = (index, byUser = false) => {
    if (index === current) return;
    const leaving = photos[current];
    current = index;
    if (byUser) slidesBox.setAttribute("aria-live", "polite");

    slides.forEach((slide, i) => slide.classList.toggle("is-active", i === index));
    dots.forEach((dot, i) => {
      if (i === index) dot.setAttribute("aria-current", "true");
      else dot.removeAttribute("aria-current");
    });

    if (leaving) { // back into the backdrop; keeps its height until it lands
      leaving.classList.remove("is-active");
      leaving.classList.add("is-leaving");
      leaving.style.transform = "";
      leaving.alt = "";
      setTimeout(() => leaving.classList.remove("is-leaving"), reduceMotion ? 0 : 1000);
    }
    const photo = photos[index];
    photo.classList.remove("is-leaving");
    photo.classList.add("is-active");
    photo.alt = photo.dataset.alt || "";
    photo.style.transform = featuredTransform(photo);
  };

  dotsBox.addEventListener("keydown", (event) => {
    const step = { ArrowLeft: -1, ArrowUp: -1, ArrowRight: 1, ArrowDown: 1 }[event.key];
    if (!step) return;
    event.preventDefault();
    const next = (current + step + slides.length) % slides.length;
    show(next, true);
    dots[next].focus();
  });

  if ("ResizeObserver" in window) new ResizeObserver(settle).observe(section);
  else window.addEventListener("resize", settle);

  // Wait for the section to come into view so the first photo's trip from the
  // backdrop is seen; without observers the first slide simply shows
  if (reduceMotion || !("IntersectionObserver" in window)) { show(0); return; }
  const observer = new IntersectionObserver(([entry]) => {
    if (!entry.isIntersecting && entry.boundingClientRect.top >= 0) return;
    observer.disconnect();
    show(0);
  }, { threshold: 0.35 });
  observer.observe(root);
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

/* ---------------------------------------------------------------
   Hero background video — never plays for reduced-motion users and
   pauses while the hero is off-screen to save CPU/battery.
   --------------------------------------------------------------- */
const initHeroVideo = () => {
  const video = document.querySelector("[data-hero-video]");
  if (!video) return;

  if (reduceMotion) {
    video.removeAttribute("autoplay");
    video.pause();
    return;
  }

  if (!("IntersectionObserver" in window)) return;
  const observer = new IntersectionObserver(([entry]) => {
    if (entry.isIntersecting) video.play().catch(() => {});
    else video.pause();
  }, { threshold: 0.1 });
  observer.observe(video);
};

initHeroVideo();
initScrollState();
initPayPill();
initReveals();
initCarousel();
initReviews();
initProcess();
initAccordion();
