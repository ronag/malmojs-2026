// Benchmark: Atomics overhead — plain vs atomic operations
import { run, bench, group, summary, do_not_optimize } from 'mitata'

const sab = new SharedArrayBuffer(256)
const i32 = new Int32Array(sab)
const u8 = new Uint8Array(sab)

// --- Plain vs Atomic read/write ---

summary(() => {
  group('read i32[0]', () => {
    bench('plain read', () => {
      do_not_optimize(i32[0])
    }).gc('inner')

    bench('Atomics.load', () => {
      do_not_optimize(Atomics.load(i32, 0))
    }).gc('inner')
  })
})

summary(() => {
  group('write i32[0]', () => {
    let i = 0
    bench('plain write', () => {
      i32[0] = ++i
    }).gc('inner')

    let j = 0
    bench('Atomics.store', () => {
      Atomics.store(i32, 0, ++j)
    }).gc('inner')
  })
})

// --- Read + Write roundtrip ---

summary(() => {
  group('read + write i32[0]', () => {
    bench('plain read + write', () => {
      const v = i32[0]
      i32[0] = v + 1
      do_not_optimize(v)
    }).gc('inner')

    bench('Atomics.load + Atomics.store', () => {
      const v = Atomics.load(i32, 0)
      Atomics.store(i32, 0, v + 1)
      do_not_optimize(v)
    }).gc('inner')
  })
})

// --- Batched writes: 1 store vs N stores ---

summary(() => {
  group('100 increments', () => {
    bench('plain write × 100', () => {
      for (let i = 0; i < 100; i++) {
        i32[0] = i
      }
      do_not_optimize(i32[0])
    }).gc('inner')

    bench('Atomics.store × 100', () => {
      for (let i = 0; i < 100; i++) {
        Atomics.store(i32, 0, i)
      }
      do_not_optimize(i32[0])
    }).gc('inner')

    bench('plain write × 100, Atomics.store × 1 (batched)', () => {
      for (let i = 0; i < 100; i++) {
        i32[0] = i
      }
      Atomics.store(i32, 0, i32[0])
      do_not_optimize(i32[0])
    }).gc('inner')
  })
})

// --- Atomics.exchange / compareExchange ---

summary(() => {
  group('atomic exchange operations', () => {
    bench('Atomics.store', () => {
      do_not_optimize(Atomics.store(i32, 0, 42))
    }).gc('inner')

    bench('Atomics.exchange', () => {
      do_not_optimize(Atomics.exchange(i32, 0, 42))
    }).gc('inner')

    bench('Atomics.compareExchange', () => {
      do_not_optimize(Atomics.compareExchange(i32, 0, 42, 43))
    }).gc('inner')

    bench('Atomics.add', () => {
      do_not_optimize(Atomics.add(i32, 0, 1))
    }).gc('inner')
  })
})

// --- Buffer copy: plain vs with atomic fence ---

summary(() => {
  group('copy 64 bytes + publish', () => {
    const src = Buffer.alloc(64, 0x42)

    bench('u8.set + plain write', () => {
      u8.set(src, 128)
      i32[0] = 64
    }).gc('inner')

    bench('u8.set + Atomics.store', () => {
      u8.set(src, 128)
      Atomics.store(i32, 0, 64)
    }).gc('inner')
  })
})

summary(() => {
  group('copy 1024 bytes + publish', () => {
    const src = Buffer.alloc(1024, 0x42)
    const bigSab = new SharedArrayBuffer(2048)
    const bigU8 = new Uint8Array(bigSab)
    const bigI32 = new Int32Array(bigSab)

    bench('u8.set + plain write', () => {
      bigU8.set(src, 1024)
      bigI32[0] = 1024
    }).gc('inner')

    bench('u8.set + Atomics.store', () => {
      bigU8.set(src, 1024)
      Atomics.store(bigI32, 0, 1024)
    }).gc('inner')
  })
})

// --- notify without waiters (common case) ---

summary(() => {
  group('Atomics.notify (no waiters)', () => {
    bench('Atomics.notify(0 waiters)', () => {
      do_not_optimize(Atomics.notify(i32, 0, 1))
    }).gc('inner')

    bench('Atomics.store + notify', () => {
      Atomics.store(i32, 0, 42)
      do_not_optimize(Atomics.notify(i32, 0, 1))
    }).gc('inner')
  })
})

await run()
