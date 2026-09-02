#!/usr/bin/env node
// Runs `next dev` and opens the local dev URL in the default browser once
// the server reports it's ready, so `npm run dev` opens itself.
const { spawn } = require("node:child_process");

const args = process.argv.slice(2);
const child = spawn("next", ["dev", ...args], {
  stdio: ["inherit", "pipe", "inherit"],
  shell: process.platform === "win32",
});

let opened = false;
const localUrlPattern = /Local:\s+(https?:\/\/\S+)/;

child.stdout.on("data", (chunk) => {
  process.stdout.write(chunk);
  if (opened) return;
  const match = chunk.toString().match(localUrlPattern);
  if (match) {
    opened = true;
    openBrowser(match[1]);
  }
});

function openBrowser(url) {
  const platform = process.platform;
  const [cmd, cmdArgs] =
    platform === "darwin"
      ? ["open", [url]]
      : platform === "win32"
        ? ["cmd", ["/c", "start", '""', url]]
        : ["xdg-open", [url]];
  spawn(cmd, cmdArgs, { stdio: "ignore", detached: true }).unref();
}

child.on("exit", (code) => process.exit(code ?? 0));
