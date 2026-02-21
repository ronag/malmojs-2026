// Benchmark: file hashing — sync vs async
import { run, bench, group, summary } from 'mitata'
import fs from 'node:fs'
import crypto from 'node:crypto'
import os from 'node:os'
import path from 'node:path'
import { open } from 'node:fs/promises'

const tmpDir = os.tmpdir()
const tmpFile = path.join(tmpDir, `bench-hash-${process.pid}.tmp`)

// Create temp file
const SIZE = 128 * 1024 * 1024    // 128 MB

fs.writeFileSync(tmpFile, crypto.randomBytes(SIZE))

// Sync hashing
function syncHash(filePath) {
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

// Async hashing using fs promises
async function asyncHash(filePath) {
  const fh = await open(filePath, 'r')
  try {
    const hasher = crypto.createHash('md5')
    const buf = Buffer.allocUnsafeSlow(128 * 1024)
    let bytesRead
    while (({ bytesRead } = await fh.read(buf, 0, buf.byteLength)) && bytesRead > 0) {
      hasher.update(bytesRead < buf.byteLength ? buf.subarray(0, bytesRead) : buf)
    }
    return hasher.digest('hex')
  } finally { await fh.close() }
}

summary(() => {
  group('hash 128 MB file', () => {
    bench('sync', () => {
      syncHash(tmpFile)
    }).gc('inner')

    bench('async', async () => {
      await asyncHash(tmpFile)
    }).gc('inner')
  })
})

summary(() => {
  group('hash 128 MB x16 sequential', () => {
    bench('sync', () => {
      for (let i = 0; i < 16; i++) syncHash(tmpFile)
    }).gc('inner')

    bench('async', async () => {
      for (let i = 0; i < 16; i++) await asyncHash(tmpFile)
    }).gc('inner')
  })
})

await run()

fs.unlinkSync(tmpFile)
