// Benchmark: cached time vs Date.now() / toISOString()
import { run, bench, group, summary } from 'mitata'

let fastNow = Date.now()
let fastISO = new Date().toISOString()
const interval = setInterval(() => {
  fastNow = Date.now()
  fastISO = new Date().toISOString()
}, 1e3)
interval.unref()

let sink

summary(() => {
  group('Date.now()', () => {
    bench('Date.now()', () => {
      sink = Date.now()
    }).gc('inner')

    bench('fastNow (cached)', () => {
      sink = fastNow
    }).gc('inner')
  })
})

summary(() => {
  group('toISOString()', () => {
    bench('new Date().toISOString()', () => {
      sink = new Date().toISOString()
    }).gc('inner')

    bench('fastISO (cached)', () => {
      sink = fastISO
    }).gc('inner')
  })
})

await run()

clearInterval(interval)
