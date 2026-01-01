import type { FC } from 'hono/jsx';
import { html } from 'hono/html';
import { Layout, Header, headerStyles } from '../components';
import type { User, WorkItem } from '../db';

interface DashboardInProgressProps {
  user: User;
  tasks: WorkItem[];
}

const inProgressStyles = `
  ${headerStyles}

  .container {
    max-width: 1000px;
    margin: 0 auto;
    padding: 40px 20px;
  }

  .page-header {
    margin-bottom: 30px;
  }

  .page-header h1 {
    font-size: 2rem;
    background: var(--accent-gradient-text);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    font-weight: 700;
    margin-bottom: 8px;
  }

  .subtitle {
    color: var(--text-secondary);
  }

  .back-link {
    color: var(--accent-primary);
    text-decoration: none;
    display: inline-flex;
    align-items: center;
    margin-bottom: 20px;
    font-weight: 500;
    transition: all 0.2s;
  }

  .back-link:hover {
    color: var(--accent-secondary);
  }

  .task-list {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .task-card {
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    border-radius: 16px;
    padding: 28px;
    transition: all 0.2s;
  }

  .task-card:hover {
    box-shadow: var(--shadow-md);
    border-color: var(--border-color-hover);
  }

  .task-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
  }

  .task-header h3 {
    font-size: 1.1rem;
    color: var(--text-primary);
    font-weight: 600;
  }

  .task-status {
    padding: 6px 14px;
    border-radius: 50px;
    font-size: 0.8rem;
    font-weight: 600;
    display: inline-flex;
    align-items: center;
  }

  .status-paid {
    background: rgba(59, 130, 246, 0.15);
    color: var(--accent-primary);
  }

  .status-processing {
    background: rgba(139, 92, 246, 0.15);
    color: var(--accent-secondary);
  }

  .task-description {
    color: var(--text-secondary);
    line-height: 1.7;
    margin-bottom: 16px;
    white-space: pre-wrap;
  }

  .task-meta {
    display: flex;
    gap: 24px;
    color: var(--text-muted);
    font-size: 0.9rem;
    flex-wrap: wrap;
    padding-top: 16px;
    border-top: 1px solid var(--border-color);
  }

  .task-meta span {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .empty {
    color: var(--text-muted);
    text-align: center;
    padding: 80px 20px;
    background: var(--bg-card);
    border-radius: 16px;
    border: 1px dashed var(--border-color);
  }

  .spinner {
    display: inline-block;
    width: 12px;
    height: 12px;
    border: 2px solid rgba(139, 92, 246, 0.3);
    border-radius: 50%;
    border-top-color: var(--accent-secondary);
    animation: spin 1s linear infinite;
    margin-right: 8px;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }
`;

const refreshScript = `setTimeout(() => location.reload(), 10000);`;

export const DashboardInProgress: FC<DashboardInProgressProps> = ({ user, tasks }) => {
  return (
    <Layout title="In Progress - WorkingDevsHero" styles={inProgressStyles} scripts={refreshScript}>
      <Header user={user} />

      <div class="container">
        <a href="/dashboard" class="back-link">← Back to Dashboard</a>
        <div class="page-header">
          <h1>Tasks In Progress</h1>
          <p class="subtitle">{tasks.length} task{tasks.length !== 1 ? 's' : ''} currently being processed</p>
        </div>

        <div class="task-list">
          {tasks.length === 0 && (
            <div class="empty">No tasks currently in progress.</div>
          )}
          {tasks.map(task => {
            const escapedDescription = task.task_description.replace(/</g, '&lt;').replace(/>/g, '&gt;');
            return (
              <div class="task-card">
                <div class="task-header">
                  <h3>Task #{task.id}</h3>
                  <span class={`task-status status-${task.status}`}>
                    {task.status === 'processing' && <span class="spinner"></span>}
                    {task.status === 'paid' ? 'In Queue' : 'Processing'}
                  </span>
                </div>
                <div class="task-description">{html`${escapedDescription}`}</div>
                <div class="task-meta">
                  <span>Time Budget: {task.max_minutes} min</span>
                  <span>Cost: ${task.cost_usd.toFixed(2)}</span>
                  <span>Paid: {task.paid_at ? new Date(task.paid_at).toLocaleString() : 'N/A'}</span>
                  {task.started_at && <span>Started: {new Date(task.started_at).toLocaleString()}</span>}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Layout>
  );
};
