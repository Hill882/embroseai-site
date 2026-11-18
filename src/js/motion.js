import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';

gsap.registerPlugin(ScrollTrigger);

export async function initMotion({ reduce, floor }) {
  if (reduce) return { lenis: null, ScrollTrigger };

  const lenis = new Lenis({ lerp: 0.1, smoothWheel: true, autoRaf: false });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((time) => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);

  // Kinetic headline (hero is already in view)
  const chars = document.querySelectorAll('.display .char');
  if (chars.length) {
    gsap.from(chars, {
      yPercent: 110,
      opacity: 0,
      duration: 0.95,
      ease: 'power4.out',
      stagger: 0.018,
      delay: 0.08
    });
  }
  gsap.from('.hero .eyebrow, .hero .sub, .hero .ctas, .hero .fine, .hero .scroll-hint', {
    y: 22,
    opacity: 0,
    duration: 0.85,
    ease: 'power3.out',
    stagger: 0.07,
    delay: 0.45
  });

  document.querySelectorAll('h2.reveal').forEach((el) => {
    gsap.from(el, {
      y: 28,
      opacity: 0,
      duration: 0.7,
      ease: 'power3.out',
      scrollTrigger: { trigger: el, start: 'top 85%' }
    });
  });

  // Camera stations: lerp between neighboring sections as you scroll
  if (floor) {
    const sections = [...document.querySelectorAll('[data-station]')];
    const names = sections.map((s) => s.dataset.station);
    ScrollTrigger.create({
      trigger: document.body,
      start: 'top top',
      end: 'bottom bottom',
      scrub: 0.5,
      onUpdate() {
        // Find the two nearest stations by viewport
        let from = 0;
        const mid = window.innerHeight * 0.4;
        for (let i = 0; i < sections.length; i++) {
          const r = sections[i].getBoundingClientRect();
          if (r.top <= mid) from = i;
        }
        const a = sections[from];
        const b = sections[Math.min(from + 1, sections.length - 1)];
        const ar = a.getBoundingClientRect();
        const span = a.offsetHeight || 1;
        const t = Math.min(Math.max((-ar.top + mid) / span, 0), 1);
        floor.setStation(a.dataset.station, b.dataset.station, t);
      }
    });
    floor.setStation(names[0], names[0], 0);
  }

  window.__embrose = {
    scrollTo(y, immediate = true) {
      lenis.scrollTo(y, { immediate, duration: immediate ? 0 : 1.1 });
      ScrollTrigger.update();
    }
  };

  return { lenis, ScrollTrigger };
}

