import { Hono } from "hono";
import { serveStatic } from "hono/bun";
import { cors } from "hono/cors";
import { createWorkItem, getWorkItemById, getPaidItems, updateWorkItemStatus, updateWorkItemPayment, getWorkItemsByUserId, getWorkItemsByUserIdAndStatus, isTransactionUsed, deleteWorkItem, type User } from "./db";
import { PAYMENT_WALLET, getSolPrice, usdToSol, getUniquePaymentAmount, checkForPayment, getWalletBalance } from "./solana";
import { registerUser, loginUser, logoutUser, validateSession, getSessionFromCookie, createSessionCookie, createLogoutCookie } from "./auth";

// Import JSX pages
import { Landing, Submit, Payment, Status, Login, Register, Dashboard, DashboardInProgress, DashboardCompleted } from "./pages";

const app = new Hono();

// Worker API authentication
const WORKER_API_KEY = process.env.WORKER_API_KEY || "";

function verifyWorkerAuth(authHeader: string | undefined): boolean {
  if (!authHeader || !WORKER_API_KEY) return false;
  const token = authHeader.replace("Bearer ", "");
  return token === WORKER_API_KEY;
}

// Get current user from session cookie (async)
async function getCurrentUser(c: any): Promise<User | null> {
  const cookieHeader = c.req.header("Cookie");
  const sessionId = getSessionFromCookie(cookieHeader);
  const { valid, user } = await validateSession(sessionId);
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

// ==========================================
// Page Routes
// ==========================================

// Landing page
app.get("/", async (c) => {
  const solPrice = await getSolPrice();
  const user = await getCurrentUser(c);
  return c.html(<Landing user={user} solPrice={solPrice} />);
});

// Submit task page (requires authentication)
app.get("/submit", async (c) => {
  const user = await getCurrentUser(c);
  if (!user) return c.redirect("/auth/login");
  return c.html(<Submit user={user} />);
});

// Payment page
app.get("/payment/:id", async (c) => {
  const id = parseInt(c.req.param("id"));
  const workItem = await getWorkItemById(id);

  if (!workItem) {
    return c.text("Work item not found", 404);
  }

  const user = await getCurrentUser(c);
  const costSol = await getUniquePaymentAmount(workItem.id, workItem.cost_usd);

  return c.html(<Payment user={user} workItem={workItem} costSol={costSol} paymentWallet={PAYMENT_WALLET} />);
});

// Task status page
app.get("/status/:id", async (c) => {
  const id = parseInt(c.req.param("id"));
  const workItem = await getWorkItemById(id);

  if (!workItem) {
    return c.text("Task not found", 404);
  }

  return c.html(<Status workItem={workItem} />);
});

// ==========================================
// Authentication Routes
// ==========================================

// Registration page
app.get("/auth/register", async (c) => {
  const user = await getCurrentUser(c);
  if (user) return c.redirect("/dashboard");
  return c.html(<Register />);
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
app.get("/auth/login", async (c) => {
  const user = await getCurrentUser(c);
  if (user) return c.redirect("/dashboard");
  return c.html(<Login />);
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
app.post("/auth/logout", async (c) => {
  const cookieHeader = c.req.header("Cookie");
  const sessionId = getSessionFromCookie(cookieHeader);
  if (sessionId) {
    await logoutUser(sessionId);
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

app.get("/auth/logout", async (c) => {
  const cookieHeader = c.req.header("Cookie");
  const sessionId = getSessionFromCookie(cookieHeader);
  if (sessionId) {
    await logoutUser(sessionId);
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
  const user = await getCurrentUser(c);
  if (!user) return c.redirect("/auth/login");

  const allTasks = await getWorkItemsByUserId(user.id);
  const inProgress = allTasks.filter(t => ["paid", "processing"].includes(t.status));
  const completed = allTasks.filter(t => ["completed", "failed"].includes(t.status));
  const pending = allTasks.filter(t => t.status === "pending_payment");

  return c.html(<Dashboard user={user} allTasks={allTasks} inProgress={inProgress} completed={completed} pending={pending} />);
});

// In-progress tasks page
app.get("/dashboard/in-progress", async (c) => {
  const user = await getCurrentUser(c);
  if (!user) return c.redirect("/auth/login");

  const tasks = await getWorkItemsByUserIdAndStatus(user.id, ["paid", "processing"]);
  return c.html(<DashboardInProgress user={user} tasks={tasks} />);
});

// Completed tasks page
app.get("/dashboard/completed", async (c) => {
  const user = await getCurrentUser(c);
  if (!user) return c.redirect("/auth/login");

  const tasks = await getWorkItemsByUserIdAndStatus(user.id, ["completed", "failed"]);
  return c.html(<DashboardCompleted user={user} tasks={tasks} />);
});

// ==========================================
// API Endpoints
// ==========================================

// API endpoint to submit work items (requires authentication)
app.post("/api/submit", async (c) => {
  try {
    const user = await getCurrentUser(c);

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
    // Create work item with pending_payment status - user must pay via Solana
    const workItem = await createWorkItem(user.email, minutes, task, costUsd, PAYMENT_WALLET, user.id);

    return c.json({
      success: true,
      workItemId: workItem.id,
      costUsd,
      message: "Task created - please complete payment",
    });
  } catch (error) {
    console.error("Error submitting work item:", error);
    return c.json({ success: false, error: "Internal server error" }, 500);
  }
});

// API endpoint to check payment status
app.get("/api/check-payment/:id", async (c) => {
  const id = parseInt(c.req.param("id"));
  const workItem = await getWorkItemById(id);

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
    if (await isTransactionUsed(result.signature)) {
      console.log(`Transaction ${result.signature} already used for another task`);
      return c.json({ paid: false, error: "Transaction already used" });
    }

    await updateWorkItemPayment(workItem.id, result.signature, result.amount!);
    return c.json({ paid: true, signature: result.signature });
  }

  return c.json({ paid: false });
});

// API endpoint to delete a pending payment task
app.delete("/api/task/:id", async (c) => {
  const user = await getCurrentUser(c);
  if (!user) {
    return c.json({ success: false, error: "Authentication required" }, 401);
  }

  const id = parseInt(c.req.param("id"));
  const workItem = await getWorkItemById(id);

  if (!workItem) {
    return c.json({ success: false, error: "Task not found" }, 404);
  }

  // Only allow owner to delete their task
  if (workItem.user_id !== user.id) {
    return c.json({ success: false, error: "Not authorized" }, 403);
  }

  // Only allow deletion of pending_payment tasks
  if (workItem.status !== "pending_payment") {
    return c.json({ success: false, error: "Can only delete tasks pending payment" }, 400);
  }

  const deleted = await deleteWorkItem(id);
  if (deleted) {
    return c.json({ success: true });
  } else {
    return c.json({ success: false, error: "Failed to delete task" }, 500);
  }
});

// API endpoint to get queue status
app.get("/api/status", async (c) => {
  const balance = await getWalletBalance();
  const paidItems = await getPaidItems();

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
  const workItem = await getWorkItemById(id);

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

// ==========================================
// Worker API Endpoints (for remote worker)
// ==========================================

// Get pending paid tasks ready to be processed
app.get("/api/worker/pending", async (c) => {
  const authHeader = c.req.header("Authorization");
  if (!verifyWorkerAuth(authHeader)) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const paidItems = await getPaidItems();
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
  const workItem = await getWorkItemById(id);

  if (!workItem) {
    return c.json({ error: "Task not found" }, 404);
  }

  if (workItem.status !== "paid") {
    return c.json({ error: "Task is not in paid status" }, 400);
  }

  await updateWorkItemStatus(id, "processing", {
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

  const workItem = await getWorkItemById(id);

  if (!workItem) {
    return c.json({ error: "Task not found" }, 404);
  }

  if (workItem.status !== "processing") {
    return c.json({ error: "Task is not in processing status" }, 400);
  }

  await updateWorkItemStatus(id, success ? "completed" : "failed", {
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
  const workItem = await getWorkItemById(id);

  if (!workItem) {
    return c.json({ error: "Task not found" }, 404);
  }

  if (workItem.status !== "pending_payment") {
    return c.json({ error: "Task is not pending_payment" }, 400);
  }

  await updateWorkItemPayment(id, "TEST-" + Date.now(), 0.001);
  return c.json({ success: true, message: "Task marked as paid for testing" });
});

// Get task details (for worker to fetch email info after claiming)
app.get("/api/worker/task/:id", async (c) => {
  const authHeader = c.req.header("Authorization");
  if (!verifyWorkerAuth(authHeader)) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const id = parseInt(c.req.param("id"));
  const workItem = await getWorkItemById(id);

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
