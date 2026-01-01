import type { FC } from 'hono/jsx';
import { Layout, Header, headerStyles, buttonStyles } from '../components';
import type { User } from '../db';

interface LandingProps {
  user: User | null;
  solPrice: number;
}

const landingStyles = `
  ${headerStyles}
  ${buttonStyles}

  .hero {
    text-align: center;
    padding: 100px 20px 80px;
    position: relative;
    overflow: hidden;
  }

  .hero-badge {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    background: var(--bg-tertiary);
    border: 1px solid var(--border-color);
    padding: 8px 16px;
    border-radius: 50px;
    font-size: 0.9rem;
    color: var(--text-secondary);
    margin-bottom: 24px;
  }

  .hero-badge .emoji {
    font-size: 1.1rem;
  }

  .hero h1 {
    font-size: 3.5rem;
    margin-bottom: 24px;
    background: var(--accent-gradient-text);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    font-weight: 800;
    line-height: 1.1;
    letter-spacing: -0.02em;
  }

  .hero p {
    font-size: 1.3rem;
    color: var(--text-secondary);
    max-width: 600px;
    margin: 0 auto 40px;
    line-height: 1.6;
  }

  .hero-cta {
    display: flex;
    gap: 16px;
    justify-content: center;
    flex-wrap: wrap;
    margin-bottom: 32px;
  }

  .solana-badge {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    background: var(--success-bg);
    padding: 10px 20px;
    border-radius: 50px;
    color: var(--success);
    font-size: 0.95rem;
    font-weight: 500;
    border: 1px solid rgba(16, 185, 129, 0.2);
  }

  .features {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 24px;
    padding: 60px 20px;
    max-width: 1200px;
    margin: 0 auto;
  }

  @media (max-width: 900px) {
    .features {
      grid-template-columns: 1fr;
    }
  }

  .feature-card {
    background: var(--bg-card);
    padding: 32px;
    border-radius: 20px;
    border: 1px solid var(--border-color);
    transition: all 0.3s;
    position: relative;
    overflow: hidden;
  }

  .feature-card:hover {
    transform: translateY(-4px);
    box-shadow: var(--shadow-xl);
    border-color: var(--border-color-hover);
  }

  .feature-card .icon {
    font-size: 2.5rem;
    margin-bottom: 16px;
    display: block;
  }

  .feature-card h3 {
    color: var(--text-primary);
    margin-bottom: 12px;
    font-size: 1.2rem;
    font-weight: 600;
  }

  .feature-card p {
    color: var(--text-secondary);
    line-height: 1.6;
    font-size: 0.95rem;
  }

  .section {
    padding: 80px 20px;
  }

  .section-alt {
    background: var(--bg-secondary);
  }

  .section-title {
    text-align: center;
    font-size: 2.5rem;
    margin-bottom: 16px;
    font-weight: 700;
    color: var(--text-primary);
  }

  .section-subtitle {
    text-align: center;
    color: var(--text-secondary);
    font-size: 1.1rem;
    max-width: 600px;
    margin: 0 auto 50px;
  }

  /* How It Works */
  .steps {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 40px;
    max-width: 1000px;
    margin: 0 auto;
  }

  @media (max-width: 768px) {
    .steps {
      grid-template-columns: 1fr;
      gap: 30px;
    }
  }

  .step {
    text-align: center;
    position: relative;
  }

  .step-number {
    width: 60px;
    height: 60px;
    background: var(--accent-gradient);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.5rem;
    font-weight: 700;
    color: white;
    margin: 0 auto 20px;
    box-shadow: var(--shadow-lg), 0 0 30px rgba(59, 130, 246, 0.2);
  }

  .step h4 {
    margin-bottom: 12px;
    font-size: 1.2rem;
    color: var(--text-primary);
    font-weight: 600;
  }

  .step p {
    color: var(--text-secondary);
    font-size: 0.95rem;
    line-height: 1.6;
  }

  /* What Can You Build */
  .build-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 20px;
    max-width: 1200px;
    margin: 0 auto;
  }

  @media (max-width: 900px) {
    .build-grid {
      grid-template-columns: repeat(2, 1fr);
    }
  }

  @media (max-width: 600px) {
    .build-grid {
      grid-template-columns: 1fr;
    }
  }

  .build-card {
    background: var(--bg-card);
    padding: 24px;
    border-radius: 16px;
    border: 1px solid var(--border-color);
    transition: all 0.2s;
  }

  .build-card:hover {
    border-color: var(--accent-primary);
    background: var(--bg-card-hover);
  }

  .build-card .emoji {
    font-size: 1.8rem;
    margin-bottom: 12px;
    display: block;
  }

  .build-card h3 {
    color: var(--text-primary);
    margin-bottom: 8px;
    font-size: 1rem;
    font-weight: 600;
  }

  .build-card p {
    color: var(--text-muted);
    font-size: 0.9rem;
    line-height: 1.5;
  }

  /* Pricing */
  .pricing {
    text-align: center;
    padding: 80px 20px;
    background: var(--bg-secondary);
  }

  .pricing-card {
    background: var(--bg-card);
    border: 2px solid var(--border-color);
    border-radius: 24px;
    padding: 48px;
    max-width: 500px;
    margin: 0 auto;
    box-shadow: var(--shadow-xl);
  }

  .price-tag {
    font-size: 4rem;
    background: var(--accent-gradient-text);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    margin: 20px 0;
    font-weight: 800;
  }

  .price-tag span {
    font-size: 1.5rem;
    color: var(--text-muted);
    -webkit-text-fill-color: var(--text-muted);
  }

  .price-detail {
    color: var(--text-secondary);
    margin-bottom: 8px;
    font-size: 1.1rem;
  }

  .price-highlight {
    color: var(--success);
    font-weight: 500;
  }

  /* Footer */
  footer {
    text-align: center;
    padding: 40px 20px;
    border-top: 1px solid var(--border-color);
    color: var(--text-muted);
    background: var(--bg-primary);
  }

  footer a {
    color: var(--text-secondary);
  }

  @media (max-width: 768px) {
    .hero h1 {
      font-size: 2.2rem;
    }
    .hero p {
      font-size: 1.1rem;
    }
    .section-title {
      font-size: 2rem;
    }
    .price-tag {
      font-size: 3rem;
    }
  }
`;

