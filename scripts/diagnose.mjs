// Standalone diagnostics for chat/message loading failures.
// Runs whatsapp-web.js directly (no Ink, no bundling, no timeouts
// swallowing details) and prints the RAW error for each step.
// Usage: node scripts/diagnose.mjs
// Reuses the saved session in ~/.whatsapp-cli/auth (or WHATSAPP_CLI_DIR).
import pkg from "whatsapp-web.js";
const { Client, LocalAuth } = pkg;
import qrcode from "qrcode-terminal";
import os from "os";
import path from "path";
import { readFile } from "fs/promises";
import util from "util";

const root =
  process.env.WHATSAPP_CLI_DIR || path.join(os.homedir(), ".whatsapp-cli");
const authPath = path.join(root, "auth");

function printError(label, err) {
  console.log(`--- ${label} FAILED ---`);
  console.log("typeof:", typeof err);
  try {
    console.log("constructor:", err?.constructor?.name);
  } catch {
    console.log("constructor: <unreadable>");
  }
  console.log("name:", err?.name);
  console.log("message:", JSON.stringify(err?.message));
  console.log("stack:", err?.stack);
  console.log("full:", util.inspect(err, { depth: 6 }).slice(0, 3000));
}

function withTimeout(promise, ms, label) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(
        () => reject(new Error(`DIAGNOSE_TIMEOUT: ${label} after ${ms}ms`)),
        ms,
      ),
    ),
  ]);
}

const puppeteer = {
  headless: true,
  args: [
    "--no-sandbox",
    "--disable-setuid-sandbox",
    "--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36",
    "--disable-blink-features=AutomationControlled",
  ],
};
if (process.env.PUPPETEER_EXECUTABLE_PATH) {
  puppeteer.executablePath = process.env.PUPPETEER_EXECUTABLE_PATH;
}

const client = new Client({
  authStrategy: new LocalAuth({ dataPath: authPath }),
  puppeteer,
});

client.on("qr", qr => {
  console.log("QR received (scan if session expired):");
  qrcode.generate(qr, { small: true });
});

client.on("authenticated", () => console.log("EVENT: authenticated"));
client.on("auth_failure", msg => {
  console.log("EVENT: auth_failure:", msg);
  process.exit(2);
});
client.on("disconnected", reason =>
  console.log("EVENT: disconnected:", reason),
);

client.on("ready", async () => {
  console.log("EVENT: ready");
  let failed = false;

  // Step 0: granular in-page probes to isolate the "r" thrower.
  // Each probe catches INSIDE the page and returns the real message.
  const probe = async (label, pageFn) => {
    try {
      const res = await client.pupPage.evaluate(pageFn);
      console.log(`PROBE ${label}:`, JSON.stringify(res)?.slice(0, 500));
    } catch (err) {
      console.log(
        `PROBE ${label} THREW (transport):`,
        JSON.stringify(err?.message)?.slice(0, 500),
      );
    }
  };
  await probe("typeof WWebJS", () => typeof window.WWebJS);
  await probe("WWebJS keys", () => Object.keys(window.WWebJS || {}));
  await probe("typeof require", () => typeof window.require);
  await probe("WAWebCollections", () => {
    try {
      const c = window.require("WAWebCollections");
      return (
        "ok keys=" +
        Object.keys(c || {})
          .slice(0, 8)
          .join(",")
      );
    } catch (e) {
      return "THREW-IN-PAGE: " + String((e && e.message) || e).slice(0, 300);
    }
  });
  await probe("Chat.getModelsArray len", () => {
    try {
      return window.require("WAWebCollections").Chat.getModelsArray().length;
    } catch (e) {
      return "THREW-IN-PAGE: " + String((e && e.message) || e).slice(0, 300);
    }
  });
  await probe("raw getChats", () =>
    window.WWebJS.getChats()
      .then(c => "ok len=" + c.length)
      .catch(
        e => "THREW-IN-PAGE: " + String((e && e.message) || e).slice(0, 300),
      ),
  );
  await probe("serialize first chat", () => {
    try {
      const arr = window.require("WAWebCollections").Chat.getModelsArray();
      if (!arr.length) return "no chats in collection";
      const m = arr[0].serialize();
      return "ok id=" + m.id?._serialized;
    } catch (e) {
      return "THREW-IN-PAGE: " + String((e && e.message) || e).slice(0, 300);
    }
  });
  await probe("getChatModel first chat", () =>
    window.WWebJS.getChatModel(
      window.require("WAWebCollections").Chat.getModelsArray()[0],
    )
      .then(m => "ok id=" + m?.id?._serialized)
      .catch(
        e => "THREW-IN-PAGE: " + String((e && e.message) || e).slice(0, 300),
      ),
  );
  await probe("WAWebWidFactory", () => {
    try {
      window.require("WAWebWidFactory");
      return "ok";
    } catch (e) {
      return "THREW-IN-PAGE: " + String((e && e.message) || e).slice(0, 300);
    }
  });

  // Step 1: getChats
  let chats;
  try {
    chats = await withTimeout(client.getChats(), 30000, "getChats");
    console.log(`OK getChats: count=${chats.length}`);
    for (const c of chats.slice(0, 3)) {
      console.log(
        `  - id=${c.id?._serialized} name=${c.name} ts=${c.timestamp} ctor=${c.constructor?.name}`,
      );
    }
  } catch (err) {
    failed = true;
    printError("getChats", err);
  }

  // Step 2: getChatById on the first live chat id
  if (chats && chats.length > 0) {
    const id = chats[0].id._serialized;
    try {
      const chat = await withTimeout(
        client.getChatById(id),
        20000,
        "getChatById(live)",
      );
      console.log(
        `OK getChatById(live ${id}):`,
        chat ? `ctor=${chat.constructor?.name}` : "UNDEFINED (not found)",
      );
      if (chat) {
        try {
          const msgs = await withTimeout(
            chat.fetchMessages({ limit: 5 }),
            20000,
            "fetchMessages",
          );
          console.log(
            `OK fetchMessages: count=${msgs.length} first=${JSON.stringify(msgs[0]?.body?.slice(0, 80))}`,
          );
        } catch (err) {
          failed = true;
          printError("fetchMessages", err);
        }
      }
    } catch (err) {
      failed = true;
      printError("getChatById(live)", err);
    }
  }

  // Step 3: getChatById on the first CACHED id (stale-id theory)
  try {
    const raw = await readFile(path.join(root, "chat-history.json"), "utf-8");
    const cachedId = JSON.parse(raw)?.chats?.[0]?.id;
    if (cachedId) {
      try {
        const chat = await withTimeout(
          client.getChatById(cachedId),
          20000,
          "getChatById(cached)",
        );
        console.log(
          `OK getChatById(cached ${cachedId}):`,
          chat ? `ctor=${chat.constructor?.name}` : "UNDEFINED (not found)",
        );
      } catch (err) {
        failed = true;
        printError("getChatById(cached)", err);
      }
    } else {
      console.log("SKIP cached-id check: no chats in chat-history.json");
    }
  } catch (err) {
    console.log(
      "SKIP cached-id check: cannot read chat-history.json:",
      err?.message,
    );
  }

  await client.destroy().catch(() => {});
  process.exit(failed ? 1 : 0);
});

console.log(`Using auth dir: ${authPath}`);
try {
  await client.initialize();
} catch (err) {
  printError("initialize", err);
  await client.destroy().catch(() => {});
  process.exit(1);
}
