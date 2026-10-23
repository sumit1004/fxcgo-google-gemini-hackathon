import React, { useState } from 'react';
import { ArrowRight, Check } from 'lucide-react';

/* ========================================================
   1. HERO SECTION
   ======================================================== */
export function HeroSection({ onExplore, onDiscover }) {
  return (
    <section id="hero" className="section section-hero">
      <div className="hero-grid">
        {/* Left Side: Dedicated 52% space for 3D ship facing right */}
        <div className="hero-ship-column" aria-hidden="true" />

        {/* Right Side: Headline, description, CTA buttons */}
        <div className="section-content hero-content-column">
          <p className="eyebrow text-teal">
            GLOBAL TRADE. REIMAGINED.
          </p>

          <h1 className="hero-title">
            Move Global Trade <span className="hero-highlight">Forward.</span>
          </h1>

          <p className="hero-description">
            FXCGO helps exporters and importers navigate currency risk, make smarter forward-contract decisions, and simplify international trade through intelligent tools and secure digital workflows.
          </p>

          <div className="hero-actions">
            <button
              className="btn-primary"
              onClick={onExplore}
              aria-label="Explore FXCGO platform"
            >
              Explore FXCGO
              <ArrowRight size={15} />
            </button>
            <button
              className="btn-secondary"
              onClick={onDiscover}
              aria-label="Discover How It Works"
            >
              Discover How It Works
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ========================================================
   2. ABOUT US SECTION
   ======================================================== */
export function AboutSection() {
  const points = [
    {
      num: '01',
      title: 'Currency Uncertainty',
      text: 'Exchange-rate movements can significantly affect international payment values and business profitability.'
    },
    {
      num: '02',
      title: 'Fragmented Operations',
      text: 'Businesses often manage contracts, insurance, and documentation across disconnected systems.'
    },
    {
      num: '03',
      title: 'Trust and Verification',
      text: 'International trade requires reliable contract integrity and secure handling of sensitive commercial information.'
    }
  ];

  return (
    <section id="about" className="section section-about">
      <div className="about-grid">
        {/* Left Side: Editorial Typography */}
        <div className="section-content about-content-column">
          <p className="eyebrow text-lime">
            ABOUT FXCGO
          </p>

          <h2 className="about-title">
            Global Trade.<br />
            Unpredictable Risks.
          </h2>

          <p className="about-description">
            International trade businesses face constant currency fluctuations, complex documentation requirements, and fragmented trade operations. These challenges create financial uncertainty and make it difficult for exporters and importers to manage their transactions efficiently.
            <br /><br />
            FXCGO brings currency intelligence and essential trade workflows together in one connected platform.
          </p>

          <div className="about-rows">
            {points.map((p) => (
              <div key={p.num} className="about-row">
                <span className="about-row-num">{p.num}</span>
                <div>
                  <h3 className="about-row-title">{p.title}</h3>
                  <p className="about-row-text">{p.text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Side: Dedicated 48% space for 3D ship facing left */}
        <div className="about-ship-column" aria-hidden="true" />
      </div>
    </section>
  );
}

/* ========================================================
   3. FEATURES SECTION
   ======================================================== */
export function FeaturesSection() {
  const [activeCurrency, setActiveCurrency] = useState('USD/INR');

  const features = [
    {
      num: '01',
      title: 'AI Forex Forecasting',
      desc: 'Understand potential currency movements over a 15-day forecast horizon and make better-informed forward-contract decisions.'
    },
    {
      num: '02',
      title: 'Forward Contract Management',
      desc: 'Create and manage trade contracts, currency pairs, amounts, agreed rates, and maturity dates.'
    },
    {
      num: '03',
      title: 'Shipment Insurance',
      desc: 'Compare indicative insurance recommendations based on shipment value, goods category, trade route, and transport mode.'
    },
    {
      num: '04',
      title: 'Trade Documentation',
      desc: 'Generate document checklists based on countries, trade direction, and transport modes.'
    },
    {
      num: '05',
      title: 'Secure Contracts & Verification',
      desc: 'Protect sensitive contract information and support cryptographic integrity verification.'
    }
  ];

  return (
    <section id="features" className="section section-features">
      <div className="features-container">
        {/* Section Header */}
        <div className="section-content features-header">
          <p className="eyebrow text-teal">
            THE FXCGO PLATFORM
          </p>
          <h2 className="features-title">
            Every Trade Decision. Better Connected.
          </h2>
          <p className="features-description">
            From forecasting currency movements to managing essential trade workflows, FXCGO brings international-trade capabilities together in one platform.
          </p>
        </div>

        {/* Features Content: Upper & Right Portions for content, Bottom for Ship */}
        <div className="section-content features-main-layout">
          {/* Upper Left: Minimal Illustrative Forex Chart */}
          <div className="features-visual-card">
            <div className="forex-card-header">
              <span className="forex-tag">15-DAY FORECAST HORIZON</span>
              <div style={{ display: 'flex', gap: '8px' }}>
                {['USD/INR', 'USD/EUR'].map((pair) => (
                  <button
                    key={pair}
                    onClick={() => setActiveCurrency(pair)}
                    className="forex-currency-pair"
                    style={{
                      background: activeCurrency === pair ? 'var(--deep-teal)' : 'transparent',
                      color: activeCurrency === pair ? 'var(--lime)' : 'var(--deep-teal)',
                      padding: '2px 8px',
                      borderRadius: '2px',
                      fontSize: '12px'
                    }}
                  >
                    {pair}
                  </button>
                ))}
              </div>
            </div>

            <div className="forex-rate-display">
              <span className="forex-rate-val">
                {activeCurrency === 'USD/INR' ? '83.42' : '0.924'}
              </span>
              <span className="forex-rate-change">
                {activeCurrency === 'USD/INR' ? '+0.18%' : '-0.08%'}
              </span>
            </div>

            {/* Illustrative SVG Curve (Deep Teal + Lime) */}
            <svg className="forex-svg-chart" viewBox="0 0 400 130" preserveAspectRatio="none">
              {/* Grid Lines */}
              <line x1="0" y1="30" x2="400" y2="30" stroke="rgba(11, 70, 80, 0.08)" strokeDasharray="3 3" />
              <line x1="0" y1="65" x2="400" y2="65" stroke="rgba(11, 70, 80, 0.08)" strokeDasharray="3 3" />
              <line x1="0" y1="100" x2="400" y2="100" stroke="rgba(11, 70, 80, 0.08)" strokeDasharray="3 3" />

              {/* Day 0 Division */}
              <line x1="160" y1="10" x2="160" y2="120" stroke="var(--deep-teal)" strokeDasharray="2 2" opacity="0.4" />
              <text x="165" y="22" fill="#0B4650" fontSize="9" fontFamily="DM Mono">TODAY</text>

              {/* Shaded Forecast Corridor */}
              <polygon
                points="160,70 210,60 260,50 320,44 380,36 380,105 320,95 260,88 210,80 160,70"
                fill="rgba(230, 255, 43, 0.25)"
              />

              {/* Historical Trend */}
              <polyline
                points="10,82 50,78 90,74 130,76 160,70"
                fill="none"
                stroke="#0B4650"
                strokeWidth="2.2"
              />

              {/* Projected Median Curve */}
              <polyline
                points="160,70 210,66 260,60 320,54 380,48"
                fill="none"
                stroke="#0B4650"
                strokeWidth="2.4"
                strokeDasharray="4 3"
              />

              {/* Key Data Markers */}
              <circle cx="160" cy="70" r="4.5" fill="#E6FF2B" stroke="#0B4650" strokeWidth="2" />
              <circle cx="380" cy="48" r="4.5" fill="#E6FF2B" stroke="#0B4650" strokeWidth="2" />

              {/* Axis Labels */}
              <text x="12" y="122" fill="#898A8D" fontSize="9" fontFamily="DM Mono">DAY -5</text>
              <text x="150" y="122" fill="#898A8D" fontSize="9" fontFamily="DM Mono">DAY 0</text>
              <text x="260" y="122" fill="#898A8D" fontSize="9" fontFamily="DM Mono">DAY +7</text>
              <text x="345" y="122" fill="#898A8D" fontSize="9" fontFamily="DM Mono">DAY +15</text>
            </svg>

            <p className="forex-card-footer">
              * Illustrative forecasting preview. FXCGO decision-support signals do not guarantee foreign exchange profit or replace licensed financial advice.
            </p>
          </div>

          {/* Right: 5 Compact Editorial Features */}
          <div className="features-editorial-list">
            {features.map((item) => (
              <div key={item.num} className="feature-item">
                <span className="feature-num">{item.num}</span>
                <div>
                  <h3 className="feature-title">{item.title}</h3>
                  <p className="feature-desc">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Space reserved for ship floating across bottom */}
        <div className="features-ship-track-spacer" aria-hidden="true" />
      </div>
    </section>
  );
}

/* ========================================================
   4. CONTACT US SECTION
   ======================================================== */
export function ContactSection({ onGetStarted, onNavigate }) {
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '', message: '' });

  const handleSubmit = (e) => {
    e.preventDefault();
    setFormSubmitted(true);
    setTimeout(() => {
      setFormData({ name: '', email: '', message: '' });
      setFormSubmitted(false);
    }, 3500);
  };

  return (
    <section id="contact" className="section section-contact">
      <div className="contact-container">
        {/* Left Side: Headline, copy, CTAs */}
        <div className="section-content contact-copy-column">
          <p className="eyebrow text-lime">
            LET'S MOVE FORWARD
          </p>

          <h2 className="contact-title">
            Ready to Transform Your Trade?
          </h2>

          <p className="contact-description">
            Bring greater clarity to currency risk and international trade workflows with FXCGO.
          </p>

          <div className="contact-actions">
            <button
              className="btn-primary"
              onClick={onGetStarted}
              aria-label="Get Started with FXCGO"
            >
              Get Started
              <ArrowRight size={15} />
            </button>
            <button
              className="btn-secondary theme-dark"
              onClick={() => {
                document.getElementById('contact-name-input')?.focus();
              }}
              aria-label="Contact Us"
            >
              Contact Us
            </button>
          </div>
        </div>

        {/* Right Side: Minimal Frontend Contact Form */}
        <div className="section-content contact-form-card">
          {formSubmitted ? (
            <div style={{ textAlign: 'center', padding: '32px 0' }}>
              <div
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--lime)',
                  color: 'var(--deep-teal)',
                  display: 'grid',
                  placeContent: 'center',
                  margin: '0 auto 16px'
                }}
              >
                <Check size={20} strokeWidth={3} />
              </div>
              <h3 style={{ fontSize: '20px', fontWeight: 800, marginBottom: '8px' }}>Inquiry Registered</h3>
              <p style={{ fontSize: '13px', color: 'rgba(249, 247, 242, 0.75)' }}>
                Thank you for reaching out. An FXCGO trade specialist will contact you shortly.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label" htmlFor="contact-name-input">Full Name</label>
                <input
                  id="contact-name-input"
                  type="text"
                  required
                  placeholder="Sumit Kumar"
                  className="form-input"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Corporate Email</label>
                <input
                  type="email"
                  required
                  placeholder="sumitkumar042006@gmail.com"
                  className="form-input"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Trade Requirements / Message</label>
                <textarea
                  rows={3}
                  required
                  placeholder="likh de jo message bhejna hai "
                  className="form-textarea"
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                />
              </div>

              <button type="submit" className="form-submit-btn">
                Send Message
              </button>
            </form>
          )}
        </div>
      </div>

      {/* Compact Footer */}
      <footer className="site-footer">
        <div className="nav-brand">
          FXC<span className="brand-go">GO</span>
        </div>

        <nav className="footer-nav" aria-label="Footer links">
          <button onClick={() => onNavigate('hero')}>Home</button>
          <button onClick={() => onNavigate('about')}>About Us</button>
          <button onClick={() => onNavigate('features')}>Features</button>
          <button onClick={() => onNavigate('contact')}>Contact Us</button>
        </nav>

        <p className="footer-copy">
          © 2026 FXCGO. by team Psychic Coders x Sassy Coders.
        </p>
      </footer>
    </section>
  );
}
