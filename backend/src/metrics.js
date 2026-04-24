// Lightweight Prometheus metrics — no extra dependencies.
// Exposes counters for HTTP requests and a histogram for request duration.

const counters = new Map();
const histograms = new Map();
const histogramBuckets = [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10];

function labelKey(labels) {
  return Object.entries(labels)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}="${v}"`)
    .join(",");
}

function incCounter(name, labels = {}, value = 1) {
  const key = `${name}{${labelKey(labels)}}`;
  counters.set(key, (counters.get(key) || 0) + value);
}

function observeHistogram(name, labels = {}, value) {
  const key = `${name}{${labelKey(labels)}}`;
  let h = histograms.get(key);
  if (!h) {
    h = { buckets: histogramBuckets.map(() => 0), sum: 0, count: 0 };
    histograms.set(key, h);
  }
  histogramBuckets.forEach((b, i) => { if (value <= b) h.buckets[i] += 1; });
  h.sum += value;
  h.count += 1;
}

// Express middleware: counts requests + records duration
function metricsMiddleware(req, res, next) {
  const start = process.hrtime.bigint();
  res.on("finish", () => {
    const route = req.route?.path || req.path;
    const labels = { method: req.method, route, status: String(res.statusCode) };
    const durationSec = Number(process.hrtime.bigint() - start) / 1e9;
    incCounter("http_requests_total", labels);
    observeHistogram("http_request_duration_seconds", labels, durationSec);
  });
  next();
}

// Prometheus text exposition format
function renderMetrics() {
  const lines = [];

  lines.push("# HELP http_requests_total Total HTTP requests");
  lines.push("# TYPE http_requests_total counter");
  for (const [key, value] of counters) lines.push(`${key} ${value}`);

  lines.push("# HELP http_request_duration_seconds HTTP request latency in seconds");
  lines.push("# TYPE http_request_duration_seconds histogram");
  for (const [key, h] of histograms) {
    const base = key.slice(0, -1); // strip trailing "}"
    const sep = base.endsWith("{") ? "" : ",";
    histogramBuckets.forEach((b, i) => {
      lines.push(`http_request_duration_seconds_bucket${base}${sep}le="${b}"} ${h.buckets[i]}`);
    });
    lines.push(`http_request_duration_seconds_bucket${base}${sep}le="+Inf"} ${h.count}`);
    lines.push(`http_request_duration_seconds_sum${key.slice("http_request_duration_seconds".length)} ${h.sum}`);
    lines.push(`http_request_duration_seconds_count${key.slice("http_request_duration_seconds".length)} ${h.count}`);
  }

  return lines.join("\n") + "\n";
}

module.exports = { metricsMiddleware, renderMetrics };
