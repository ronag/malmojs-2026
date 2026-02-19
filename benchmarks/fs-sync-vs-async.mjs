// Benchmark: fs.readSync vs fs.read (callback)
import { run, bench, group, summary } from 'mitata'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

// Create a temp file with some data
const tmpDir = os.tmpdir()
const tmpFile = path.join(tmpDir, `bench-fs-${process.pid}.tmp`)
const SMALL = 4 * 1024          // 4 KB
const LARGE = 4 * 1024 * 1024   // 4 MB

fs.writeFileSync(tmpFile, Buffer.alloc(LARGE, 0x42))

const fd = fs.openSync(tmpFile, 'r')
const buf = Buffer.alloc(LARGE)

// --- 4 KB reads ---

summary(() => {
  group(`read 4 KB`, () => {
    bench('fs.readSync', () => {
      fs.readSync(fd, buf, 0, SMALL, 0)
    }).gc('inner')

    bench('fs.read (callback)', () => {
      return new Promise(resolve => {
        fs.read(fd, buf, 0, SMALL, 0, resolve)
      })
    }).gc('inner')
  })
})

// --- 4 MB reads ---

summary(() => {
  group(`read 4 MB`, () => {
    bench('fs.readSync', () => {
      fs.readSync(fd, buf, 0, LARGE, 0)
    }).gc('inner')

    bench('fs.read (callback)', () => {
      return new Promise(resolve => {
        fs.read(fd, buf, 0, LARGE, 0, resolve)
      })
    }).gc('inner')
  })
})

await run()

fs.closeSync(fd)
fs.unlinkSync(tmpFile)
