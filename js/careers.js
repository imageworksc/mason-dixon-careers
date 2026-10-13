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
   Application form — sits inline below the openings. A posting's
   "Apply Now" scrolls to it and fills in the position; without JS the
   link is a plain anchor to the form.
   reCAPTCHA v2 (the current form's site key) loads once the form is
   near the viewport, and must be ticked before submitting.
   Submission posts to data-endpoint on the form; until one is set the
   form validates but does not send, and says so.
   --------------------------------------------------------------- */
const initApply = () => {
  const section = document.querySelector("#apply-form");
  const form = section?.querySelector("[data-apply-form]");
  if (!form) return;
  const role = section.querySelector("[data-apply-role]");
  const position = form.querySelector("[data-apply-position]");
  const heard = form.querySelector("[data-apply-heard]");
  const other = form.querySelector("[data-apply-other]");
  const file = form.querySelector("[data-apply-file]");
  const status = form.querySelector("[data-apply-status]");
  const captcha = form.querySelector("[data-apply-captcha]");
  const MAX_BYTES = 8 * 1024 * 1024;
  let captchaId = null;

  // Load Google's script once, on first open, and render the checkbox into the form
  const loadCaptcha = () => {
    if (!captcha || captcha.dataset.loaded) return;
    captcha.dataset.loaded = "true";
    window.masonDixonCaptchaReady = () => {
      captchaId = window.grecaptcha.render(captcha, { sitekey: captcha.dataset.sitekey, theme: "light" });
    };
    const script = document.createElement("script");
    script.src = "https://www.google.com/recaptcha/api.js?hl=en&render=explicit&onload=masonDixonCaptchaReady";
    script.async = true;
    document.head.append(script);
  };
  const captchaDone = () => captchaId === null || Boolean(window.grecaptcha?.getResponse(captchaId));

  const setStatus = (text, isError = false) => {
    status.textContent = text;
    status.classList.toggle("is-error", isError);
  };

  document.querySelectorAll("[data-apply]").forEach((link) => {
    link.addEventListener("click", (event) => {
      event.preventDefault();
      // Postings fill in the position; the general "Send Us Your Resume" leaves it open
      role.textContent = link.dataset.apply;
      position.value = link.dataset.apply;
      setStatus("");
      loadCaptcha();
      role.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
      form.querySelector("input:not([type=hidden])").focus({ preventScroll: true });
    });
  });

  // Load the CAPTCHA as the form approaches, so it is ready when reached
  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      observer.disconnect();
      loadCaptcha();
    }, { rootMargin: "400px 0px" });
    observer.observe(section);
  } else {
    loadCaptcha();
  }

  heard.addEventListener("change", () => { other.hidden = heard.value !== "_other_"; });

  file.addEventListener("change", () => {
    const tooBig = file.files[0] && file.files[0].size > MAX_BYTES;
    file.setCustomValidity(tooBig ? "Please choose a file of 8 MB or less." : "");
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    if (!captchaDone()) {
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
      if (captchaId !== null) window.grecaptcha.reset(captchaId);
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
