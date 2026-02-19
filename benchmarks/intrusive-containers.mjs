// Benchmark: Intrusive unordered array vs linked list vs normal array
// Measures remove + re-add on pre-filled containers (N=1000)
import { run, bench, group, summary } from 'mitata'

const N = 1000

const kIndex = Symbol('index')
const kPrev = Symbol('prev')
const kNext = Symbol('next')

// --- Intrusive unordered array (swap-remove) ---
class IntrusiveArray {
  items = []
  add(item) {
    item[kIndex] = this.items.length
    this.items.push(item)
  }
  remove(item) {
    const idx = item[kIndex]
    const last = this.items.pop()
    if (last !== item) {
      this.items[idx] = last
      last[kIndex] = idx
    }
    item[kIndex] = -1
  }
}

// --- Doubly linked list ---
class LinkedList {
  head = null
  tail = null
  add(item) {
    item[kPrev] = this.tail
    item[kNext] = null
    if (this.tail) this.tail[kNext] = item
    else this.head = item
    this.tail = item
  }
  remove(item) {
    const prev = item[kPrev]
    const next = item[kNext]
    if (prev) prev[kNext] = next
    else this.head = next
    if (next) next[kPrev] = prev
    else this.tail = prev
    item[kPrev] = null
    item[kNext] = null
  }
}

// --- Normal array (indexOf + splice) ---
class NormalArray {
  items = []
  add(item) { this.items.push(item) }
  remove(item) {
    const idx = this.items.indexOf(item)
    if (idx !== -1) this.items.splice(idx, 1)
  }
}

// Pre-create items
const items = Array.from({ length: N }, () => ({}))

// Pre-fill containers
const ia = new IntrusiveArray()
const ll = new LinkedList()
const na = new NormalArray()
for (const item of items) { ia.add(item); ll.add(item); na.add(item) }

// --- Remove head + re-add ---
summary(() => {
  group('remove + add head (N=1000)', () => {
    bench('intrusive array (swap)', () => {
      const item = items[0]
      ia.remove(item)
      ia.add(item)
    }).gc('inner')

    bench('linked list', () => {
      const item = items[0]
      ll.remove(item)
      ll.add(item)
    }).gc('inner')

    bench('array (indexOf + splice)', () => {
      const item = items[0]
      na.remove(item)
      na.add(item)
    }).gc('inner')
  })
})

// --- Remove middle + re-add ---
summary(() => {
  group('remove + add middle (N=1000)', () => {
    bench('intrusive array (swap)', () => {
      const item = items[N >> 1]
      ia.remove(item)
      ia.add(item)
    }).gc('inner')

    bench('linked list', () => {
      const item = items[N >> 1]
      ll.remove(item)
      ll.add(item)
    }).gc('inner')

    bench('array (indexOf + splice)', () => {
      const item = items[N >> 1]
      na.remove(item)
      na.add(item)
    }).gc('inner')
  })
})

// --- Remove tail + re-add ---
summary(() => {
  group('remove + add tail (N=1000)', () => {
    bench('intrusive array (swap)', () => {
      const item = items[N - 1]
      ia.remove(item)
      ia.add(item)
    }).gc('inner')

    bench('linked list', () => {
      const item = items[N - 1]
      ll.remove(item)
      ll.add(item)
    }).gc('inner')

    bench('array (indexOf + splice)', () => {
      const item = items[N - 1]
      na.remove(item)
      na.add(item)
    }).gc('inner')
  })
})

await run()
