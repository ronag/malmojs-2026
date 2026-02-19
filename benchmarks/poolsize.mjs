// Benchmark: Buffer.poolSize and stream highWaterMark tuning
import { run, bench, group, summary, do_not_optimize } from 'mitata'
import { Readable, Writable } from 'node:stream'
import { pipeline } from 'node:stream/promises'

// --- Buffer.poolSize benchmarks ---

// Default poolSize = 8192
// Buffer.allocUnsafe uses the pool for sizes <= poolSize/2 (4096)
// Sizes > 4096 skip the pool and allocate directly

summary(() => {
  group('allocUnsafe 1024 bytes (poolSize)', () => {
    bench('poolSize = 8192 (default)', () => {
      Buffer.poolSize = 8192
      do_not_optimize(Buffer.allocUnsafe(1024))
    }).gc('inner')

    bench('poolSize = 128 * 1024', () => {
      Buffer.poolSize = 128 * 1024
      do_not_optimize(Buffer.allocUnsafe(1024))
    }).gc('inner')
  })
})

summary(() => {
  group('allocUnsafe 8192 bytes (poolSize)', () => {
    bench('poolSize = 8192 (default)', () => {
      Buffer.poolSize = 8192
      do_not_optimize(Buffer.allocUnsafe(8192))
    }).gc('inner')

    bench('poolSize = 128 * 1024', () => {
      Buffer.poolSize = 128 * 1024
      do_not_optimize(Buffer.allocUnsafe(8192))
    }).gc('inner')
  })
})

summary(() => {
  group('allocUnsafe 16384 bytes (poolSize)', () => {
    bench('poolSize = 8192 (default)', () => {
      Buffer.poolSize = 8192
      do_not_optimize(Buffer.allocUnsafe(16384))
    }).gc('inner')

    bench('poolSize = 128 * 1024', () => {
      Buffer.poolSize = 128 * 1024
      do_not_optimize(Buffer.allocUnsafe(16384))
    }).gc('inner')
  })
})

summary(() => {
  group('allocUnsafe 65536 bytes (poolSize)', () => {
    bench('poolSize = 8192 (default)', () => {
      Buffer.poolSize = 8192
      do_not_optimize(Buffer.allocUnsafe(65536))
    }).gc('inner')

    bench('poolSize = 128 * 1024', () => {
      Buffer.poolSize = 128 * 1024
      do_not_optimize(Buffer.allocUnsafe(65536))
    }).gc('inner')
  })
})

// Reset poolSize
Buffer.poolSize = 8192

// --- Stream highWaterMark benchmarks ---

function makeSource(total, chunkSize) {
  let sent = 0
  return new Readable({
    read() {
      if (sent >= total) {
        this.push(null)
        return
      }
      this.push(Buffer.allocUnsafe(chunkSize))
      sent += chunkSize
    }
  })
}

function makeSink() {
  return new Writable({
    write(chunk, encoding, callback) {
      do_not_optimize(chunk)
      callback()
    }
  })
}

const TOTAL = 16 * 1024 * 1024 // 16 MB

summary(() => {
  group('stream pipeline 16 MB (highWaterMark)', () => {
    bench('highWaterMark = 16384 (default)', async () => {
      const src = makeSource(TOTAL, 1024)
      const dst = makeSink()
      await pipeline(src, dst)
    })

    bench('highWaterMark = 128 * 1024', async () => {
      const src = new Readable({
        highWaterMark: 128 * 1024,
        read() {
          if (this._sent >= TOTAL) { this.push(null); return }
          this.push(Buffer.allocUnsafe(1024))
          this._sent = (this._sent || 0) + 1024
        }
      })
      const dst = new Writable({
        highWaterMark: 128 * 1024,
        write(chunk, encoding, callback) {
          do_not_optimize(chunk)
          callback()
        }
      })
      await pipeline(src, dst)
    })
  })
})

await run()
