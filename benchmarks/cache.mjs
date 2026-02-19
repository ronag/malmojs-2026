// Benchmark: Intrusive power-of-2 random choice cache vs lru-cache
import { run, bench, group, summary, do_not_optimize } from 'mitata'
import { LRUCache } from 'lru-cache'

// --- FastCache: Map for lookups + intrusive Array for eviction ---
// Items store their own array index (_cacheIdx) — swap-remove for O(1) delete
// Eviction: pick 2 random indices from array, evict older one (lower tick)

const kCacheTick = Symbol('kCacheTick')
const kCacheIdx = Symbol('kCacheIdx')
const kCacheKey = Symbol('kCacheKey')

class FastCache {
  #map = new Map()
  #arr = []
  #capacity
  #tick = 0

  constructor(capacity) {
    this.#capacity = capacity
  }

  get(key) {
    const item = this.#map.get(key)
    if (item !== undefined) {
      item[kCacheTick] = ++this.#tick
    }
    return item
  }

  set(key, item) {
    // wrap around is harmless since we only compare ticks for recency, not absolute value
    this.#tick = (this.#tick + 1) & 2147483647

    if (item[kCacheIdx] !== -1) {
      // Update existing — item already in arr
      item[kCacheTick] = this.#tick
      return
    }

    if (this.#arr.length >= this.#capacity) {
      // Power-of-2 random choice eviction
      const i = (Math.random() * this.#arr.length) | 0
      const j = (Math.random() * this.#arr.length) | 0
      const target = (this.#arr[i][kCacheTick] <= this.#arr[j][kCacheTick]) ? i : j
      const evicted = this.#arr[target]

      // Remove evicted from map
      this.#map.delete(evicted[kCacheKey])

      // Swap-remove from arr: replace evicted with last element
      const last = this.#arr.pop()
      if (last !== evicted) {
        this.#arr[target] = last
        last[kCacheIdx] = target
      }

      evicted[kCacheIdx] = -1
      evicted[kCacheKey] = undefined
    }

    // Add new item
    item[kCacheKey] = key
    item[kCacheTick] = this.#tick
    item[kCacheIdx] = this.#arr.length
    this.#arr.push(item)
    this.#map.set(key, item)
  }

  delete(item) {
    if (item[kCacheIdx] === -1) return

    this.#map.delete(item[kCacheKey])

    // Swap-remove
    const idx = item[kCacheIdx]
    const last = this.#arr.pop()
    if (last !== item) {
      this.#arr[idx] = last
      last[kCacheIdx] = idx
    }

    item[kCacheIdx] = -1
    item[kCacheKey] = undefined
  }

  get size() {
    return this.#arr.length
  }
}

// --- Setup ---

const CAPACITY = 1024

// Values are objects that carry their own cache bookkeeping (intrusive)
class CacheableItem {
  constructor(data) {
    this.data = data
    this[kCacheIdx] = -1
    this[kCacheKey] = undefined
    this[kCacheTick] = 0
  }
}

// Pre-generate keys and items to avoid alloc in hot path
const keys = new Array(CAPACITY)
const items = new Array(CAPACITY)
for (let i = 0; i < CAPACITY; i++) {
  keys[i] = `key-${i}`
  items[i] = new CacheableItem(i)
}

const extraKeys = new Array(CAPACITY)
for (let i = 0; i < CAPACITY; i++) {
  extraKeys[i] = `extra-${i}`
}

// --- Benchmarks ---

const lru = new LRUCache({ max: CAPACITY })
const fast = new FastCache(CAPACITY)

summary(() => {
  group('set 1 entry (warm cache)', () => {
    let i = 0
    bench('LRUCache.set', () => {
      const idx = i++ & (CAPACITY - 1)
      lru.set(keys[idx], items[idx])
      do_not_optimize(lru.size)
    }).gc('inner')

    let j = 0
    bench('FastCache.set (intrusive)', () => {
      const idx = j++ & (CAPACITY - 1)
      fast.set(keys[idx], items[idx])
      do_not_optimize(fast.size)
    }).gc('inner')
  })
})

// Pre-fill both caches for get benchmarks
for (let i = 0; i < CAPACITY; i++) {
  lru.set(keys[i], items[i])
  fast.set(keys[i], items[i])
}

summary(() => {
  group('get 1 entry (hit)', () => {
    let i = 0
    bench('LRUCache.get', () => {
      do_not_optimize(lru.get(keys[i++ & (CAPACITY - 1)]))
    }).gc('inner')

    let j = 0
    bench('FastCache.get (intrusive)', () => {
      do_not_optimize(fast.get(keys[j++ & (CAPACITY - 1)]))
    }).gc('inner')
  })
})

summary(() => {
  group('get 1 entry (miss)', () => {
    let i = 0
    bench('LRUCache.get (miss)', () => {
      do_not_optimize(lru.get(extraKeys[i++ & (CAPACITY - 1)]))
    }).gc('inner')

    let j = 0
    bench('FastCache.get (miss)', () => {
      do_not_optimize(fast.get(extraKeys[j++ & (CAPACITY - 1)]))
    }).gc('inner')
  })
})

summary(() => {
  group('mixed get/set (80% get, 20% set)', () => {
    let i = 0
    bench('LRUCache mixed', () => {
      const idx = i++ & (CAPACITY - 1)
      if (i % 5 === 0) {
        lru.set(keys[idx], items[idx])
        do_not_optimize(lru.size)
      } else {
        do_not_optimize(lru.get(keys[idx]))
      }
    }).gc('inner')

    let j = 0
    bench('FastCache mixed (intrusive)', () => {
      const idx = j++ & (CAPACITY - 1)
      if (j % 5 === 0) {
        fast.set(keys[idx], items[idx])
        do_not_optimize(fast.size)
      } else {
        do_not_optimize(fast.get(keys[idx]))
      }
    }).gc('inner')
  })
})

summary(() => {
  group('eviction pressure (set beyond capacity)', () => {
    bench('LRUCache eviction', () => {
      const c = new LRUCache({ max: 128 })
      for (let i = 0; i < 256; i++) {
        c.set(keys[i & (CAPACITY - 1)], items[i & (CAPACITY - 1)])
      }
      do_not_optimize(c.size)
    }).gc('inner')

    bench('FastCache eviction (intrusive)', () => {
      const c = new FastCache(128)
      for (let i = 0; i < 256; i++) {
        c.set(keys[i & (CAPACITY - 1)], items[i & (CAPACITY - 1)])
      }
      do_not_optimize(c.size)
    }).gc('inner')
  })
})

summary(() => {
  group('batch 1000 set + get', () => {
    bench('LRUCache batch', () => {
      const c = new LRUCache({ max: CAPACITY })
      for (let i = 0; i < 1000; i++) {
        c.set(keys[i & (CAPACITY - 1)], i)
      }
      let sum = 0
      for (let i = 0; i < 1000; i++) {
        sum += c.get(keys[i & (CAPACITY - 1)])
      }
      do_not_optimize(sum)
    }).gc('inner')

    bench('FastCache batch (intrusive)', () => {
      const c = new FastCache(CAPACITY)
      for (let i = 0; i < 1000; i++) {
        c.set(keys[i & (CAPACITY - 1)], items[i & (CAPACITY - 1)])
      }
      let sum = 0
      for (let i = 0; i < 1000; i++) {
        const v = c.get(keys[i & (CAPACITY - 1)])
        sum += v ? v.data : 0
      }
      do_not_optimize(sum)
    }).gc('inner')
  })
})

await run()
