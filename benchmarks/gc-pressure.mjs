// Benchmark: Demonstrating GC impact on different patterns
import { run, bench, group, summary } from 'mitata'

summary(() => {
  group('object allocation patterns', () => {
    bench('short-lived objects (young gen)', () => {
      const obj = { x: 1, y: 2, z: 3 }
      return obj.x + obj.y + obj.z
    }).gc('inner')

    const reusable = { x: 0, y: 0, z: 0 }
    bench('reused object (zero alloc)', () => {
      reusable.x = 1
      reusable.y = 2
      reusable.z = 3
      return reusable.x + reusable.y + reusable.z
    }).gc('inner')
  })
})

summary(() => {
  group('batch 1000 object allocations', () => {
    bench('1000 new objects', () => {
      const arr = []
      for (let i = 0; i < 1000; i++) {
        arr.push({ x: i, y: i + 1, z: i + 2 })
      }
      return arr.length
    }).gc('inner')

    bench('1000 reused objects', () => {
      const arr = new Array(1000)
      const obj = { x: 0, y: 0, z: 0 }
      for (let i = 0; i < 1000; i++) {
        obj.x = i
        obj.y = i + 1
        obj.z = i + 2
        arr[i] = obj.x + obj.y + obj.z
      }
      return arr.length
    }).gc('inner')
  })
})

summary(() => {
  group('array patterns', () => {
    bench('new Array + push 100', () => {
      const arr = []
      for (let i = 0; i < 100; i++) arr.push(i)
    }).gc('inner')

    const reusableArr = new Array(100)
    bench('reused pre-allocated array 100', () => {
      for (let i = 0; i < 100; i++) reusableArr[i] = i
    }).gc('inner')
  })
})

summary(() => {
  group('Map vs plain object for cache', () => {
    bench('new Map per operation', () => {
      const m = new Map()
      m.set('a', 1)
      m.set('b', 2)
      return m.get('a') + m.get('b')
    }).gc('inner')

    bench('plain object per operation', () => {
      const o = { a: 1, b: 2 }
      return o.a + o.b
    }).gc('inner')
  })
})

await run()
