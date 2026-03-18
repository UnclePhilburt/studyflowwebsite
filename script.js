// Mobile Menu Toggle
const mobileMenuBtn = document.getElementById('mobileMenuBtn');
const navLinks = document.querySelector('.nav-links');

mobileMenuBtn?.addEventListener('click', () => {
  navLinks.classList.toggle('active');
  mobileMenuBtn.classList.toggle('active');
});

// Navbar scroll effect
const navbar = document.querySelector('.navbar');
let lastScroll = 0;

window.addEventListener('scroll', () => {
  const currentScroll = window.pageYOffset;

  if (currentScroll > 50) {
    navbar.classList.add('scrolled');
  } else {
    navbar.classList.remove('scrolled');
  }

  lastScroll = currentScroll;
});

// Smooth scroll for anchor links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function (e) {
    e.preventDefault();
    const target = document.querySelector(this.getAttribute('href'));
    if (target) {
      const offset = 80; // Account for fixed navbar
      const targetPosition = target.offsetTop - offset;
      window.scrollTo({
        top: targetPosition,
        behavior: 'smooth'
      });

      // Close mobile menu if open
      navLinks?.classList.remove('active');
      mobileMenuBtn?.classList.remove('active');
    }
  });
});

// Intersection Observer for fade-in animations
const observerOptions = {
  threshold: 0.1,
  rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('fade-in');
      observer.unobserve(entry.target);
    }
  });
}, observerOptions);

// Observe all feature cards, pricing cards, and faq items
document.querySelectorAll('.feature-card, .pricing-card, .faq-item, .step').forEach(el => {
  observer.observe(el);
});

// Add fade-in class for animations
const style = document.createElement('style');
style.textContent = `
  .feature-card, .pricing-card, .faq-item, .step {
    opacity: 0;
    transform: translateY(20px);
    transition: opacity 0.6s ease, transform 0.6s ease;
  }

  .fade-in {
    opacity: 1 !important;
    transform: translateY(0) !important;
  }
`;
document.head.appendChild(style);

// Stats counter animation
const animateCounter = (element, target) => {
  const duration = 2000;
  const start = 0;
  const increment = target / (duration / 16);
  let current = start;

  const timer = setInterval(() => {
    current += increment;
    if (current >= target) {
      element.textContent = target.toLocaleString();
      clearInterval(timer);
    } else {
      element.textContent = Math.floor(current).toLocaleString();
    }
  }, 16);
};

// Trigger counter animation when stats come into view
const statsObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const statNumbers = entry.target.querySelectorAll('.stat-number');
      statNumbers.forEach(stat => {
        const text = stat.textContent;
        const isPercentage = text.includes('%');
        const value = parseInt(text.replace(/[^0-9]/g, ''));

        // Animate the counter
        animateCounter(stat, value);

        // Add back percentage or plus sign
        if (isPercentage) {
          setTimeout(() => {
            stat.textContent = stat.textContent + '%';
          }, 2000);
        } else if (text.includes('+')) {
          setTimeout(() => {
            stat.textContent = stat.textContent + '+';
          }, 2000);
        }
      });

      statsObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.5 });

const heroStats = document.querySelector('.hero-stats');
if (heroStats) {
  statsObserver.observe(heroStats);
}

// Download button tracking
document.querySelectorAll('a[href*="download"]').forEach(button => {
  button.addEventListener('click', (e) => {
    // Track download event (integrate with analytics)
    console.log('Download clicked:', e.target.textContent);

    // You can add Google Analytics or other tracking here
    if (typeof gtag !== 'undefined') {
      gtag('event', 'download', {
        'event_category': 'engagement',
        'event_label': 'extension_download'
      });
    }
  });
});

// Pricing card hover effect
document.querySelectorAll('.pricing-card').forEach(card => {
  card.addEventListener('mouseenter', () => {
    card.style.transform = 'translateY(-8px) scale(1.02)';
  });

  card.addEventListener('mouseleave', () => {
    card.style.transform = 'translateY(0) scale(1)';
  });
});

// Browser mockup parallax effect
window.addEventListener('scroll', () => {
  const browserMockup = document.querySelector('.browser-mockup');
  if (browserMockup) {
    const scrolled = window.pageYOffset;
    const rate = scrolled * 0.3;
    browserMockup.style.transform = `translateY(${rate}px)`;
  }
});

// Copy to clipboard functionality (for code snippets if added later)
function copyToClipboard(text) {
  navigator.clipboard.writeText(text).then(() => {
    // Show success message
    console.log('Copied to clipboard');
  });
}

// Email subscription form (if added)
const subscribeForm = document.getElementById('subscribeForm');
if (subscribeForm) {
  subscribeForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = e.target.querySelector('input[type="email"]').value;
    console.log('Email subscription:', email);

    // Add your email subscription logic here
    alert('Thank you for subscribing!');
    e.target.reset();
  });
}

// Show/hide FAQ answers
document.querySelectorAll('.faq-item').forEach(item => {
  const question = item.querySelector('.faq-question');
  const answer = item.querySelector('.faq-answer');

  if (question && answer) {
    // Initially hide answers
    answer.style.maxHeight = answer.scrollHeight + 'px';

    question.style.cursor = 'pointer';
    question.addEventListener('click', () => {
      const isOpen = item.classList.contains('open');

      if (isOpen) {
        item.classList.remove('open');
        answer.style.maxHeight = answer.scrollHeight + 'px';
      } else {
        item.classList.add('open');
        answer.style.maxHeight = answer.scrollHeight + 'px';
      }
    });
  }
});

// Add loading state to buttons
document.querySelectorAll('.btn').forEach(button => {
  if (button.tagName === 'BUTTON') {
    button.addEventListener('click', function() {
      if (!this.classList.contains('loading')) {
        this.classList.add('loading');
        this.disabled = true;

        // Simulate loading (remove in production)
        setTimeout(() => {
          this.classList.remove('loading');
          this.disabled = false;
        }, 2000);
      }
    });
  }
});

// Dark Mode Toggle
const themeToggle = document.getElementById('themeToggle');
const htmlElement = document.documentElement;
const bodyElement = document.body;

// Check for saved theme preference or default to light mode
const currentTheme = localStorage.getItem('theme') || 'light';

// Apply saved theme on load
if (currentTheme === 'dark') {
  bodyElement.classList.add('dark-mode');
}

// Toggle theme
themeToggle?.addEventListener('click', () => {
  bodyElement.classList.toggle('dark-mode');

  // Save preference
  const theme = bodyElement.classList.contains('dark-mode') ? 'dark' : 'light';
  localStorage.setItem('theme', theme);

  console.log('Theme switched to:', theme);
});

console.log('StudyFlowSuite website loaded ✨');

document.addEventListener('DOMContentLoaded', function() {

      // Simulate AI selecting the correct answer
      setTimeout(() => {
        // Highlight the correct answer (Paris)
        const correctAnswer = document.querySelector('.demo-answer[data-correct="true"]');
        const correctRadio = correctAnswer.querySelector('input[type="radio"]');

        // Select the radio button
        correctRadio.checked = true;
        correctAnswer.classList.add('correct-selected');

        // Show explanation
        setTimeout(() => {

          // Change button text

          // Reload on click
            location.reload();
          };
        }, 800);
      }, 1000);
    });

    // Allow manual selection
      answer.addEventListener('click', function() {
        this.classList.add('selected');
      });
    });
  }
});
