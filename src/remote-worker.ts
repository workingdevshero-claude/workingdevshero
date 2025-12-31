import { spawn } from "child_process";
import nodemailer from "nodemailer";

// Configuration from environment
const API_BASE_URL = process.env.API_BASE_URL || "http://localhost:3000";
const WORKER_API_KEY = process.env.WORKER_API_KEY || "";

// Email configuration - using Proton Mail SMTP
const EMAIL_FROM = "claude@kookz.life";
const SMTP_HOST = process.env.SMTP_HOST || "smtp.protonmail.ch";
const SMTP_PORT = parseInt(process.env.SMTP_PORT || "587");
const SMTP_USER = process.env.SMTP_USER || EMAIL_FROM;
const SMTP_PASS = process.env.SMTP_PASS || "";

// Task interface
interface WorkItem {
  id: number;
  email: string;
  maxMinutes: number;
  taskDescription: string;
  costUsd: number;
  costSol: number | null;
  status: string;
  createdAt: string;
  paidAt: string | null;
}

// API helper
async function apiRequest(
  method: "GET" | "POST",
  path: string,
  body?: object
): Promise<{ ok: boolean; data: any; status: number }> {
  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${WORKER_API_KEY}`,
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    const data = await response.json();
    return { ok: response.ok, data, status: response.status };
  } catch (error) {
    console.error(`API request failed: ${method} ${path}`, error);
    return { ok: false, data: { error: "Network error" }, status: 0 };
  }
}

// Create email transporter
function createTransporter() {
  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: false,
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
  });
}

// Execute Claude Code CLI with task
async function executeClaudeCode(
  task: string,
  maxMinutes: number
): Promise<{ success: boolean; output: string; error?: string }> {
  return new Promise((resolve) => {
    const startTime = Date.now();
    const maxTimeMs = maxMinutes * 60 * 1000;

    // Build the prompt with time constraint
    const prompt = `You have a maximum of ${maxMinutes} minutes to complete this task. Please use the system clock to track time and ensure you complete before the time limit. If you cannot finish, provide what you have accomplished so far.

TASK:
${task}

Please proceed with the task now.`;

    console.log(`Starting Claude Code for task (max ${maxMinutes} min)...`);

    const claudeProcess = spawn("claude", ["-p", prompt], {
      cwd: "/tmp",
      env: {
        ...process.env,
        HOME: process.env.HOME || "/home/claude",
      },
    });

    let output = "";
    let errorOutput = "";

    claudeProcess.stdout.on("data", (data) => {
      const text = data.toString();
      output += text;
      process.stdout.write(text);
    });

    claudeProcess.stderr.on("data", (data) => {
      const text = data.toString();
      errorOutput += text;
      process.stderr.write(text);
    });

    // Set timeout
    const timeout = setTimeout(() => {
      console.log(`Task exceeded time limit (${maxMinutes} min), terminating...`);
      claudeProcess.kill("SIGTERM");
      setTimeout(() => {
        if (!claudeProcess.killed) {
          claudeProcess.kill("SIGKILL");
        }
      }, 5000);
    }, maxTimeMs);

    claudeProcess.on("close", (code) => {
      clearTimeout(timeout);
      const elapsed = (Date.now() - startTime) / 1000 / 60;
      console.log(`Claude Code finished in ${elapsed.toFixed(2)} minutes with code ${code}`);

      resolve({
        success: code === 0,
        output: output || "No output generated",
        error: errorOutput || undefined,
      });
    });

    claudeProcess.on("error", (err) => {
      clearTimeout(timeout);
      console.error("Failed to start Claude Code:", err);
      resolve({
        success: false,
        output: "",
        error: `Failed to start Claude Code: ${err.message}`,
      });
    });
  });
}

// Send result email
async function sendResultEmail(
  workItem: WorkItem,
  result: { success: boolean; output: string; error?: string }
): Promise<boolean> {
  try {
    const transporter = createTransporter();

    const subject = result.success
      ? `Your AI Task is Complete - WorkingDevsHero`
      : `AI Task Update - WorkingDevsHero`;

    const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #1a1a2e, #0f3460); color: white; padding: 30px; border-radius: 10px 10px 0 0; }
    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
    .task { background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #00d4ff; }
    .result { background: white; padding: 20px; border-radius: 8px; border-left: 4px solid ${result.success ? "#14f195" : "#ff6b6b"}; }
    .result pre { background: #1a1a2e; color: #fff; padding: 15px; border-radius: 8px; overflow-x: auto; white-space: pre-wrap; }
    .footer { text-align: center; padding: 20px; color: #666; font-size: 0.9rem; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin:0;">WorkingDevsHero</h1>
      <p style="margin:10px 0 0;">AI Application Development as a Service</p>
    </div>
    <div class="content">
      <h2>${result.success ? "Task Completed Successfully!" : "Task Update"}</h2>

      <div class="task">
        <h3>Your Task</h3>
        <p>${workItem.taskDescription.replace(/\n/g, "<br>")}</p>
        <p><strong>Time Allocated:</strong> ${workItem.maxMinutes} minutes</p>
        <p><strong>Cost:</strong> $${workItem.costUsd.toFixed(2)} (${workItem.costSol?.toFixed(6) || "N/A"} SOL)</p>
      </div>

      <div class="result">
        <h3>Result</h3>
        <pre>${result.output.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</pre>
        ${result.error ? `<p style="color: #ff6b6b;"><strong>Errors:</strong> ${result.error.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</p>` : ""}
      </div>
    </div>
    <div class="footer">
      <p>Thank you for using WorkingDevsHero!</p>
      <p>Questions? Reply to this email.</p>
    </div>
  </div>
</body>
</html>
    `;

    await transporter.sendMail({
      from: `"WorkingDevsHero" <${EMAIL_FROM}>`,
      to: workItem.email,
      subject,
      html,
      text: `WorkingDevsHero - Task ${result.success ? "Completed" : "Update"}\n\nYour Task:\n${workItem.taskDescription}\n\nResult:\n${result.output}\n\n${result.error ? `Errors: ${result.error}` : ""}`,
    });

    console.log(`Email sent to ${workItem.email}`);
    return true;
  } catch (error) {
    console.error("Failed to send email:", error);
    return false;
  }
}

