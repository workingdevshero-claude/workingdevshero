import type { FC } from 'hono/jsx';
import { html } from 'hono/html';
import { Layout, Header, Card, FormGroup, headerStyles, cardStyles, formStyles, buttonStyles, modalStyles, modalScript } from '../components';
import type { User } from '../db';

interface SubmitProps {
  user: User;
}

const submitStyles = `
  ${headerStyles}
  ${cardStyles}
  ${formStyles}
  ${buttonStyles}
  ${modalStyles}

  .page-container {
    max-width: 800px;
    margin: 0 auto;
    padding: 40px 20px;
  }

  .page-header {
    text-align: center;
    margin-bottom: 40px;
  }

  .page-header h1 {
    font-size: 2.5rem;
    margin-bottom: 12px;
    background: var(--accent-gradient-text);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    font-weight: 700;
  }

  .subtitle {
    color: var(--text-secondary);
    font-size: 1.1rem;
  }

  .form-group textarea {
    min-height: 200px;
  }

  .cost-preview {
    background: var(--success-bg);
    padding: 28px;
    border-radius: 16px;
    margin: 30px 0;
    text-align: center;
    border: 1px solid rgba(16, 185, 129, 0.2);
  }

  .cost-preview p {
    color: var(--text-secondary);
    margin-bottom: 8px;
  }

  .cost-preview .amount {
    font-size: 2.8rem;
    color: var(--success);
    font-weight: 800;
  }

  .cost-preview .rate {
    color: var(--text-muted);
    font-size: 0.9rem;
    margin-top: 12px;
  }

  .examples {
    margin-top: 40px;
    padding-top: 30px;
    border-top: 1px solid var(--border-color);
  }

  .examples h3 {
    color: var(--text-secondary);
    margin-bottom: 16px;
    font-size: 0.85rem;
    text-transform: uppercase;
    letter-spacing: 1px;
    font-weight: 600;
  }

  .example-chips {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
  }

  .example-chip {
    background: var(--bg-tertiary);
    border: 1px solid var(--border-color);
    padding: 10px 18px;
    border-radius: 50px;
    font-size: 0.9rem;
    color: var(--text-secondary);
    cursor: pointer;
    transition: all 0.2s;
    font-weight: 500;
  }

  .example-chip:hover {
    background: rgba(59, 130, 246, 0.1);
    border-color: var(--accent-primary);
    color: var(--accent-primary);
    transform: translateY(-1px);
  }
`;

