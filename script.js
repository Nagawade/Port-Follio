/**
 * script.js — Multi-page safe
 * - Robust nav highlighting + fixes "#undefined" problem
 * - Mobile nav toggle (if present)
 * - Dark mode (localStorage)
 * - Year injection
 * - Visitor counter (localStorage)
 * - Skills animation (if .skill-bar present)
 * - Projects filter + search (if #projects-grid present)
 * - Resume upload preview + link opener (if elements present)
 * - Contact form validation (if #contact-form present)
 *
 * Drop this file into your project root and include:
 * <script src="script.js" defer></script>
 */

document.addEventListener('DOMContentLoaded', () => {
  /* ---------- helpers ---------- */
  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));
  const safeText = s => String(s || '').trim();

  /* ---------- elements (may be absent on some pages) ---------- */
  const navLinks = $$('.nav-link');
  const navToggle = $('#nav-toggle');
  const navList = $('#nav-list');
  const themeToggle = $('#theme-toggle');
  const yearEl = $('#year');
  const visitorCountEl = $('#visitor-count');

  const skillBars = $$('.skill-bar');
  const projectsGrid = $('#projects-grid');
  const filterBtns = $$('.filter-btn');
  const projectSearch = $('#project-search');

  const resumeFileInput = $('#resume-file');
  const resumeInfo = $('#resume-info');
  const resumeUrlInput = $('#resume-url');
  const resumeLinkBtn = $('#resume-link-btn');

  const contactForm = $('#contact-form');
  const formFeedback = $('#form-feedback');

  /* ---------- NAV: remove stray #undefined, highlight, and safe click behavior ---------- */
  (function navSetup() {
    // Remove accidental "#undefined" or "undefined"
    if (location.hash === '#undefined' || location.hash === 'undefined') {
      history.replaceState(null, '', location.pathname + location.search);
    }

    // Determine current file name (index.html for empty)
    const currentFile = (window.location.pathname.split('/').pop() || 'index.html').toLowerCase();

    // Highlight logic: compare filenames (robust to absolute/relative hrefs)
    navLinks.forEach(link => {
      try {
        const hrefAttr = safeText(link.getAttribute('href'));
        const linkFile = hrefAttr.split('/').pop().toLowerCase() || '';
        // if the link is just a hash or empty, skip highlighting here
        if (!linkFile) {
          link.classList.remove('active');
          return;
        }
        if (linkFile === currentFile || (currentFile === '' && linkFile === 'index.html')) {
          link.classList.add('active');
        } else {
          link.classList.remove('active');
        }
      } catch (err) {
        // ignore individual link errors
      }
    });

    // Click behavior:
    // - If link has data-target => treat as SPA tab (preventDefault only if dataset.target present)
    // - Else allow navigation (but mark active visually for the brief moment)
    navLinks.forEach(link => {
      link.addEventListener('click', (e) => {
        const isSpa = link.hasAttribute('data-target');
        const target = safeText(link.dataset.target);
        if (isSpa && target) {
          // SPA behavior only if valid data-target exists
          e.preventDefault();
          // Clear active & set clicked
          navLinks.forEach(l => l.classList.toggle('active', l === link));
          // Set hash safely (avoid undefined)
          history.replaceState(null, '', '#' + target);
          // Call global showSection if exists (single-page behavior)
          if (typeof showSection === 'function') {
            try { showSection(target); } catch (err) { /* ignore */ }
          }
        } else {
          // Multi-page behavior: set active for visual feedback (navigation may follow)
          navLinks.forEach(l => l.classList.remove('active'));
          link.classList.add('active');
          // let browser navigate normally
        }
      });
    });

    // update highlight on navigation events (back/forward)
    window.addEventListener('popstate', () => {
      const file = (window.location.pathname.split('/').pop() || 'index.html').toLowerCase();
      navLinks.forEach(link => {
        const hrefAttr = safeText(link.getAttribute('href'));
        const linkFile = hrefAttr.split('/').pop().toLowerCase() || '';
        link.classList.toggle('active', linkFile === file);
      });
    });
  })();

  /* ---------- Mobile nav toggle (if present) ---------- */
  (function mobileNav() {
    if (!navToggle || !navList) return;
    navToggle.addEventListener('click', () => {
      const expanded = navToggle.getAttribute('aria-expanded') === 'true';
      navToggle.setAttribute('aria-expanded', String(!expanded));
      navList.style.display = expanded ? '' : 'flex';
    });

    // close on outside click (mobile width)
    document.addEventListener('click', (e) => {
      if (window.innerWidth <= 860) {
        if (!navList.contains(e.target) && !navToggle.contains(e.target)) {
          navList.style.display = '';
          navToggle.setAttribute('aria-expanded', 'false');
        }
      }
    });
  })();

  /* ---------- Theme (dark mode) ---------- */
  (function themeSetup() {
    try {
      const stored = localStorage.getItem('theme');
      if (stored === 'dark') document.body.classList.add('dark');
    } catch (err) { /* ignore storage errors */ }

    if (!themeToggle) return;
    // set initial icon
    themeToggle.textContent = document.body.classList.contains('dark') ? '☀️' : '🌙';

    themeToggle.addEventListener('click', () => {
      document.body.classList.toggle('dark');
      const theme = document.body.classList.contains('dark') ? 'dark' : 'light';
      try { localStorage.setItem('theme', theme); } catch (err) { /* ignore */ }
      themeToggle.textContent = theme === 'dark' ? '☀️' : '🌙';
    });
  })();

  /* ---------- Year injection ---------- */
  if (yearEl) {
    try { yearEl.textContent = new Date().getFullYear(); } catch (err) { /* ignore */ }
  }

  /* ---------- Visitor counter (simple localStorage) ---------- */
  if (visitorCountEl) {
    try {
      const key = 'portfolio_visitors_v1';
      let count = Number(localStorage.getItem(key) || 0);
      count += 1;
      localStorage.setItem(key, String(count));
      visitorCountEl.textContent = String(count);
    } catch (err) {
      visitorCountEl.textContent = '—';
    }
  }

  /* ---------- Skills animation ---------- */
  (function skillsAnimation() {
    if (!skillBars || !skillBars.length) return;
    // animate fills after a short delay so CSS transitions run
    setTimeout(() => {
      skillBars.forEach(bar => {
        try {
          const fill = bar.querySelector('.skill-fill');
          const percent = safeText(bar.dataset.percent).replace('%', '') || '0';
          if (fill) fill.style.width = Math.min(100, Math.max(0, Number(percent))) + '%';
        } catch (err) { /* ignore */ }
      });
    }, 130);
  })();

  /* ---------- Projects: filter + search ---------- */
  (function projectsModule() {
    if (!projectsGrid) return;
    const CARD = '.project-card';

    function filterProjects(filter) {
      const cards = projectsGrid.querySelectorAll(CARD);
      cards.forEach(card => {
        const cat = (card.dataset.category || 'all').toString();
        card.style.display = (filter === 'all' || cat === filter) ? '' : 'none';
      });
    }

    if (filterBtns && filterBtns.length) {
      filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
          filterBtns.forEach(b => b.classList.toggle('active', b === btn));
          filterProjects(btn.dataset.filter || 'all');
        });
      });
    }

    if (projectSearch) {
      projectSearch.addEventListener('input', () => {
        const q = projectSearch.value.trim().toLowerCase();
        const cards = projectsGrid.querySelectorAll(CARD);
        cards.forEach(card => {
          const title = (card.dataset.title || '').toLowerCase();
          const desc = (card.textContent || '').toLowerCase();
          const match = title.includes(q) || desc.includes(q);
          card.style.display = match ? '' : 'none';
        });
      });
    }
  })();

  /* ---------- Resume upload + link opener ---------- */
  (function resumeModule() {
    if (resumeFileInput) {
      resumeFileInput.addEventListener('change', (e) => {
        const f = e.target.files && e.target.files[0];
        if (!resumeInfo) return;
        if (!f) {
          resumeInfo.innerHTML = '';
          return;
        }
        if (f.type !== 'application/pdf') {
          resumeInfo.textContent = 'Please upload a PDF file.';
          return;
        }
        const url = URL.createObjectURL(f);
        resumeInfo.innerHTML = `<strong>Uploaded:</strong> ${f.name} — <a href="${url}" target="_blank" rel="noopener">Open</a>`;
      });
    }

    if (resumeLinkBtn && resumeUrlInput) {
      resumeLinkBtn.addEventListener('click', () => {
        const url = safeText(resumeUrlInput.value);
        if (!url) return;
        window.open(url, '_blank', 'noopener');
      });
    }
  })();

  /* ---------- Contact form (client-side validation demo) ---------- */
  (function contactModule() {
    if (!contactForm) return;
    contactForm.addEventListener('submit', (e) => {
      e.preventDefault();
      if (formFeedback) formFeedback.textContent = '';
      if (!contactForm.checkValidity()) {
        if (formFeedback) {
          formFeedback.textContent = 'Please fill out all fields correctly.';
          formFeedback.style.color = '#f43f5e';
        }
        return;
      }
      // Replace below with real endpoint POST if you add serverless or Formspree etc.
      if (formFeedback) {
        formFeedback.textContent = 'Message sent — thank you! (Demo only)';
        formFeedback.style.color = '';
      }
      contactForm.reset();
    });
  })();

  /* ---------- Accessibility: keyboard support for nav links ---------- */
  (function navA11y() {
    if (!navLinks || !navLinks.length) return;
    navLinks.forEach(l => {
      l.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') l.click();
      });
    });
  })();

  /* ---------- finished ---------- */
});