const SolanaIcon: FC = () => (
  <svg width="18" height="18" viewBox="0 0 397 311" fill="currentColor">
    <path d="M64.6 237.9c2.4-2.4 5.7-3.8 9.2-3.8h317.4c5.8 0 8.7 7 4.6 11.1l-62.7 62.7c-2.4 2.4-5.7 3.8-9.2 3.8H6.5c-5.8 0-8.7-7-4.6-11.1l62.7-62.7z"/>
    <path d="M64.6 3.8C67.1 1.4 70.4 0 73.8 0h317.4c5.8 0 8.7 7 4.6 11.1l-62.7 62.7c-2.4 2.4-5.7 3.8-9.2 3.8H6.5c-5.8 0-8.7-7-4.6-11.1L64.6 3.8z"/>
    <path d="M332.4 120.2c-2.4-2.4-5.7-3.8-9.2-3.8H5.9c-5.8 0-8.7 7-4.6 11.1l62.7 62.7c2.4 2.4 5.7 3.8 9.2 3.8h317.4c5.8 0 8.7-7 4.6-11.1l-62.8-62.7z"/>
  </svg>
);

const FeatureCard: FC<{ icon: string; title: string; description: string }> = ({ icon, title, description }) => (
  <div class="feature-card">
    <span class="icon">{icon}</span>
    <h3>{title}</h3>
    <p>{description}</p>
  </div>
);

const Step: FC<{ number: number; title: string; description: string }> = ({ number, title, description }) => (
  <div class="step">
    <div class="step-number">{number}</div>
    <h4>{title}</h4>
    <p>{description}</p>
  </div>
);

const BuildCard: FC<{ emoji: string; title: string; description: string }> = ({ emoji, title, description }) => (
  <div class="build-card">
    <span class="emoji">{emoji}</span>
    <h3>{title}</h3>
    <p>{description}</p>
  </div>
);