const examples = {
  portfolio: `Create a comprehensive tech stock portfolio analysis with real holdings:

PORTFOLIO DATA (create as CSV):
Include these actual stocks with realistic purchase data:
- NVDA (NVIDIA) - 50 shares bought at $450
- AAPL (Apple) - 100 shares bought at $175
- MSFT (Microsoft) - 40 shares bought at $380
- GOOGL (Alphabet) - 25 shares bought at $140
- AMZN (Amazon) - 30 shares bought at $178
- META (Meta) - 35 shares bought at $480
- TSM (Taiwan Semiconductor) - 45 shares bought at $150
- AVGO (Broadcom) - 20 shares bought at $160
- AMD (AMD) - 60 shares bought at $145
- CRM (Salesforce) - 25 shares bought at $270

PYTHON ANALYSIS SCRIPT:
- Calculate current portfolio value using recent prices
- Compute individual returns, weighted performance
- Sector breakdown (semiconductors vs software vs cloud)
- Concentration risk analysis (NVDA exposure)
- Dividend yield analysis
- Beta calculation vs S&P 500

DETAILED REPORT:
- Executive summary with total gains/losses
- Winner/loser analysis with specific recommendations
- Is the portfolio too concentrated in AI/chips?
- Rebalancing suggestions: what to trim, what to add
- Tax-loss harvesting opportunities if any positions are down
- 5 specific action items with rationale`,

  businessplan: `Create a comprehensive business plan for "CodePilot Pro" - an AI-powered code review and refactoring SaaS tool that integrates with GitHub/GitLab.

PRODUCT CONCEPT:
- AI analyzes pull requests for bugs, security issues, performance problems
- Suggests refactoring improvements with one-click apply
- Learns team coding standards over time
- Pricing: $29/month individual, $99/month team (5 users), $299/month enterprise

MARKET ANALYSIS:
- Size the developer tools market (compare to GitHub, GitLab, Snyk revenues)
- Analyze competitors: Codacy, SonarQube, DeepCode (now Snyk), CodeClimate
- Identify gaps in current offerings

FINANCIAL MODEL:
- Build a 3-year revenue projection
- Assume: 1,000 users Year 1, 5,000 Year 2, 20,000 Year 3
- Calculate MRR, ARR, churn assumptions
- Infrastructure costs (OpenAI API, AWS hosting)
- Break-even analysis

GO-TO-MARKET:
- Launch strategy targeting open source maintainers first
- Developer advocate program
- Integration partnerships with GitHub, VS Code
- Content marketing: "Code Review Horror Stories" blog series

COMPETITIVE MOAT:
- How to defend against GitHub adding this feature natively
- Data/learning advantages over time`,

  webapp: `Build a complete personal expense tracker web application called "SpendWise":

FEATURES:
- Track expenses by category: Food, Transport, Entertainment, Shopping, Bills, Health
- Add income sources: Salary, Freelance, Investments, Other
- Monthly budget setting per category with alerts at 80% and 100%
- Dashboard with spending trends, category breakdown pie chart
- Recurring expense tracking (Netflix $15.99, Spotify $10.99, Gym $49)

TECH STACK:
- Backend: Node.js with Express, SQLite database
- Frontend: Vanilla JavaScript with Chart.js for visualizations
- Authentication: Simple email/password with sessions

SAMPLE DATA:
Pre-populate with 3 months of realistic expense data:
- Rent: $1,800/month
- Groceries: $400-500/month (variable)
- Dining out: $200-350/month
- Gas: $150/month
- Subscriptions: Netflix, Spotify, iCloud, gym
- Random purchases: Amazon, clothing, etc.

REPORTS:
- Monthly summary email template
- Year-over-year comparison
- "Where can I cut back?" AI suggestions based on spending patterns
- Export to CSV for tax purposes

Include complete setup instructions and a demo account.`,

  research: `Conduct comprehensive market research on the Electric Vehicle (EV) industry for a potential investor:

MARKET OVERVIEW:
- Global EV market size 2024 and projected 2030
- Growth rates by region: US, Europe, China
- EV adoption curves vs ICE vehicle decline

MAJOR PLAYERS ANALYSIS:
Create detailed profiles for:
- Tesla: market share, margins, competitive advantages, risks
- BYD: China dominance, international expansion, vertical integration
- Rivian: commercial fleet strategy, Amazon partnership, cash runway
- Lucid: luxury positioning, Saudi backing, production challenges
- Legacy automakers: Ford F-150 Lightning, GM Ultium, VW ID series

SUPPLY CHAIN DEEP DIVE:
- Battery manufacturers: CATL, LG Energy, Panasonic, BYD
- Lithium/cobalt/nickel supply constraints
- Charging infrastructure: ChargePoint, EVgo, Tesla Supercharger network

INVESTMENT THESIS:
- Bull case vs bear case for EV sector
- Which segments are overvalued vs undervalued?
- Best pure-play investments vs diversified exposure
- Risks: competition, commoditization, regulatory changes

SPECIFIC RECOMMENDATIONS:
- Top 3 stocks to buy with price targets
- Top 2 stocks to avoid with reasoning
- ETF alternatives for diversified exposure (DRIV, IDRV, LIT)`,

  contentcalendar: `Develop a 3-month content marketing strategy for "IronFit" - a premium fitness app targeting busy professionals aged 30-45:

BRAND POSITIONING:
- "Executive fitness for people who don't have time for the gym"
- 20-minute science-backed workouts
- Competitors: Peloton, Apple Fitness+, Nike Training Club

BUYER PERSONAS:
1. "Busy Brian" - 38, VP of Sales, travels 2x/month, wants hotel room workouts
2. "Working Mom Sarah" - 34, marketing manager, needs early morning routines before kids wake
3. "Desk-Bound David" - 42, software engineer, back pain, wants posture correction

12-WEEK CONTENT CALENDAR:
Create specific content for each week including:
- Blog post titles with outlines
- Instagram posts (carousel ideas, Reels concepts)
- LinkedIn articles for professional audience
- Email sequences for free trial nurturing

WRITE 3 COMPLETE BLOG POSTS:

1. "The 20-Minute Executive Workout: How CEOs Stay Fit" (2000 words)
   - Interview-style with productivity tips
   - Specific workout routine included

2. "Fix Your Desk Posture: A 10-Minute Daily Routine" (1500 words)
   - Step-by-step exercises with descriptions
   - Before/after transformation stories

3. "Fitness After 40: What Changes and How to Adapt" (1500 words)
   - Science-backed recovery recommendations
   - Injury prevention focus

SOCIAL MEDIA:
- 20 Instagram caption templates
- 10 LinkedIn post templates for B2B partnerships
- Influencer collaboration pitch template`
};

