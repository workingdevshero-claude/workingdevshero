import type { FC } from 'hono/jsx';
import { html } from 'hono/html';
import { Layout, Header, headerStyles } from '../components';
import type { User, WorkItem } from '../db';

interface DashboardCompletedProps {
  user: User;
  tasks: WorkItem[];
}

const completedStyles = `
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
    text-transform: capitalize;
  }

  .status-completed {
    background: var(--success-bg);
    color: var(--success);
  }

  .status-failed {
    background: var(--error-bg);
    color: var(--error);
  }

  .task-description {
    color: var(--text-secondary);
    line-height: 1.7;
    margin-bottom: 16px;
  }

  .task-meta {
    display: flex;
    gap: 24px;
    color: var(--text-muted);
    font-size: 0.9rem;
    margin-bottom: 16px;
    flex-wrap: wrap;
  }

  .task-result {
    background: var(--bg-tertiary);
    padding: 18px;
    border-radius: 12px;
    margin-top: 16px;
    font-family: monospace;
    font-size: 0.9rem;
    max-height: 200px;
    overflow-y: auto;
    white-space: pre-wrap;
    color: var(--text-primary);
    border: 1px solid var(--border-color);
  }

  .task-result.collapsed {
    max-height: 80px;
  }

  .toggle-result {
    color: var(--accent-primary);
    background: none;
    border: none;
    cursor: pointer;
    font-size: 0.9rem;
    margin-top: 12px;
    padding: 0;
    font-weight: 500;
    transition: all 0.2s;
  }

  .toggle-result:hover {
    color: var(--accent-secondary);
    text-decoration: underline;
  }

  .empty {
    color: var(--text-muted);
    text-align: center;
    padding: 80px 20px;
    background: var(--bg-card);
    border-radius: 16px;
    border: 1px dashed var(--border-color);
  }
`;

const toggleScript = `
  function toggleResult(id) {
    const el = document.getElementById('result-' + id);
    const btn = el.nextElementSibling;
    if (el.classList.contains('collapsed')) {
      el.classList.remove('collapsed');
      btn.textContent = 'Show Less';
    } else {
      el.classList.add('collapsed');
      btn.textContent = 'Show More';
    }
  }
`;

export const DashboardCompleted: FC<DashboardCompletedProps> = ({ user, tasks }) => {
  return (
    <Layout title="Completed Tasks - WorkingDevsHero" styles={completedStyles} scripts={toggleScript}>
      <Header user={user} />

      <div class="container">
        <a href="/dashboard" class="back-link">← Back to Dashboard</a>
        <div class="page-header">
          <h1>Completed Tasks</h1>
          <p class="subtitle">{tasks.length} completed task{tasks.length !== 1 ? 's' : ''}</p>
        </div>

        <div class="task-list">
          {tasks.length === 0 && (
            <div class="empty">No completed tasks yet.</div>
          )}
          {tasks.map(task => {
            let resultData: { output?: string } | null = null;
            try {
              resultData = task.result ? JSON.parse(task.result) : null;
            } catch (e) {
              // Ignore parse errors
            }
            const escapedDescription = task.task_description.substring(0, 200).replace(/</g, '&lt;').replace(/>/g, '&gt;');
            const escapedOutput = resultData?.output?.replace(/</g, '&lt;').replace(/>/g, '&gt;') || 'No output';

            return (
              <div class="task-card">
                <div class="task-header">
                  <h3>Task #{task.id}</h3>
                  <span class={`task-status status-${task.status}`}>{task.status}</span>
                </div>
                <div class="task-description">
                  {html`${escapedDescription}`}{task.task_description.length > 200 ? '...' : ''}
                </div>
                <div class="task-meta">
                  <span>Time Budget: {task.max_minutes} min</span>
                  <span>Cost: ${task.cost_usd.toFixed(2)}{task.cost_sol ? ` (${task.cost_sol.toFixed(6)} SOL)` : ''}</span>
                  <span>Completed: {task.completed_at ? new Date(task.completed_at).toLocaleString() : 'N/A'}</span>
                </div>
                {resultData && (
                  <>
                    <div class="task-result collapsed" id={`result-${task.id}`}>
                      {html`${escapedOutput}`}
                    </div>
                    <button class="toggle-result" onclick={`toggleResult(${task.id})`}>Show More</button>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </Layout>
  );
};
