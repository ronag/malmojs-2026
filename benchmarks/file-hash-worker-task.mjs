import fs from 'node:fs'
import crypto from 'node:crypto'

export default function ({ filePath }) {
  const fd = fs.openSync(filePath, 'r')
  try {
    const hasher = crypto.createHash('md5')
    const buf = Buffer.allocUnsafeSlow(128 * 1024)
    let n
    while ((n = fs.readSync(fd, buf)) > 0)
      hasher.update(n < buf.byteLength ? buf.subarray(0, n) : buf)
    return hasher.digest('hex')
  } finally { fs.closeSync(fd) }
}
