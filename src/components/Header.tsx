import type { FC } from 'hono/jsx';
import type { User } from '../db';

interface HeaderProps {
  user?: User | null;
  logoHref?: string;
}

export const headerStyles = `
  header {
    padding: 16px 0;
    border-bottom: 1px solid var(--border-color);
    background: rgba(255, 255, 255, 0.8);
    position: sticky;
    top: 0;
    z-index: 100;
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
  }

  [data-theme="dark"] header {
    background: rgba(30, 41, 59, 0.85);
  }

  .header-content {
    max-width: 1200px;
    margin: 0 auto;
    padding: 0 20px;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .logo {
    font-size: 1.4rem;
    font-weight: 800;
    background: var(--accent-gradient-text);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    text-decoration: none;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .logo:hover {
    text-decoration: none;
  }

  .logo-icon {
    font-size: 1.6rem;
    -webkit-text-fill-color: initial;
  }

  nav {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  nav a {
    color: var(--text-secondary);
    text-decoration: none;
    padding: 8px 16px;
    border-radius: 10px;
    transition: all 0.2s;
    font-weight: 500;
  }

  nav a:hover {
    color: var(--text-primary);
    background: var(--bg-tertiary);
    text-decoration: none;
  }

  .nav-user {
    color: var(--text-muted);
    padding: 8px 12px;
    font-size: 0.9rem;
  }

  .nav-button {
    color: white !important;
    text-decoration: none;
    background: var(--accent-gradient);
    padding: 10px 20px;
    border-radius: 12px;
    font-weight: 600;
    transition: all 0.2s;
    box-shadow: var(--shadow-sm);
  }

  .nav-button:hover {
    text-decoration: none;
    transform: translateY(-1px);
    box-shadow: var(--shadow-md);
    background: var(--accent-gradient-hover);
  }

  .theme-toggle {
    background: var(--bg-tertiary);
    border: 1px solid var(--border-color);
    border-radius: 10px;
    padding: 8px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s;
    color: var(--text-secondary);
  }

  .theme-toggle:hover {
    background: var(--bg-card-hover);
    color: var(--text-primary);
    border-color: var(--border-color-hover);
  }

  .theme-toggle svg {
    width: 20px;
    height: 20px;
    stroke: currentColor;
    fill: none;
    stroke-width: 2;
    stroke-linecap: round;
    stroke-linejoin: round;
  }
`;

const ThemeToggle: FC = () => (
  <button class="theme-toggle" onclick="toggleTheme()" aria-label="Toggle theme">
    <svg id="theme-icon" viewBox="0 0 24 24">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
    </svg>
  </button>
);

export const Header: FC<HeaderProps> = ({ user, logoHref = '/' }) => {
  return (
    <header>
      <div class="header-content">
        <a href={logoHref} class="logo">
          <span class="logo-icon">⚡</span>
          WorkingDevsHero
        </a>
        <nav>
          <ThemeToggle />
          {user ? (
            <>
              <a href="/dashboard">Dashboard</a>
              <span class="nav-user">{user.email}</span>
              <a href="/auth/logout">Logout</a>
            </>
          ) : (
            <>
              <a href="/auth/login">Login</a>
              <a href="/auth/register" class="nav-button">Sign Up</a>
            </>
          )}
        </nav>
      </div>
    </header>
  );
};