export const Landing: FC<LandingProps> = ({ user }) => {
  const ctaHref = user ? '/submit' : '/auth/register';
  const ctaText = user ? 'Submit a Task' : 'Get Started';

  return (
    <Layout title="WorkingDevsHero - AI Application Development as a Service" styles={landingStyles} showBlobs>
      <Header user={user} />

      <section class="hero">
        <div class="container">
          <div class="hero-badge">
            <span class="emoji">🚀</span>
            AI-powered development in minutes
          </div>
          <h1>Build Software<br />Without the Hassle</h1>
          <p>Tell us what you need, and let AI do the heavy lifting. Pay only for the time you use. It's that simple.</p>
          <div class="hero-cta">
            <a href={ctaHref} class="cta-button">
              {ctaText} →
            </a>
          </div>
          <div class="solana-badge">
            <SolanaIcon />
            Pay with Solana
          </div>
        </div>
      </section>

      <section class="features">
        <FeatureCard
          icon="⚡"
          title="Lightning Fast"
          description="AI analyzes your requirements and starts building immediately. Most tasks complete in minutes, not days."
        />
        <FeatureCard
          icon="💰"
          title="Pay Per Minute"
          description="Only pay for what you use. Set your budget, and never worry about surprise bills. $0.10/minute."
        />
        <FeatureCard
          icon="📧"
          title="Delivered to You"
          description="Get your completed work delivered straight to your inbox. Ready to use, no setup required."
        />
      </section>

      {/* How It Works - moved above What Can You Build */}
      <section class="section section-alt">
        <div class="container">
          <h2 class="section-title">How It Works</h2>
          <p class="section-subtitle">Three simple steps from idea to working software</p>
          <div class="steps">
            <Step
              number={1}
              title="Describe Your Task"
              description="Tell us what you want in plain English. Add as much detail as you like - the more, the better!"
            />
            <Step
              number={2}
              title="Set Your Budget"
              description="Choose how many minutes of AI time you need. Pay securely with Solana - fast and low fees."
            />
            <Step
              number={3}
              title="Get Your Results"
              description="Receive your completed work via email. Review it, use it, love it. It's yours!"
            />
          </div>
        </div>
      </section>

      {/* What Can You Build */}
      <section class="section">
        <div class="container">
          <h2 class="section-title">What Can You Build?</h2>
          <p class="section-subtitle">From quick scripts to full applications - if you can describe it, we can build it</p>
          <div class="build-grid">
            <BuildCard
              emoji="📊"
              title="Reports & Analysis"
              description="Data analysis, financial reports, market research, and automated reporting tools."
            />
            <BuildCard
              emoji="✍️"
              title="Content Creation"
              description="Blog posts, marketing copy, newsletters, SEO articles, and content calendars."
            />
            <BuildCard
              emoji="🌐"
              title="Websites"
              description="Landing pages, portfolios, documentation sites, and single-page applications."
            />
            <BuildCard
              emoji="🔧"
              title="Scripts & Automation"
              description="Python scripts, shell automation, data pipelines, and web scrapers."
            />
            <BuildCard
              emoji="🔌"
              title="APIs & Backends"
              description="REST APIs, GraphQL servers, database schemas, and microservices."
            />
            <BuildCard
              emoji="🛠️"
              title="Dev Tools"
              description="CLI tools, browser extensions, VS Code plugins, and Discord bots."
            />
          </div>
        </div>
      </section>

      <section class="pricing">
        <div class="container">
          <h2 class="section-title">Simple Pricing</h2>
          <p class="section-subtitle">No subscriptions, no hidden fees. Just pay for what you use.</p>
          <div class="pricing-card">
            <p class="price-detail">Just</p>
            <div class="price-tag">$6<span>/hour</span></div>
            <p class="price-detail">That's only <span class="price-highlight">$0.10 per minute</span></p>
            <p class="price-detail" style="margin-top: 24px; margin-bottom: 32px;">
              Pay with Solana for instant, low-fee transactions
            </p>
            <a href={ctaHref} class="cta-button">{ctaText} →</a>
          </div>
        </div>
      </section>

      <footer>
        <div class="container">
          <p>© 2025 WorkingDevsHero • Built with ⚡ and AI</p>
        </div>
      </footer>
    </Layout>
  );
};
