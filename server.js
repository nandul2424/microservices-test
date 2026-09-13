// Simple Express frontend that serves a page with two buttons (Auth, Payment)
// and proxies those button clicks server-side to the backend Kubernetes
// Services. The browser can NOT reach cluster DNS names like "backend-auth"
// directly, so this pod does the forwarding on the browser's behalf using the
// BACKEND_*_URL environment variables injected by the Deployment manifest.

const express = require("express");
const path = require("path");

const app = express();

const PORT = process.env.PORT || 8080;
// These default to the in-cluster Service DNS names. In Kubernetes they are
// overridden by the env vars set in frontend.yaml.
const BACKEND_AUTH_URL = process.env.BACKEND_AUTH_URL || "http://backend-auth:3000";
const BACKEND_PAYMENT_URL = process.env.BACKEND_PAYMENT_URL || "http://backend-payment:5000";

app.use(express.static(path.join(__dirname, "public")));

// Server-side proxy: called from the browser, runs inside the pod where the
// cluster DNS names resolve, forwards to the backend, returns the result.
async function proxy(res, targetUrl, label) {
  try {
    const upstream = await fetch(targetUrl, { signal: AbortSignal.timeout(5000) });
    const body = await upstream.text();
    res.status(200).json({
      service: label,
      target: targetUrl,
      upstreamStatus: upstream.status,
      body: body,
    });
  } catch (err) {
    res.status(502).json({
      service: label,
      target: targetUrl,
      error: err.message,
    });
  }
}

app.get("/api/auth", (req, res) => proxy(res, BACKEND_AUTH_URL, "auth"));
app.get("/api/payment", (req, res) => proxy(res, BACKEND_PAYMENT_URL, "payment"));

// Liveness/readiness endpoint used by the Kubernetes probes.
app.get("/healthz", (req, res) => res.json({ status: "ok" }));

app.listen(PORT, () => {
  console.log(`Frontend listening on port ${PORT}`);
  console.log(`  auth    -> ${BACKEND_AUTH_URL}`);
  console.log(`  payment -> ${BACKEND_PAYMENT_URL}`);
});
