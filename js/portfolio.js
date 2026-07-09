/* GreenVac portfolio - category filter and image viewer */
(function () {
  var filterBtns = Array.prototype.slice.call(document.querySelectorAll('.filter-btn'));
  var cards = Array.prototype.slice.call(document.querySelectorAll('.photo-card'));

  if (!cards.length) return;

  filterBtns.forEach(function (btn) {
    btn.addEventListener('click', function () {
      filterBtns.forEach(function (b) { b.classList.remove('active'); });
      btn.classList.add('active');

      var filter = btn.dataset.filter;
      cards.forEach(function (card) {
        if (filter === 'all' || card.dataset.category === filter) {
          card.classList.remove('hidden');
        } else {
          card.classList.add('hidden');
        }
      });
    });
  });

  var lightbox = document.createElement('div');
  lightbox.className = 'portfolio-lightbox';
  lightbox.setAttribute('role', 'dialog');
  lightbox.setAttribute('aria-modal', 'true');
  lightbox.setAttribute('aria-label', 'Expanded portfolio photo');
  lightbox.hidden = true;
  lightbox.innerHTML =
    '<button type="button" class="portfolio-lightbox__close" aria-label="Close expanded image">&times;</button>' +
    '<button type="button" class="portfolio-lightbox__nav portfolio-lightbox__prev" aria-label="Previous image">&#8249;</button>' +
    '<figure class="portfolio-lightbox__figure">' +
      '<img class="portfolio-lightbox__image" alt="">' +
      '<figcaption class="portfolio-lightbox__caption"></figcaption>' +
    '</figure>' +
    '<button type="button" class="portfolio-lightbox__nav portfolio-lightbox__next" aria-label="Next image">&#8250;</button>';

  document.body.appendChild(lightbox);

  var lightboxImage = lightbox.querySelector('.portfolio-lightbox__image');
  var lightboxCaption = lightbox.querySelector('.portfolio-lightbox__caption');
  var closeBtn = lightbox.querySelector('.portfolio-lightbox__close');
  var prevBtn = lightbox.querySelector('.portfolio-lightbox__prev');
  var nextBtn = lightbox.querySelector('.portfolio-lightbox__next');
  var currentCard = null;

  function visibleCards() {
    return cards.filter(function (card) { return !card.classList.contains('hidden'); });
  }

  function cardCaption(card) {
    var tag = card.querySelector('.photo-tag');
    var location = card.querySelector('.photo-location');
    return {
      tag: tag ? tag.textContent.trim() : '',
      location: location ? location.textContent.trim() : ''
    };
  }

  function updateLightbox(card) {
    var img = card.querySelector('img');
    var caption = cardCaption(card);
    currentCard = card;
    lightboxImage.src = img.currentSrc || img.src;
    lightboxImage.alt = img.alt || caption.tag || 'Expanded portfolio photo';
    lightboxCaption.innerHTML = '<strong>' + caption.tag + '</strong>' + (caption.location ? '<span>' + caption.location + '</span>' : '');
  }

  function openLightbox(card) {
    updateLightbox(card);
    lightbox.hidden = false;
    requestAnimationFrame(function () {
      lightbox.classList.add('is-open');
      closeBtn.focus();
    });
    document.body.style.overflow = 'hidden';
  }

  function closeLightbox() {
    lightbox.classList.remove('is-open');
    lightbox.hidden = true;
    lightboxImage.removeAttribute('src');
    document.body.style.overflow = '';
    if (currentCard) currentCard.focus();
  }

  function stepLightbox(direction) {
    var visible = visibleCards();
    if (!visible.length || !currentCard) return;
    var index = visible.indexOf(currentCard);
    var nextIndex = (index + direction + visible.length) % visible.length;
    updateLightbox(visible[nextIndex]);
  }

  cards.forEach(function (card) {
    var caption = cardCaption(card);
    card.setAttribute('role', 'button');
    card.setAttribute('tabindex', '0');
    card.setAttribute('aria-label', 'Expand image: ' + [caption.tag, caption.location].filter(Boolean).join(', '));

    card.addEventListener('click', function () {
      openLightbox(card);
    });
    card.addEventListener('keydown', function (event) {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        openLightbox(card);
      }
    });
  });

  closeBtn.addEventListener('click', closeLightbox);
  prevBtn.addEventListener('click', function () { stepLightbox(-1); });
  nextBtn.addEventListener('click', function () { stepLightbox(1); });
  lightbox.addEventListener('click', function (event) {
    if (event.target === lightbox) closeLightbox();
  });

  document.addEventListener('keydown', function (event) {
    if (lightbox.hidden) return;
    if (event.key === 'Escape') closeLightbox();
    if (event.key === 'ArrowLeft') stepLightbox(-1);
    if (event.key === 'ArrowRight') stepLightbox(1);
  });
})();
