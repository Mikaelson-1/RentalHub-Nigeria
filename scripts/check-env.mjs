#!/usr/bin/env node

import fs from "fs";
import path from "path";

const cwd = process.cwd();
const envPath = path.join(cwd, ".env");

if (fs.existsSync(envPath)) {
  const fileContent = fs.readFileSync(envPath, "utf8");
  for (const line of fileContent.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const equalIndex = trimmed.indexOf("=");
    if (equalIndex === -1) continue;
    const key = trimmed.slice(0, equalIndex).trim();
    const rawValue = trimmed.slice(equalIndex + 1).trim();
    if (!key || process.env[key]) continue;
    const cleaned = rawValue.replace(/^['"]|['"]$/g, "");
    process.env[key] = cleaned;
  }
}

const requiredVars = ["DATABASE_URL", "NEXTAUTH_SECRET", "NEXTAUTH_URL"];
const missingVars = requiredVars.filter((name) => !process.env[name] || !process.env[name].trim());

if (missingVars.length > 0) {
  console.error(
    `Missing required environment variables: ${missingVars.join(", ")}\n` +
      "Check your .env file or deployment environment.",
  );
  process.exit(1);
}

console.log(`Environment check passed (${requiredVars.length} required variables present).`);