const submitScript = `
  ${modalScript}

  const examples = ${JSON.stringify(examples)};

  function setExample(type) {
    document.getElementById('task').value = examples[type];
  }

  const minutesSelect = document.getElementById('minutes');
  const costUsdSpan = document.getElementById('costUsd');

  function updateCost() {
    const minutes = parseInt(minutesSelect.value) || 10;
    const costUsd = (minutes * 0.10).toFixed(2);
    costUsdSpan.textContent = costUsd;
  }

  minutesSelect.addEventListener('change', updateCost);

  document.getElementById('taskForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target;
    const button = form.querySelector('button');
    button.disabled = true;
    button.textContent = 'Submitting...';

    try {
      const response = await fetch('/api/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          minutes: parseInt(form.minutes.value),
          task: form.task.value
        })
      });

      const data = await response.json();
      if (data.success) {
        window.location.href = '/payment/' + data.workItemId;
      } else if (data.requiresAuth) {
        window.location.href = '/auth/login';
      } else {
        showAlert('Error', data.error || 'Failed to submit task');
        button.disabled = false;
        button.textContent = 'Submit Task & Pay with Solana';
      }
    } catch (error) {
      showAlert('Error', 'Error submitting task. Please try again.');
      button.disabled = false;
      button.textContent = 'Submit Task & Pay with Solana';
    }
  });
`;

export const Submit: FC<SubmitProps> = ({ user }) => {
  return (
    <Layout title="Submit Task - WorkingDevsHero" styles={submitStyles} scripts={submitScript} includeModal>
      <Header user={user} />

      <div class="page-container">
        <div class="page-header">
          <h1>Submit a Task</h1>
          <p class="subtitle">Describe what you want built and let AI do the work</p>
        </div>

        <Card>
          <form id="taskForm">
            <FormGroup label="Results will be sent to">
              <div class="email-display">{user.email}</div>
            </FormGroup>

            <FormGroup label="Time Budget" htmlFor="minutes" hint="Choose how much AI development time to allocate. Complex tasks need more time.">
              <select id="minutes" name="minutes">
                <option value="5">5 minutes - $0.50</option>
                <option value="10" selected>10 minutes - $1.00</option>
                <option value="15">15 minutes - $1.50</option>
                <option value="30">30 minutes - $3.00</option>
                <option value="60">60 minutes - $6.00</option>
                <option value="120">120 minutes - $12.00</option>
              </select>
            </FormGroup>

            <FormGroup label="Task Description" htmlFor="task" hint="The more detail you provide, the better the results.">
              <textarea
                id="task"
                name="task"
                required
                placeholder={`Be specific about what you want built. Include:
- The type of output (script, website, report, etc.)
- Technologies or languages to use (if any preference)
- Any specific requirements or constraints
- Examples or references if helpful`}
              />
            </FormGroup>

            <div class="cost-preview">
              <p>Total Cost</p>
              <div class="amount">$<span id="costUsd">1.00</span></div>
              <div class="rate">$0.10 per minute of AI development time</div>
            </div>

            <button type="submit" class="btn btn-primary btn-full">Submit Task & Pay with Solana</button>
          </form>

          <div class="examples">
            <h3>Example Tasks</h3>
            <div class="example-chips">
              <span class="example-chip" onclick="setExample('portfolio')">Tech Stock Portfolio Analysis</span>
              <span class="example-chip" onclick="setExample('businessplan')">AI Dev Tool Business Plan</span>
              <span class="example-chip" onclick="setExample('webapp')">Expense Tracker App</span>
              <span class="example-chip" onclick="setExample('research')">EV Market Research</span>
              <span class="example-chip" onclick="setExample('contentcalendar')">Fitness Brand Content Strategy</span>
            </div>
          </div>
        </Card>
      </div>
    </Layout>
  );
};
