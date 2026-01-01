import type { FC } from 'hono/jsx';
import { html } from 'hono/html';
import { Layout, Header, Card, headerStyles, cardStyles, buttonStyles, modalStyles, modalScript } from '../components';
import type { User, WorkItem } from '../db';

interface PaymentProps {
  user: User | null;
  workItem: WorkItem;
  costSol: number;
  paymentWallet: string;
}

const paymentStyles = `
  ${headerStyles}
  ${cardStyles}
  ${buttonStyles}
  ${modalStyles}

  .page-container {
    max-width: 600px;
    margin: 0 auto;
    padding: 40px 20px;
  }

  .page-header {
    text-align: center;
    margin-bottom: 30px;
  }

  .page-header h1 {
    font-size: 2rem;
    background: var(--accent-gradient-text);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    font-weight: 700;
  }

  .status {
    text-align: center;
    padding: 20px;
    border-radius: 12px;
    margin-bottom: 30px;
    font-weight: 600;
  }

  .status.pending {
    background: var(--warning-bg);
    border: 1px solid rgba(245, 158, 11, 0.3);
    color: var(--warning);
  }

  .status.paid {
    background: var(--success-bg);
    border: 1px solid rgba(16, 185, 129, 0.3);
    color: var(--success);
  }

  .payment-details {
    background: var(--bg-tertiary);
    padding: 30px;
    border-radius: 16px;
    margin-bottom: 30px;
    border: 1px solid var(--border-color);
  }

  .payment-details h3 {
    margin-bottom: 20px;
    color: var(--text-secondary);
    font-size: 0.9rem;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .amount {
    text-align: center;
    margin-bottom: 20px;
  }

  .amount .sol {
    font-size: 2.8rem;
    color: var(--success);
    font-weight: 800;
  }

  .amount .usd {
    color: var(--text-muted);
    margin-top: 8px;
  }

  .address {
    background: var(--bg-secondary);
    padding: 16px;
    border-radius: 10px;
    word-break: break-all;
    font-family: monospace;
    font-size: 0.85rem;
    margin-bottom: 15px;
    border: 1px solid var(--border-color);
    color: var(--text-primary);
  }

  .copy-button {
    width: 100%;
    background: var(--success);
    color: white;
    padding: 14px;
    border: none;
    border-radius: 10px;
    cursor: pointer;
    font-weight: 600;
    transition: all 0.2s;
  }

  .copy-button:hover {
    opacity: 0.9;
    transform: translateY(-1px);
  }

  .qr-code {
    text-align: center;
    margin: 25px 0;
  }

  .qr-code img {
    background: white;
    padding: 15px;
    border-radius: 16px;
    max-width: 200px;
    box-shadow: var(--shadow-md);
  }

  .qr-code p {
    margin-top: 12px;
    color: var(--text-muted);
    font-size: 0.85rem;
  }

  .task-preview {
    background: var(--bg-tertiary);
    padding: 20px;
    border-radius: 12px;
    margin-top: 20px;
    border: 1px solid var(--border-color);
  }

  .task-preview h4 {
    color: var(--text-secondary);
    margin-bottom: 12px;
    font-size: 0.9rem;
    font-weight: 600;
  }

  .task-preview p {
    white-space: pre-wrap;
    color: var(--text-primary);
    line-height: 1.6;
  }

  .info {
    margin-top: 20px;
    padding: 16px;
    background: rgba(59, 130, 246, 0.1);
    border-radius: 12px;
    font-size: 0.9rem;
    color: var(--text-secondary);
    border: 1px solid rgba(59, 130, 246, 0.2);
  }

  .info strong {
    color: var(--text-primary);
  }

  .back-link {
    display: block;
    text-align: center;
    margin-top: 24px;
    color: var(--accent-primary);
    text-decoration: none;
    font-weight: 500;
    transition: all 0.2s;
  }

  .back-link:hover {
    color: var(--accent-secondary);
  }

  #checking {
    display: none;
    text-align: center;
    padding: 20px;
    color: var(--text-secondary);
  }

  .spinner {
    display: inline-block;
    width: 20px;
    height: 20px;
    border: 2px solid var(--border-color);
    border-radius: 50%;
    border-top-color: var(--accent-primary);
    animation: spin 1s linear infinite;
    margin-right: 10px;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  .cancel-button {
    width: 100%;
    background: transparent;
    color: var(--error);
    padding: 14px;
    border: 2px solid var(--error);
    border-radius: 10px;
    cursor: pointer;
    font-weight: 600;
    margin-top: 15px;
    transition: all 0.2s;
  }

  .cancel-button:hover {
    background: var(--error-bg);
    transform: translateY(-1px);
  }

  .cancel-button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
  }
`;

