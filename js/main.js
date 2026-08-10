/* ─── Google tag (gtag.js) bootstrap ──────────────────── */
window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', 'GT-WB5M7MK8');
gtag('config', 'AW-17948622134');

/* ─── PostHog Analytics ──────────────────────────────── */
!function(t,e){var o,n,p,r;e.__SV||(window.posthog=e,e._i=[],e.init=function(i,s,a){function g(t,e){var o=e.split(".");2==o.length&&(t=t[o[0]],e=o[1]);t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}}(p=t.createElement("script")).type="text/javascript",p.async=!0,p.src=s.api_host+"/static/array.js",(r=t.getElementsByTagName("script")[0]).parentNode.insertBefore(p,r);var u=e;for(void 0!==a?u=e[a]=[]:a="posthog",u.people=u.people||[],u.toString=function(t){var e="posthog";return"posthog"!==a&&(e+="."+a),t||(e+=" (stub)"),e},u.people.toString=function(){return u.toString(1)+" (stub)"},o="capture identify alias people.set people.set_once set_config register register_once unregister opt_out_capturing has_opted_out_capturing opt_in_capturing reset isFeatureEnabled onFeatureFlags getFeatureFlag getFeatureFlagPayload reloadFeatureFlags group updateEarlyAccessFeatureEnrollment getEarlyAccessFeatures getActiveMatchingSurveys getSurveys onSessionId".split(" "),n=0;n<o.length;n++)g(u,o[n]);e._i.push([i,s,a])},e.__SV=1)}(document,window.posthog||(window.posthog=[]));
posthog.init('phc_fLwcKTK5vJCmqZbbrhdkW08HO4IF5Jq8G1iQ7qmQmAw', {
  api_host: 'https://us.i.posthog.com',
  person_profiles: 'identified_only',
  capture_pageview: true,
});

// Fire landing_variant_viewed only on homepage
(function() {
  var path = window.location.pathname;
  if (path === '/' || path === '/index.html' || path.endsWith('greenvac/index.html') || path === '') {
    posthog.capture('landing_variant_viewed', { variant: 'control' });
  }
})();

/* GreenVac Services — Main JavaScript */

document.documentElement.classList.add('js');

