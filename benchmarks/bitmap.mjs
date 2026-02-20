// Benchmark: Bitmap state vs object properties
import { run, bench, group, summary, do_not_optimize } from 'mitata'

// --- 31-property object state ---

class ObjectState {
  f0  = false; f1  = false; f2  = false; f3  = false; f4  = false
  f5  = false; f6  = false; f7  = false; f8  = false; f9  = false
  f10 = false; f11 = false; f12 = false; f13 = false; f14 = false
  f15 = false; f16 = false; f17 = false; f18 = false; f19 = false
  f20 = false; f21 = false; f22 = false; f23 = false; f24 = false
  f25 = false; f26 = false; f27 = false; f28 = false; f29 = false
  f30 = false
}

// 31 bits — all flags set
const ALL_SET = 0x7FFF_FFFF

// --- Test 31 values at the same time ---

summary(() => {
  group('test 31 flags (any set?)', () => {
    // Object: all flags true so no short-circuit — worst case for ||
    const s = new ObjectState()
    s.f30 = true  // only last one set — forces all 30 to be evaluated first
    bench('object: 31 || checks', () => {
      do_not_optimize(
        s.f0  || s.f1  || s.f2  || s.f3  || s.f4  || s.f5  || s.f6  ||
        s.f7  || s.f8  || s.f9  || s.f10 || s.f11 || s.f12 || s.f13 ||
        s.f14 || s.f15 || s.f16 || s.f17 || s.f18 || s.f19 || s.f20 ||
        s.f21 || s.f22 || s.f23 || s.f24 || s.f25 || s.f26 || s.f27 ||
        s.f28 || s.f29 || s.f30
      )
    })

    let state = 1 << 30  // only bit 30 set — equivalent worst case
    bench('bitmap: state & ALL_SET', () => {
      do_not_optimize(state & ALL_SET)
    })
  })
})

// --- Update 31 values at the same time ---

summary(() => {
  group('update 31 flags (bulk reset)', () => {
    const s = new ObjectState()
    bench('object: 31 property writes', () => {
      s.f0  = false; s.f1  = false; s.f2  = false; s.f3  = false; s.f4  = false
      s.f5  = false; s.f6  = false; s.f7  = false; s.f8  = false; s.f9  = false
      s.f10 = false; s.f11 = false; s.f12 = false; s.f13 = false; s.f14 = false
      s.f15 = false; s.f16 = false; s.f17 = false; s.f18 = false; s.f19 = false
      s.f20 = false; s.f21 = false; s.f22 = false; s.f23 = false; s.f24 = false
      s.f25 = false; s.f26 = false; s.f27 = false; s.f28 = false; s.f29 = false
      s.f30 = false
      do_not_optimize(s)
    })

    let state = ALL_SET
    bench('bitmap: state = 0', () => {
      state = 0
      do_not_optimize(state)
    })
  })
})

// --- Cache-line density: scan N objects vs N packed integers ---
//
// M3 Pro: L1d=64KB, L2=4MB, L3=30MB
// ObjectState with 31 booleans: ~152 bytes each (V8 in-object fields)
//   64K objects × 152 B = ~9.5 MB  → must fetch from L3/RAM
// Int32Array of states: 4 bytes each
//   64K states  ×   4 B = 256 KB   → fits comfortably in L2
//
const N = 64 * 1024

const objStates = Array.from({ length: N }, () => {
  const s = new ObjectState()
  // randomise to prevent constant-folding
  if (Math.random() < 0.01) s.f30 = true
  return s
})

const intStates = new Int32Array(N)
for (let i = 0; i < N; i++) {
  if (Math.random() < 0.01) intStates[i] = 1 << 30
}

summary(() => {
  group(`scan ${N} states for any flag set (cache-cold)`, () => {
    bench('object: 31 property reads × 64K', () => {
      let found = 0
      for (let i = 0; i < N; i++) {
        const s = objStates[i]
        if (s.f0  || s.f1  || s.f2  || s.f3  || s.f4  || s.f5  || s.f6  ||
            s.f7  || s.f8  || s.f9  || s.f10 || s.f11 || s.f12 || s.f13 ||
            s.f14 || s.f15 || s.f16 || s.f17 || s.f18 || s.f19 || s.f20 ||
            s.f21 || s.f22 || s.f23 || s.f24 || s.f25 || s.f26 || s.f27 ||
            s.f28 || s.f29 || s.f30) found++
      }
      do_not_optimize(found)
    })

    bench('bitmap: state & ALL_SET × 64K', () => {
      let found = 0
      for (let i = 0; i < N; i++) {
        if (intStates[i] & ALL_SET) found++
      }
      do_not_optimize(found)
    })
  })
})

await run()
