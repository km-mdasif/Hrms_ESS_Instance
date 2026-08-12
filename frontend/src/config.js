const DEFAULT_API_HTTP_PORT = Number(process.env.REACT_APP_API_HTTP_PORT || 5000);
const DEFAULT_API_HTTPS_PORT = Number(process.env.REACT_APP_API_HTTPS_PORT || 5443);
const DEFAULT_API_HOST =
  process.env.REACT_APP_API_HOST ||
  (typeof window !== "undefined" ? window.location.hostname || "localhost" : "localhost");
const USE_ORIGIN = process.env.REACT_APP_API_USE_ORIGIN === "true";

const DEFAULT_API_BASE_URL = (() => {
  if (typeof window !== "undefined") {
    const origin = window.location.origin;
    const protocol = window.location.protocol === "https:" ? "https" : "http";

    if (process.env.REACT_APP_API_BASE_URL) {
      return process.env.REACT_APP_API_BASE_URL;
    }

    if (protocol === "https:") {
      return origin;
    }

    const host = process.env.REACT_APP_API_HOST || window.location.hostname || "localhost";
    const port = protocol === "https" ? DEFAULT_API_HTTPS_PORT : DEFAULT_API_HTTP_PORT;
    return `${protocol}://${host}:${port}`;
  }

  return process.env.REACT_APP_API_BASE_URL || `http://${DEFAULT_API_HOST}:${DEFAULT_API_HTTP_PORT}`;
})();

export const API_BASE_URL =
  process.env.REACT_APP_API_BASE_URL || DEFAULT_API_BASE_URL;

// Helpful debug: show resolved API base when running in browser console
if (typeof window !== "undefined") {
  // eslint-disable-next-line no-console
  console.debug("API_BASE_URL:", API_BASE_URL);
}
