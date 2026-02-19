// Benchmark: Async return pattern — sync fast path vs always-async
// The key insight: async functions ALWAYS return a Promise, even on cache hit.
// The async return pattern avoids Promise creation on the sync path entirely.
import { run, bench, group, summary } from 'mitata'

// Populate a cache
const CACHE_SIZE = 10000
const cache = new Map()
for (let i = 0; i < CACHE_SIZE; i++) {
  cache.set(i, `value-${i}`)
}

function fetchRemote(key) {
  return Promise.resolve(`value-${key}`)
}

// --- Pattern 1: async function (always returns a Promise) ---
async function resolveAsync(key) {
  const cached = cache.get(key)
  if (cached !== undefined) return cached
  return await fetchRemote(key)
}

// --- Pattern 2: sync/async return pattern ---
function resolvePattern(key) {
  const cached = cache.get(key)
  if (cached !== undefined) {
    return { async: false, value: cached }
  }
  return { async: true, value: fetchRemote(key) }
}

// --- Pattern 3: sync/async return pattern (reused result) ---
const syncResult = { async: false, value: null }
function resolvePatternReused(key) {
  const cached = cache.get(key)
  if (cached !== undefined) {
    syncResult.value = cached
    return syncResult
  }
  return { async: true, value: fetchRemote(key) }
}

// Benchmark: 1000 lookups that are ALL cache hits (sync path)
// This isolates the cost of the async function wrapper
const BATCH = 1000
const hitKeys = Array.from({ length: BATCH }, (_, i) => i % CACHE_SIZE)

summary(() => {
  group(`${BATCH} cache hits (100% sync)`, () => {
    bench('async function (always Promise)', async () => {
      let sum = 0
      for (let i = 0; i < BATCH; i++) {
        const v = await resolveAsync(hitKeys[i])
        sum += v.length
      }
      return sum
    }).gc('inner')

    bench('async return pattern', () => {
      let sum = 0
      for (let i = 0; i < BATCH; i++) {
        const r = resolvePattern(hitKeys[i])
        if (r.async) throw new Error('unexpected')
        sum += r.value.length
      }
      return sum
    }).gc('inner')

    bench('async return (reused obj)', () => {
      let sum = 0
      for (let i = 0; i < BATCH; i++) {
        const r = resolvePatternReused(hitKeys[i])
        if (r.async) throw new Error('unexpected')
        sum += r.value.length
      }
      return sum
    }).gc('inner')
  })
})

// Mixed hit rate: 95% cache hit
function makeMixedKeys(hitRate) {
  const keys = new Array(BATCH)
  for (let i = 0; i < BATCH; i++) {
    keys[i] = Math.random() < hitRate ? (i % CACHE_SIZE) : (CACHE_SIZE + i)
  }
  return keys
}

for (const hitRate of [0.50, 0.95]) {
  const label = `${BATCH} lookups, ${Math.round(hitRate * 100)}% hit rate`
  const keys = makeMixedKeys(hitRate)

  summary(() => {
    group(label, () => {
      bench('async function (always Promise)', async () => {
        let sum = 0
        for (let i = 0; i < BATCH; i++) {
          const v = await resolveAsync(keys[i])
          sum += v.length
        }
        return sum
      }).gc('inner')

      bench('async return pattern', async () => {
        let sum = 0
        for (let i = 0; i < BATCH; i++) {
          const r = resolvePattern(keys[i])
          if (r.async) {
            sum += (await r.value).length
          } else {
            sum += r.value.length
          }
        }
        return sum
      }).gc('inner')

      bench('async return (reused obj)', async () => {
        let sum = 0
        for (let i = 0; i < BATCH; i++) {
          const r = resolvePatternReused(keys[i])
          if (r.async) {
            sum += (await r.value).length
          } else {
            sum += r.value.length
          }
        }
        return sum
      }).gc('inner')
    })
  })
}

await run()
