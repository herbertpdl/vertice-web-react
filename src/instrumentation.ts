// Runs once when a Next server instance starts, before it handles requests.
export async function register() {
  // The BFF calls run in the Node.js runtime. Skip `next build`, which may load this file too:
  // the deploy environment, not the build machine, sets TRUSTED_PROXY_HOPS.
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (process.env.NEXT_PHASE === "phase-production-build") return;
  const { checkBootConfig } = await import("./lib/bootChecks");
  checkBootConfig();
}