// Process a single work item
async function processWorkItem(workItem: WorkItem): Promise<void> {
  console.log(`\n${"=".repeat(50)}`);
  console.log(`Processing work item #${workItem.id}`);
  console.log(`Task: ${workItem.taskDescription.substring(0, 100)}...`);
  console.log(`Max time: ${workItem.maxMinutes} minutes`);
  console.log(`${"=".repeat(50)}\n`);

  // Claim the task
  const claimResult = await apiRequest("POST", `/api/worker/claim/${workItem.id}`);
  if (!claimResult.ok) {
    console.error(`Failed to claim task #${workItem.id}:`, claimResult.data);
    return;
  }

  // Execute Claude Code
  const result = await executeClaudeCode(workItem.taskDescription, workItem.maxMinutes);

  // Report completion
  const completeResult = await apiRequest("POST", `/api/worker/complete/${workItem.id}`, {
    success: result.success,
    output: result.output,
    error: result.error,
  });

  if (!completeResult.ok) {
    console.error(`Failed to report completion for task #${workItem.id}:`, completeResult.data);
  }

  // Send email notification
  const emailSent = await sendResultEmail(workItem, result);
  if (!emailSent) {
    console.error(`Failed to send email for work item #${workItem.id}`);
  }

  console.log(`\nWork item #${workItem.id} ${result.success ? "completed" : "failed"}`);
}

// Fetch pending tasks from remote API
async function fetchPendingTasks(): Promise<WorkItem[]> {
  const result = await apiRequest("GET", "/api/worker/pending");
  if (!result.ok) {
    console.error("Failed to fetch pending tasks:", result.data);
    return [];
  }
  return result.data.items || [];
}

// Main worker loop
async function runWorker(): Promise<void> {
  console.log("WorkingDevsHero Remote Worker Started");
  console.log(`API Base URL: ${API_BASE_URL}`);
  console.log("Checking for paid tasks...\n");

  if (!WORKER_API_KEY) {
    console.error("ERROR: WORKER_API_KEY environment variable is not set!");
    console.error("Please set the WORKER_API_KEY environment variable.");
    process.exit(1);
  }

  while (true) {
    try {
      const paidItems = await fetchPendingTasks();

      if (paidItems.length > 0) {
        console.log(`Found ${paidItems.length} paid item(s) in queue`);

        // Process one at a time
        const item = paidItems[0];
        await processWorkItem(item);
      } else {
        // No items, wait before checking again
        process.stdout.write(".");
      }

      // Wait 5 seconds before next check
      await new Promise((resolve) => setTimeout(resolve, 5000));
    } catch (error) {
      console.error("Worker error:", error);
      await new Promise((resolve) => setTimeout(resolve, 10000));
    }
  }
}

// Run if executed directly
if (import.meta.main) {
  runWorker().catch(console.error);
}

export { runWorker, processWorkItem, executeClaudeCode, sendResultEmail };
