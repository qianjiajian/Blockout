// Isolated launcher preload for large v147 continuation checkpoints.
// The proof CLI's input fingerprint must remain unchanged, so this shim is
// loaded by Node without changing the bound proof source files.
const fs = require('node:fs');
const crypto = require('node:crypto');
const originalWriteFileSync = fs.writeFileSync;
const originalReadFileSync = fs.readFileSync;
const MAX_SINGLE_WRITE = 0x7fffffff;

fs.readFileSync = function readFileSyncChunked(file, options) {
  const encoding = typeof options === 'string' ? options : options?.encoding;
  if (encoding !== undefined) return originalReadFileSync.call(fs, file, options);
  const stat = fs.statSync(file);
  if (stat.size <= MAX_SINGLE_WRITE) return originalReadFileSync.call(fs, file, options);
  const fd = fs.openSync(file, 'r');
  try {
    const data = Buffer.allocUnsafe(stat.size);
    const chunkSize = 256 * 1024 * 1024;
    let offset = 0;
    while (offset < data.length) {
      const length = Math.min(chunkSize, data.length - offset);
      let done = 0;
      while (done < length) {
        const n = fs.readSync(fd, data, offset + done, length - done, offset + done);
        if (!n) throw new Error(`Unexpected EOF while reading ${file}`);
        done += n;
      }
      offset += length;
    }
    return data;
  } finally {
    fs.closeSync(fd);
  }
};

fs.writeFileSync = function writeFileSyncChunked(file, data, options) {
  if (!Buffer.isBuffer(data) || data.length <= MAX_SINGLE_WRITE) {
    return originalWriteFileSync.call(fs, file, data, options);
  }
  const flags = typeof options === 'string' ? options : (options?.flag ?? 'w');
  const mode = typeof options === 'object' && options?.mode !== undefined ? options.mode : undefined;
  const fd = fs.openSync(file, flags, mode);
  try {
    let offset = 0;
    const chunkSize = 256 * 1024 * 1024;
    while (offset < data.length) {
      const length = Math.min(chunkSize, data.length - offset);
      fs.writeSync(fd, data, offset, length, null);
      offset += length;
    }
  } finally {
    fs.closeSync(fd);
  }
};

// Node's Hash.update has the same single-buffer limit. Preserve the normal
// SHA-256 result while feeding large checkpoint buffers in bounded slices.
const originalCreateHash = crypto.createHash;
crypto.createHash = function createHashChunked(...args) {
  const hash = originalCreateHash(...args);
  const originalUpdate = hash.update.bind(hash);
  hash.update = function updateChunked(data, encoding) {
    if (Buffer.isBuffer(data) && data.length > MAX_SINGLE_WRITE) {
      const chunkSize = 256 * 1024 * 1024;
      for (let offset = 0; offset < data.length; offset += chunkSize) {
        originalUpdate(data.subarray(offset, Math.min(offset + chunkSize, data.length)));
      }
      return hash;
    }
    originalUpdate(data, encoding);
    return hash;
  };
  return hash;
};
