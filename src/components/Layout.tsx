import type { FC, PropsWithChildren } from 'hono/jsx';
import { html, raw } from 'hono/html';

export const baseStyles = `
  :root {
    /* Light mode (default) */
    --bg-primary: #f8fafc;
    --bg-secondary: #ffffff;
    --bg-tertiary: #f1f5f9;
    --bg-card: #ffffff;
    --bg-card-hover: #f8fafc;

    --text-primary: #1e293b;
    --text-secondary: #64748b;
    --text-muted: #94a3b8;

    --accent-primary: #3b82f6;
    --accent-secondary: #8b5cf6;
    --accent-gradient: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 50%, #ec4899 100%);
    --accent-gradient-hover: linear-gradient(135deg, #2563eb 0%, #7c3aed 50%, #db2777 100%);
    --accent-gradient-text: linear-gradient(135deg, #3b82f6, #8b5cf6, #ec4899);

    --success: #10b981;
    --success-bg: rgba(16, 185, 129, 0.1);
    --warning: #f59e0b;
    --warning-bg: rgba(245, 158, 11, 0.1);
    --error: #ef4444;
    --error-bg: rgba(239, 68, 68, 0.1);

    --border-color: #e2e8f0;
    --border-color-hover: #cbd5e1;

    --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.05);
    --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1);
    --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1);
    --shadow-xl: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
    --shadow-glow: 0 0 40px rgba(59, 130, 246, 0.15);
  }

  [data-theme="dark"] {
    --bg-primary: #0f172a;
    --bg-secondary: #1e293b;
    --bg-tertiary: #334155;
    --bg-card: #1e293b;
    --bg-card-hover: #334155;

    --text-primary: #f1f5f9;
    --text-secondary: #94a3b8;
    --text-muted: #64748b;

    --border-color: #334155;
    --border-color-hover: #475569;

    --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.3);
    --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.4), 0 2px 4px -2px rgba(0, 0, 0, 0.3);
    --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.4), 0 4px 6px -4px rgba(0, 0, 0, 0.3);
    --shadow-xl: 0 20px 25px -5px rgba(0, 0, 0, 0.4), 0 8px 10px -6px rgba(0, 0, 0, 0.3);
    --shadow-glow: 0 0 60px rgba(59, 130, 246, 0.2);
  }

  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }

  body {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    background: var(--bg-primary);
    min-height: 100vh;
    color: var(--text-primary);
    transition: background 0.3s ease, color 0.3s ease;
    line-height: 1.6;
  }

  .container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 0 20px;
  }

  a {
    color: var(--accent-primary);
    text-decoration: none;
    transition: color 0.2s;
  }

  a:hover {
    color: var(--accent-secondary);
  }

  /* Fun decorative blobs */
  .blob {
    position: fixed;
    border-radius: 50%;
    filter: blur(80px);
    opacity: 0.4;
    pointer-events: none;
    z-index: -1;
    transition: opacity 0.3s;
  }

  [data-theme="dark"] .blob {
    opacity: 0.2;
  }

  .blob-1 {
    width: 500px;
    height: 500px;
    background: #3b82f6;
    top: -150px;
    right: -100px;
    animation: float 20s ease-in-out infinite;
  }

  .blob-2 {
    width: 400px;
    height: 400px;
    background: #8b5cf6;
    bottom: -100px;
    left: -100px;
    animation: float 25s ease-in-out infinite reverse;
  }

  .blob-3 {
    width: 300px;
    height: 300px;
    background: #ec4899;
    top: 40%;
    left: 60%;
    animation: float 18s ease-in-out infinite;
  }

  @keyframes float {
    0%, 100% { transform: translate(0, 0) scale(1); }
    25% { transform: translate(20px, -20px) scale(1.05); }
    50% { transform: translate(-10px, 10px) scale(0.95); }
    75% { transform: translate(-20px, -10px) scale(1.02); }
  }

  /* Sparkle effect for fun */
  .sparkle {
    position: relative;
  }

  .sparkle::before {
    content: '✨';
    position: absolute;
    top: -10px;
    right: -20px;
    font-size: 1.2rem;
    animation: sparkle 2s ease-in-out infinite;
  }

  @keyframes sparkle {
    0%, 100% { opacity: 1; transform: scale(1) rotate(0deg); }
    50% { opacity: 0.5; transform: scale(1.2) rotate(10deg); }
  }
`;

