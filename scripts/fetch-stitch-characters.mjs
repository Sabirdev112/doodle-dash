#!/usr/bin/env node
/**
 * Pull character PNGs from a Google Stitch project via MCP API.
 * Reads STITCH_API_KEY from env or ~/.cursor/mcp.json
 */

import fs from "node:fs/promises";
import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const OUT_DIR = path.join(ROOT, "public/avatars/characters");
const PROJECT_ID = process.argv[2] ?? "10430182249522217870";
const MCP_URL = "https://stitch.googleapis.com/mcp";

const CHARACTER_IDS = [
  "beep",
  "whiskers",
  "zorg",
  "chaos",
  "explorer",
  "cool-cat",
  "sprout",
  "rocker",
  "intern",
  "diva",
];

function resolveApiKey() {
  if (process.env.STITCH_API_KEY) return process.env.STITCH_API_KEY;
  try {
    const mcpPath = path.join(homedir(), ".cursor", "mcp.json");
    const raw = readFileSync(mcpPath, "utf8");
    const key = JSON.parse(raw)?.mcpServers?.stitch?.headers?.["X-Goog-Api-Key"];
    if (key) return key;
  } catch {
    /* ignore */
  }
  return null;
}

async function callTool(apiKey, name, args) {
  const res = await fetch(MCP_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json, text/event-stream",
      "X-Goog-Api-Key": apiKey,
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "tools/call",
      params: { name, arguments: args },
    }),
  });

  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(`Invalid MCP response: ${text.slice(0, 200)}`);
  }

  if (json.error) {
    throw new Error(JSON.stringify(json.error));
  }

  return json.result?.structuredContent ?? json.result;
}

function matchCharacterId(title, index) {
  const text = String(title).toLowerCase();

  const rules = [
    { needles: ["surprised robot", "sleek metallic", "robot"], id: "beep" },
    { needles: ["grumpy cat", "tuxedo", "bowtie"], id: "whiskers" },
    { needles: ["three-eyed alien", "spotted skin", "mischievous grin"], id: "zorg" },
    { needles: ["wild-haired professor", "lab coat", "bushy white"], id: "chaos" },
    { needles: ["adventurous girl", "green backpack"], id: "explorer" },
    { needles: ["diva bird", "feathered boa", "flamboyant", "red feathers"], id: "diva" },
    { needles: ["skater cat", "backward baseball"], id: "cool-cat" },
    { needles: ["anxious plant", "terracotta pot"], id: "sprout" },
    { needles: ["rocker octopus", "mohawk", "studded collar"], id: "rocker" },
    { needles: ["wizard intern", "purple robe"], id: "intern" },
  ];

  for (const rule of rules) {
    if (rule.needles.some((needle) => text.includes(needle))) {
      return rule.id;
    }
  }

  return CHARACTER_IDS[index] ?? `character-${index + 1}`;
}

async function downloadImage(url, destination) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Download failed ${response.status}: ${url}`);
  }
  const buffer = Buffer.from(await response.arrayBuffer());
  await fs.writeFile(destination, buffer);
}

async function main() {
  const apiKey = resolveApiKey();
  if (!apiKey) {
    throw new Error("Missing Stitch API key in STITCH_API_KEY or ~/.cursor/mcp.json");
  }

  await fs.mkdir(OUT_DIR, { recursive: true });

  const listResult = await callTool(apiKey, "list_screens", {
    projectId: PROJECT_ID,
  });

  const screens = listResult?.screens ?? [];
  if (screens.length === 0) {
    throw new Error(`No screens in Stitch project ${PROJECT_ID}`);
  }

  console.log(`Found ${screens.length} screens`);

  const assigned = new Set();

  for (const [index, screen] of screens.entries()) {
    const screenId = String(screen.name ?? "").split("/").pop();
    const title = screen.title ?? `screen-${index + 1}`;
    const characterId = matchCharacterId(title, index);

    if (assigned.has(characterId)) {
      console.warn(`Duplicate mapping for ${characterId}: ${title}`);
      continue;
    }
    assigned.add(characterId);

    let imageUrl =
      screen.screenshot?.downloadUrl ??
      screen.image?.downloadUrl ??
      screen.imageUrl;

    if (!imageUrl && screenId) {
      const detail = await callTool(apiKey, "get_screen", {
        projectId: PROJECT_ID,
        screenId,
      });
      imageUrl =
        detail?.screen?.screenshot?.downloadUrl ??
        detail?.screenshot?.downloadUrl ??
        detail?.image?.downloadUrl;
    }

    if (!imageUrl) {
      console.warn(`Skip ${title}: no screenshot URL`);
      continue;
    }

    const rawPath = path.join(OUT_DIR, `${characterId}.raw.png`);
    await downloadImage(imageUrl, rawPath);
    console.log(`${title} -> ${characterId}.raw.png`);
  }

  console.log("\nRun: python scripts/clean-character-pngs.py");
}

main().catch((error) => {
  console.error(error.message ?? error);
  process.exit(1);
});
