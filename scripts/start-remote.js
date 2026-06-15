#!/usr/bin/env node
/**
 * Távolról tesztelés: saját ngrok fiók + token (megbízhatóbb, mint az Expo exp.direct tunnel).
 *
 * 1. Regisztráció: https://ngrok.com → Your Authtoken
 * 2. .env: NGROK_AUTHTOKEN=...
 * 3. npm run start:remote
 */
const { spawn } = require("child_process");
const path = require("path");

require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const ngrok = require("@expo/ngrok");
const PORT = Number(process.env.EXPO_PORT || 8081);

async function main() {
  const authtoken = process.env.NGROK_AUTHTOKEN?.trim();
  if (!authtoken) {
    console.error(
      "\n[PickIt] Hiányzik a NGROK_AUTHTOKEN a .env fájlból.\n" +
        "  1. Regisztrálj: https://ngrok.com\n" +
        "  2. Másold be: Your Authtoken → .env\n" +
        "  3. npm run start:remote\n"
    );
    process.exit(1);
  }

  let expo;
  let tunnelUrl;

  const shutdown = async (code = 0) => {
    try {
      await ngrok.disconnect();
      await ngrok.kill();
    } catch {
      /* már leállt */
    }
    if (expo && !expo.killed) expo.kill("SIGTERM");
    process.exit(code);
  };

  process.on("SIGINT", () => void shutdown(0));
  process.on("SIGTERM", () => void shutdown(0));

  console.log("\n[PickIt] ngrok tunnel indítása (eu)…");
  try {
    tunnelUrl = await ngrok.connect({
      addr: PORT,
      authtoken,
      region: process.env.NGROK_REGION || "eu",
    });
  } catch (err) {
    console.error("\n[PickIt] ngrok hiba:", err.message || err);
    console.error("Ellenőrizd a tokent, és kapcsold ki a VPN-t.\n");
    process.exit(1);
  }

  const hostname = new URL(tunnelUrl).hostname;
  console.log("[PickIt] Tunnel URL:", tunnelUrl);
  console.log("[PickIt] Expo csomagoló host:", hostname, "\n");

  expo = spawn(
    "npx",
    ["expo", "start", "--port", String(PORT), "--lan"],
    {
      cwd: path.join(__dirname, ".."),
      stdio: "inherit",
      shell: true,
      env: {
        ...process.env,
        REACT_NATIVE_PACKAGER_HOSTNAME: hostname,
      },
    }
  );

  expo.on("exit", (code) => void shutdown(code ?? 0));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