export const modalStyles = `
  .modal-overlay {
    display: none;
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    backdrop-filter: blur(4px);
    z-index: 1000;
    align-items: center;
    justify-content: center;
  }

  .modal-overlay.active {
    display: flex;
  }

  .modal {
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    border-radius: 24px;
    padding: 32px;
    max-width: 400px;
    width: 90%;
    text-align: center;
    box-shadow: var(--shadow-xl);
  }

  .modal h3 {
    margin-bottom: 12px;
    color: var(--text-primary);
    font-size: 1.25rem;
    font-weight: 600;
  }

  .modal p {
    color: var(--text-secondary);
    margin-bottom: 24px;
    line-height: 1.6;
  }

  .modal-buttons {
    display: flex;
    gap: 12px;
    justify-content: center;
  }

  .modal-btn {
    padding: 12px 24px;
    border-radius: 12px;
    font-weight: 600;
    cursor: pointer;
    border: none;
    transition: all 0.2s;
    font-size: 0.95rem;
  }

  .modal-btn:hover {
    transform: translateY(-2px);
    box-shadow: var(--shadow-md);
  }

  .modal-btn-primary {
    background: var(--accent-gradient);
    color: white;
  }

  .modal-btn-secondary {
    background: var(--bg-tertiary);
    color: var(--text-secondary);
  }

  .modal-btn-danger {
    background: var(--error);
    color: white;
  }
`;

export const modalScript = `
  function showModal(title, message, buttons) {
    document.getElementById('modal-title').textContent = title;
    document.getElementById('modal-message').textContent = message;
    const buttonsContainer = document.getElementById('modal-buttons');
    buttonsContainer.innerHTML = '';
    buttons.forEach(btn => {
      const button = document.createElement('button');
      button.className = 'modal-btn ' + (btn.class || 'modal-btn-primary');
      button.textContent = btn.text;
      button.onclick = () => {
        hideModal();
        if (btn.action) btn.action();
      };
      buttonsContainer.appendChild(button);
    });
    document.getElementById('modal').classList.add('active');
  }

  function hideModal() {
    document.getElementById('modal').classList.remove('active');
  }

  function showAlert(title, message, onClose) {
    showModal(title, message, [
      { text: 'OK', class: 'modal-btn-primary', action: onClose }
    ]);
  }

  function showConfirm(title, message, onConfirm, onCancel) {
    showModal(title, message, [
      { text: 'Cancel', class: 'modal-btn-secondary', action: onCancel },
      { text: 'Confirm', class: 'modal-btn-danger', action: onConfirm }
    ]);
  }
`;

// Theme initialization script - runs immediately in head to prevent flash
const themeInitScript = `
(function() {
  var theme = localStorage.getItem('theme');
  if (!theme) {
    theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  document.documentElement.setAttribute('data-theme', theme);
})();
`;

// Theme toggle functions - loaded in body
const themeToggleScript = `
function toggleTheme() {
  var current = document.documentElement.getAttribute('data-theme') || 'light';
  var next = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('theme', next);
  updateThemeIcon();
}

function updateThemeIcon() {
  var theme = document.documentElement.getAttribute('data-theme') || 'light';
  var icon = document.getElementById('theme-icon');
  if (icon) {
    if (theme === 'dark') {
      // Sun icon for dark mode (click to switch to light)
      icon.innerHTML = '<circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>';
    } else {
      // Moon icon for light mode (click to switch to dark)
      icon.innerHTML = '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>';
    }
  }
}

// Update icon on page load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', updateThemeIcon);
} else {
  updateThemeIcon();
}
`;

interface LayoutProps {
  title: string;
  styles?: string;
  scripts?: string;
  includeModal?: boolean;
  showBlobs?: boolean;
}

export const Modal: FC = () => (
  <div class="modal-overlay" id="modal">
    <div class="modal">
      <h3 id="modal-title">Confirm</h3>
      <p id="modal-message">Are you sure?</p>
      <div class="modal-buttons" id="modal-buttons"></div>
    </div>
  </div>
);

export const Layout: FC<PropsWithChildren<LayoutProps>> = ({
  title,
  styles = '',
  scripts = '',
  includeModal = false,
  showBlobs = false,
  children
}) => {
  return (
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>{title}</title>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
        <script>{raw(themeInitScript)}</script>
        <style>{raw(baseStyles + (includeModal ? modalStyles : '') + styles)}</style>
      </head>
      <body>
        {showBlobs && (
          <>
            <div class="blob blob-1"></div>
            <div class="blob blob-2"></div>
            <div class="blob blob-3"></div>
          </>
        )}
        {children}
        {includeModal && <Modal />}
        <script>{raw(themeToggleScript + (includeModal ? modalScript : '') + scripts)}</script>
      </body>
    </html>
  );
};
