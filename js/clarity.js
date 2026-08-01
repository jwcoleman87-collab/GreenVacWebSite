/* Microsoft Clarity analytics — project xmk1qbiqul.
 *
 * Clarity records sessions from the real GreenVac production site and nowhere
 * else. The browser's own hostname is the deciding signal: a build-time flag is
 * not enough, because Vercel preview deployments run production builds and would
 * otherwise pour preview and review traffic into the live project.
 *
 * On any excluded host this file downloads no tag, contacts no clarity.ms
 * endpoint, and leaves window.clarity undefined.
 */
(function (window, document) {
  "use strict";

  var PROJECT_ID = "xmk1qbiqul";
  var PRODUCTION_HOSTS = ["greenvac.com.au", "www.greenvac.com.au"];

  // One installation per document, whichever page or partial pulls this in.
  if (window.GreenVacClarity) return;

  function isProductionHost() {
    // Production is always served over https, so requiring it also keeps out a
    // local server reached through a hosts-file mapping of the real name.
    if (!window.location || window.location.protocol !== "https:") return false;

    var host = typeof window.location.hostname === "string"
      ? window.location.hostname.toLowerCase()
      : "";
    // A fully qualified name keeps the DNS root dot. It is the same site.
    if (host.charAt(host.length - 1) === ".") host = host.slice(0, -1);

    return PRODUCTION_HOSTS.indexOf(host) !== -1;
  }

  // Best effort, not a guarantee: a wrapper that overrides its user agent and
  // hides its runtime is indistinguishable from an ordinary browser here.
  function isElectron() {
    var agent = window.navigator && window.navigator.userAgent;
    if (typeof agent === "string" && agent.indexOf("Electron/") !== -1) return true;
    var runtime = window.process;
    return !!(runtime && runtime.versions && runtime.versions.electron);
  }

  // Catches browsers launched under WebDriver or Chromium's automation flag,
  // which is how Selenium, Puppeteer and Playwright normally start one, plus
  // Cypress, which drives an ordinary browser and announces itself on window.
  // A tool that attaches to an already-running browser over CDP is not visible
  // to this check.
  function isAutomated() {
    var navigator = window.navigator || {};
    return navigator.webdriver === true || !!window.Cypress;
  }

  var enabled = isProductionHost() && !isElectron() && !isAutomated();

  window.GreenVacClarity = Object.freeze({
    enabled: enabled,
    projectId: PROJECT_ID,
  });

  if (!enabled) return;

  // Microsoft's stock loader, behaviour unchanged: create the queue, then fetch
  // the tag for this project.
  (function (c, l, a, r, i, t, y) {
    c[a] = c[a] || function () {
      (c[a].q = c[a].q || []).push(arguments);
    };
    t = l.createElement(r);
    t.async = true;
    t.src = "https://www.clarity.ms/tag/" + i;
    y = l.getElementsByTagName(r)[0];
    y.parentNode.insertBefore(t, y);
  })(window, document, "clarity", "script", PROJECT_ID);
})(window, document);
