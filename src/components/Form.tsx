import type { FC, PropsWithChildren } from 'hono/jsx';

export const formStyles = `
  .form-group {
    margin-bottom: 24px;
  }

  .form-group label {
    display: block;
    margin-bottom: 8px;
    color: var(--text-secondary);
    font-weight: 600;
    font-size: 0.95rem;
  }

  .form-group input,
  .form-group textarea,
  .form-group select {
    width: 100%;
    padding: 14px 16px;
    border: 2px solid var(--border-color);
    border-radius: 12px;
    background: var(--bg-secondary);
    color: var(--text-primary);
    font-size: 1rem;
    transition: all 0.2s;
  }

  .form-group input:hover,
  .form-group textarea:hover,
  .form-group select:hover {
    border-color: var(--border-color-hover);
  }

  .form-group input:focus,
  .form-group textarea:focus,
  .form-group select:focus {
    outline: none;
    border-color: var(--accent-primary);
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }

  .form-group input::placeholder,
  .form-group textarea::placeholder {
    color: var(--text-muted);
  }

  .form-group textarea {
    min-height: 150px;
    resize: vertical;
    font-family: inherit;
    line-height: 1.6;
  }

  .form-group small {
    display: block;
    margin-top: 8px;
    color: var(--text-muted);
    font-size: 0.875rem;
  }

  .form-group select {
    cursor: pointer;
    appearance: none;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E");
    background-repeat: no-repeat;
    background-position: right 12px center;
    background-size: 20px;
    padding-right: 44px;
  }

  .email-display {
    padding: 14px 16px;
    background: rgba(59, 130, 246, 0.1);
    border-radius: 12px;
    color: var(--accent-primary);
    border: 2px solid rgba(59, 130, 246, 0.2);
    font-weight: 500;
  }
`;

export const buttonStyles = `
  .btn {
    padding: 14px 32px;
    border: none;
    border-radius: 12px;
    font-size: 1rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
    text-decoration: none;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
  }

  .btn:hover {
    transform: translateY(-2px);
    box-shadow: var(--shadow-md);
  }

  .btn:active {
    transform: translateY(0);
  }

  .btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
  }

  .btn-primary {
    background: var(--accent-gradient);
    color: white;
    box-shadow: var(--shadow-sm);
  }

  .btn-primary:hover {
    background: var(--accent-gradient-hover);
    box-shadow: var(--shadow-lg), 0 0 30px rgba(59, 130, 246, 0.2);
    color: white;
  }

  .btn-secondary {
    background: var(--bg-tertiary);
    color: var(--text-secondary);
    border: 1px solid var(--border-color);
  }

  .btn-secondary:hover {
    background: var(--bg-card-hover);
    color: var(--text-primary);
  }

  .btn-danger {
    background: transparent;
    color: var(--error);
    border: 2px solid var(--error);
  }

  .btn-danger:hover {
    background: var(--error-bg);
  }

  .btn-full {
    width: 100%;
  }

  .btn-small {
    padding: 10px 20px;
    font-size: 0.9rem;
  }

  .cta-button {
    background: var(--accent-gradient);
    color: white;
    padding: 16px 40px;
    border: none;
    border-radius: 50px;
    font-size: 1.1rem;
    font-weight: 600;
    cursor: pointer;
    text-decoration: none;
    display: inline-flex;
    align-items: center;
    gap: 8px;
    transition: all 0.3s;
    box-shadow: var(--shadow-md);
  }

  .cta-button:hover {
    transform: translateY(-3px);
    box-shadow: var(--shadow-xl), 0 0 40px rgba(59, 130, 246, 0.3);
    text-decoration: none;
    color: white;
  }

  .cta-button:active {
    transform: translateY(-1px);
  }
`;

interface FormGroupProps {
  label: string;
  htmlFor?: string;
  hint?: string;
}

export const FormGroup: FC<PropsWithChildren<FormGroupProps>> = ({
  label,
  htmlFor,
  hint,
  children
}) => {
  return (
    <div class="form-group">
      <label for={htmlFor}>{label}</label>
      {children}
      {hint && <small>{hint}</small>}
    </div>
  );
};
