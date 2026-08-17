const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');
const app = require('./server');

const preferredHttpPort = Number(process.env.HTTP_PORT) || Number(process.env.PORT) || 5000;
const preferredHttpsPort = Number(process.env.HTTPS_PORT) || 5443;
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

const tryListen = (server, port, protocol, onSuccess) => {
  const attempt = (candidatePort) => {
    server.removeAllListeners('error');
    server.once('error', (error) => {
      if (error.code === 'EACCES' || error.code === 'EADDRINUSE') {
        const nextPort = fallbackPorts[protocol].find((value) => value !== candidatePort && value !== undefined);
        if (nextPort) {
          console.warn(`${protocol.toUpperCase()} port ${candidatePort} unavailable (${error.code}). Retrying on ${nextPort}...`);
          attempt(nextPort);
          return;
        }

        console.error(`${protocol.toUpperCase()} server could not bind to any configured port (${fallbackPorts[protocol].join(', ')}).`);
        console.error('Set HTTPS_PORT to a valid port with enough permissions, or update the host firewall/port rules.');
        process.exit(1);
      }

      throw error;
    });

    server.listen(candidatePort, '0.0.0.0', () => onSuccess(candidatePort));
  };

  attempt(port);
};

const fallbackPorts = {
  http: [preferredHttpPort, 5000, 5001, 8080],
  https: [preferredHttpsPort, 5443, 8443, 5001],
};

const httpServer = http.createServer(app);
tryListen(httpServer, preferredHttpPort, 'http', (port) => {
  console.log(`HTTP server running on http://localhost:${port}`);
  console.log(`Swagger UI available at http://localhost:${port}/api-docs`);
});

const httpsServer = https.createServer(options, app);
tryListen(httpsServer, preferredHttpsPort, 'https', (port) => {
  console.log(`HTTPS server running on https://localhost:${port}`);
  console.log(`Swagger UI available at https://localhost:${port}/api-docs`);
});
