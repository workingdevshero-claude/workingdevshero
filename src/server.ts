import { Hono } from "hono";
import { serveStatic } from "hono/bun";
import { cors } from "hono/cors";
import { createWorkItem, getWorkItemById, getPaidItems, updateWorkItemStatus, updateWorkItemPayment, getWorkItemsByUserId, getWorkItemsByUserIdAndStatus, isTransactionUsed, type User } from "./db";
import { PAYMENT_WALLET, getSolPrice, usdToSol, getUniquePaymentAmount, checkForPayment, getWalletBalance } from "./solana";
import { registerUser, loginUser, logoutUser, validateSession, getSessionFromCookie, createSessionCookie, createLogoutCookie } from "./auth";

const app = new Hono();

// Worker API authentication
const WORKER_API_KEY = process.env.WORKER_API_KEY || "";

function verifyWorkerAuth(authHeader: string | undefined): boolean {
  if (!authHeader || !WORKER_API_KEY) return false;
  const token = authHeader.replace("Bearer ", "");
  return token === WORKER_API_KEY;
}

// Get current user from session cookie
function getCurrentUser(c: any): User | null {
  const cookieHeader = c.req.header("Cookie");
  const sessionId = getSessionFromCookie(cookieHeader);
  const { valid, user } = validateSession(sessionId);
  return valid && user ? user : null;
}

// Enable CORS
app.use("*", cors());

// Serve static files
app.use("/css/*", serveStatic({ root: "./public" }));
app.use("/js/*", serveStatic({ root: "./public" }));
app.use("/images/*", serveStatic({ root: "./public" }));

// Rate: $6/hour = $0.10/minute
const RATE_PER_MINUTE_USD = 0.10;