document.addEventListener('DOMContentLoaded', function () {

  /* ─── Mobile Navigation ──────────────────────────────── */
  const hamburger  = document.getElementById('nav-hamburger');
  const mobileMenu = document.getElementById('nav-mobile');

  if (hamburger && mobileMenu) {
    hamburger.addEventListener('click', function () {
      const isOpen = mobileMenu.classList.toggle('open');
      hamburger.classList.toggle('active');
      hamburger.setAttribute('aria-expanded', String(isOpen));
      mobileMenu.setAttribute('aria-hidden', String(!isOpen));
    });

    // Close mobile menu on any link click
    mobileMenu.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', function () {
        mobileMenu.classList.remove('open');
        hamburger.classList.remove('active');
        hamburger.setAttribute('aria-expanded', 'false');
      });
    });
  }

  /* ─── Active Nav Link ────────────────────────────────── */
  function normalizePath(path) {
    if (!path) return '/';
    var normalized = path.split('#')[0].split('?')[0];
    if (!normalized) return '/';
    normalized = normalized.replace(/\/index(?:\.html)?$/i, '/');
    normalized = normalized.replace(/\.html$/i, '');
    normalized = normalized.replace(/\/+$/, '') || '/';
    return normalized;
  }

  var currentPath = normalizePath(window.location.pathname);
  document.querySelectorAll('.nav-links a, .nav-mobile a').forEach(function (link) {
    var href = link.getAttribute('href');
    if (!href || href === '#' || href.indexOf('http') === 0 || href.indexOf('mailto:') === 0 || href.indexOf('tel:') === 0) return;
    var linkPath = normalizePath(href);
    if (linkPath === currentPath) {
      link.classList.add('active');
      link.setAttribute('aria-current', 'page');
    }
  });

  /* ─── Scroll-Triggered Fade-In Animations ────────────── */
  var fadeElements = document.querySelectorAll('.fade-up');

  if (fadeElements.length > 0 && 'IntersectionObserver' in window) {
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
        }
      });
    }, {
      threshold: 0.08,
      rootMargin: '0px 0px -40px 0px'
    });

    fadeElements.forEach(function (el) { observer.observe(el); });
  } else {
    // Fallback: show all immediately if IntersectionObserver not supported
    fadeElements.forEach(function (el) { el.classList.add('visible'); });
  }

  /* ─── Contact Form Submission ──────────────────────────── */
  var contactForm = document.getElementById('contact-form');
  if (contactForm) {
    function setFieldError(field, message) {
      field.setAttribute('aria-invalid', 'true');
      var group = field.closest('.form-group');
      if (!group) return;
      var errId = field.id + '-error';
      var existing = group.querySelector('.form-error');
      if (existing) existing.remove();
      var err = document.createElement('div');
      err.className = 'form-error';
      err.id = errId;
      err.setAttribute('role', 'alert');
      err.textContent = message;
      group.appendChild(err);
      var describedBy = (field.getAttribute('aria-describedby') || '').split(' ').filter(Boolean);
      if (describedBy.indexOf(errId) === -1) describedBy.push(errId);
      field.setAttribute('aria-describedby', describedBy.join(' '));
    }
    function clearFieldError(field) {
      field.removeAttribute('aria-invalid');
      var group = field.closest('.form-group');
      if (!group) return;
      var existing = group.querySelector('.form-error');
      if (existing) existing.remove();
      var errId = field.id + '-error';
      var describedBy = (field.getAttribute('aria-describedby') || '').split(' ').filter(function (id) { return id && id !== errId; });
      if (describedBy.length) field.setAttribute('aria-describedby', describedBy.join(' '));
      else field.removeAttribute('aria-describedby');
    }
    // Clear error state once the user starts correcting the field
    contactForm.querySelectorAll('input, textarea, select').forEach(function (field) {
      field.addEventListener('input', function () {
        if (field.getAttribute('aria-invalid') === 'true') clearFieldError(field);
      });
    });

    contactForm.addEventListener('submit', function (e) {
      e.preventDefault();

      // Manual validation so we can wire aria-invalid + inline messages
      var firstInvalid = null;
      contactForm.querySelectorAll('input, textarea, select').forEach(function (field) {
        clearFieldError(field);
        if (!field.checkValidity()) {
          var msg = field.validity.valueMissing
            ? 'This field is required.'
            : (field.validity.typeMismatch ? 'Please enter a valid ' + (field.type === 'email' ? 'email address.' : field.type + '.') : 'Please check this field.');
          setFieldError(field, msg);
          if (!firstInvalid) firstInvalid = field;
        }
      });
      if (firstInvalid) {
        firstInvalid.focus();
        return;
      }

      var btn = contactForm.querySelector('button[type="submit"]');
      var original = btn.textContent;
      var service = (document.getElementById('service') || {}).value || null;
      var suburb = ((document.getElementById('suburb') || {}).value || '').trim() || null;

      btn.textContent = 'Sending...';
      btn.disabled = true;

      if (typeof posthog !== 'undefined') {
        posthog.capture('contact_form_submit_attempt', {
          service: service,
          suburb: suburb,
          page: window.location.pathname,
        });
      }

      var formData = new FormData(contactForm);
      var emailField = document.getElementById('email');
      var replyTo = emailField && emailField.value ? emailField.value.trim() : '';
      if (replyTo) formData.append('_replyto', replyTo);

      fetch(contactForm.action, {
        method: contactForm.method || 'POST',
        body: formData,
        headers: { 'Accept': 'application/json' }
      }).then(function (response) {
        return response.text().then(function (text) {
          var payload = null;
          try {
            payload = text ? JSON.parse(text) : null;
          } catch (err) {
            payload = null;
          }
          if (!response.ok || (payload && (payload.success === 'false' || payload.success === false))) {
            throw new Error((payload && payload.message) || 'Form submission failed with status ' + response.status);
          }
          return payload;
        });
      }).then(function () {

        if (typeof gtag === 'function') {
          gtag('event', 'form_submit', {
            'event_category': 'lead',
            'event_label': 'Contact Form',
            'value': 1
          });
        }
        if (typeof posthog !== 'undefined') {
          posthog.capture('contact_form_submit_success', {
            service: service,
            suburb: suburb,
            page: window.location.pathname,
          });
        }

        btn.textContent = 'Message sent — James will be in touch!';
        btn.style.background = '#145533';
        contactForm.reset();

        setTimeout(function () {
          btn.textContent = original;
          btn.disabled = false;
          btn.style.background = '';
        }, 5000);
      }).catch(function () {
        if (typeof posthog !== 'undefined') {
          posthog.capture('contact_form_submit_error', {
            service: service,
            suburb: suburb,
            page: window.location.pathname,
          });
        }
        btn.textContent = 'Could not send — call James direct';
        btn.style.background = '#8b1e1e';
        setTimeout(function () {
          btn.textContent = original;
          btn.disabled = false;
          btn.style.background = '';
        }, 6500);
      });
    });
  }

  /* ─── Floating call button: avoid covering hero CTAs ───── */
  var floatingCallBtn = document.querySelector('.call-btn-float');
  var hero = document.querySelector('.hero');
  if (floatingCallBtn && hero && 'IntersectionObserver' in window) {
    var heroObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        floatingCallBtn.classList.toggle('is-visible', !entry.isIntersecting);
      });
    }, { threshold: 0.05 });

    heroObserver.observe(hero);
  } else if (floatingCallBtn) {
    floatingCallBtn.classList.add('is-visible');
  }

  if (floatingCallBtn) {
    floatingCallBtn.addEventListener('focus', function () {
      floatingCallBtn.classList.add('is-visible');
    });
  }

  /* ─── Phone link tooltips ─────────────────────────────── */
  document.querySelectorAll('a[href^="tel:"]').forEach(function (el) {
    el.setAttribute('title', 'Call James Direct');
  });

  /* ─── Dynamic copyright year ─────────────────────────── */
  document.querySelectorAll('.copyright-year').forEach(function (el) {
    el.textContent = new Date().getFullYear();
  });

  /* ─── Logo image fallback ─────────────────────────────── */
  document.querySelectorAll('img[alt*="GreenVac"]').forEach(function (img) {
    img.addEventListener('error', function () {
      var badge = document.createElement('div');
      badge.style.cssText = 'background:#1b7046;color:#fff;font-family:Montserrat,Arial Black,sans-serif;font-weight:900;font-size:1rem;letter-spacing:1px;padding:8px 14px;border-radius:6px;line-height:1.2;text-align:center;white-space:nowrap;text-transform:uppercase';
      badge.innerHTML = 'GREEN<span style="font-weight:400">VAC</span><br><span style="font-size:0.6rem;letter-spacing:3px;font-weight:600">SERVICES</span>';
      img.parentNode.replaceChild(badge, img);
    });
  });

  /* ─── Smart Photo Loader ──────────────────────────────────
     How it works: any placeholder div with a data-img attribute
     will automatically show that image once you drop the file
     into the greenvac/images/ folder. No code changes needed.
  ─────────────────────────────────────────────────────────── */
  document.querySelectorAll('.img-placeholder[data-img]').forEach(function (placeholder) {
    var src = placeholder.getAttribute('data-img');
    var testImg = new Image();
    testImg.onload = function () {
      var img = document.createElement('img');
      img.src = src;
      img.alt = placeholder.querySelector('.ph-desc') ? placeholder.querySelector('.ph-desc').textContent.trim() : '';
      img.style.cssText = 'width:100%;height:100%;object-fit:cover;border-radius:8px;display:block;';
      // Match the height of the placeholder
      var ph = placeholder;
      img.style.minHeight = ph.style.minHeight || '300px';
      placeholder.parentNode.replaceChild(img, placeholder);
    };
    testImg.src = src;
  });

  /* ─── Site-wide content image viewer ────────────────────────────────
     Job photos inside <main> open at their full source size. Images that
     already act as navigation (logos, blog links and service cards) keep
     their original behaviour. Portfolio cards use this same viewer.
  ─────────────────────────────────────────────────────────────────── */
  var imageLightbox = document.createElement('div');
  imageLightbox.className = 'image-lightbox';
  imageLightbox.setAttribute('role', 'dialog');
  imageLightbox.setAttribute('aria-modal', 'true');
  imageLightbox.setAttribute('aria-label', 'Expanded image viewer');
  imageLightbox.hidden = true;
  imageLightbox.innerHTML =
    '<button type="button" class="image-lightbox__close" aria-label="Close expanded image">&times;</button>' +
    '<button type="button" class="image-lightbox__nav image-lightbox__prev" aria-label="Previous image">&#8249;</button>' +
    '<figure class="image-lightbox__figure">' +
      '<img class="image-lightbox__image" alt="">' +
      '<figcaption class="image-lightbox__caption"></figcaption>' +
    '</figure>' +
    '<button type="button" class="image-lightbox__nav image-lightbox__next" aria-label="Next image">&#8250;</button>';
  document.body.appendChild(imageLightbox);

  var expandedImage = imageLightbox.querySelector('.image-lightbox__image');
  var expandedCaption = imageLightbox.querySelector('.image-lightbox__caption');
  var imageCloseBtn = imageLightbox.querySelector('.image-lightbox__close');
  var imagePrevBtn = imageLightbox.querySelector('.image-lightbox__prev');
  var imageNextBtn = imageLightbox.querySelector('.image-lightbox__next');
  var imageTriggerData = new WeakMap();
  var currentImageTrigger = null;

  function imageCaption(img) {
    var figure = img.closest('figure');
    var figcaption = figure ? figure.querySelector('figcaption') : null;
    if (figcaption && figcaption.textContent.trim()) return figcaption.textContent.trim();

    var card = img.closest('.photo-card');
    if (card) {
      var tag = card.querySelector('.photo-tag');
      var location = card.querySelector('.photo-location');
      var parts = [tag, location].filter(Boolean).map(function (el) { return el.textContent.trim(); });
      if (parts.length) return parts.join(' — ');
    }

    return (img.getAttribute('alt') || '').trim();
  }

  function registerImage(img) {
    if (!img || img.closest('.image-lightbox') || img.hasAttribute('data-no-expand')) return;
    if (img.closest('[aria-hidden="true"]')) return;
    if (img.closest('.service-card, .nh-service-card')) return;
    if (img.closest('a, button') && !img.closest('.photo-card')) return;

    var trigger = img.closest('.photo-card') || img;
    if (trigger.hasAttribute('data-image-expandable')) return;

    var caption = imageCaption(img);
    trigger.setAttribute('data-image-expandable', '');
    trigger.setAttribute('role', 'button');
    trigger.setAttribute('tabindex', '0');
    trigger.setAttribute('aria-label', 'Expand image' + (caption ? ': ' + caption : ''));
    trigger.classList.add('image-expandable');
    imageTriggerData.set(trigger, {
      image: img,
      caption: caption
    });
  }

  function backgroundImageUrl(el) {
    var value = window.getComputedStyle(el).backgroundImage || '';
    var match = value.match(/^url\(["']?(.*?)["']?\)$/);
    return match ? match[1] : '';
  }

  function registerBackgroundImage(el) {
    var src = backgroundImageUrl(el);
    if (!src || el.hasAttribute('data-image-expandable')) return;

    var heading = el.querySelector('h1, h2');
    var caption = heading ? heading.innerText.replace(/\s+/g, ' ').trim() : 'GreenVac job photo';
    var expandButton = document.createElement('button');
    expandButton.type = 'button';
    expandButton.className = 'image-expand-button';
    expandButton.setAttribute('aria-label', 'Expand background image: ' + caption);
    expandButton.innerHTML =
      '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">' +
        '<path d="M9 4H4v5M15 4h5v5M9 20H4v-5M15 20h5v-5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>' +
      '</svg>';
    el.appendChild(expandButton);

    el.setAttribute('data-image-expandable', '');
    el.classList.add('image-expandable-bg');
    imageTriggerData.set(el, {
      src: src,
      caption: caption
    });
  }

  function registerPageImages(root) {
    if (root.nodeType !== 1 && root.nodeType !== 9) return;
    if (root.matches && root.matches('main img')) registerImage(root);
    root.querySelectorAll('main img').forEach(registerImage);
  }

  function availableImageTriggers() {
    return Array.prototype.slice.call(document.querySelectorAll('[data-image-expandable]')).filter(function (trigger) {
      return imageTriggerData.has(trigger) && trigger.getClientRects().length > 0;
    });
  }

  function updateExpandedImage(trigger) {
    var data = imageTriggerData.get(trigger);
    if (!data) return;

    currentImageTrigger = trigger;
    expandedImage.src = data.image ? (data.image.currentSrc || data.image.src) : data.src;
    expandedImage.alt = data.caption || (data.image ? data.image.alt : '') || 'Expanded GreenVac job photo';
    expandedCaption.textContent = data.caption || '';
    expandedCaption.hidden = !data.caption;

    var hasMultiple = availableImageTriggers().length > 1;
    imagePrevBtn.hidden = !hasMultiple;
    imageNextBtn.hidden = !hasMultiple;
  }

  function openImageLightbox(trigger) {
    updateExpandedImage(trigger);
    imageLightbox.hidden = false;
    imageLightbox.classList.add('is-open');
    document.body.classList.add('image-lightbox-open');
    imageCloseBtn.focus();
  }

  function closeImageLightbox() {
    imageLightbox.classList.remove('is-open');
    imageLightbox.hidden = true;
    expandedImage.removeAttribute('src');
    document.body.classList.remove('image-lightbox-open');
    if (currentImageTrigger && currentImageTrigger.isConnected) currentImageTrigger.focus();
  }

  function stepImageLightbox(direction) {
    var triggers = availableImageTriggers();
    if (triggers.length < 2 || !currentImageTrigger) return;
    var index = triggers.indexOf(currentImageTrigger);
    var nextIndex = (index + direction + triggers.length) % triggers.length;
    updateExpandedImage(triggers[nextIndex]);
  }

  registerPageImages(document);
  document.querySelectorAll('.info-hero').forEach(registerBackgroundImage);

  if ('MutationObserver' in window) {
    var imageObserver = new MutationObserver(function (mutations) {
      mutations.forEach(function (mutation) {
        mutation.addedNodes.forEach(registerPageImages);
      });
    });
    imageObserver.observe(document.body, { childList: true, subtree: true });
  }

  document.addEventListener('click', function (event) {
    var trigger = event.target.closest('[data-image-expandable]');
    if (!trigger || !imageTriggerData.has(trigger)) return;
    if (trigger.classList.contains('image-expandable-bg')) {
      var interactive = event.target.closest('a, button');
      if (interactive && !interactive.classList.contains('image-expand-button')) return;
    }
    event.preventDefault();
    openImageLightbox(trigger);
  });

  document.addEventListener('keydown', function (event) {
    if (!imageLightbox.hidden) {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeImageLightbox();
        return;
      }
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        stepImageLightbox(-1);
        return;
      }
      if (event.key === 'ArrowRight') {
        event.preventDefault();
        stepImageLightbox(1);
        return;
      }
      if (event.key === 'Tab') {
        var controls = [imageCloseBtn, imagePrevBtn, imageNextBtn].filter(function (button) { return !button.hidden; });
        var controlIndex = controls.indexOf(document.activeElement);
        if (event.shiftKey && controlIndex <= 0) {
          event.preventDefault();
          controls[controls.length - 1].focus();
        } else if (!event.shiftKey && controlIndex === controls.length - 1) {
          event.preventDefault();
          controls[0].focus();
        }
      }
      return;
    }

    if (event.key !== 'Enter' && event.key !== ' ') return;
    var trigger = event.target.closest('[data-image-expandable]');
    if (!trigger || !imageTriggerData.has(trigger)) return;
    event.preventDefault();
    openImageLightbox(trigger);
  });

  imageCloseBtn.addEventListener('click', closeImageLightbox);
  imagePrevBtn.addEventListener('click', function () { stepImageLightbox(-1); });
  imageNextBtn.addEventListener('click', function () { stepImageLightbox(1); });
  imageLightbox.addEventListener('click', function (event) {
    if (event.target === imageLightbox) closeImageLightbox();
  });

});
