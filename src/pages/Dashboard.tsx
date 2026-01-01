import type { FC } from 'hono/jsx';
import { Layout, Header, headerStyles } from '../components';
import type { User, WorkItem } from '../db';

interface DashboardProps {
  user: User;
  allTasks: WorkItem[];
  inProgress: WorkItem[];
  completed: WorkItem[];
  pending: WorkItem[];
}

const dashboardStyles = `
  ${headerStyles}

  .container {
    max-width: 1000px;
    margin: 0 auto;
    padding: 40px 20px;
  }

  .page-header {
    margin-bottom: 40px;
  }

  .page-header h1 {
    font-size: 2.2rem;
    background: var(--accent-gradient-text);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    font-weight: 700;
    margin-bottom: 8px;
  }

  .page-header p {
    color: var(--text-secondary);
  }

  .stats {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 20px;
    margin-bottom: 40px;
  }

  .stat-card {
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    border-radius: 16px;
    padding: 28px;
    text-align: center;
    transition: all 0.3s;
  }

  .stat-card:hover {
    transform: translateY(-2px);
    box-shadow: var(--shadow-md);
    border-color: var(--border-color-hover);
  }

  .stat-number {
    font-size: 2.8rem;
    background: var(--accent-gradient-text);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    font-weight: 800;
  }

  .stat-label {
    color: var(--text-secondary);
    margin-top: 8px;
    font-weight: 500;
  }

  .section {
    margin-bottom: 40px;
  }

  .section h2 {
    margin-bottom: 20px;
    font-size: 1.3rem;
    color: var(--text-primary);
    font-weight: 600;
  }

  .task-list {
    display: flex;
    flex-direction: column;
    gap: 15px;
  }

  .task-card {
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    border-radius: 14px;
    padding: 20px 24px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    text-decoration: none;
    color: inherit;
    transition: all 0.2s;
  }

  .task-card:hover {
    background: var(--bg-card-hover);
    border-color: var(--border-color-hover);
    transform: translateX(4px);
  }

  .task-info h3 {
    font-size: 1rem;
    margin-bottom: 6px;
    color: var(--text-primary);
    font-weight: 600;
  }

  .task-info p {
    color: var(--text-muted);
    font-size: 0.9rem;
  }

  .task-status {
    padding: 6px 14px;
    border-radius: 50px;
    font-size: 0.8rem;
    font-weight: 600;
    text-transform: capitalize;
  }

  .status-pending-payment {
    background: var(--warning-bg);
    color: var(--warning);
  }

  .status-paid {
    background: rgba(59, 130, 246, 0.15);
    color: var(--accent-primary);
  }

  .status-processing {
    background: rgba(139, 92, 246, 0.15);
    color: var(--accent-secondary);
  }

  .status-completed {
    background: var(--success-bg);
    color: var(--success);
  }

  .status-failed {
    background: var(--error-bg);
    color: var(--error);
  }

  .nav-links {
    margin-bottom: 30px;
    display: flex;
    gap: 12px;
    flex-wrap: wrap;
  }

  .nav-links a {
    display: inline-flex;
    align-items: center;
    padding: 10px 20px;
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    border-radius: 50px;
    color: var(--text-secondary);
    text-decoration: none;
    transition: all 0.2s;
    font-weight: 500;
  }

  .nav-links a:hover {
    background: var(--bg-card-hover);
    border-color: var(--accent-primary);
    color: var(--accent-primary);
  }

  .nav-links .btn {
    border-radius: 50px;
  }

  .empty {
    color: var(--text-muted);
    text-align: center;
    padding: 60px;
    background: var(--bg-card);
    border-radius: 16px;
    border: 1px dashed var(--border-color);
  }
`;

export const Dashboard: FC<DashboardProps> = ({ user, allTasks, inProgress, completed }) => {
  return (
    <Layout title="Dashboard - WorkingDevsHero" styles={dashboardStyles}>
      <Header user={user} />

      <div class="container">
        <div class="page-header">
          <h1>Welcome back!</h1>
          <p>Here's an overview of your tasks</p>
        </div>

        <div class="stats">
          <div class="stat-card">
            <div class="stat-number">{allTasks.length}</div>
            <div class="stat-label">Total Tasks</div>
          </div>
          <div class="stat-card">
            <div class="stat-number">{inProgress.length}</div>
            <div class="stat-label">In Progress</div>
          </div>
          <div class="stat-card">
            <div class="stat-number">{completed.length}</div>
            <div class="stat-label">Completed</div>
          </div>
        </div>

        <div class="nav-links">
          <a href="/dashboard/in-progress">View In Progress</a>
          <a href="/dashboard/completed">View Completed</a>
          <a href="/submit" class="btn btn-primary">+ New Task</a>
        </div>

        <div class="section">
          <h2>Recent Tasks</h2>
          <div class="task-list">
            {allTasks.length === 0 && (
              <div class="empty">No tasks yet. Submit your first task!</div>
            )}
            {allTasks.slice(0, 5).map(task => (
              <a
                href={task.status === 'pending_payment' ? `/payment/${task.id}` : `/status/${task.id}`}
                class="task-card"
              >
                <div class="task-info">
                  <h3>{task.task_description.substring(0, 60)}{task.task_description.length > 60 ? '...' : ''}</h3>
                  <p>{task.max_minutes} min • ${task.cost_usd.toFixed(2)} • {new Date(task.created_at).toLocaleDateString()}</p>
                </div>
                <span class={`task-status status-${task.status.replace('_', '-')}`}>
                  {task.status.replace('_', ' ')}
                </span>
              </a>
            ))}
          </div>
        </div>
      </div>
    </Layout>
  );
};
