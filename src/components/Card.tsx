import type { FC, PropsWithChildren } from 'hono/jsx';

export const cardStyles = `
  .card {
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    border-radius: 24px;
    padding: 40px;
    box-shadow: var(--shadow-lg);
    transition: all 0.3s ease;
  }

  .card:hover {
    box-shadow: var(--shadow-xl);
  }

  .card h1 {
    text-align: center;
    margin-bottom: 30px;
    background: var(--accent-gradient-text);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    font-weight: 700;
  }

  .card h2 {
    margin-bottom: 20px;
    color: var(--text-primary);
  }
`;

export const Card: FC<PropsWithChildren<{ className?: string }>> = ({ children, className = '' }) => {
  return (
    <div class={`card ${className}`}>
      {children}
    </div>
  );
};
