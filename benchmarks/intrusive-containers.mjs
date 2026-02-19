// Benchmark: Intrusive unordered array vs linked list vs normal array
// Measures remove + re-add on pre-filled containers (N=10000)
import { run, bench, group, summary, do_not_optimize } from 'mitata'

const N = 10000

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

// --- Non-intrusive linked list (wrapper nodes) ---
class WrapperLinkedList {
  head = null
  tail = null
  nodeMap = new Map() // item → node lookup for O(1) remove
  add(item) {
    const node = { value: item, prev: this.tail, next: null }
    if (this.tail) this.tail.next = node
    else this.head = node
    this.tail = node
    this.nodeMap.set(item, node)
  }
  remove(item) {
    const node = this.nodeMap.get(item)
    if (!node) return
    if (node.prev) node.prev.next = node.next
    else this.head = node.next
    if (node.next) node.next.prev = node.prev
    else this.tail = node.prev
    this.nodeMap.delete(item)
    // node becomes garbage → GC
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
const wl = new WrapperLinkedList()
const na = new NormalArray()
for (const item of items) { ia.add(item); ll.add(item); wl.add(item); na.add(item) }

// --- Remove head + re-add ---
summary(() => {
  group('remove + add head (N=10000)', () => {
    bench('intrusive array (swap)', () => {
      const item = items[0]
      ia.remove(item)
      ia.add(item)
      do_not_optimize(ia.items.length)
    }).gc('inner')

    bench('intrusive linked list', () => {
      const item = items[0]
      ll.remove(item)
      ll.add(item)
      do_not_optimize(ll.tail)
    }).gc('inner')

    bench('linked list (wrapper nodes)', () => {
      const item = items[0]
      wl.remove(item)
      wl.add(item)
      do_not_optimize(wl.nodeMap.size)
    }).gc('inner')

    bench('array (indexOf + splice)', () => {
      const item = items[0]
      na.remove(item)
      na.add(item)
      do_not_optimize(na.items.length)
    }).gc('inner')
  })
})

// --- Remove middle + re-add ---
summary(() => {
  group('remove + add middle (N=10000)', () => {
    bench('intrusive array (swap)', () => {
      const item = items[N >> 1]
      ia.remove(item)
      ia.add(item)
      do_not_optimize(ia.items.length)
    }).gc('inner')

    bench('intrusive linked list', () => {
      const item = items[N >> 1]
      ll.remove(item)
      ll.add(item)
      do_not_optimize(ll.tail)
    }).gc('inner')

    bench('linked list (wrapper nodes)', () => {
      const item = items[N >> 1]
      wl.remove(item)
      wl.add(item)
      do_not_optimize(wl.nodeMap.size)
    }).gc('inner')

    bench('array (indexOf + splice)', () => {
      const item = items[N >> 1]
      na.remove(item)
      na.add(item)
      do_not_optimize(na.items.length)
    }).gc('inner')
  })
})

// --- Remove tail + re-add ---
summary(() => {
  group('remove + add tail (N=10000)', () => {
    bench('intrusive array (swap)', () => {
      const item = items[N - 1]
      ia.remove(item)
      ia.add(item)
      do_not_optimize(ia.items.length)
    }).gc('inner')

    bench('intrusive linked list', () => {
      const item = items[N - 1]
      ll.remove(item)
      ll.add(item)
      do_not_optimize(ll.tail)
    }).gc('inner')

    bench('linked list (wrapper nodes)', () => {
      const item = items[N - 1]
      wl.remove(item)
      wl.add(item)
      do_not_optimize(wl.nodeMap.size)
    }).gc('inner')

    bench('array (indexOf + splice)', () => {
      const item = items[N - 1]
      na.remove(item)
      na.add(item)
      do_not_optimize(na.items.length)
    }).gc('inner')
  })
})

await run()
