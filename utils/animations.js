/**
 * Animation Utilities
 * Provides scroll reveal, stagger animations, and other visual effects
 */

/**
 * Initialize scroll reveal animation
 * Elements with .scroll-reveal class will fade in when scrolled into view
 */
export function initScrollReveal() {
  const revealElements = document.querySelectorAll('.scroll-reveal');
  
  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        revealObserver.unobserve(entry.target);
      }
    });
  }, {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
  });
  
  revealElements.forEach(element => {
    revealObserver.observe(element);
  });
}

/**
 * Apply staggered animation delays to elements
 * @param {string} selector - CSS selector for elements
 * @param {number} delay - Delay between each element in ms (default: 100)
 */
export function staggerAnimation(selector, delay = 100) {
  const elements = document.querySelectorAll(selector);
  elements.forEach((element, index) => {
    element.style.animationDelay = `${index * delay}ms`;
  });
}

/**
 * Show confetti animation for celebration
 * Note: In production, use canvas-confetti library for better effects
 */
export function showConfetti() {
  const duration = 3000;
  const animationEnd = Date.now() + duration;
  const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 10000 };

  function randomInRange(min, max) {
    return Math.random() * (max - min) + min;
  }

  const interval = setInterval(function() {
    const timeLeft = animationEnd - Date.now();

    if (timeLeft <= 0) {
      return clearInterval(interval);
    }

    const particleCount = 50 * (timeLeft / duration);
    
    // Simulate confetti (in real app, would use canvas-confetti library)
    console.log('🎉 Confetti!', Math.round(particleCount));
  }, 250);
}

/**
 * Smooth scroll to element with easing
 * @param {HTMLElement} element - Target element to scroll to
 * @param {number} duration - Animation duration in ms (default: 800)
 */
export function smoothScrollTo(element, duration = 800) {
  const targetPosition = element.getBoundingClientRect().top + window.pageYOffset;
  const startPosition = window.pageYOffset;
  const distance = targetPosition - startPosition;
  let startTime = null;

  function animation(currentTime) {
    if (startTime === null) startTime = currentTime;
    const timeElapsed = currentTime - startTime;
    const run = ease(timeElapsed, startPosition, distance, duration);
    window.scrollTo(0, run);
    if (timeElapsed < duration) requestAnimationFrame(animation);
  }

  function ease(t, b, c, d) {
    t /= d / 2;
    if (t < 1) return c / 2 * t * t + b;
    t--;
    return -c / 2 * (t * (t - 2) - 1) + b;
  }

  requestAnimationFrame(animation);
}

/**
 * Add entrance animations to cards on page load
 */
function animateCards() {
  const cards = document.querySelectorAll('.card:not(.animate-fade-in):not(.no-animate)');
  cards.forEach((card, index) => {
    card.classList.add('animate-fade-in');
    card.style.animationDelay = `${index * 0.1}s`;
  });
}

/**
 * Initialize all animation features
 */
export function initAnimations() {
  initScrollReveal();
  animateCards();
}

// Auto-initialize on page load
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAnimations);
  } else {
    initAnimations();
  }
}
