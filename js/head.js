/**
 * Runs synchronously in <head> so reveal styles apply before first paint.
 * Everything else lives in main.js (loaded as a deferred module).
 */
document.documentElement.classList.add("js");
