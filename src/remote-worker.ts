import nodemailer from "nodemailer";
import { mkdir, readdir, stat } from "fs/promises";
import { join } from "path";
import archiver from "archiver";
import { createWriteStream, existsSync } from "fs";

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

// Create a unique task directory
async function createTaskDirectory(taskId: number): Promise<string> {
  const baseDir = process.env.HOME || "/home/claude";
  const taskDir = join(baseDir, "tasks", `task-${taskId}-${Date.now()}`);
  await mkdir(taskDir, { recursive: true });
  return taskDir;
}

// Get all files in a directory recursively
async function getFilesRecursively(dir: string, baseDir: string = dir): Promise<string[]> {
  const files: string[] = [];
  try {
    const entries = await readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = join(dir, entry.name);
      if (entry.isDirectory()) {
        // Skip node_modules and hidden directories
        if (entry.name === "node_modules" || entry.name.startsWith(".")) continue;
        files.push(...await getFilesRecursively(fullPath, baseDir));
      } else {
        files.push(fullPath);
      }
    }
  } catch (e) {
    console.error(`Error reading directory ${dir}:`, e);
  }
  return files;
}

// Zip all files in a directory
async function zipDirectory(sourceDir: string, outputPath: string): Promise<boolean> {
  return new Promise(async (resolve) => {
    try {
      const files = await getFilesRecursively(sourceDir);

      if (files.length === 0) {
        console.log("No files to zip");
        resolve(false);
        return;
      }

      console.log(`Zipping ${files.length} files from ${sourceDir}`);

      const output = createWriteStream(outputPath);
      const archive = archiver("zip", { zlib: { level: 9 } });

      output.on("close", () => {
        console.log(`Created zip archive: ${outputPath} (${archive.pointer()} bytes)`);
        resolve(true);
      });

      archive.on("error", (err) => {
        console.error("Archiver error:", err);
        resolve(false);
      });

      archive.pipe(output);

      for (const file of files) {
        const relativePath = file.replace(sourceDir + "/", "");
        archive.file(file, { name: relativePath });
      }

      await archive.finalize();
    } catch (e) {
      console.error("Error zipping directory:", e);
      resolve(false);
    }
  });
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

// Execute Claude Code CLI with task using Bun.spawn
async function executeClaudeCode(
  task: string,
  maxMinutes: number,
  workingDir: string
): Promise<{ success: boolean; output: string; error?: string }> {
  const startTime = Date.now();
  const maxTimeMs = maxMinutes * 60 * 1000;

  const prompt = `You have a maximum of ${maxMinutes} minutes to complete this task. If you cannot finish, provide what you have accomplished so far.

IMPORTANT: Save all generated files and artifacts in the current working directory.

TASK:
${task}

Please proceed with the task now.`;

  console.log(`Starting Claude Code for task (max ${maxMinutes} min)...`);
  console.log(`Working directory: ${workingDir}`);

  const proc = Bun.spawn(["claude", "-p", prompt, "--output-format", "stream-json", "--verbose", "--no-session-persistence", "--allowedTools", "WebSearch,WebFetch,Read,Write,Edit,Bash,Glob,Grep"], {
    cwd: workingDir,
    env: { ...process.env },
    stdout: "pipe",
    stderr: "pipe",
  });

  console.log(`Claude process started with PID: ${proc.pid}`);

  let finalResult = "";
  let errorOutput = "";

  // Set timeout to kill if exceeded
  const timeoutId = setTimeout(() => {
    console.log(`\nTask exceeded time limit (${maxMinutes} min), terminating...`);
    proc.kill();
  }, maxTimeMs);

  // Process stdout
  const reader = proc.stdout.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || ""; // Keep incomplete line in buffer

      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const json = JSON.parse(line);

          if (json.type === 'system' && json.subtype === 'init') {
            console.log(`🚀 Session: ${json.session_id?.substring(0, 8)}... Model: ${json.model}`);
          }
          else if (json.type === 'assistant' && json.message?.content) {
            for (const block of json.message.content) {
              if (block.type === 'text') {
                console.log(`💬 ${block.text}`);
                finalResult += block.text;
              }
              if (block.type === 'tool_use') {
                console.log(`🔧 Tool: ${block.name}`);
              }
              if (block.type === 'thinking') {
                console.log(`💭 ${block.thinking.substring(0, 200)}...`);
              }
            }
          }
          else if (json.type === 'result') {
            console.log(`✅ Done! Cost: $${json.total_cost_usd?.toFixed(4)} Duration: ${(json.duration_ms / 1000).toFixed(1)}s`);
            if (json.result) finalResult = json.result;
          }
        } catch {
          console.log(line);
        }
      }
    }
  } catch (e) {
    console.error("Error reading stdout:", e);
  }

  // Process stderr
  const stderrText = await new Response(proc.stderr).text();
  if (stderrText.trim()) {
    errorOutput = stderrText;
    console.error("Stderr:", stderrText.substring(0, 200));
  }

  clearTimeout(timeoutId);
  const exitCode = await proc.exited;
  const elapsed = (Date.now() - startTime) / 1000 / 60;
  console.log(`\nClaude finished in ${elapsed.toFixed(2)} minutes with code ${exitCode}`);

  return {
    success: exitCode === 0,
    output: finalResult || "No output generated",
    error: errorOutput || undefined,
  };
}