// Landing page
app.get("/", async (c) => {
  const solPrice = await getSolPrice();
  const user = getCurrentUser(c);
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>WorkingDevsHero - AI Application Development as a Service</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
      min-height: 100vh;
      color: #fff;
    }

    .container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 0 20px;
    }

    header {
      padding: 20px 0;
      border-bottom: 1px solid rgba(255,255,255,0.1);
    }

    .logo {
      font-size: 1.5rem;
      font-weight: 700;
      color: #00d4ff;
    }

    .hero {
      text-align: center;
      padding: 80px 20px;
    }

    .hero h1 {
      font-size: 3rem;
      margin-bottom: 20px;
      background: linear-gradient(90deg, #00d4ff, #7c3aed);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }

    .hero p {
      font-size: 1.25rem;
      color: #a0aec0;
      max-width: 600px;
      margin: 0 auto 40px;
    }

    .cta-button {
      background: linear-gradient(90deg, #00d4ff, #7c3aed);
      color: white;
      padding: 15px 40px;
      border: none;
      border-radius: 30px;
      font-size: 1.1rem;
      cursor: pointer;
      text-decoration: none;
      display: inline-block;
      transition: transform 0.2s, box-shadow 0.2s;
    }

    .cta-button:hover {
      transform: translateY(-2px);
      box-shadow: 0 10px 30px rgba(0, 212, 255, 0.3);
    }

    .features {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 30px;
      padding: 60px 20px;
    }

    .feature-card {
      background: rgba(255,255,255,0.05);
      padding: 30px;
      border-radius: 15px;
      border: 1px solid rgba(255,255,255,0.1);
    }

    .feature-card h3 {
      color: #00d4ff;
      margin-bottom: 15px;
    }

    .feature-card p {
      color: #a0aec0;
      line-height: 1.6;
    }

    .pricing {
      text-align: center;
      padding: 60px 20px;
      background: rgba(0,0,0,0.2);
    }

    .pricing h2 {
      font-size: 2.5rem;
      margin-bottom: 20px;
    }

    .price-tag {
      font-size: 4rem;
      color: #00d4ff;
      margin: 20px 0;
    }

    .price-tag span {
      font-size: 1.5rem;
      color: #a0aec0;
    }

    .form-section {
      max-width: 600px;
      margin: 0 auto;
      padding: 60px 20px;
    }

    .form-section h2 {
      text-align: center;
      margin-bottom: 30px;
    }

    .form-group {
      margin-bottom: 20px;
    }

    .form-group label {
      display: block;
      margin-bottom: 8px;
      color: #a0aec0;
    }

    .form-group input,
    .form-group textarea {
      width: 100%;
      padding: 15px;
      border: 1px solid rgba(255,255,255,0.2);
      border-radius: 10px;
      background: rgba(255,255,255,0.05);
      color: white;
      font-size: 1rem;
    }

    .form-group input:focus,
    .form-group textarea:focus {
      outline: none;
      border-color: #00d4ff;
    }

    .form-group textarea {
      min-height: 150px;
      resize: vertical;
    }

    .cost-preview {
      background: rgba(0, 212, 255, 0.1);
      padding: 20px;
      border-radius: 10px;
      margin: 20px 0;
      text-align: center;
    }

    .cost-preview .amount {
      font-size: 2rem;
      color: #00d4ff;
    }

    .submit-button {
      width: 100%;
      background: linear-gradient(90deg, #00d4ff, #7c3aed);
      color: white;
      padding: 15px;
      border: none;
      border-radius: 10px;
      font-size: 1.1rem;
      cursor: pointer;
      transition: opacity 0.2s;
    }

    .submit-button:hover {
      opacity: 0.9;
    }

    .submit-button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    footer {
      text-align: center;
      padding: 40px 20px;
      border-top: 1px solid rgba(255,255,255,0.1);
      color: #a0aec0;
    }

    .solana-badge {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      background: rgba(20, 241, 149, 0.1);
      padding: 8px 16px;
      border-radius: 20px;
      color: #14f195;
      font-size: 0.9rem;
      margin-top: 10px;
    }

    @media (max-width: 768px) {
      .hero h1 {
        font-size: 2rem;
      }
      .price-tag {
        font-size: 3rem;
      }
    }
  </style>
</head>
<body>
  <header>
    <div class="container" style="display: flex; justify-content: space-between; align-items: center;">
      <div class="logo">WorkingDevsHero</div>
      <nav>
        ${user ? `
          <a href="/dashboard" style="color: #00d4ff; text-decoration: none; margin-right: 15px;">Dashboard</a>
          <span style="color: #a0aec0;">${user.email}</span>
        ` : `
          <a href="/auth/login" style="color: #00d4ff; text-decoration: none; margin-right: 15px;">Login</a>
          <a href="/auth/register" style="color: #fff; text-decoration: none; background: linear-gradient(90deg, #00d4ff, #7c3aed); padding: 8px 16px; border-radius: 20px;">Sign Up</a>
        `}
      </nav>
    </div>
  </header>

  <section class="hero">
    <div class="container">
      <h1>AI Application Development as a Service</h1>
      <p>Let Claude Code build your software. Pay only for the time you need. Fast, reliable, and powered by cutting-edge AI.</p>
      <a href="#submit" class="cta-button">Get Started</a>
      <div class="solana-badge">
        <svg width="20" height="20" viewBox="0 0 397 311" fill="currentColor">
          <path d="M64.6 237.9c2.4-2.4 5.7-3.8 9.2-3.8h317.4c5.8 0 8.7 7 4.6 11.1l-62.7 62.7c-2.4 2.4-5.7 3.8-9.2 3.8H6.5c-5.8 0-8.7-7-4.6-11.1l62.7-62.7z"/>
          <path d="M64.6 3.8C67.1 1.4 70.4 0 73.8 0h317.4c5.8 0 8.7 7 4.6 11.1l-62.7 62.7c-2.4 2.4-5.7 3.8-9.2 3.8H6.5c-5.8 0-8.7-7-4.6-11.1L64.6 3.8z"/>
          <path d="M332.4 120.2c-2.4-2.4-5.7-3.8-9.2-3.8H5.9c-5.8 0-8.7 7-4.6 11.1l62.7 62.7c2.4 2.4 5.7 3.8 9.2 3.8h317.4c5.8 0 8.7-7 4.6-11.1l-62.8-62.7z"/>
        </svg>
        Powered by Solana
      </div>
    </div>
  </section>

  <section class="features">
    <div class="feature-card">
      <h3>AI-Powered Development</h3>
      <p>Claude Code analyzes your requirements and builds exactly what you need. From simple scripts to complex applications.</p>
    </div>
    <div class="feature-card">
      <h3>Pay by the Minute</h3>
      <p>Set your maximum time budget and only pay for what you use. Transparent pricing at $6/hour ($0.10/minute).</p>
    </div>
    <div class="feature-card">
      <h3>Results via Email</h3>
      <p>Sign up, submit your task, and get results delivered directly to your inbox when complete.</p>
    </div>
  </section>

  <section class="pricing">
    <div class="container">
      <h2>Simple, Transparent Pricing</h2>
      <div class="price-tag">$6 <span>/ hour</span></div>
      <p style="color: #a0aec0; margin-bottom: 10px;">That's just $0.10 per minute of AI development time</p>
      <p style="color: #a0aec0;">Currently in beta - free for registered users!</p>
    </div>
  </section>

  <section class="form-section" id="submit">
    <h2>Submit Your Task</h2>
    ${user ? `
    <form id="taskForm">
      <div class="form-group">
        <label>Results will be sent to</label>
        <div style="padding: 15px; background: rgba(255,255,255,0.05); border-radius: 10px; color: #00d4ff;">${user.email}</div>
      </div>

      <div class="form-group">
        <label for="minutes">Maximum Minutes (1-120)</label>
        <input type="number" id="minutes" name="minutes" min="1" max="120" value="10" required>
      </div>

      <div class="form-group">
        <label for="task">Task Description</label>
        <textarea id="task" name="task" required placeholder="Describe what you want built. Be as specific as possible..."></textarea>
      </div>

      <div class="cost-preview">
        <p>Estimated Cost</p>
        <div class="amount">$<span id="costUsd">1.00</span></div>
      </div>

      <button type="submit" class="submit-button">Submit Task</button>
    </form>
    ` : `
    <div style="text-align: center; padding: 40px;">
      <p style="color: #a0aec0; margin-bottom: 20px;">Please log in or create an account to submit tasks.</p>
      <a href="/auth/login" class="cta-button" style="margin-right: 10px;">Login</a>
      <a href="/auth/register" class="cta-button">Sign Up</a>
    </div>
    `}
  </section>

  <footer>
    <div class="container">
      <p>&copy; 2025 WorkingDevsHero. AI Development for Everyone.</p>
    </div>
  </footer>

  <script>
    const ratePerMinute = 0.10;

    const minutesInput = document.getElementById('minutes');
    const costUsdSpan = document.getElementById('costUsd');

    function updateCost() {
      if (!minutesInput) return;
      const minutes = parseInt(minutesInput.value) || 1;
      const costUsd = (minutes * ratePerMinute).toFixed(2);
      costUsdSpan.textContent = costUsd;
    }

    if (minutesInput) {
      minutesInput.addEventListener('input', updateCost);
    }

    const taskForm = document.getElementById('taskForm');
    if (taskForm) {
      taskForm.addEventListener('submit', async (e) => {
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
            window.location.href = '/status/' + data.workItemId;
          } else if (data.requiresAuth) {
            window.location.href = '/auth/login';
          } else {
            alert('Error: ' + data.error);
            button.disabled = false;
            button.textContent = 'Submit Task';
          }
        } catch (error) {
          alert('Error submitting task. Please try again.');
          button.disabled = false;
          button.textContent = 'Submit Task';
        }
      });
    }
  </script>
</body>
</html>`;

  return c.html(html);
});

// API endpoint to submit work items (requires authentication)
app.post("/api/submit", async (c) => {
  try {
    const user = getCurrentUser(c);

    // Require authentication
    if (!user) {
      return c.json({ success: false, error: "Authentication required", requiresAuth: true }, 401);
    }

    const body = await c.req.json();
    const { minutes, task } = body;

    if (!minutes || !task) {
      return c.json({ success: false, error: "Missing required fields" }, 400);
    }

    if (minutes < 1 || minutes > 120) {
      return c.json({ success: false, error: "Minutes must be between 1 and 120" }, 400);
    }

    const costUsd = minutes * RATE_PER_MINUTE_USD;
    // Use user's email and mark as paid immediately (no payment flow)
    const workItem = createWorkItem(user.email, minutes, task, costUsd, PAYMENT_WALLET, user.id);

    // Mark as paid immediately - skip payment flow for authenticated users
    updateWorkItemPayment(workItem.id, `AUTH-${user.id}-${Date.now()}`, 0);

    return c.json({
      success: true,
      workItemId: workItem.id,
      costUsd,
      message: "Task submitted and queued for processing",
    });
  } catch (error) {
    console.error("Error submitting work item:", error);
    return c.json({ success: false, error: "Internal server error" }, 500);
  }
});

// Payment page
app.get("/payment/:id", async (c) => {
  const id = parseInt(c.req.param("id"));
  const workItem = getWorkItemById(id);

  if (!workItem) {
    return c.text("Work item not found", 404);
  }

  const solPrice = await getSolPrice();
  // Use unique payment amount tied to this specific work item
  const costSol = await getUniquePaymentAmount(workItem.id, workItem.cost_usd);

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Payment - WorkingDevsHero</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
      min-height: 100vh;
      color: #fff;
      padding: 40px 20px;
    }

    .container {
      max-width: 600px;
      margin: 0 auto;
    }

    .card {
      background: rgba(255,255,255,0.05);
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 20px;
      padding: 40px;
    }

    h1 {
      text-align: center;
      margin-bottom: 30px;
      color: #00d4ff;
    }

    .status {
      text-align: center;
      padding: 20px;
      border-radius: 10px;
      margin-bottom: 30px;
    }

    .status.pending {
      background: rgba(255, 193, 7, 0.1);
      border: 1px solid rgba(255, 193, 7, 0.3);
    }

    .status.paid {
      background: rgba(20, 241, 149, 0.1);
      border: 1px solid rgba(20, 241, 149, 0.3);
    }

    .payment-details {
      background: rgba(0,0,0,0.3);
      padding: 30px;
      border-radius: 15px;
      margin-bottom: 30px;
    }

    .payment-details h3 {
      margin-bottom: 20px;
      color: #a0aec0;
    }

    .amount {
      text-align: center;
      margin-bottom: 20px;
    }

    .amount .sol {
      font-size: 3rem;
      color: #14f195;
    }

    .amount .usd {
      color: #a0aec0;
    }

    .address {
      background: rgba(255,255,255,0.05);
      padding: 15px;
      border-radius: 10px;
      word-break: break-all;
      font-family: monospace;
      font-size: 0.9rem;
      margin-bottom: 15px;
    }

    .copy-button {
      width: 100%;
      background: #14f195;
      color: #1a1a2e;
      padding: 12px;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      font-weight: 600;
    }

    .copy-button:hover {
      opacity: 0.9;
    }

    .task-preview {
      background: rgba(255,255,255,0.05);
      padding: 20px;
      border-radius: 10px;
      margin-top: 20px;
    }

    .task-preview h4 {
      color: #a0aec0;
      margin-bottom: 10px;
    }

    .task-preview p {
      white-space: pre-wrap;
      color: #fff;
    }

    .info {
      margin-top: 20px;
      padding: 15px;
      background: rgba(0, 212, 255, 0.1);
      border-radius: 10px;
      font-size: 0.9rem;
      color: #a0aec0;
    }

    .back-link {
      display: block;
      text-align: center;
      margin-top: 20px;
      color: #00d4ff;
      text-decoration: none;
    }

    #checking {
      display: none;
      text-align: center;
      padding: 20px;
      color: #a0aec0;
    }

    .spinner {
      display: inline-block;
      width: 20px;
      height: 20px;
      border: 2px solid rgba(255,255,255,0.3);
      border-radius: 50%;
      border-top-color: #00d4ff;
      animation: spin 1s linear infinite;
      margin-right: 10px;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="card">
      <h1>Payment Details</h1>

      <div class="status ${workItem.status === 'paid' ? 'paid' : 'pending'}">
        ${workItem.status === 'paid'
          ? '<strong>Payment Received!</strong> Your task is in the queue.'
          : '<strong>Awaiting Payment</strong>'}
      </div>

      ${workItem.status !== 'paid' ? `
      <div class="payment-details">
        <h3>Send exactly:</h3>
        <div class="amount">
          <div class="sol">${costSol.toFixed(9)} SOL</div>
          <div class="usd">≈ $${workItem.cost_usd.toFixed(2)} USD</div>
        </div>

        <h3>To this address:</h3>
        <div class="address" id="address">${PAYMENT_WALLET}</div>
        <button class="copy-button" onclick="copyAddress()">Copy Address</button>
      </div>

      <div id="checking">
        <span class="spinner"></span>
        Checking for payment...
      </div>

      <div class="info">
        <p><strong>Important:</strong> Send the exact amount shown above. Once payment is confirmed, your task will be added to the queue and processed. Results will be sent to <strong>${workItem.email}</strong></p>
      </div>
      ` : `
      <div class="info">
        <p>Your task has been added to the queue! You will receive the results at <strong>${workItem.email}</strong> once processing is complete.</p>
      </div>
      `}

      <div class="task-preview">
        <h4>Your Task (${workItem.max_minutes} minutes max)</h4>
        <p>${workItem.task_description.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>
      </div>

      <a href="/" class="back-link">← Back to Home</a>
    </div>
  </div>

  <script>
    function copyAddress() {
      navigator.clipboard.writeText('${PAYMENT_WALLET}');
      const button = document.querySelector('.copy-button');
      button.textContent = 'Copied!';
      setTimeout(() => button.textContent = 'Copy Address', 2000);
    }

    ${workItem.status !== 'paid' ? `
    // Check for payment every 10 seconds
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

    // Check immediately and then every 10 seconds
    checkPayment();
    setInterval(checkPayment, 10000);
    ` : ''}
  </script>
</body>
</html>`;

  return c.html(html);
});

