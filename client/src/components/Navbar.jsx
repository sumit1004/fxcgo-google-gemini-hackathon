import React, { useState, useEffect } from 'react';
import { Menu, X } from 'lucide-react';

export default function Navbar({ onNavigate, onGetStarted }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isDarkSection, setIsDarkSection] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      const about = document.getElementById('about');
      const features = document.getElementById('features');
      const contact = document.getElementById('contact');

      if (!about || !features || !contact) return;

      const aboutTop = about.offsetTop - 50;
      const featuresTop = features.offsetTop - 50;
      const contactTop = contact.offsetTop - 50;

      // Hero: light (0 to aboutTop)
      // About: dark (aboutTop to featuresTop)
      // Features: light (featuresTop to contactTop)
      // Contact: dark (contactTop onwards)
      if (scrollY >= contactTop) {
        setIsDarkSection(true);
      } else if (scrollY >= featuresTop) {
        setIsDarkSection(false);
      } else if (scrollY >= aboutTop) {
        setIsDarkSection(true);
      } else {
        setIsDarkSection(false);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleLinkClick = (id) => {
    onNavigate(id);
    setMobileOpen(false);
  };

  return (
    <header className={`nav-bar ${isDarkSection ? 'theme-dark' : 'theme-light'}`}>
      {/* Brand Wordmark */}
      <button 
        className="nav-brand" 
        onClick={() => handleLinkClick('hero')}
        aria-label="FXCGO Homepage"
      >
        FXC<span className="brand-go">GO</span>
      </button>

      {/* Navigation Links */}
      <nav className={`nav-links ${mobileOpen ? 'nav-open' : ''}`} aria-label="Main Navigation">
        <button 
          className="nav-link" 
          onClick={() => handleLinkClick('hero')}
        >
          Home
        </button>
        <button 
          className="nav-link" 
          onClick={() => handleLinkClick('about')}
        >
          About Us
        </button>
        <button 
          className="nav-link" 
          onClick={() => handleLinkClick('features')}
        >
          Features
        </button>
        <button 
          className="nav-link" 
          onClick={() => handleLinkClick('contact')}
        >
          Contact Us
        </button>

        <a 
          href="/login"
          className="nav-link"
          style={{ fontWeight: 700 }}
          onClick={() => setMobileOpen(false)}
        >
          Sign In
        </a>

        <a 
          href="/register"
          className="nav-cta" 
          onClick={() => setMobileOpen(false)}
        >
          Get Started
        </a>
      </nav>

      {/* Mobile Menu Button */}
      <button 
        className="nav-mobile-toggle"
        onClick={() => setMobileOpen(!mobileOpen)}
        aria-label={mobileOpen ? 'Close Menu' : 'Open Menu'}
        aria-expanded={mobileOpen}
      >
        {mobileOpen ? <X size={22} /> : <Menu size={22} />}
      </button>
    </header>
  );
}
