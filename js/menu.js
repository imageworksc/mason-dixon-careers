/**
 * Mason Dixon Animal Emergency Hospital — Option A header and navigation.
 * Brought in from imageworksc/menu-mason-dixon; one init per feature.
 */

/* Must stay in sync with the drawer breakpoint in components.css. */
const drawer = window.matchMedia("(max-width: 1120px)");

const items = [...document.querySelectorAll("[data-nav-item]")];

const buttonOf = (item) => item.querySelector("[data-nav-btn]");

const closePanel = (item) => {
  item.classList.remove("is-open");
  buttonOf(item).setAttribute("aria-expanded", "false");
};

const closeAllPanels = (except) => {
  for (const item of items) {
    if (item !== except) closePanel(item);
  }
};

const openPanel = (item) => {
  closeAllPanels(item);
  item.classList.add("is-open");
  buttonOf(item).setAttribute("aria-expanded", "true");
};

/* ---------------------------------------------------------------
   Dropdown panels — hover on desktop, accordion in the drawer,
   full disclosure-pattern keyboard support in both.
   --------------------------------------------------------------- */
const initPanels = () => {
  if (!items.length) return;
  let closeTimer = null;

  for (const item of items) {
    const btn = buttonOf(item);
    const links = [...item.querySelectorAll(".panel a")];

    item.addEventListener("mouseenter", () => {
      if (drawer.matches) return;
      window.clearTimeout(closeTimer);
      openPanel(item);
    });

    /* A short grace period so a diagonal trip from the button to the
       panel's far corner doesn't drop the menu mid-move. */
    item.addEventListener("mouseleave", () => {
      if (drawer.matches) return;
      closeTimer = window.setTimeout(() => closePanel(item), 300);
    });

    btn.addEventListener("click", () => {
      window.clearTimeout(closeTimer);
      if (item.classList.contains("is-open")) closePanel(item);
      else openPanel(item);
    });

    btn.addEventListener("keydown", (event) => {
      if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
      event.preventDefault();
      /* Without this the item-level handler below sees the link we are
         about to focus and steps one further. */
      event.stopPropagation();
      openPanel(item);
      (event.key === "ArrowDown" ? links[0] : links.at(-1))?.focus();
    });

    item.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && item.classList.contains("is-open")) {
        /* Let Escape close the panel without also closing the drawer. */
        event.stopPropagation();
        closePanel(item);
        btn.focus();
        return;
      }

      const index = links.indexOf(document.activeElement);
      if (index < 0) return;

      const move = { ArrowDown: index + 1, ArrowUp: index - 1, Home: 0, End: links.length - 1 }[event.key];
      if (move === undefined) return;
      event.preventDefault();
      links[(move + links.length) % links.length].focus();
    });

    /* Tabbing out of the group closes it. In the drawer the open panel is
       part of the document flow, so leaving it is not a dismissal. */
    item.addEventListener("focusout", (event) => {
      if (drawer.matches) return;
      if (!item.contains(event.relatedTarget)) closePanel(item);
    });
  }

  document.addEventListener("click", (event) => {
    if (drawer.matches) return;
    if (!event.target.closest("[data-nav-item]")) closeAllPanels();
  });
};

/* ---------------------------------------------------------------
   Mobile drawer
   --------------------------------------------------------------- */
const initDrawer = () => {
  const nav = document.querySelector("[data-nav]");
  const toggle = document.querySelector("[data-nav-toggle]");
  const veil = document.querySelector("[data-nav-veil]");
  const closeBtn = document.querySelector("[data-nav-close]");
  if (!nav || !toggle || !veil) return;

  const isOpen = () => nav.classList.contains("is-open");

  /* Collapsed panels are display:none, so offsetParent filters their links
     out of the tab ring for free. */
  const focusables = () =>
    [...nav.querySelectorAll("a[href], button")].filter((el) => el.offsetParent !== null);

  const open = () => {
    nav.classList.add("is-open");
    veil.classList.add("is-open");
    toggle.setAttribute("aria-expanded", "true");
    document.body.classList.add("nav-open");
    focusables()[0]?.focus();
  };

  const close = ({ restoreFocus = true } = {}) => {
    const wasOpen = isOpen();
    nav.classList.remove("is-open");
    veil.classList.remove("is-open");
    toggle.setAttribute("aria-expanded", "false");
    document.body.classList.remove("nav-open");
    closeAllPanels();
    if (wasOpen && restoreFocus) toggle.focus();
  };

  toggle.addEventListener("click", () => (isOpen() ? close() : open()));
  closeBtn?.addEventListener("click", () => close());
  veil.addEventListener("click", () => close());

  /* Following a link navigates away; the drawer should not be left open
     behind the new page, and focus belongs to the destination. */
  for (const link of nav.querySelectorAll("a[href]")) {
    link.addEventListener("click", () => {
      if (drawer.matches) close({ restoreFocus: false });
    });
  }

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      if (isOpen()) close();
      else closeAllPanels();
      return;
    }

    if (event.key !== "Tab" || !isOpen()) return;

    const els = focusables();
    if (!els.length) return;
    const [first] = els;
    const last = els.at(-1);

    if (!nav.contains(document.activeElement)) {
      event.preventDefault();
      first.focus();
    } else if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });

  /* Crossing the breakpoint with the drawer open would strand the body
     scroll lock and the open state on a desktop layout. */
  drawer.addEventListener("change", () => close({ restoreFocus: false }));
};

/* ---------------------------------------------------------------
   Sticky header shadow once the page scrolls
   --------------------------------------------------------------- */
const initHeaderScrollState = () => {
  const header = document.querySelector("[data-site-header]");
  if (!header) return;
  let ticking = false;

  const update = () => {
    header.classList.toggle("is-scrolled", window.scrollY > 4);
    ticking = false;
  };

  window.addEventListener(
    "scroll",
    () => {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(update);
    },
    { passive: true },
  );

  update();
};

initPanels();
initDrawer();
initHeaderScrollState();
