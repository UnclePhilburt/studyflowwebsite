// Documentation page specific JavaScript

// Active section highlighting
const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        const id = entry.target.id;
        // Remove active class from all links
        document.querySelectorAll('.nav-section-links a').forEach((link) => {
          link.classList.remove('active');
        });
        // Add active class to current section link
        const activeLink = document.querySelector(`.nav-section-links a[href="#${id}"]`);
        if (activeLink) {
          activeLink.classList.add('active');
        }
      }
    });
  },
  {
    rootMargin: '-100px 0px -66%',
    threshold: 0
  }
);

// Observe all sections
document.querySelectorAll('.doc-section').forEach((section) => {
  observer.observe(section);
});

// Smooth scroll for sidebar links
document.querySelectorAll('.nav-section-links a').forEach((link) => {
  link.addEventListener('click', (e) => {
    e.preventDefault();
    const targetId = link.getAttribute('href');
    const targetSection = document.querySelector(targetId);
    if (targetSection) {
      const offset = 100;
      const targetPosition = targetSection.offsetTop - offset;
      window.scrollTo({
        top: targetPosition,
        behavior: 'smooth'
      });
    }
  });
});

// Copy code blocks
document.querySelectorAll('.code-block').forEach((block) => {
  const button = document.createElement('button');
  button.className = 'copy-code-btn';
  button.textContent = 'Copy';
  button.style.cssText = `
    position: absolute;
    top: 0.75rem;
    right: 0.75rem;
    background: rgba(255, 255, 255, 0.1);
    color: white;
    border: 1px solid rgba(255, 255, 255, 0.2);
    padding: 0.5rem 1rem;
    border-radius: 4px;
    cursor: pointer;
    font-size: 0.75rem;
    font-weight: 600;
    transition: all 0.2s;
  `;

  button.addEventListener('mouseenter', () => {
    button.style.background = 'rgba(255, 255, 255, 0.2)';
  });

  button.addEventListener('mouseleave', () => {
    button.style.background = 'rgba(255, 255, 255, 0.1)';
  });

  button.addEventListener('click', () => {
    const code = block.querySelector('code').textContent;
    navigator.clipboard.writeText(code).then(() => {
      button.textContent = 'Copied!';
      setTimeout(() => {
        button.textContent = 'Copy';
      }, 2000);
    });
  });

  block.style.position = 'relative';
  block.appendChild(button);
});

// Search functionality (basic)
function createSearchBox() {
  const sidebar = document.querySelector('.sidebar-content');
  if (!sidebar) return;

  const searchHTML = `
    <div class="docs-search">
      <input type="text" placeholder="Search documentation..." id="docsSearch">
    </div>
  `;

  sidebar.insertAdjacentHTML('afterbegin', searchHTML);

  const searchInput = document.getElementById('docsSearch');
  searchInput.addEventListener('input', (e) => {
    const query = e.target.value.toLowerCase();
    const sections = document.querySelectorAll('.doc-section');

    if (query.length === 0) {
      sections.forEach((section) => {
        section.style.display = 'block';
      });
      return;
    }

    sections.forEach((section) => {
      const text = section.textContent.toLowerCase();
      if (text.includes(query)) {
        section.style.display = 'block';
      } else {
        section.style.display = 'none';
      }
    });
  });
}

// Initialize search
createSearchBox();

// Add anchor links to headings
document.querySelectorAll('.doc-section h2, .doc-section h3').forEach((heading) => {
  if (!heading.id) {
    heading.id = heading.textContent
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }

  heading.style.cursor = 'pointer';
  heading.addEventListener('click', () => {
    const url = new URL(window.location);
    url.hash = heading.id;
    window.history.pushState({}, '', url);

    navigator.clipboard.writeText(url.toString()).then(() => {
      // Show feedback
      const feedback = document.createElement('span');
      feedback.textContent = ' 🔗 Link copied!';
      feedback.style.cssText = `
        margin-left: 0.5rem;
        font-size: 0.875rem;
        color: var(--primary);
        font-weight: 500;
      `;
      heading.appendChild(feedback);
      setTimeout(() => feedback.remove(), 2000);
    });
  });
});

// Back to top button
const backToTop = document.createElement('button');
backToTop.innerHTML = '↑';
backToTop.className = 'back-to-top';
backToTop.style.cssText = `
  position: fixed;
  bottom: 2rem;
  right: 2rem;
  width: 48px;
  height: 48px;
  background: var(--gradient);
  color: white;
  border: none;
  border-radius: 50%;
  font-size: 1.5rem;
  cursor: pointer;
  box-shadow: var(--shadow-lg);
  opacity: 0;
  pointer-events: none;
  transition: all 0.3s;
  z-index: 1000;
`;

document.body.appendChild(backToTop);

window.addEventListener('scroll', () => {
  if (window.pageYOffset > 300) {
    backToTop.style.opacity = '1';
    backToTop.style.pointerEvents = 'auto';
  } else {
    backToTop.style.opacity = '0';
    backToTop.style.pointerEvents = 'none';
  }
});

backToTop.addEventListener('click', () => {
  window.scrollTo({
    top: 0,
    behavior: 'smooth'
  });
});

// Print-friendly version
document.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
    // Add print-specific styles
    const style = document.createElement('style');
    style.textContent = `
      @media print {
        .navbar, .docs-sidebar, .back-to-top, .copy-code-btn {
          display: none !important;
        }
        .docs-main {
          padding: 0;
        }
        .doc-section {
          page-break-inside: avoid;
        }
      }
    `;
    document.head.appendChild(style);
  }
});

console.log('Documentation page loaded 📚');
