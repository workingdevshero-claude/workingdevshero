import type { FC } from 'hono/jsx';
import { Layout, Header, Card, headerStyles, cardStyles, formStyles, buttonStyles } from '../components';

const loginStyles = `
  ${headerStyles}
  ${cardStyles}
  ${formStyles}
  ${buttonStyles}

  .page-container {
    max-width: 420px;
    margin: 0 auto;
    padding: 60px 20px;
  }

  .logo {
    text-align: center;
    margin-bottom: 32px;
  }

  .logo a {
    font-size: 1.5rem;
    font-weight: 800;
    background: var(--accent-gradient-text);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    text-decoration: none;
    display: inline-flex;
    align-items: center;
    gap: 8px;
  }

  .logo-icon {
    font-size: 1.8rem;
    -webkit-text-fill-color: initial;
  }

  .card h1 {
    text-align: center;
    margin-bottom: 32px;
    font-size: 1.8rem;
    background: var(--accent-gradient-text);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    font-weight: 700;
  }

  .error {
    background: var(--error-bg);
    color: var(--error);
    padding: 14px 16px;
    border-radius: 10px;
    margin-bottom: 20px;
    display: none;
    font-size: 0.9rem;
    border: 1px solid rgba(239, 68, 68, 0.2);
  }

  .links {
    text-align: center;
    margin-top: 24px;
    padding-top: 24px;
    border-top: 1px solid var(--border-color);
    color: var(--text-secondary);
  }

  .links a {
    color: var(--accent-primary);
    text-decoration: none;
    font-weight: 600;
  }

  .links a:hover {
    text-decoration: underline;
  }
`;

const loginScript = `
  document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target;
    const errorDiv = document.getElementById('error');

    try {
      const response = await fetch('/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: form.email.value, password: form.password.value })
      });
      const data = await response.json();
      if (data.success) {
        window.location.href = '/dashboard';
      } else {
        errorDiv.textContent = data.error || 'Login failed';
        errorDiv.style.display = 'block';
      }
    } catch (error) {
      errorDiv.textContent = 'An error occurred. Please try again.';
      errorDiv.style.display = 'block';
    }
  });
`;

export const Login: FC = () => {
  return (
    <Layout title="Login - WorkingDevsHero" styles={loginStyles} scripts={loginScript}>
      <div class="page-container">
        <div class="logo">
          <a href="/">
            <span class="logo-icon">⚡</span>
            WorkingDevsHero
          </a>
        </div>
        <Card>
          <h1>Welcome Back</h1>
          <div id="error" class="error"></div>
          <form id="loginForm">
            <div class="form-group">
              <label for="email">Email</label>
              <input type="email" id="email" name="email" required placeholder="you@example.com" />
            </div>
            <div class="form-group">
              <label for="password">Password</label>
              <input type="password" id="password" name="password" required placeholder="Enter your password" />
            </div>
            <button type="submit" class="btn btn-primary btn-full">Login</button>
          </form>
          <div class="links">
            <p>Don't have an account? <a href="/auth/register">Sign Up</a></p>
          </div>
        </Card>
      </div>
    </Layout>
  );
};