// API endpoint to check payment status
app.get("/api/check-payment/:id", async (c) => {
  const id = parseInt(c.req.param("id"));
  const workItem = getWorkItemById(id);

  if (!workItem) {
    return c.json({ error: "Not found" }, 404);
  }

  if (workItem.status === "paid" || workItem.status === "processing" || workItem.status === "completed") {
    return c.json({ paid: true });
  }

  // Use unique payment amount for this specific work item
  const costSol = await getUniquePaymentAmount(workItem.id, workItem.cost_usd);

  // Convert creation time to Unix timestamp (seconds)
  const createdAtTimestamp = Math.floor(new Date(workItem.created_at).getTime() / 1000);

  // Check blockchain for payment with timestamp filter
  const result = await checkForPayment(costSol, workItem.id, createdAtTimestamp);

  if (result.found && result.signature) {
    // Verify this transaction hasn't already been used for another task
    if (isTransactionUsed(result.signature)) {
      console.log(`Transaction ${result.signature} already used for another task`);
      return c.json({ paid: false, error: "Transaction already used" });
    }

    updateWorkItemPayment(workItem.id, result.signature, result.amount!);
    return c.json({ paid: true, signature: result.signature });
  }

  return c.json({ paid: false });
});

// API endpoint to get queue status
app.get("/api/status", async (c) => {
  const balance = await getWalletBalance();
  const paidItems = getPaidItems();

  return c.json({
    walletBalance: balance,
    queueLength: paidItems.length,
    items: paidItems.map((item) => ({
      id: item.id,
      status: item.status,
      maxMinutes: item.max_minutes,
      createdAt: item.created_at,
    })),
  });
});

