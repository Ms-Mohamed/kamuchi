const http = require('http');

async function runTests() {
    console.log("Starting Backend API Tests...\n");
    let token = '';

    // 1. Test Login to get Token
    try {
        const loginPayload = JSON.stringify({ username: 'Admin', password: 'admin123' });
        const loginRes = await fetchJson('POST', '/api/auth/login', loginPayload);
        if (!loginRes.token) throw new Error("No token received");
        token = loginRes.token;
        console.log("✅ Auth Login - Passed");
    } catch (e) {
        console.error("❌ Auth Login - Failed:", e.message);
        return; // Stop if we can't authenticate
    }

    const headers = { 'Authorization': `Bearer ${token}` };

    const routes = [
        { name: 'Users', path: '/api/users' },
        { name: 'Logistics Imports', path: '/api/logistics-imports' },
        { name: 'Logistics Exports', path: '/api/logistics-exports' },
        { name: 'Invoices', path: '/api/invoices' },
        { name: 'Fournisseurs', path: '/api/fournisseurs' },
        { name: 'Tracteurs', path: '/api/tracteurs' },
        { name: 'Analytics Financials', path: '/api/analytics/financials' },
        { name: 'Audit Logs', path: '/api/audit-logs' }
    ];

    let failures = 0;
    for (const route of routes) {
        try {
            const res = await fetchJson('GET', route.path, null, headers);
            console.log(`✅ ${route.name} (${route.path}) - Passed`);
        } catch (e) {
            console.error(`❌ ${route.name} (${route.path}) - Failed: ${e.message}`);
            failures++;
        }
    }

    console.log(`\nTest Suite Complete: ${routes.length - failures}/${routes.length} tests passed.`);
    if (failures > 0) process.exit(1);
}

function fetchJson(method, path, body, headers = {}) {
    return new Promise((resolve, reject) => {
        const reqHeaders = { 'Content-Type': 'application/json', ...headers };
        if (body) reqHeaders['Content-Length'] = Buffer.byteLength(body);

        const req = http.request({
            hostname: 'localhost',
            port: 5000,
            path: path,
            method: method,
            headers: reqHeaders
        }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    try { resolve(JSON.parse(data)); } catch (err) { resolve(data); }
                } else {
                    reject(new Error(`HTTP ${res.statusCode}: ${data}`));
                }
            });
        });

        req.on('error', (e) => reject(e));
        if (body) req.write(body);
        req.end();
    });
}

runTests();
