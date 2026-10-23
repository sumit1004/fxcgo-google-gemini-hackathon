import React, { useCallback, useEffect, useState } from 'react';
import Lenis from 'lenis';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

import Loader from '../components/Loader';
import Navbar from '../components/Navbar';
import CargoShipScene from '../components/CargoShipScene';
import { 
  HeroSection, 
  AboutSection, 
  FeaturesSection, 
  ContactSection 
} from '../components/Sections';
import useScrollAnimations from '../hooks/useScrollAnimations';

gsap.registerPlugin(ScrollTrigger);

export default function LandingPage() {
  const [modelLoaded, setModelLoaded] = useState(false);

  // Staggered scroll animations for section text
  useScrollAnimations();

  // Lenis smooth scroll synchronized with GSAP ScrollTrigger
  useEffect(() => {
    const lenis = new Lenis({
      lerp: 0.08,
      smoothWheel: true,
      wheelMultiplier: 0.95
    });

    lenis.on('scroll', ScrollTrigger.update);

    const updateLenis = (time) => {
      lenis.raf(time * 1000);
    };

    gsap.ticker.add(updateLenis);
    gsap.ticker.lagSmoothing(0);

    return () => {
      gsap.ticker.remove(updateLenis);
      lenis.destroy();
    };
  }, []);

  const handleLoaderDone = useCallback(() => {
    setModelLoaded(true);
    setTimeout(() => {
      ScrollTrigger.refresh();
    }, 150);
  }, []);

  const scrollTo = (id) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <>
      {/* Loading Screen */}
      {!modelLoaded && <Loader onDone={handleLoaderDone} />}

      {/* Persistent 3D Cargo Ship Scene */}
      <CargoShipScene />

      {/* Minimal Navigation Bar */}
      <Navbar 
        onNavigate={scrollTo}
        onGetStarted={() => scrollTo('contact')}
      />

      {/* Exactly FOUR Main Sections */}
      <main className="landing-wrapper">
        {/* 1. Hero */}
        <HeroSection 
          onExplore={() => scrollTo('features')}
          onDiscover={() => scrollTo('about')}
        />

        {/* 2. About Us */}
        <AboutSection />

        {/* 3. Features */}
        <FeaturesSection />

        {/* 4. Contact Us */}
        <ContactSection 
          onGetStarted={() => scrollTo('contact')}
          onNavigate={scrollTo}
        />
      </main>
    </>
  );
}
