/**
 * File Management Utilities
 * Handles file operations, storage, and path management
 */

const fs = require("fs");
const path = require("path");
const { getPool } = require("../database/db");

const DEFAULT_DOCUMENT_PATH = path.resolve(__dirname, "../../document-storage");

/**
 * Get document directory from database or use default
 */
async function getDocumentDirectory() {
  try {
    const dbPool = await getPool();
    const result = await dbPool
      .request()
      .input("operation", require("../database/db").sql.NVarChar(50), "get_document_directory")
      .execute("sp_webapi");

    const documentPath = result.recordset[0]?.DocumentPath || DEFAULT_DOCUMENT_PATH;
    const normalizedPath =
      String(documentPath || DEFAULT_DOCUMENT_PATH).replace(/[\\/]+$/, "") ||
      DEFAULT_DOCUMENT_PATH;

    if (!fs.existsSync(normalizedPath)) {
      fs.mkdirSync(normalizedPath, { recursive: true });
    }

    return normalizedPath;
  } catch (error) {
    console.warn("[FileManager] Error getting document directory, using default:", error.message);
    if (!fs.existsSync(DEFAULT_DOCUMENT_PATH)) {
      fs.mkdirSync(DEFAULT_DOCUMENT_PATH, { recursive: true });
    }
    return DEFAULT_DOCUMENT_PATH;
  }
}

/**
 * Sanitize file path segments to prevent directory traversal
 */
function sanitizePathSegment(value) {
  return String(value || "")
    .replace(/[<>:"/\\|?*]+/g, "_")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Ensure directory exists
 */
function ensureDirectory(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

/**
 * Delete file if it exists
 */
function deleteFile(filePath) {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      return true;
    }
  } catch (error) {
    console.error("[FileManager] Error deleting file:", error);
  }
  return false;
}

/**
 * Get file stats
 */
function getFileStats(filePath) {
  try {
    if (fs.existsSync(filePath)) {
      return fs.statSync(filePath);
    }
  } catch (error) {
    console.error("[FileManager] Error getting file stats:", error);
  }
  return null;
}

/**
 * Read file as buffer
 */
function readFileBuffer(filePath) {
  try {
    if (fs.existsSync(filePath)) {
      return fs.readFileSync(filePath);
    }
  } catch (error) {
    console.error("[FileManager] Error reading file:", error);
  }
  return null;
}

/**
 * Convert data URL to blob and save file
 */
function dataURLtoBlob(dataurl) {
  const arr = dataurl.split(",");
  const mime = arr[0].match(/:(.*?);/)?.[1] || "application/octet-stream";
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return { buffer: u8arr, mime };
}

/**
 * Generate unique filename
 */
function generateUniqueFilename(originalName) {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  const ext = path.extname(originalName);
  const name = path.basename(originalName, ext);
  return `${sanitizePathSegment(name)}-${timestamp}-${random}${ext}`;
}

module.exports = {
  getDocumentDirectory,
  sanitizePathSegment,
  ensureDirectory,
  deleteFile,
  getFileStats,
  readFileBuffer,
  dataURLtoBlob,
  generateUniqueFilename,
  DEFAULT_DOCUMENT_PATH
};
