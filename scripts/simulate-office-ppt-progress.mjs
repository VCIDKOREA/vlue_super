#!/usr/bin/env node
/**
 * PC 웹 AI PPT 빌더 → mock-progress 시뮬레이터
 *
 *   node scripts/simulate-office-ppt-progress.mjs --token <ACCESS_TOKEN>
 *   node scripts/simulate-office-ppt-progress.mjs --user <UUID>   # X-VLUE-User-Id
 */
const args = process.argv.slice(2);
function arg(name, fallback = "") {
  const i = args.indexOf(name);
  return i >= 0 ? String(args[i + 1] || "").trim() : fallback;
}

const apiBase = (process.env.VLUE_API_URL || "http://localhost:8788").replace(/\/$/, "");
const token = arg("--token", process.env.VLUE_ACCESS_TOKEN || "");
const userId = arg("--user", process.env.VLUE_TEST_USER_ID || "");
const title = arg("--title", "VLUE AI PPT 데모");

const headers = { "Content-Type": "application/json" };
if (token) headers.Authorization = `Bearer ${token}`;
else if (userId) headers["X-VLUE-User-Id"] = userId;
else {
  console.error("필수: --token 또는 --user");
  process.exit(1);
}

const url = `${apiBase}/api/office/ppt-tasks/mock-progress`;
let taskId = "";

for (const progress of [0, 25, 50, 75, 100]) {
  const status = progress >= 100 ? "COMPLETED" : progress > 0 ? "PROCESSING" : "PENDING";
  const res = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify({ taskId: taskId || undefined, projectTitle: title, progress, status })
  });
  const data = await res.json().catch(() => ({}));
  console.log(`progress=${progress} status=${res.status}`, data.task || data);
  if (!res.ok) process.exit(1);
  taskId = data.task?.id || taskId;
  await new Promise((r) => setTimeout(r, 500));
}

console.log("\ncurl 예시:");
console.log(`curl -X POST "${url}" \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer <TOKEN>" \\
  -d '{"projectTitle":"${title}","progress":100,"status":"COMPLETED"}'`);
