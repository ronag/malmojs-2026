// Benchmark: Function queue — closures vs flat callback+opaque array
import { run, bench, group, summary } from 'mitata'

// --- Closure-based queue ---
class ClosureQueue {
  constructor() {
    this.head = 0
    this.tail = 0
    this.fns = new Array(1024)
  }
  push(fn) {
    this.fns[this.tail++] = fn
  }
  drain() {
    while (this.head < this.tail) {
      this.fns[this.head]()
      this.fns[this.head++] = undefined
    }
    this.head = 0
    this.tail = 0
  }
}

// --- Flat callback+opaque queue ---
class FlatQueue {
  constructor() {
    this.head = 0
    this.tail = 0
    this.fns = new Array(2048)  // pairs: [callback, opaque, callback, opaque, ...]
  }
  push(callback, opaque) {
    this.fns[this.tail++] = callback
    this.fns[this.tail++] = opaque
  }
  drain() {
    while (this.head < this.tail) {
      const fn = this.fns[this.head]
      const opaque = this.fns[this.head + 1]
      this.fns[this.head] = undefined
      this.fns[this.head + 1] = undefined
      this.head += 2
      fn(opaque)
    }
    this.head = 0
    this.tail = 0
  }
}

// Shared handler for flat queue
function handler(opaque) {
  opaque.sum += opaque.value
}

const opaqueObj = { sum: 0, value: 0 }

summary(() => {
  group('queue: push + drain 100 items', () => {
    bench('closure queue', () => {
      const q = new ClosureQueue()
      let sum = 0
      for (let i = 0; i < 100; i++) {
        const v = i
        q.push(() => { sum += v })
      }
      q.drain()
      return sum
    }).gc('inner')

    bench('flat queue (cb + opaque)', () => {
      const q = new FlatQueue()
      opaqueObj.sum = 0
      for (let i = 0; i < 100; i++) {
        opaqueObj.value = i
        q.push(handler, opaqueObj)
      }
      q.drain()
      return opaqueObj.sum
    }).gc('inner')
  })
})

summary(() => {
  group('queue: push + drain 1000 items', () => {
    bench('closure queue', () => {
      const q = new ClosureQueue()
      let sum = 0
      for (let i = 0; i < 1000; i++) {
        const v = i
        q.push(() => { sum += v })
      }
      q.drain()
      return sum
    }).gc('inner')

    bench('flat queue (cb + opaque)', () => {
      const q = new FlatQueue()
      opaqueObj.sum = 0
      for (let i = 0; i < 1000; i++) {
        opaqueObj.value = i
        q.push(handler, opaqueObj)
      }
      q.drain()
      return opaqueObj.sum
    }).gc('inner')
  })
})

// Reusable queue instances — amortize queue allocation
const closureQ = new ClosureQueue()
const flatQ = new FlatQueue()

summary(() => {
  group('reused queue: push + drain 100 items', () => {
    bench('closure queue', () => {
      let sum = 0
      for (let i = 0; i < 100; i++) {
        const v = i
        closureQ.push(() => { sum += v })
      }
      closureQ.drain()
      return sum
    }).gc('inner')

    bench('flat queue (cb + opaque)', () => {
      opaqueObj.sum = 0
      for (let i = 0; i < 100; i++) {
        opaqueObj.value = i
        flatQ.push(handler, opaqueObj)
      }
      flatQ.drain()
      return opaqueObj.sum
    }).gc('inner')
  })
})

await run()
