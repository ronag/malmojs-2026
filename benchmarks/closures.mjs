// Benchmark: Closures vs Opaque callbacks
import { run, bench, group, summary } from 'mitata'

function handler(opaque) {
  return opaque.a + opaque.b
}

const opaqueObj = { a: 0, b: 0 }
let counter = 0

summary(() => {
  group('closure vs opaque', () => {
    bench('closure (new function per call)', () => {
      const a = counter
      const b = counter + 1
      const fn = () => a + b
      counter = fn()
    }).gc('inner')

    bench('opaque (static function + data)', () => {
      opaqueObj.a = counter
      opaqueObj.b = counter + 1
      counter = handler(opaqueObj)
    }).gc('inner')
  })
})

// Batch pattern — more realistic allocation pressure
summary(() => {
  group('batch 1000 callbacks', () => {
    bench('1000 closures', () => {
      const fns = []
      for (let i = 0; i < 1000; i++) {
        const v = i
        fns.push(() => v + 1)
      }
      let sum = 0
      for (const fn of fns) sum += fn()
      return sum
    }).gc('inner')

    bench('1000 opaque calls', () => {
      const data = { v: 0 }
      const fn = (d) => d.v + 1
      let sum = 0
      for (let i = 0; i < 1000; i++) {
        data.v = i
        sum += fn(data)
      }
      return sum
    }).gc('inner')
  })
})

await run()
