/* GreenVac portfolio category filter. Image expansion is handled site-wide in main.js. */
(function () {
  var filterBtns = Array.prototype.slice.call(document.querySelectorAll('.filter-btn'));
  var cards = Array.prototype.slice.call(document.querySelectorAll('.photo-card'));

  if (!cards.length) return;

  filterBtns.forEach(function (btn) {
    btn.addEventListener('click', function () {
      filterBtns.forEach(function (button) { button.classList.remove('active'); });
      btn.classList.add('active');

      var filter = btn.dataset.filter;
      cards.forEach(function (card) {
        card.classList.toggle('hidden', filter !== 'all' && card.dataset.category !== filter);
      });
    });
  });
})();
