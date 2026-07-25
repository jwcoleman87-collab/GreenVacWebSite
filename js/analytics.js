/* GreenVac lead analytics.
 *
 * The existing Google tag is loaded and configured elsewhere. This helper owns
 * lead event dispatch only; it must never install another Google tag.
 */
(function (window, document) {
  "use strict";

  if (window.GreenVacAnalytics) return;

  var suppliedConfig = window.GreenVacAnalyticsConfig || {};
  var config = {
    googleAdsId: suppliedConfig.googleAdsId || "AW-17948622134",
    // These are public conversion-action labels (the part after
    // AW-17948622134/). An explicit empty-string override intentionally disables
    // the direct Ads conversion ping without disabling legacy analytics.
    phoneConversionLabel: typeof suppliedConfig.phoneConversionLabel === "string"
      ? suppliedConfig.phoneConversionLabel
      : "Yu01CPve8dQcELb6yO5C",
    estimatorConversionLabel: typeof suppliedConfig.estimatorConversionLabel === "string"
      ? suppliedConfig.estimatorConversionLabel
      : "7zJ6CKGOiNUcELb6yO5C",
    // Google Ads supplies the estimator action with a flat value so accepted
    // enquiries are comparable in reporting. This is a fixed non-personal
    // figure, not a quoted job price, and is sent for the estimator only.
    estimatorConversionValue: typeof suppliedConfig.estimatorConversionValue === "number"
      ? suppliedConfig.estimatorConversionValue
      : 1.0,
    estimatorConversionCurrency: typeof suppliedConfig.estimatorConversionCurrency === "string"
      ? suppliedConfig.estimatorConversionCurrency
      : "AUD",
    productionHosts: suppliedConfig.productionHosts || ["www.greenvac.com.au", "greenvac.com.au"],
  };

  window.GreenVacAnalyticsConfig = config;

  var onceInPage = {};

  function isProductionHost() {
    return config.productionHosts.indexOf(window.location.hostname) !== -1;
  }

  function createEventId(prefix) {
    if (window.crypto && typeof window.crypto.randomUUID === "function") {
      return prefix + "-" + window.crypto.randomUUID();
    }

    return prefix + "-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 12);
  }

  function gtagEvent(name, parameters) {
    if (!isProductionHost() || typeof window.gtag !== "function") return false;
    // Tracking must never surface as a user-facing failure. The estimator calls
    // this from inside its submission try block, so a blocked, stubbed or
    // throwing Google tag would otherwise show an error screen for an enquiry
    // the server already accepted.
    try {
      window.gtag("event", name, parameters);
    } catch (_error) {
      return false;
    }
    return true;
  }

  function adsDestination(label) {
    if (!/^AW-\d+$/.test(config.googleAdsId)) return "";
    if (!/^[A-Za-z0-9_-]+$/.test(label)) return "";
    return config.googleAdsId + "/" + label;
  }

  // monetary is optional. Only the estimator action is configured with a value,
  // so the phone conversion payload stays exactly as Google Ads already
  // receives it. A malformed value or currency is omitted rather than guessed.
  function adsConversion(label, transactionId, monetary) {
    var destination = adsDestination(label);
    if (!destination) return false;

    var payload = {
      send_to: destination,
      transaction_id: transactionId,
    };

    if (monetary && typeof monetary.value === "number" && isFinite(monetary.value)) {
      payload.value = monetary.value;
      if (typeof monetary.currency === "string" && /^[A-Z]{3}$/.test(monetary.currency)) {
        payload.currency = monetary.currency;
      }
    }

    return gtagEvent("conversion", payload);
  }

  function readSessionMarker(key) {
    if (onceInPage[key]) return true;
    try {
      return window.sessionStorage && window.sessionStorage.getItem(key) === "1";
    } catch (_error) {
      return false;
    }
  }

  function writeSessionMarker(key) {
    onceInPage[key] = true;
    try {
      if (window.sessionStorage) window.sessionStorage.setItem(key, "1");
    } catch (_error) {
      // Some privacy modes disable sessionStorage. The in-page marker still
      // prevents duplicate dispatches during this document lifetime.
    }
  }

  function phonePlacement(link) {
    var explicitPlacement = link.getAttribute("data-phone-placement");
    if (explicitPlacement) return explicitPlacement;
    if (link.closest(".call-btn-float")) return "floating_call";
    if (link.closest(".top-bar, .header-sticky")) return "header";
    if (link.closest("footer, .footer")) return "footer";
    if (link.closest(".hero")) return "hero";

    var path = window.location.pathname;
    if (path === "/contact" || path === "/contact.html") return "contact_page";
    if (path === "/get-a-quote" || path.indexOf("/get-a-quote/") === 0) return "estimator";
    if (path === "/404.html") return "error_page";
    return "page_content";
  }

  function trackPhoneLead(link) {
    if (!isProductionHost()) return false;

    var placement = phonePlacement(link);
    var eventId = createEventId("phone");

    // Preserve the existing Google and PostHog event names. The Ads conversion
    // event is additional only when its real conversion label is configured.
    gtagEvent("phone_call_click", {
      event_category: "engagement",
      event_label: "Phone Call",
      value: 1,
      phone_placement: placement,
      event_id: eventId,
    });
    adsConversion(config.phoneConversionLabel, eventId);

    if (window.posthog && typeof window.posthog.capture === "function") {
      window.posthog.capture("phone_call_click", {
        label: "Phone Call",
        placement: placement,
      });
    }

    return true;
  }

  function trackEstimatorLead(options) {
    if (!isProductionHost()) return false;

    var eventId = options && options.eventId ? String(options.eventId) : createEventId("estimator");
    var marker = "greenvac_estimator_lead:" + eventId;
    if (readSessionMarker(marker)) return false;
    writeSessionMarker(marker);

    // Keep the existing successful-estimator Google event intact. No visitor
    // details or estimator answers are included in either Google payload.
    gtagEvent("form_submit", {
      event_category: "lead",
      event_label: "Estimator Request",
      value: 1,
      lead_type: "estimator",
      event_id: eventId,
    });
    adsConversion(config.estimatorConversionLabel, eventId, {
      value: config.estimatorConversionValue,
      currency: config.estimatorConversionCurrency,
    });

    return true;
  }

  function handleDocumentClick(event) {
    var target = event.target;
    if (!target || typeof target.closest !== "function") return;
    var link = target.closest('a[href^="tel:"]');
    if (!link) return;
    trackPhoneLead(link);
  }

  document.addEventListener("click", handleDocumentClick);

  window.GreenVacAnalytics = Object.freeze({
    createEventId: createEventId,
    isProductionHost: isProductionHost,
    phonePlacement: phonePlacement,
    trackEstimatorLead: trackEstimatorLead,
    trackPhoneLead: trackPhoneLead,
  });
})(window, document);
