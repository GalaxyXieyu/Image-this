#!/usr/bin/env node
/**
 * Smoke test for Phase 4 toolbox tasks.
 *
 * Requires:
 * - Dev server running on http://localhost:34123
 * - Valid NextAuth session cookies in /tmp/smoke_cookies.txt
 * - User has provider credentials configured
 */

import { spawn } from "node:child_process";

const BASE = "http://localhost:34123";
const COOKIE_FILE = "/tmp/smoke_cookies.txt";

const toolTypes = [
  {
    name: "background_replace",
    legacyType: "BACKGROUND_REMOVAL",
    params: {
      prompt: "clean white background, ecommerce product photography, studio lighting",
      aiModel: "gemini",
      outputResolution: "1024x1024",
    },
  },
  {
    name: "watermark",
    legacyType: "WATERMARK",
    params: {
      watermarkType: "text",
      watermarkText: "SMOKE TEST",
      watermarkOpacity: 0.3,
      watermarkPosition: "bottom-right",
      outputResolution: "1024x1024",
    },
  },
  {
    name: "upscale",
    legacyType: "IMAGE_UPSCALING",
    params: {
      upscaleFactor: 2,
      aiModel: "volcengine",
      outputResolution: "2x",
    },
  },
  {
    name: "outpaint",
    legacyType: "IMAGE_EXPANSION",
    params: {
      xScale: 1.5,
      yScale: 1.5,
      prompt: "naturally extend the scene edges, keep subject stable",
      aiModel: "volcengine",
      outputResolution: "1024x1024",
    },
  },
];

function curl(args, expectJson = true) {
  return new Promise((resolve, reject) => {
    const cmd = ["curl", "-s", "-S", "-c", COOKIE_FILE, "-b", COOKIE_FILE, ...args];
    const proc = spawn(cmd[0], cmd.slice(1));
    let stdout = "";
    let stderr = "";
    proc.stdout.on("data", (d) => (stdout += d.toString()));
    proc.stderr.on("data", (d) => (stderr += d.toString()));
    proc.on("close", (code) => {
      if (code !== 0) {
        return reject(new Error(`curl failed (${code}): ${stderr || stdout}`));
      }
      if (expectJson) {
        try {
          return resolve(JSON.parse(stdout));
        } catch {
          return resolve({ raw: stdout });
        }
      }
      resolve(stdout);
    });
  });
}

const inputAsset = {
  assetId: "asset-1780740048244-gv6y613t",
  filePath: "/Volumes/DATABASE/code/business/Image-this/public/uploads/input-assets/asset-1780740048244-gv6y613t-01-homepage.png",
  clientUrl: "/api/files/input-assets/asset-1780740048244-gv6y613t-01-homepage.png",
  originalFilename: "01-homepage.png",
  mimeType: "image/png",
  sizeBytes: 744504,
};

async function createTask(tool) {
  const inputData = JSON.stringify({
    workflowType: tool.name,
    inputAsset,
    ...tool.params,
    toolDraft: {
      toolType: tool.name,
      inputAssets: [inputAsset],
      parameters: tool.params,
      batchMode: false,
    },
  });

  return curl([
    "-X", "POST",
    "-H", "Content-Type: application/json",
    "-d", JSON.stringify({
      type: tool.legacyType,
      inputData,
      priority: 2,
      totalSteps: 1,
    }),
    `${BASE}/api/tasks`,
  ]);
}

async function triggerWorker() {
  return curl([
    "-X", "POST",
    "-H", "Content-Type: application/json",
    "-d", JSON.stringify({ batch: true }),
    `${BASE}/api/tasks/worker`,
  ]);
}

async function getStatus(id) {
  return curl(["-X", "GET", `${BASE}/api/tasks/status?ids=${id}`]);
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function run() {
  console.log("=== Smoke test for toolbox tasks ===");
  console.log("Creating tasks...\n");

  const tasks = [];
  for (const tool of toolTypes) {
    try {
      const result = await createTask(tool);
      if (!result?.task?.id) {
        console.error(`[${tool.name}] CREATE FAILED:`, JSON.stringify(result));
        continue;
      }
      tasks.push({ tool, taskId: result.task.id });
      console.log(`[${tool.name}] created task ${result.task.id}`);
    } catch (err) {
      console.error(`[${tool.name}] CREATE ERROR:`, err.message);
    }
  }

  if (tasks.length === 0) {
    console.error("No tasks created. Aborting.");
    process.exit(1);
  }

  console.log("\nTriggering worker...");
  for (let i = 0; i < 3; i++) {
    try {
      const workerResult = await triggerWorker();
      console.log(`worker run ${i + 1}:`, JSON.stringify(workerResult).slice(0, 240));
    } catch (err) {
      console.error(`worker run ${i + 1} error:`, err.message);
    }
    await sleep(2000);
  }

  console.log("\nPolling status (max 180s)...");
  const start = Date.now();
  const pending = new Set(tasks.map((t) => t.taskId));
  const results = new Map();
  let pollRound = 0;

  while (pending.size > 0 && Date.now() - start < 180000) {
    for (const taskId of Array.from(pending)) {
      try {
        const status = await getStatus(taskId);
        const task = Array.isArray(status?.tasks) ? status.tasks[0] : status;
        if (!task) continue;

        if (task.status === "completed" || task.status === "failed" || task.status === "cancelled") {
          pending.delete(taskId);
          results.set(taskId, task);
          const toolName = tasks.find((t) => t.taskId === taskId)?.tool?.name;
          console.log(
            `[${toolName}] ${task.status} resultUrl=${task.resultImageUrl || "n/a"} error=${task.errorMessage || "n/a"}`
          );
        }
      } catch {
        // ignore polling errors
      }
    }
    if (pending.size > 0) {
      await sleep(4000);
      pollRound++;
      // 持续触发 worker 以处理串行队列中的后续任务（并发限制为 1 时）
      if (pollRound % 3 === 0) {
        try {
          const workerResult = await triggerWorker();
          console.log(`worker re-trigger (round ${pollRound}):`, JSON.stringify(workerResult).slice(0, 240));
        } catch (err) {
          // ignore trigger errors
        }
      }
    }
  }

  console.log("\n=== Summary ===");
  for (const { tool, taskId } of tasks) {
    const task = results.get(taskId);
    if (!task) {
      console.log(`${tool.name}: TIMEOUT / still pending`);
    } else if (task.status === "completed" && task.resultImageUrl) {
      console.log(`${tool.name}: OK ${task.resultImageUrl}`);
    } else {
      console.log(`${tool.name}: ${task.status} ${task.errorMessage || ""}`);
    }
  }
}

run().catch((err) => {
  console.error("Smoke test failed:", err);
  process.exit(1);
});