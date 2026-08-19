const DEFAULT_API_HTTP_PORT = Number(process.env.REACT_APP_API_HTTP_PORT || 5000);
const DEFAULT_API_HTTPS_PORT = Number(process.env.REACT_APP_API_HTTPS_PORT || 5443);
const DEFAULT_API_HOST =
  process.env.REACT_APP_API_HOST ||
  (typeof window !== "undefined" ? window.location.hostname || "localhost" : "localhost");
const USE_ORIGIN = process.env.REACT_APP_API_USE_ORIGIN === "true";

const normalizeHost = (host) => {
  if (!host) return "localhost";
  const normalized = String(host).trim();
  if (!normalized || normalized === "0.0.0.0") return "localhost";
  return normalized;
};

const getGlobalConfig = () => {
  if (typeof window === "undefined") {
    return {};
  }

  return window.__APP_CONFIG__ || window.__GLOBAL_API_CONFIG__ || {};
};

const resolveBaseUrl = () => {
  const globalConfig = getGlobalConfig();
  const configuredBaseUrl =
    process.env.REACT_APP_API_BASE_URL ||
    globalConfig.apiBaseUrl ||
    globalConfig.API_BASE_URL ||
    globalConfig.apiUrl ||
    globalConfig.API_URL ||
    "";

  if (configuredBaseUrl) {
    return String(configuredBaseUrl).replace(/\/+$/, "");
  }

  const configuredHost = normalizeHost(
    process.env.REACT_APP_API_HOST ||
      globalConfig.apiHost ||
      globalConfig.API_HOST ||
      DEFAULT_API_HOST ||
      "localhost"
  );

  const configuredHttpPort = Number(
    process.env.REACT_APP_API_HTTP_PORT ||
      globalConfig.apiPort ||
      globalConfig.API_PORT ||
      DEFAULT_API_HTTP_PORT
  ) || DEFAULT_API_HTTP_PORT;

  if (typeof window !== "undefined") {
    const currentHost = normalizeHost(window.location.hostname || "localhost");
    const protocol = window.location.protocol === "https:" ? "https" : "http";
    const configuredPort = protocol === "https" ? DEFAULT_API_HTTPS_PORT : configuredHttpPort;

    if (USE_ORIGIN && window.location.origin) {
      return window.location.origin.replace(/\/+$/, "");
    }

    if (configuredHost && configuredHost !== "localhost" && configuredHost !== "127.0.0.1" && configuredHost !== "::1") {
      return `${protocol}://${configuredHost}:${configuredPort}`;
    }

    if (currentHost === "localhost" || currentHost === "127.0.0.1" || currentHost === "::1") {
      return `http://localhost:${configuredPort}`;
    }

    if (/^(192\.168\.|10\.|172\.(1[6-9]|2\d|3[01])\.)/.test(currentHost)) {
      return `${protocol}://${currentHost}:${configuredPort}`;
    }

    return `http://${currentHost}:${configuredPort}`;
  }

  return `http://${configuredHost}:${configuredHttpPort}`;
};

const DEFAULT_API_BASE_URL = resolveBaseUrl();

export const API_BASE_URL =
  process.env.REACT_APP_API_BASE_URL ||
  getGlobalConfig().apiBaseUrl ||
  getGlobalConfig().API_BASE_URL ||
  DEFAULT_API_BASE_URL;

if (typeof window !== "undefined") {
  window.__APP_CONFIG__ = {
    ...(window.__APP_CONFIG__ || {}),
    apiBaseUrl: API_BASE_URL,
    apiHost: normalizeHost(process.env.REACT_APP_API_HOST || getGlobalConfig().apiHost || window.location.hostname || "localhost"),
    apiPort: Number(process.env.REACT_APP_API_HTTP_PORT || getGlobalConfig().apiPort || DEFAULT_API_HTTP_PORT),
  };

  // eslint-disable-next-line no-console
  console.debug("API_BASE_URL:", API_BASE_URL);
}
