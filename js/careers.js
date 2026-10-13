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

  // After switching, bring the new posting's start into view if the reader
  // had scrolled down into the previous (often long) description
  const showFromTop = () => {
    const header = document.querySelector("[data-site-header]");
    const offset = (header ? header.getBoundingClientRect().height : 0) + 16;
    if (root.getBoundingClientRect().top >= offset) return;
    root.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
  };

  tabs.forEach((tab, i) => tab.addEventListener("click", () => {
    if (current === i) return;
    current = i;
    render();
    showFromTop();
  }));

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
    tabs[next].focus({ preventScroll: true });
    showFromTop();
  });

  desktop.addEventListener("change", render);
  render();
};

/* ---------------------------------------------------------------
   Application form — one form under the openings. Every apply call to
   action links to it; a posting's "Apply Now" also picks that position
   in the dropdown. reCAPTCHA v2 (the current careers form's site key)
   loads as the form comes near, and must be ticked to submit.
   Submission posts to data-endpoint on the form; until one is set the
   form validates but does not send, and says so.
   --------------------------------------------------------------- */
const CAPTCHA_SRC = "https://www.google.com/recaptcha/api.js?hl=en&render=explicit&onload=masonDixonCaptchaReady";
const MAX_RESUME_BYTES = 8 * 1024 * 1024;

const initApply = () => {
  const wrap = document.getElementById("apply-form");
  const form = wrap?.querySelector("[data-apply-form]");
  if (!form) return;
  const position = form.querySelector("[data-apply-position]");
  const heard = form.querySelector("[data-apply-heard]");
  const other = form.querySelector("[data-apply-other]");
  const file = form.querySelector("[data-apply-file]");
  const status = form.querySelector("[data-apply-status]");
  const captcha = form.querySelector("[data-apply-captcha]");
  let captchaId = null;

  const setStatus = (text, isError = false) => {
    status.textContent = text;
    status.classList.toggle("is-error", isError);
  };

  const loadCaptcha = () => {
    if (!captcha || captcha.dataset.loaded) return;
    captcha.dataset.loaded = "true";
    window.masonDixonCaptchaReady = () => {
      captchaId = window.grecaptcha.render(captcha, { sitekey: captcha.dataset.sitekey, theme: "light" });
    };
    const script = document.createElement("script");
    script.src = CAPTCHA_SRC;
    script.async = true;
    document.head.append(script);
  };

  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      observer.disconnect();
      loadCaptcha();
    }, { rootMargin: "400px 0px" });
    observer.observe(wrap);
  } else {
    loadCaptcha();
  }

  // Every apply link scrolls to the form; a posting's link also picks its position
  document.querySelectorAll('a[href="#apply-form"]').forEach((link) => {
    link.addEventListener("click", (event) => {
      event.preventDefault();
      if (link.dataset.apply) position.value = link.dataset.apply;
      setStatus("");
      loadCaptcha();
      wrap.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
      form.querySelector("input:not([type=hidden])").focus({ preventScroll: true });
    });
  });

  heard.addEventListener("change", () => { other.hidden = heard.value !== "_other_"; });

  file.addEventListener("change", () => {
    const tooBig = file.files[0] && file.files[0].size > MAX_RESUME_BYTES;
    file.setCustomValidity(tooBig ? "Please choose a file of 8 MB or less." : "");
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    // Required: no submission without a ticked CAPTCHA (or while it is still loading)
    if (captchaId === null || !window.grecaptcha.getResponse(captchaId)) {
      setStatus("Please complete the CAPTCHA.", true);
      return;
    }
    const endpoint = form.dataset.endpoint;
    if (!endpoint) {
      setStatus("This form is not connected yet, so the application was not sent.", true);
      return;
    }
    const button = form.querySelector('[type="submit"]');
    button.disabled = true;
    try {
      const response = await fetch(endpoint, { method: "POST", body: new FormData(form) });
      if (!response.ok) throw new Error(response.statusText);
      form.reset();
      other.hidden = true;
      window.grecaptcha.reset(captchaId);
      setStatus("Thank you! Your application has been sent.");
    } catch {
      setStatus("Something went wrong. Please try again or call (717) 432-6030.", true);
    } finally {
      button.disabled = false;
    }
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

initJobs();
initApply();
initCountUp();