// API endpoint to get individual task status
app.get("/api/task/:id", async (c) => {
  const id = parseInt(c.req.param("id"));
  const workItem = getWorkItemById(id);

  if (!workItem) {
    return c.json({ error: "Task not found" }, 404);
  }

  return c.json({
    id: workItem.id,
    status: workItem.status,
    maxMinutes: workItem.max_minutes,
    costUsd: workItem.cost_usd,
    costSol: workItem.cost_sol,
    createdAt: workItem.created_at,
    paidAt: workItem.paid_at,
    startedAt: workItem.started_at,
    completedAt: workItem.completed_at,
    hasResult: !!workItem.result,
  });
});

// Task status page
app.get("/status/:id", async (c) => {
  const id = parseInt(c.req.param("id"));
  const workItem = getWorkItemById(id);

  if (!workItem) {
    return c.text("Task not found", 404);
  }

  const statusColors: Record<string, string> = {
    pending_payment: "#ffc107",
    paid: "#00d4ff",
    processing: "#7c3aed",
    completed: "#14f195",
    failed: "#ff6b6b",
  };

  const statusLabels: Record<string, string> = {
    pending_payment: "Awaiting Payment",
    paid: "In Queue",
    processing: "Processing",
    completed: "Completed",
    failed: "Failed",
  };

  const statusColor = statusColors[workItem.status] || "#666";
  const statusLabel = statusLabels[workItem.status] || workItem.status;
  const maskedEmail = workItem.email.replace(/(.{2}).*(@.*)/, "$1***$2");
  const createdDate = workItem.created_at ? new Date(workItem.created_at).toLocaleString() : "";
  const paidDate = workItem.paid_at ? new Date(workItem.paid_at).toLocaleString() : "";
  const startedDate = workItem.started_at ? new Date(workItem.started_at).toLocaleString() : "";
  const completedDate = workItem.completed_at ? new Date(workItem.completed_at).toLocaleString() : "";
  const shouldRefresh = workItem.status !== "completed" && workItem.status !== "failed";

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Task Status - WorkingDevsHero</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
      min-height: 100vh;
      color: #fff;
      padding: 40px 20px;
    }
    .container { max-width: 600px; margin: 0 auto; }
    .card {
      background: rgba(255,255,255,0.05);
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 20px;
      padding: 40px;
    }
    h1 { text-align: center; margin-bottom: 30px; color: #00d4ff; }
    .status-badge {
      display: inline-block;
      padding: 10px 20px;
      border-radius: 20px;
      font-weight: 600;
      background: ${statusColor};
      color: #1a1a2e;
      margin-bottom: 20px;
    }
    .timeline { margin: 30px 0; }
    .timeline-item {
      display: flex;
      align-items: center;
      margin-bottom: 15px;
      color: #a0aec0;
    }
    .timeline-item.active { color: #fff; }
    .timeline-dot {
      width: 12px;
      height: 12px;
      border-radius: 50%;
      background: #333;
      margin-right: 15px;
    }
    .timeline-item.active .timeline-dot { background: #14f195; }
    .timeline-item.current .timeline-dot {
      background: #00d4ff;
      box-shadow: 0 0 10px #00d4ff;
    }
    .task-info { background: rgba(0,0,0,0.3); padding: 20px; border-radius: 10px; margin-top: 20px; }
    .task-info p { margin-bottom: 10px; color: #a0aec0; }
    .task-info strong { color: #fff; }
    .back-link { display: block; text-align: center; margin-top: 20px; color: #00d4ff; text-decoration: none; }
  </style>
</head>
<body>
  <div class="container">
    <div class="card">
      <h1>Task #${workItem.id}</h1>
      <div style="text-align: center;">
        <span class="status-badge">${statusLabel}</span>
      </div>

      <div class="timeline">
        <div class="timeline-item ${workItem.created_at ? "active" : ""} ${workItem.status === "pending_payment" ? "current" : ""}">
          <div class="timeline-dot"></div>
          <span>Task Created${createdDate ? " - " + createdDate : ""}</span>
        </div>
        <div class="timeline-item ${workItem.paid_at ? "active" : ""} ${workItem.status === "paid" ? "current" : ""}">
          <div class="timeline-dot"></div>
          <span>Payment Received${paidDate ? " - " + paidDate : ""}</span>
        </div>
        <div class="timeline-item ${workItem.started_at ? "active" : ""} ${workItem.status === "processing" ? "current" : ""}">
          <div class="timeline-dot"></div>
          <span>Processing Started${startedDate ? " - " + startedDate : ""}</span>
        </div>
        <div class="timeline-item ${workItem.completed_at ? "active" : ""} ${workItem.status === "completed" ? "current" : ""}">
          <div class="timeline-dot"></div>
          <span>Completed${completedDate ? " - " + completedDate : ""}</span>
        </div>
      </div>

      <div class="task-info">
        <p><strong>Time Budget:</strong> ${workItem.max_minutes} minutes</p>
        <p><strong>Cost:</strong> $${workItem.cost_usd.toFixed(2)}${workItem.cost_sol ? " (" + workItem.cost_sol.toFixed(6) + " SOL)" : ""}</p>
        <p><strong>Results will be sent to:</strong> ${maskedEmail}</p>
      </div>

      ${workItem.status === "pending_payment" ? '<p style="text-align:center;margin-top:20px;"><a href="/payment/' + workItem.id + '" style="color:#00d4ff;">View Payment Details</a></p>' : ""}

      <a href="/" class="back-link">← Back to Home</a>
    </div>
  </div>
  ${shouldRefresh ? `
  <script>
    setTimeout(() => location.reload(), 10000);
  </script>
  ` : ""}
</body>
</html>`;

  return c.html(html);
});

// ==========================================
// Authentication Routes
// ==========================================

// Registration page
app.get("/auth/register", (c) => {
  const user = getCurrentUser(c);
  if (user) return c.redirect("/dashboard");

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Register - WorkingDevsHero</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
      min-height: 100vh;
      color: #fff;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .card {
      background: rgba(255,255,255,0.05);
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 20px;
      padding: 40px;
      width: 100%;
      max-width: 400px;
    }
    h1 { text-align: center; margin-bottom: 30px; color: #00d4ff; }
    .form-group { margin-bottom: 20px; }
    .form-group label { display: block; margin-bottom: 8px; color: #a0aec0; }
    .form-group input {
      width: 100%;
      padding: 15px;
      border: 1px solid rgba(255,255,255,0.2);
      border-radius: 10px;
      background: rgba(255,255,255,0.05);
      color: white;
      font-size: 1rem;
    }
    .form-group input:focus { outline: none; border-color: #00d4ff; }
    .submit-button {
      width: 100%;
      background: linear-gradient(90deg, #00d4ff, #7c3aed);
      color: white;
      padding: 15px;
      border: none;
      border-radius: 10px;
      font-size: 1.1rem;
      cursor: pointer;
    }
    .submit-button:hover { opacity: 0.9; }
    .error { background: rgba(255,107,107,0.2); color: #ff6b6b; padding: 15px; border-radius: 10px; margin-bottom: 20px; }
    .links { text-align: center; margin-top: 20px; }
    .links a { color: #00d4ff; text-decoration: none; }
    .logo { text-align: center; margin-bottom: 30px; font-size: 1.5rem; font-weight: 700; color: #00d4ff; }
  </style>
</head>
<body>
  <div class="card">
    <div class="logo">WorkingDevsHero</div>
    <h1>Create Account</h1>
    <div id="error" class="error" style="display: none;"></div>
    <form id="registerForm">
      <div class="form-group">
        <label for="email">Email</label>
        <input type="email" id="email" name="email" required placeholder="you@example.com">
      </div>
      <div class="form-group">
        <label for="password">Password (min 8 characters)</label>
        <input type="password" id="password" name="password" required minlength="8">
      </div>
      <div class="form-group">
        <label for="confirmPassword">Confirm Password</label>
        <input type="password" id="confirmPassword" name="confirmPassword" required>
      </div>
      <button type="submit" class="submit-button">Create Account</button>
    </form>
    <div class="links">
      <p>Already have an account? <a href="/auth/login">Login</a></p>
    </div>
  </div>
  <script>
    document.getElementById('registerForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const form = e.target;
      const errorDiv = document.getElementById('error');
      const password = form.password.value;
      const confirmPassword = form.confirmPassword.value;

      if (password !== confirmPassword) {
        errorDiv.textContent = 'Passwords do not match';
        errorDiv.style.display = 'block';
        return;
      }

      try {
        const response = await fetch('/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: form.email.value, password })
        });
        const data = await response.json();
        if (data.success) {
          window.location.href = '/dashboard';
        } else {
          errorDiv.textContent = data.error || 'Registration failed';
          errorDiv.style.display = 'block';
        }
      } catch (error) {
        errorDiv.textContent = 'An error occurred. Please try again.';
        errorDiv.style.display = 'block';
      }
    });
  </script>
</body>
</html>`;
  return c.html(html);
});

// Registration API
app.post("/auth/register", async (c) => {
  const body = await c.req.json();
  const { email, password } = body;

  if (!email || !password) {
    return c.json({ success: false, error: "Email and password required" }, 400);
  }

  const result = await registerUser(email, password);
  if (!result.success) {
    return c.json({ success: false, error: result.error }, 400);
  }

  // Auto-login after registration
  const loginResult = await loginUser(email, password);
  if (!loginResult.success) {
    return c.json({ success: false, error: "Registration succeeded but login failed" }, 500);
  }

  return c.json(
    { success: true },
    {
      headers: {
        "Set-Cookie": createSessionCookie(loginResult.sessionId!),
      },
    }
  );
});

// Login page
app.get("/auth/login", (c) => {
  const user = getCurrentUser(c);
  if (user) return c.redirect("/dashboard");

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Login - WorkingDevsHero</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
      min-height: 100vh;
      color: #fff;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .card {
      background: rgba(255,255,255,0.05);
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 20px;
      padding: 40px;
      width: 100%;
      max-width: 400px;
    }
    h1 { text-align: center; margin-bottom: 30px; color: #00d4ff; }
    .form-group { margin-bottom: 20px; }
    .form-group label { display: block; margin-bottom: 8px; color: #a0aec0; }
    .form-group input {
      width: 100%;
      padding: 15px;
      border: 1px solid rgba(255,255,255,0.2);
      border-radius: 10px;
      background: rgba(255,255,255,0.05);
      color: white;
      font-size: 1rem;
    }
    .form-group input:focus { outline: none; border-color: #00d4ff; }
    .submit-button {
      width: 100%;
      background: linear-gradient(90deg, #00d4ff, #7c3aed);
      color: white;
      padding: 15px;
      border: none;
      border-radius: 10px;
      font-size: 1.1rem;
      cursor: pointer;
    }
    .submit-button:hover { opacity: 0.9; }
    .error { background: rgba(255,107,107,0.2); color: #ff6b6b; padding: 15px; border-radius: 10px; margin-bottom: 20px; }
    .links { text-align: center; margin-top: 20px; }
    .links a { color: #00d4ff; text-decoration: none; }
    .logo { text-align: center; margin-bottom: 30px; font-size: 1.5rem; font-weight: 700; color: #00d4ff; }
  </style>
</head>
<body>
  <div class="card">
    <div class="logo">WorkingDevsHero</div>
    <h1>Login</h1>
    <div id="error" class="error" style="display: none;"></div>
    <form id="loginForm">
      <div class="form-group">
        <label for="email">Email</label>
        <input type="email" id="email" name="email" required placeholder="you@example.com">
      </div>
      <div class="form-group">
        <label for="password">Password</label>
        <input type="password" id="password" name="password" required>
      </div>
      <button type="submit" class="submit-button">Login</button>
    </form>
    <div class="links">
      <p>Don't have an account? <a href="/auth/register">Sign Up</a></p>
    </div>
  </div>
  <script>
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
  </script>
</body>
</html>`;
  return c.html(html);
});

// Login API
app.post("/auth/login", async (c) => {
  const body = await c.req.json();
  const { email, password } = body;

  if (!email || !password) {
    return c.json({ success: false, error: "Email and password required" }, 400);
  }

  const result = await loginUser(email, password);
  if (!result.success) {
    return c.json({ success: false, error: result.error }, 400);
  }

  return c.json(
    { success: true },
    {
      headers: {
        "Set-Cookie": createSessionCookie(result.sessionId!),
      },
    }
  );
});

// Logout
app.post("/auth/logout", (c) => {
  const cookieHeader = c.req.header("Cookie");
  const sessionId = getSessionFromCookie(cookieHeader);
  if (sessionId) {
    logoutUser(sessionId);
  }
  return c.json(
    { success: true },
    {
      headers: {
        "Set-Cookie": createLogoutCookie(),
      },
    }
  );
});

app.get("/auth/logout", (c) => {
  const cookieHeader = c.req.header("Cookie");
  const sessionId = getSessionFromCookie(cookieHeader);
  if (sessionId) {
    logoutUser(sessionId);
  }
  return c.redirect("/", {
    headers: {
      "Set-Cookie": createLogoutCookie(),
    },
  });
});

// ==========================================
// Dashboard Routes
// ==========================================

// Main dashboard
app.get("/dashboard", async (c) => {
  const user = getCurrentUser(c);
  if (!user) return c.redirect("/auth/login");

  const allTasks = getWorkItemsByUserId(user.id);
  const inProgress = allTasks.filter(t => ["paid", "processing"].includes(t.status));
  const completed = allTasks.filter(t => ["completed", "failed"].includes(t.status));
  const pending = allTasks.filter(t => t.status === "pending_payment");

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Dashboard - WorkingDevsHero</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
      min-height: 100vh;
      color: #fff;
    }
    .container { max-width: 1000px; margin: 0 auto; padding: 20px; }
    header {
      padding: 20px 0;
      border-bottom: 1px solid rgba(255,255,255,0.1);
      margin-bottom: 30px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .logo { font-size: 1.5rem; font-weight: 700; color: #00d4ff; }
    nav a { color: #a0aec0; text-decoration: none; margin-left: 20px; }
    nav a:hover { color: #00d4ff; }
    h1 { margin-bottom: 30px; }
    .stats {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 20px;
      margin-bottom: 40px;
    }
    .stat-card {
      background: rgba(255,255,255,0.05);
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 15px;
      padding: 25px;
      text-align: center;
    }
    .stat-number { font-size: 2.5rem; color: #00d4ff; }
    .stat-label { color: #a0aec0; margin-top: 5px; }
    .section { margin-bottom: 40px; }
    .section h2 { margin-bottom: 20px; font-size: 1.3rem; }
    .task-list { display: flex; flex-direction: column; gap: 15px; }
    .task-card {
      background: rgba(255,255,255,0.05);
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 12px;
      padding: 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .task-info h3 { font-size: 1rem; margin-bottom: 5px; }
    .task-info p { color: #a0aec0; font-size: 0.9rem; }
    .task-status {
      padding: 6px 12px;
      border-radius: 20px;
      font-size: 0.8rem;
      font-weight: 600;
    }
    .status-pending { background: rgba(255,193,7,0.2); color: #ffc107; }
    .status-paid { background: rgba(0,212,255,0.2); color: #00d4ff; }
    .status-processing { background: rgba(124,58,237,0.2); color: #7c3aed; }
    .status-completed { background: rgba(20,241,149,0.2); color: #14f195; }
    .status-failed { background: rgba(255,107,107,0.2); color: #ff6b6b; }
    .new-task-btn {
      background: linear-gradient(90deg, #00d4ff, #7c3aed);
      color: white;
      padding: 12px 24px;
      border: none;
      border-radius: 25px;
      text-decoration: none;
      display: inline-block;
    }
    .empty { color: #a0aec0; text-align: center; padding: 40px; }
    .nav-links a {
      display: inline-block;
      margin-right: 20px;
      padding: 8px 16px;
      background: rgba(255,255,255,0.05);
      border-radius: 8px;
      color: #00d4ff;
      text-decoration: none;
    }
    .nav-links a:hover { background: rgba(255,255,255,0.1); }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <a href="/" class="logo">WorkingDevsHero</a>
      <nav>
        <span style="color: #a0aec0;">${user.email}</span>
        <a href="/auth/logout">Logout</a>
      </nav>
    </header>

    <h1>Welcome back!</h1>

    <div class="stats">
      <div class="stat-card">
        <div class="stat-number">${allTasks.length}</div>
        <div class="stat-label">Total Tasks</div>
      </div>
      <div class="stat-card">
        <div class="stat-number">${inProgress.length}</div>
        <div class="stat-label">In Progress</div>
      </div>
      <div class="stat-card">
        <div class="stat-number">${completed.length}</div>
        <div class="stat-label">Completed</div>
      </div>
    </div>

    <div class="nav-links">
      <a href="/dashboard/in-progress">View In Progress</a>
      <a href="/dashboard/completed">View Completed</a>
      <a href="/#submit" class="new-task-btn">New Task</a>
    </div>

    <div class="section">
      <h2>Recent Tasks</h2>
      <div class="task-list">
        ${allTasks.length === 0 ? '<div class="empty">No tasks yet. Submit your first task!</div>' : ''}
        ${allTasks.slice(0, 5).map(task => `
          <a href="${task.status === 'pending_payment' ? '/payment/' : '/status/'}${task.id}" class="task-card" style="text-decoration: none; color: inherit;">
            <div class="task-info">
              <h3>${task.task_description.substring(0, 60)}${task.task_description.length > 60 ? '...' : ''}</h3>
              <p>${task.max_minutes} min • $${task.cost_usd.toFixed(2)} • ${new Date(task.created_at).toLocaleDateString()}</p>
            </div>
            <span class="task-status status-${task.status.replace('_', '-')}">${task.status.replace('_', ' ')}</span>
          </a>
        `).join('')}
      </div>
    </div>
  </div>
</body>
</html>`;
  return c.html(html);
});

// In-progress tasks page
app.get("/dashboard/in-progress", async (c) => {
  const user = getCurrentUser(c);
  if (!user) return c.redirect("/auth/login");

  const tasks = getWorkItemsByUserIdAndStatus(user.id, ["paid", "processing"]);

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>In Progress - WorkingDevsHero</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
      min-height: 100vh;
      color: #fff;
    }
    .container { max-width: 1000px; margin: 0 auto; padding: 20px; }
    header {
      padding: 20px 0;
      border-bottom: 1px solid rgba(255,255,255,0.1);
      margin-bottom: 30px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .logo { font-size: 1.5rem; font-weight: 700; color: #00d4ff; }
    nav a { color: #a0aec0; text-decoration: none; margin-left: 20px; }
    nav a:hover { color: #00d4ff; }
    h1 { margin-bottom: 10px; }
    .subtitle { color: #a0aec0; margin-bottom: 30px; }
    .task-list { display: flex; flex-direction: column; gap: 15px; }
    .task-card {
      background: rgba(255,255,255,0.05);
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 12px;
      padding: 25px;
    }
    .task-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; }
    .task-header h3 { font-size: 1.1rem; }
    .task-status {
      padding: 6px 12px;
      border-radius: 20px;
      font-size: 0.8rem;
      font-weight: 600;
    }
    .status-paid { background: rgba(0,212,255,0.2); color: #00d4ff; }
    .status-processing { background: rgba(124,58,237,0.2); color: #7c3aed; }
    .task-description { color: #a0aec0; line-height: 1.6; margin-bottom: 15px; white-space: pre-wrap; }
    .task-meta { display: flex; gap: 20px; color: #a0aec0; font-size: 0.9rem; }
    .empty { color: #a0aec0; text-align: center; padding: 60px; }
    .back-link { color: #00d4ff; text-decoration: none; display: inline-block; margin-bottom: 20px; }
    .spinner { display: inline-block; width: 12px; height: 12px; border: 2px solid rgba(255,255,255,0.3); border-radius: 50%; border-top-color: #7c3aed; animation: spin 1s linear infinite; margin-right: 8px; }
    @keyframes spin { to { transform: rotate(360deg); } }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <a href="/" class="logo">WorkingDevsHero</a>
      <nav>
        <a href="/dashboard">Dashboard</a>
        <a href="/auth/logout">Logout</a>
      </nav>
    </header>

    <a href="/dashboard" class="back-link">← Back to Dashboard</a>
    <h1>Tasks In Progress</h1>
    <p class="subtitle">${tasks.length} task${tasks.length !== 1 ? 's' : ''} currently being processed</p>

    <div class="task-list">
      ${tasks.length === 0 ? '<div class="empty">No tasks currently in progress.</div>' : ''}
      ${tasks.map(task => `
        <div class="task-card">
          <div class="task-header">
            <h3>Task #${task.id}</h3>
            <span class="task-status status-${task.status}">
              ${task.status === 'processing' ? '<span class="spinner"></span>' : ''}
              ${task.status === 'paid' ? 'In Queue' : 'Processing'}
            </span>
          </div>
          <div class="task-description">${task.task_description.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>
          <div class="task-meta">
            <span>Time Budget: ${task.max_minutes} min</span>
            <span>Cost: $${task.cost_usd.toFixed(2)}</span>
            <span>Paid: ${task.paid_at ? new Date(task.paid_at).toLocaleString() : 'N/A'}</span>
            ${task.started_at ? `<span>Started: ${new Date(task.started_at).toLocaleString()}</span>` : ''}
          </div>
        </div>
      `).join('')}
    </div>
  </div>
  <script>
    // Auto-refresh every 10 seconds
    setTimeout(() => location.reload(), 10000);
  </script>
</body>
</html>`;
  return c.html(html);
});

// Completed tasks page
app.get("/dashboard/completed", async (c) => {
  const user = getCurrentUser(c);
  if (!user) return c.redirect("/auth/login");

  const tasks = getWorkItemsByUserIdAndStatus(user.id, ["completed", "failed"]);

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Completed Tasks - WorkingDevsHero</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
      min-height: 100vh;
      color: #fff;
    }
    .container { max-width: 1000px; margin: 0 auto; padding: 20px; }
    header {
      padding: 20px 0;
      border-bottom: 1px solid rgba(255,255,255,0.1);
      margin-bottom: 30px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .logo { font-size: 1.5rem; font-weight: 700; color: #00d4ff; }
    nav a { color: #a0aec0; text-decoration: none; margin-left: 20px; }
    nav a:hover { color: #00d4ff; }
    h1 { margin-bottom: 10px; }
    .subtitle { color: #a0aec0; margin-bottom: 30px; }
    .task-list { display: flex; flex-direction: column; gap: 15px; }
    .task-card {
      background: rgba(255,255,255,0.05);
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 12px;
      padding: 25px;
    }
    .task-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; }
    .task-header h3 { font-size: 1.1rem; }
    .task-status {
      padding: 6px 12px;
      border-radius: 20px;
      font-size: 0.8rem;
      font-weight: 600;
    }
    .status-completed { background: rgba(20,241,149,0.2); color: #14f195; }
    .status-failed { background: rgba(255,107,107,0.2); color: #ff6b6b; }
    .task-description { color: #a0aec0; line-height: 1.6; margin-bottom: 15px; }
    .task-meta { display: flex; gap: 20px; color: #a0aec0; font-size: 0.9rem; margin-bottom: 15px; }
    .task-result {
      background: rgba(0,0,0,0.3);
      padding: 15px;
      border-radius: 8px;
      margin-top: 15px;
      font-family: monospace;
      font-size: 0.9rem;
      max-height: 200px;
      overflow-y: auto;
      white-space: pre-wrap;
    }
    .task-result.collapsed { max-height: 80px; }
    .toggle-result { color: #00d4ff; background: none; border: none; cursor: pointer; font-size: 0.9rem; margin-top: 10px; }
    .empty { color: #a0aec0; text-align: center; padding: 60px; }
    .back-link { color: #00d4ff; text-decoration: none; display: inline-block; margin-bottom: 20px; }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <a href="/" class="logo">WorkingDevsHero</a>
      <nav>
        <a href="/dashboard">Dashboard</a>
        <a href="/auth/logout">Logout</a>
      </nav>
    </header>

    <a href="/dashboard" class="back-link">← Back to Dashboard</a>
    <h1>Completed Tasks</h1>
    <p class="subtitle">${tasks.length} completed task${tasks.length !== 1 ? 's' : ''}</p>

    <div class="task-list">
      ${tasks.length === 0 ? '<div class="empty">No completed tasks yet.</div>' : ''}
      ${tasks.map(task => {
        let resultData = null;
        try {
          resultData = task.result ? JSON.parse(task.result) : null;
        } catch (e) {}
        return `
        <div class="task-card">
          <div class="task-header">
            <h3>Task #${task.id}</h3>
            <span class="task-status status-${task.status}">${task.status}</span>
          </div>
          <div class="task-description">${task.task_description.substring(0, 200).replace(/</g, '&lt;').replace(/>/g, '&gt;')}${task.task_description.length > 200 ? '...' : ''}</div>
          <div class="task-meta">
            <span>Time Budget: ${task.max_minutes} min</span>
            <span>Cost: $${task.cost_usd.toFixed(2)}${task.cost_sol ? ' (' + task.cost_sol.toFixed(6) + ' SOL)' : ''}</span>
            <span>Completed: ${task.completed_at ? new Date(task.completed_at).toLocaleString() : 'N/A'}</span>
          </div>
          ${resultData ? `
          <div class="task-result collapsed" id="result-${task.id}">${(resultData.output || 'No output').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>
          <button class="toggle-result" onclick="toggleResult(${task.id})">Show More</button>
          ` : ''}
        </div>
      `}).join('')}
    </div>
  </div>
  <script>
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
  </script>
</body>
</html>`;
  return c.html(html);
});

// ==========================================
// Worker API Endpoints (for remote worker)
// ==========================================

// Get pending paid tasks ready to be processed
app.get("/api/worker/pending", async (c) => {
  const authHeader = c.req.header("Authorization");
  if (!verifyWorkerAuth(authHeader)) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const paidItems = getPaidItems();
  return c.json({
    items: paidItems.map((item) => ({
      id: item.id,
      email: item.email,
      maxMinutes: item.max_minutes,
      taskDescription: item.task_description,
      costUsd: item.cost_usd,
      costSol: item.cost_sol,
      status: item.status,
      createdAt: item.created_at,
      paidAt: item.paid_at,
    })),
  });
});

// Claim a task (mark as processing)
app.post("/api/worker/claim/:id", async (c) => {
  const authHeader = c.req.header("Authorization");
  if (!verifyWorkerAuth(authHeader)) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const id = parseInt(c.req.param("id"));
  const workItem = getWorkItemById(id);

  if (!workItem) {
    return c.json({ error: "Task not found" }, 404);
  }

  if (workItem.status !== "paid") {
    return c.json({ error: "Task is not in paid status" }, 400);
  }

  updateWorkItemStatus(id, "processing", {
    started_at: new Date().toISOString(),
  });

  return c.json({ success: true, message: "Task claimed" });
});

// Complete a task with result
app.post("/api/worker/complete/:id", async (c) => {
  const authHeader = c.req.header("Authorization");
  if (!verifyWorkerAuth(authHeader)) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const id = parseInt(c.req.param("id"));
  const body = await c.req.json();
  const { success, output, error } = body;

  const workItem = getWorkItemById(id);

  if (!workItem) {
    return c.json({ error: "Task not found" }, 404);
  }

  if (workItem.status !== "processing") {
    return c.json({ error: "Task is not in processing status" }, 400);
  }

  updateWorkItemStatus(id, success ? "completed" : "failed", {
    completed_at: new Date().toISOString(),
    result: JSON.stringify({ success, output, error }),
  });

  return c.json({ success: true, message: "Task completed" });
});

// TEST ONLY: Mark a task as paid for testing
app.post("/api/test/mark-paid/:id", async (c) => {
  const authHeader = c.req.header("Authorization");
  if (!verifyWorkerAuth(authHeader)) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const id = parseInt(c.req.param("id"));
  const workItem = getWorkItemById(id);

  if (!workItem) {
    return c.json({ error: "Task not found" }, 404);
  }

  if (workItem.status !== "pending_payment") {
    return c.json({ error: "Task is not pending_payment" }, 400);
  }

  updateWorkItemPayment(id, "TEST-" + Date.now(), 0.001);
  return c.json({ success: true, message: "Task marked as paid for testing" });
});

// Get task details (for worker to fetch email info after claiming)
app.get("/api/worker/task/:id", async (c) => {
  const authHeader = c.req.header("Authorization");
  if (!verifyWorkerAuth(authHeader)) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const id = parseInt(c.req.param("id"));
  const workItem = getWorkItemById(id);

  if (!workItem) {
    return c.json({ error: "Task not found" }, 404);
  }

  return c.json({
    id: workItem.id,
    email: workItem.email,
    maxMinutes: workItem.max_minutes,
    taskDescription: workItem.task_description,
    costUsd: workItem.cost_usd,
    costSol: workItem.cost_sol,
    status: workItem.status,
    createdAt: workItem.created_at,
    paidAt: workItem.paid_at,
    startedAt: workItem.started_at,
  });
});

const port = parseInt(process.env.PORT || "3000");
console.log(`Server starting on http://localhost:${port}`);

export default {
  port,
  fetch: app.fetch,
};
