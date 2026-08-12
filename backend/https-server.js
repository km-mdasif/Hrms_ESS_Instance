const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');
const app = require('./server');

const httpPort = Number(process.env.HTTP_PORT) || Number(process.env.PORT) || 5000;
const httpsPort = Number(process.env.HTTPS_PORT) || 5443;
const certPath = process.env.HTTPS_CERT_PATH
  ? path.resolve(process.env.HTTPS_CERT_PATH)
  : path.resolve(__dirname, '../certs/localhost.crt');
const keyPath = process.env.HTTPS_KEY_PATH
  ? path.resolve(process.env.HTTPS_KEY_PATH)
  : path.resolve(__dirname, '../certs/localhost.key');

if (!fs.existsSync(certPath) || !fs.existsSync(keyPath)) {
  console.error(`HTTPS certificate or key not found. certPath=${certPath}, keyPath=${keyPath}`);
  process.exit(1);
}

const options = {
  key: fs.readFileSync(keyPath),
  cert: fs.readFileSync(certPath),
};

http.createServer(app).listen(httpPort, '0.0.0.0', () => {
  console.log(`HTTP server running on http://localhost:${httpPort}`);
  console.log(`Swagger UI available at http://localhost:${httpPort}/api-docs`);
});

https.createServer(options, app).listen(httpsPort, '0.0.0.0', () => {
  console.log(`HTTPS server running on https://localhost:${httpsPort}`);
  console.log(`Swagger UI available at https://localhost:${httpsPort}/api-docs`);
});
