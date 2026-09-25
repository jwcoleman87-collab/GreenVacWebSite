(() => {
  'use strict';
  const carousel = document.querySelector('.ndt-carousel');
  if (!carousel) return;
  const viewport = carousel.querySelector('.ndt-carousel-window');
  const track = carousel.querySelector('.ndt-job-grid');
  const cards = [...track.children];
  const previous = carousel.querySelector('.ndt-carousel-prev');
  const next = carousel.querySelector('.ndt-carousel-next');
  const status = carousel.querySelector('.ndt-carousel-status');
  const mobile = matchMedia('(max-width: 800px)');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let busy = false;
  let timer;
  let startTouch;
  let offset = 0;
  let step = 0;

  // Start with job 01 as the first full card; job 05 peeks in on the left.
  track.prepend(track.lastElementChild);
  function layout() {
    const width = track.firstElementChild.getBoundingClientRect().width;
    const gap = parseFloat(getComputedStyle(track).gap);
    step = width + gap;
    offset = mobile.matches ? (viewport.clientWidth - width) / 2 - step : -width / 2;
    carousel.style.setProperty('--carousel-offset', `${offset}px`);
    carousel.style.setProperty('--arrow-top', `${width * 3 / 8}px`);
    [...track.children].forEach((card, index) => {
      // Fully off-screen cards stay out of the keyboard order.
      card.inert = index > (mobile.matches ? 2 : 3);
    });
  }
  function announce() {
    const shown = [...track.children].slice(1, mobile.matches ? 2 : 3);
    status.textContent = shown.map(card => card.querySelector('figcaption span').textContent).join('; ');
  }
  function move(direction) {
    if (busy) return;
    busy = true;
    if (direction < 0) {
      track.prepend(track.lastElementChild);
      track.style.transform = `translateX(${offset - step}px)`;
    }
    // Commit the starting position before transitioning one card.
    track.getBoundingClientRect();
    carousel.classList.add('is-moving');
    track.style.transform = `translateX(${direction > 0 ? offset - step : offset}px)`;
    const finish = () => {
      clearTimeout(timer);
      track.removeEventListener('transitionend', finish);
      carousel.classList.remove('is-moving');
      if (direction > 0) track.append(track.firstElementChild);
      track.style.transform = '';
      busy = false;
      layout();
      announce();
    };
    track.addEventListener('transitionend', finish, { once: true });
    timer = setTimeout(finish, reduced.matches ? 0 : 380);
  }
  previous.addEventListener('click', () => move(-1));
  next.addEventListener('click', () => move(1));
  carousel.addEventListener('keydown', event => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    (event.key === 'ArrowLeft' ? previous : next).focus();
    move(event.key === 'ArrowLeft' ? -1 : 1);
  });
  viewport.addEventListener('touchstart', event => {
    if (event.touches.length === 1) startTouch = event.touches[0];
  }, { passive: true });
  viewport.addEventListener('touchend', event => {
    if (!startTouch) return;
    const end = event.changedTouches[0];
    const dx = end.clientX - startTouch.clientX;
    const dy = end.clientY - startTouch.clientY;
    startTouch = null;
    if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy) * 1.3) move(dx < 0 ? 1 : -1);
  }, { passive: true });
  viewport.addEventListener('touchcancel', () => { startTouch = null; }, { passive: true });
  new ResizeObserver(() => { if (!busy) layout(); }).observe(viewport);
  layout();
  carousel.classList.add('is-ready');
  previous.hidden = next.hidden = false;
})();
