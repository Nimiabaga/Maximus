/* ============================================================
   Maximus Lounge & Bar — app.js
   Handles: splash screen, page transitions, scroll animations,
            skeleton loaders
   ============================================================ */

(function () {

  /* ----------------------------------------------------------
     1. SPLASH SCREEN (index.html only)
  ---------------------------------------------------------- */
  const splash = document.getElementById('splash');
  if (splash) {
    window.addEventListener('load', () => {
      setTimeout(() => splash.classList.add('hidden'), 1600);
    });
  }

  /* ----------------------------------------------------------
     2. PAGE FADE-IN on load
  ---------------------------------------------------------- */
  document.body.style.opacity = '0';
  window.addEventListener('load', () => {
    document.body.style.transition = 'opacity 0.3s ease';
    document.body.style.opacity   = '1';
  });

  /* ----------------------------------------------------------
     3. PAGE FADE-OUT on internal navigation
  ---------------------------------------------------------- */
  document.addEventListener('click', (e) => {
    const link = e.target.closest('a[href]');
    if (!link) return;

    const href = link.getAttribute('href');
    if (!href) return;

    // Skip: external, anchors, tel, mailto
    if (
      href.startsWith('http') ||
      href.startsWith('#')    ||
      href.startsWith('tel')  ||
      href.startsWith('mailto')
    ) return;

    e.preventDefault();
    document.body.style.transition = 'opacity 0.25s ease';
    document.body.style.opacity    = '0';
    setTimeout(() => { window.location.href = href; }, 260);
  });

  /* ----------------------------------------------------------
     4. SCROLL-REVEAL — cards animate in as they enter viewport
        Auto-applied to .scroll-reveal AND all .food-card elements
  ---------------------------------------------------------- */
  // Auto-tag every food card so sub-pages get the effect too
  document.querySelectorAll('.food-card').forEach(card => {
    card.classList.add('scroll-reveal');
  });

  const revealItems = document.querySelectorAll('.scroll-reveal');

  if (revealItems.length > 0) {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry, i) => {
          if (entry.isIntersecting) {
            setTimeout(() => {
              entry.target.classList.add('visible');
            }, i * 80);
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.08 }
    );
    revealItems.forEach(el => observer.observe(el));
  }

  /* ----------------------------------------------------------
     5. SKELETON LOADERS — shimmer while images load
  ---------------------------------------------------------- */
  document.querySelectorAll('.food-card img').forEach(img => {
    if (!img.complete) {
      img.classList.add('skeleton');
      img.addEventListener('load',  () => img.classList.remove('skeleton'), { once: true });
      img.addEventListener('error', () => img.classList.remove('skeleton'), { once: true });
    }
  });

})();