export const Payment: FC<PaymentProps> = ({ user, workItem, costSol, paymentWallet }) => {
  const isPaid = workItem.status === 'paid' || workItem.status === 'processing' || workItem.status === 'completed';
  const escapedTask = workItem.task_description.replace(/</g, '&lt;').replace(/>/g, '&gt;');

  const paymentScript = `
    ${modalScript}

    function copyAddress() {
      navigator.clipboard.writeText('${paymentWallet}');
      const button = document.querySelector('.copy-button');
      button.textContent = 'Copied!';
      setTimeout(() => button.textContent = 'Copy Address', 2000);
    }

    async function cancelTask() {
      showConfirm(
        'Cancel Task',
        'Are you sure you want to cancel this task? This action cannot be undone.',
        async () => {
          const button = document.querySelector('.cancel-button');
          button.disabled = true;
          button.textContent = 'Cancelling...';
          try {
            const response = await fetch('/api/task/${workItem.id}', {
              method: 'DELETE',
            });
            const data = await response.json();
            if (data.success) {
              showAlert('Success', 'Task cancelled successfully', () => {
                window.location.href = '/dashboard';
              });
            } else {
              showAlert('Error', 'Failed to cancel task: ' + (data.error || 'Unknown error'));
              button.disabled = false;
              button.textContent = 'Cancel Task';
            }
          } catch (error) {
            showAlert('Error', 'Error cancelling task. Please try again.');
            button.disabled = false;
            button.textContent = 'Cancel Task';
          }
        }
      );
    }

    ${!isPaid ? `
    async function checkPayment() {
      document.getElementById('checking').style.display = 'block';
      try {
        const response = await fetch('/api/check-payment/${workItem.id}');
        const data = await response.json();
        if (data.paid) {
          window.location.reload();
        }
      } catch (error) {
        console.error('Error checking payment:', error);
      }
    }

    checkPayment();
    setInterval(checkPayment, 10000);
    ` : ''}
  `;

  return (
    <Layout title="Payment - WorkingDevsHero" styles={paymentStyles} scripts={paymentScript} includeModal>
      <Header user={user} />
      <div class="page-container">
        <Card>
          <div class="page-header">
            <h1>Payment Details</h1>
          </div>

          <div class={`status ${isPaid ? 'paid' : 'pending'}`}>
            {isPaid
              ? 'Payment Received! Your task is in the queue.'
              : 'Awaiting Payment'
            }
          </div>

          {!isPaid && (
            <>
              <div class="payment-details">
                <h3>Send exactly:</h3>
                <div class="amount">
                  <div class="sol">{costSol.toFixed(9)} SOL</div>
                  <div class="usd">≈ ${workItem.cost_usd.toFixed(2)} USD</div>
                </div>

                <div class="qr-code">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=solana:${paymentWallet}?amount=${costSol.toFixed(9)}`}
                    alt="Solana Payment QR Code"
                  />
                  <p>Scan with your Solana wallet</p>
                </div>

                <h3>Or send to this address:</h3>
                <div class="address" id="address">{paymentWallet}</div>
                <button class="copy-button" onclick="copyAddress()">Copy Address</button>
                <button class="cancel-button" onclick="cancelTask()">Cancel Task</button>
              </div>

              <div id="checking">
                <span class="spinner"></span>
                Checking for payment...
              </div>

              <div class="info">
                <p><strong>Important:</strong> Send the exact amount shown above. Once payment is confirmed, your task will be added to the queue and processed. Results will be sent to <strong>{workItem.email}</strong></p>
              </div>
            </>
          )}

          {isPaid && (
            <div class="info">
              <p>Your task has been added to the queue! You will receive the results at <strong>{workItem.email}</strong> once processing is complete.</p>
            </div>
          )}

          <div class="task-preview">
            <h4>Your Task ({workItem.max_minutes} minutes max)</h4>
            <p>{html`${escapedTask}`}</p>
          </div>

          <a href="/dashboard" class="back-link">← Back to Dashboard</a>
        </Card>
      </div>
    </Layout>
  );
};
