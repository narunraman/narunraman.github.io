(function() {
  function fitTitles() {
    document.querySelectorAll('.post-wrap .title, [data-fit-title]').forEach(title => {
      title.style.removeProperty('--title-size');
      title.style.removeProperty('white-space');

      if (window.innerWidth < 700 || title.hasAttribute('data-allow-wrap')) return;

      const maxSize = parseFloat(getComputedStyle(title).fontSize);
      const minSize = 24;
      title.style.whiteSpace = 'nowrap';
      title.style.setProperty('--title-size', `${maxSize}px`);

      if (title.scrollWidth <= title.clientWidth) return;

      let low = minSize;
      let high = maxSize;
      for (let attempt = 0; attempt < 12; attempt++) {
        const size = (low + high) / 2;
        title.style.setProperty('--title-size', `${size}px`);
        if (title.scrollWidth <= title.clientWidth) low = size;
        else high = size;
      }
      title.style.setProperty('--title-size', `${low}px`);
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fitTitles);
  else fitTitles();
  window.addEventListener('resize', fitTitles, { passive: true });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitTitles);
})();