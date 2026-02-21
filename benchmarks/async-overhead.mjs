// Benchmark: async/await vs callback-based async
import { run, bench, group, summary } from 'mitata'

let sink = 0

// --- Sync baseline ---
function syncCall(a, b) {
  return a + b
}

// --- Callback (fires synchronously — no Promise, no microtask) ---
function callbackCall(a, b, cb) {
  cb(a + b)
}

// --- async/await (always creates a Promise) ---
async function asyncCall(a, b) {
  return a + b
}

// --- callback + queueMicrotask (deferred but no Promise) ---
function callbackMicrotaskCall(a, b, cb) {
  queueMicrotask(() => cb(a + b))
}

// --- new Promise wrapping sync work ---
function promiseCall(a, b) {
  return new Promise(resolve => resolve(a + b))
}

summary(() => {
  group('sync vs callback vs async/await', () => {
    bench('sync function', () => {
      sink = syncCall(sink, 1)
    }).gc('inner')

    bench('callback (sync fire)', () => {
      callbackCall(sink, 1, (v) => { sink = v })
    }).gc('inner')

    bench('async/await', async () => {
      sink = await asyncCall(sink, 1)
    }).gc('inner')

    bench('callback + queueMicrotask', () => {
      callbackMicrotaskCall(sink, 1, (v) => { sink = v })
    }).gc('inner')

    bench('new Promise(resolve => ...)', async () => {
      sink = await promiseCall(sink, 1)
    }).gc('inner')
  })
})

await run()
