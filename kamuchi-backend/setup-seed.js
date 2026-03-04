const http = require('http');

const options = {
    hostname: 'localhost',
    port: 5000,
    path: '/api/setup',
    method: 'POST',
};

const req = http.request(options, res => {
    console.log(`statusCode: ${res.statusCode}`);
    res.on('data', d => {
        process.stdout.write(d);
    });
});

req.on('error', error => {
    console.error('Setup failed:', error);
});

req.end();
