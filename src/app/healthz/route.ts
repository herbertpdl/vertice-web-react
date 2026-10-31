// Liveness for the load balancer and the container health check: the server is up and serving.
// Calls nothing upstream, so a BFF outage doesn't take the web out of the target group.
export function GET() {
  return Response.json({ status: "ok" });
}
