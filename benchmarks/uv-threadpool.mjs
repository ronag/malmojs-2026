// Benchmark: UV thread pool size impact on concurrent async operations
// Uses separate FDs to avoid file descriptor contention
import fs from 'node:fs'
import crypto from 'node:crypto'
import os from 'node:os'
import path from 'node:path'
import { performance } from 'node:perf_hooks'

const POOL_SIZE = parseInt(process.env.UV_THREADPOOL_SIZE || '4', 10)
const N = 2000
const CONCURRENCY = 100

const tmpDir = os.tmpdir()

// Create CONCURRENCY separate temp files (different FDs = no contention)
const files = []
const fds = []
for (let i = 0; i < CONCURRENCY; i++) {
  const p = path.join(tmpDir, `bench-uv-${process.pid}-${i}.tmp`)
  fs.writeFileSync(p, crypto.randomBytes(4096))
  files.push(p)
  fds.push(fs.openSync(p, 'r'))
}

const buf = Buffer.alloc(4096)

function benchConcurrent(name, opFn) {
  return new Promise((resolve) => {
    let inflight = 0
    let completed = 0
    let next = 0
    const start = performance.now()

    function launch() {
      while (inflight < CONCURRENCY && next < N) {
        inflight++
        const idx = next % CONCURRENCY
        next++
        opFn(idx, () => {
          inflight--
          completed++
          if (completed >= N) {
            const elapsed = performance.now() - start
            resolve({ name, elapsed: Math.round(elapsed), opsPerSec: Math.round(completed / elapsed * 1000) })
          } else {
            launch()
          }
        })
      }
    }
    launch()
  })
}

console.log(`UV_THREADPOOL_SIZE=${POOL_SIZE}`)

// fs.read with separate FDs
const fsResult = await benchConcurrent('fs.read (separate FDs)', (idx, cb) => {
  fs.read(fds[idx], buf, 0, 4096, 0, cb)
})
console.log(`  fs.read:   ${fsResult.opsPerSec} ops/s  (${fsResult.elapsed}ms)`)

// crypto.pbkdf2 — CPU-bound, blocks thread pool thread
const cryptoResult = await benchConcurrent('crypto.pbkdf2', (_idx, cb) => {
  crypto.pbkdf2('password', 'salt', 10000, 64, 'sha512', cb)
})
console.log(`  crypto:    ${cryptoResult.opsPerSec} ops/s  (${cryptoResult.elapsed}ms)`)

// mixed: alternating fs and crypto
let toggle = false
const mixedResult = await benchConcurrent('mixed', (idx, cb) => {
  toggle = !toggle
  if (toggle) {
    fs.read(fds[idx], buf, 0, 4096, 0, cb)
  } else {
    crypto.pbkdf2('password', 'salt', 10000, 64, 'sha512', cb)
  }
})
console.log(`  mixed:     ${mixedResult.opsPerSec} ops/s  (${mixedResult.elapsed}ms)`)

// Cleanup
for (const fd of fds) fs.closeSync(fd)
for (const f of files) fs.unlinkSync(f)
