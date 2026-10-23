import { useLayoutEffect } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export default function useScrollAnimations() {
  useLayoutEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }

    const ctx = gsap.context(() => {
      // 1. Hero text entrance
      gsap.from('.hero-content-column > *', {
        y: 28,
        opacity: 0,
        stagger: 0.1,
        duration: 0.9,
        ease: 'power3.out',
        delay: 0.15
      });

      // Hero text fades and moves upward slightly as user scrolls down into About Us
      gsap.to('.hero-content-column', {
        scrollTrigger: {
          trigger: '#hero',
          start: '55% top',
          end: 'bottom top',
          scrub: true
        },
        y: -60,
        opacity: 0,
        ease: 'none'
      });

      // 2. About Us text entrance
      gsap.from('.about-content-column > *', {
        scrollTrigger: {
          trigger: '#about',
          start: 'top 75%',
          toggleActions: 'play none none reverse'
        },
        y: 32,
        opacity: 0,
        stagger: 0.1,
        duration: 0.8,
        ease: 'power2.out'
      });

      // 3. Features header & items entrance
      gsap.from('.features-header > *', {
        scrollTrigger: {
          trigger: '#features',
          start: 'top 75%',
          toggleActions: 'play none none reverse'
        },
        y: 30,
        opacity: 0,
        stagger: 0.1,
        duration: 0.8,
        ease: 'power2.out'
      });

      gsap.from('.feature-item', {
        scrollTrigger: {
          trigger: '.features-editorial-list',
          start: 'top 80%',
          toggleActions: 'play none none reverse'
        },
        y: 20,
        opacity: 0,
        stagger: 0.08,
        duration: 0.6,
        ease: 'power2.out'
      });

      // 4. Contact Us entrance
      gsap.from('.contact-copy-column > *', {
        scrollTrigger: {
          trigger: '#contact',
          start: 'top 75%',
          toggleActions: 'play none none reverse'
        },
        y: 28,
        opacity: 0,
        stagger: 0.1,
        duration: 0.8,
        ease: 'power2.out'
      });
    });

    return () => ctx.revert();
  }, []);
}
