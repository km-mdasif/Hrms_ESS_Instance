const DEFAULT_API_HTTP_PORT = Number(process.env.REACT_APP_API_HTTP_PORT || 5000);
const DEFAULT_API_HTTPS_PORT = Number(process.env.REACT_APP_API_HTTPS_PORT || 5443);
const DEFAULT_API_HOST =
  process.env.REACT_APP_API_HOST ||
  (typeof window !== "undefined" ? window.location.hostname || "localhost" : "localhost");
const USE_ORIGIN = process.env.REACT_APP_API_USE_ORIGIN === "true";

const normalizeHost = (host) => {
  if (!host) return "localhost";
  const normalized = String(host).trim();
  return normalized === "0.0.0.0" ? "localhost" : normalized;
};

const DEFAULT_API_BASE_URL = (() => {
  if (typeof window !== "undefined") {
    if (process.env.REACT_APP_API_BASE_URL) {
      return process.env.REACT_APP_API_BASE_URL;
    }

    const host = normalizeHost(process.env.REACT_APP_API_HOST || window.location.hostname || "localhost");
    const isSecure =
      window.location.protocol === "https:" ||
      process.env.REACT_APP_API_SECURE === "true" ||
      process.env.REACT_APP_API_HTTPS === "true" ||
      process.env.REACT_APP_API_SSL === "true";
    const protocol = isSecure ? "https" : "http";
    const port = isSecure ? DEFAULT_API_HTTPS_PORT : DEFAULT_API_HTTP_PORT;

    if (USE_ORIGIN && window.location.origin) {
      return window.location.origin;
    }

    if (host === "localhost" || host === "127.0.0.1" || host === "::1") {
      return `${protocol}://localhost:${port}`;
    }

    return `${protocol}://${host}:${port}`;
  }

  return process.env.REACT_APP_API_BASE_URL || `http://${normalizeHost(DEFAULT_API_HOST)}:${DEFAULT_API_HTTP_PORT}`;
})();

export const API_BASE_URL =
  process.env.REACT_APP_API_BASE_URL || DEFAULT_API_BASE_URL;

// Helpful debug: show resolved API base when running in browser console
if (typeof window !== "undefined") {
  // eslint-disable-next-line no-console
  console.debug("API_BASE_URL:", API_BASE_URL);
}