// Send result email
async function sendResultEmail(
  workItem: WorkItem,
  result: { success: boolean; output: string; error?: string },
  attachmentPath?: string
): Promise<boolean> {
  try {
    const transporter = createTransporter();

    const subject = result.success
      ? `Your AI Task is Complete - WorkingDevsHero`
      : `AI Task Update - WorkingDevsHero`;

    const hasAttachment = attachmentPath && existsSync(attachmentPath);

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

      ${hasAttachment ? `
      <div class="task" style="border-left-color: #14f195;">
        <h3>📎 Attachments</h3>
        <p>Your generated files are attached as a ZIP archive. Extract to access all created artifacts.</p>
      </div>
      ` : ""}
    </div>
    <div class="footer">
      <p>Thank you for using WorkingDevsHero!</p>
      <p>Questions? Reply to this email.</p>
    </div>
  </div>
</body>
</html>
    `;

    const mailOptions: any = {
      from: `"WorkingDevsHero" <${EMAIL_FROM}>`,
      to: workItem.email,
      subject,
      html,
      text: `WorkingDevsHero - Task ${result.success ? "Completed" : "Update"}\n\nYour Task:\n${workItem.taskDescription}\n\nResult:\n${result.output}\n\n${result.error ? `Errors: ${result.error}` : ""}${hasAttachment ? "\n\nNote: Generated files are attached as a ZIP archive." : ""}`,
    };

    if (hasAttachment) {
      mailOptions.attachments = [
        {
          filename: `task-${workItem.id}-artifacts.zip`,
          path: attachmentPath,
        },
      ];
      console.log(`Attaching zip file: ${attachmentPath}`);
    }

    await transporter.sendMail(mailOptions);

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

  // Create a unique task directory
  const taskDir = await createTaskDirectory(workItem.id);
  console.log(`Created task directory: ${taskDir}`);

  // Execute Claude Code in the task directory
  const result = await executeClaudeCode(workItem.taskDescription, workItem.maxMinutes, taskDir);

  // Zip any created artifacts
  let zipPath: string | undefined;
  const files = await getFilesRecursively(taskDir);
  if (files.length > 0) {
    zipPath = join(taskDir, `task-${workItem.id}-artifacts.zip`);
    const zipped = await zipDirectory(taskDir, zipPath);
    if (!zipped) {
      zipPath = undefined;
    }
  } else {
    console.log("No artifacts created in task directory");
  }

  // Report completion
  const completeResult = await apiRequest("POST", `/api/worker/complete/${workItem.id}`, {
    success: result.success,
    output: result.output,
    error: result.error,
  });

  if (!completeResult.ok) {
    console.error(`Failed to report completion for task #${workItem.id}:`, completeResult.data);
  }

  // Send email notification with artifacts attached
  const emailSent = await sendResultEmail(workItem, result, zipPath);
  if (!emailSent) {
    console.error(`Failed to send email for work item #${workItem.id}`);
  }

  console.log(`\nWork item #${workItem.id} ${result.success ? "completed" : "failed"}`);
  if (zipPath) {
    console.log(`Artifacts attached: ${zipPath}`);
  }
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
