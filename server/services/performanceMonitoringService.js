const { performance } = require("perf_hooks");

const SLOW_REQUEST_THRESHOLD_MS = 1000;
const MAX_SAMPLES = 200;
const MAX_ENDPOINTS = 100;

const startedAt = Date.now();

const totals = {
    requests: 0,
    clientErrors: 0,
    serverErrors: 0,
    slowRequests: 0,
    totalDurationMs: 0,
    maxDurationMs: 0,
    samples: [],
    statusCodes: {}
};

const endpoints = new Map();

const addSample = (samples, duration) => {
    samples.push(duration);

    if (samples.length > MAX_SAMPLES) {
        samples.shift();
    }
};

const percentile = (samples, value) => {
    if (!samples.length) return 0;

    const sorted = [...samples].sort((a, b) => a - b);
    const index = Math.min(
        sorted.length - 1,
        Math.ceil(value * sorted.length) - 1
    );

    return Math.round(sorted[index] * 100) / 100;
};

const getEndpointName = (req) => {
    const routePath = req.route?.path;

    if (!routePath) {
        return "unmatched";
    }

    const basePath = req.baseUrl || "";
    const route = Array.isArray(routePath)
        ? routePath[0]
        : routePath;

    return `${basePath}${route}` || "/";
};

const recordRequest = (req, res, durationMs) => {
    const statusCode = res.statusCode;
    const method = req.method;
    const route = getEndpointName(req);
    const key = `${method} ${route}`;

    totals.requests += 1;
    totals.totalDurationMs += durationMs;
    totals.maxDurationMs = Math.max(
        totals.maxDurationMs,
        durationMs
    );

    addSample(totals.samples, durationMs);

    if (statusCode >= 400 && statusCode < 500) {
        totals.clientErrors += 1;
    }

    if (statusCode >= 500) {
        totals.serverErrors += 1;
    }

    if (durationMs >= SLOW_REQUEST_THRESHOLD_MS) {
        totals.slowRequests += 1;
    }

    const statusKey = String(statusCode);
    totals.statusCodes[statusKey] =
        (totals.statusCodes[statusKey] || 0) + 1;

    let endpoint = endpoints.get(key);

    if (!endpoint) {
        if (endpoints.size >= MAX_ENDPOINTS) {
            const oldestKey = endpoints.keys().next().value;
            endpoints.delete(oldestKey);
        }

        endpoint = {
            method,
            route,
            requests: 0,
            clientErrors: 0,
            serverErrors: 0,
            slowRequests: 0,
            totalDurationMs: 0,
            maxDurationMs: 0,
            samples: []
        };

        endpoints.set(key, endpoint);
    }

    endpoint.requests += 1;
    endpoint.totalDurationMs += durationMs;
    endpoint.maxDurationMs = Math.max(
        endpoint.maxDurationMs,
        durationMs
    );

    addSample(endpoint.samples, durationMs);

    if (statusCode >= 400 && statusCode < 500) {
        endpoint.clientErrors += 1;
    }

    if (statusCode >= 500) {
        endpoint.serverErrors += 1;
    }

    if (durationMs >= SLOW_REQUEST_THRESHOLD_MS) {
        endpoint.slowRequests += 1;
    }
};

const performanceMonitoringMiddleware = (req, res, next) => {
    const start = performance.now();

    res.once("finish", () => {
        const durationMs = Math.max(
            0,
            Math.round((performance.now() - start) * 100) / 100
        );

        recordRequest(req, res, durationMs);
    });

    next();
};

const getPerformanceSnapshot = () => {
    const endpointReports = Array.from(endpoints.values())
        .map((endpoint) => ({
            method: endpoint.method,
            route: endpoint.route,
            requests: endpoint.requests,
            clientErrors: endpoint.clientErrors,
            serverErrors: endpoint.serverErrors,
            slowRequests: endpoint.slowRequests,
            averageResponseTimeMs: Number(
                (
                    endpoint.totalDurationMs /
                    endpoint.requests
                ).toFixed(2)
            ),
            p95ResponseTimeMs: percentile(
                endpoint.samples,
                0.95
            ),
            maxResponseTimeMs: endpoint.maxDurationMs
        }))
        .sort((a, b) => b.requests - a.requests);

    const memory = process.memoryUsage();

    return {
        generatedAt: new Date().toISOString(),
        period: "Since last server restart",
        uptimeSeconds: Math.floor(process.uptime()),
        uptimeStartedAt: new Date(startedAt).toISOString(),
        requests: totals.requests,
        clientErrors: totals.clientErrors,
        serverErrors: totals.serverErrors,
        slowRequests: totals.slowRequests,
        averageResponseTimeMs: totals.requests
            ? Number(
                (
                    totals.totalDurationMs /
                    totals.requests
                ).toFixed(2)
            )
            : 0,
        p95ResponseTimeMs: percentile(
            totals.samples,
            0.95
        ),
        maxResponseTimeMs: totals.maxDurationMs,
        slowRequestThresholdMs: SLOW_REQUEST_THRESHOLD_MS,
        statusCodes: { ...totals.statusCodes },
        memory: {
            heapUsedMb: Number(
                (memory.heapUsed / 1024 / 1024).toFixed(2)
            ),
            heapTotalMb: Number(
                (memory.heapTotal / 1024 / 1024).toFixed(2)
            ),
            rssMb: Number(
                (memory.rss / 1024 / 1024).toFixed(2)
            )
        },
        endpoints: endpointReports
    };
};

module.exports = {
    performanceMonitoringMiddleware,
    getPerformanceSnapshot
};
