// Benchmark: Native setTimeout vs @nxtedition/timers
import { run, bench, group, summary } from 'mitata'
import { setTimeout as pooledTimeout, clearTimeout as pooledClear } from '@nxtedition/timers'

summary(() => {
  group('create + clear', () => {
    bench('native setTimeout', () => {
      const t = globalThis.setTimeout(() => {}, 5000)
      globalThis.clearTimeout(t)
    }).gc('inner')

    bench('pooled setTimeout', () => {
      const t = pooledTimeout(() => {}, 5000)
      pooledClear(t)
    }).gc('inner')
  })
})

summary(() => {
  group('batch create + clear 100x', () => {
    bench('native batch 100x', () => {
      const timers = []
      for (let i = 0; i < 100; i++) {
        timers.push(globalThis.setTimeout(() => {}, 5000))
      }
      for (const t of timers) {
        globalThis.clearTimeout(t)
      }
    }).gc('inner')

    bench('pooled batch 100x', () => {
      const timers = []
      for (let i = 0; i < 100; i++) {
        timers.push(pooledTimeout(() => {}, 5000))
      }
      for (const t of timers) {
        pooledClear(t)
      }
    }).gc('inner')
  })
})

await run()
