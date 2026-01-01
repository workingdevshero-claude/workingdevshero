import type { FC } from 'hono/jsx';
import { Layout, Header, Card, headerStyles, cardStyles } from '../components';
import type { WorkItem } from '../db';

interface StatusProps {
  workItem: WorkItem;
}

const statusColors: Record<string, string> = {
  pending_payment: "var(--warning)",
  paid: "var(--accent-primary)",
  processing: "var(--accent-secondary)",
  completed: "var(--success)",
  failed: "var(--error)",
};

const statusBgs: Record<string, string> = {
  pending_payment: "var(--warning-bg)",
  paid: "rgba(59, 130, 246, 0.15)",
  processing: "rgba(139, 92, 246, 0.15)",
  completed: "var(--success-bg)",
  failed: "var(--error-bg)",
};

const statusLabels: Record<string, string> = {
  pending_payment: "Awaiting Payment",
  paid: "In Queue",
  processing: "Processing",
  completed: "Completed",
  failed: "Failed",
};

const statusStyles = `
  ${headerStyles}
  ${cardStyles}

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

  .status-badge {
    display: inline-block;
    padding: 10px 24px;
    border-radius: 50px;
    font-weight: 600;
    font-size: 0.95rem;
    margin-bottom: 20px;
  }

  .timeline {
    margin: 30px 0;
    padding: 20px;
    background: var(--bg-tertiary);
    border-radius: 16px;
    border: 1px solid var(--border-color);
  }

  .timeline-item {
    display: flex;
    align-items: center;
    margin-bottom: 18px;
    color: var(--text-muted);
    font-size: 0.95rem;
  }

  .timeline-item:last-child {
    margin-bottom: 0;
  }

  .timeline-item.active {
    color: var(--text-primary);
  }

  .timeline-dot {
    width: 14px;
    height: 14px;
    border-radius: 50%;
    background: var(--bg-secondary);
    border: 2px solid var(--border-color);
    margin-right: 16px;
    flex-shrink: 0;
  }

  .timeline-item.active .timeline-dot {
    background: var(--success);
    border-color: var(--success);
  }

  .timeline-item.current .timeline-dot {
    background: var(--accent-primary);
    border-color: var(--accent-primary);
    box-shadow: 0 0 12px rgba(59, 130, 246, 0.4);
  }

  .task-info {
    background: var(--bg-tertiary);
    padding: 24px;
    border-radius: 16px;
    margin-top: 20px;
    border: 1px solid var(--border-color);
  }

  .task-info p {
    margin-bottom: 12px;
    color: var(--text-secondary);
    display: flex;
    justify-content: space-between;
  }

  .task-info p:last-child {
    margin-bottom: 0;
  }

  .task-info strong {
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

  .payment-link {
    color: var(--accent-primary);
    text-decoration: none;
    font-weight: 500;
  }

  .payment-link:hover {
    text-decoration: underline;
  }
`;

export const Status: FC<StatusProps> = ({ workItem }) => {
  const statusColor = statusColors[workItem.status] || "var(--text-muted)";
  const statusBg = statusBgs[workItem.status] || "var(--bg-tertiary)";
  const statusLabel = statusLabels[workItem.status] || workItem.status;
  const maskedEmail = workItem.email.replace(/(.{2}).*(@.*)/, "$1***$2");

  const createdDate = workItem.created_at ? new Date(workItem.created_at).toLocaleString() : "";
  const paidDate = workItem.paid_at ? new Date(workItem.paid_at).toLocaleString() : "";
  const startedDate = workItem.started_at ? new Date(workItem.started_at).toLocaleString() : "";
  const completedDate = workItem.completed_at ? new Date(workItem.completed_at).toLocaleString() : "";
  const shouldRefresh = workItem.status !== "completed" && workItem.status !== "failed";

  const refreshScript = shouldRefresh ? `setTimeout(() => location.reload(), 10000);` : '';

  return (
    <Layout title="Task Status - WorkingDevsHero" styles={statusStyles} scripts={refreshScript}>
      <div class="page-container">
        <Card>
          <div class="page-header">
            <h1>Task #{workItem.id}</h1>
          </div>
          <div style="text-align: center;">
            <span class="status-badge" style={`background: ${statusBg}; color: ${statusColor};`}>{statusLabel}</span>
          </div>

          <div class="timeline">
            <div class={`timeline-item ${workItem.created_at ? "active" : ""} ${workItem.status === "pending_payment" ? "current" : ""}`}>
              <div class="timeline-dot"></div>
              <span>Task Created{createdDate ? ` - ${createdDate}` : ""}</span>
            </div>
            <div class={`timeline-item ${workItem.paid_at ? "active" : ""} ${workItem.status === "paid" ? "current" : ""}`}>
              <div class="timeline-dot"></div>
              <span>Payment Received{paidDate ? ` - ${paidDate}` : ""}</span>
            </div>
            <div class={`timeline-item ${workItem.started_at ? "active" : ""} ${workItem.status === "processing" ? "current" : ""}`}>
              <div class="timeline-dot"></div>
              <span>Processing Started{startedDate ? ` - ${startedDate}` : ""}</span>
            </div>
            <div class={`timeline-item ${workItem.completed_at ? "active" : ""} ${workItem.status === "completed" ? "current" : ""}`}>
              <div class="timeline-dot"></div>
              <span>Completed{completedDate ? ` - ${completedDate}` : ""}</span>
            </div>
          </div>

          <div class="task-info">
            <p><span>Time Budget:</span> <strong>{workItem.max_minutes} minutes</strong></p>
            <p><span>Cost:</span> <strong>${workItem.cost_usd.toFixed(2)}{workItem.cost_sol ? ` (${workItem.cost_sol.toFixed(6)} SOL)` : ""}</strong></p>
            <p><span>Results will be sent to:</span> <strong>{maskedEmail}</strong></p>
          </div>

          {workItem.status === "pending_payment" && (
            <p style="text-align:center;margin-top:24px;">
              <a href={`/payment/${workItem.id}`} class="payment-link">View Payment Details →</a>
            </p>
          )}

          <a href="/dashboard" class="back-link">← Back to Dashboard</a>
        </Card>
      </div>
    </Layout>
  );
};
