// Benchmark: Cross-thread communication patterns
// MessagePort (postMessage) vs @nxtedition/shared ring buffer
import { run, bench, group, summary } from 'mitata'
import { MessageChannel } from 'node:worker_threads'
import { alloc, reader, writer } from '@nxtedition/shared'

const SMALL = 64    // typical small message
const MEDIUM = 1024 // typical medium message

// --- Ring buffer: write + read roundtrip ---

function makeRing() {
  const shared = alloc(16 * 1024 * 1024)
  return { w: writer(shared), r: reader(shared) }
}

const ring1 = makeRing()

summary(() => {
  group(`write + read ${SMALL} bytes`, () => {
    const buf = Buffer.alloc(SMALL, 0x42)

    bench('ring buffer (write + read)', () => {
      ring1.w.writeSync(SMALL, (data) => {
        buf.copy(data.buffer, data.offset)
        return data.offset + SMALL
      })
      ring1.r.readSome(() => {})
    }).gc('inner')
  })
})

const ring2 = makeRing()

summary(() => {
  group(`write + read ${MEDIUM} bytes`, () => {
    const buf = Buffer.alloc(MEDIUM, 0x42)

    bench('ring buffer (write + read)', () => {
      ring2.w.writeSync(MEDIUM, (data) => {
        buf.copy(data.buffer, data.offset)
        return data.offset + MEDIUM
      })
      ring2.r.readSome(() => {})
    }).gc('inner')
  })
})

// --- Batch throughput ---

const ring3 = makeRing()

summary(() => {
  group(`batch 100 × ${SMALL}b write + readSome`, () => {
    const buf = Buffer.alloc(SMALL, 0x42)

    bench('ring buffer corked batch 100', () => {
      ring3.w.cork(() => {
        for (let i = 0; i < 100; i++) {
          ring3.w.writeSync(SMALL, (data) => {
            buf.copy(data.buffer, data.offset)
            return data.offset + SMALL
          })
        }
      })
      ring3.r.readSome(() => {})
    }).gc('inner')
  })
})

// --- postMessage vs ring buffer (write + immediate read to prevent fill) ---

const { port1, port2 } = new MessageChannel()
port2.on('message', () => {})

const ring4 = makeRing()

summary(() => {
  group(`send ${SMALL} bytes`, () => {
    const buf = Buffer.alloc(SMALL, 0x42)

    bench('MessagePort postMessage', () => {
      port1.postMessage(buf)
    }).gc('inner')

    bench('ring buffer writeSync + readSome', () => {
      ring4.w.writeSync(SMALL, (data) => {
        buf.copy(data.buffer, data.offset)
        return data.offset + SMALL
      })
      ring4.r.readSome(() => {})
    }).gc('inner')
  })
})

const ring5 = makeRing()

summary(() => {
  group(`send ${MEDIUM} bytes`, () => {
    const buf = Buffer.alloc(MEDIUM, 0x42)

    bench('MessagePort postMessage', () => {
      port1.postMessage(buf)
    }).gc('inner')

    bench('ring buffer writeSync + readSome', () => {
      ring5.w.writeSync(MEDIUM, (data) => {
        buf.copy(data.buffer, data.offset)
        return data.offset + MEDIUM
      })
      ring5.r.readSome(() => {})
    }).gc('inner')
  })
})

// --- Object message (common pattern) ---

const ring6 = makeRing()

summary(() => {
  group('send object message', () => {
    const msg = { type: 'log', ts: Date.now(), level: 30, msg: 'hello' }

    bench('MessagePort postMessage (object)', () => {
      port1.postMessage(msg)
    }).gc('inner')

    bench('ring buffer (pre-serialized JSON)', () => {
      ring6.w.writeSync(256, (data) => {
        return data.offset + data.buffer.write(JSON.stringify(msg), data.offset)
      })
      ring6.r.readSome(() => {})
    }).gc('inner')
  })
})

// --- Batch postMessage vs ring buffer ---

const ring7 = makeRing()

summary(() => {
  group('batch 100 messages', () => {
    const buf = Buffer.alloc(SMALL, 0x42)

    bench('MessagePort 100× postMessage', () => {
      for (let i = 0; i < 100; i++) {
        port1.postMessage(buf)
      }
    }).gc('inner')

    bench('ring buffer corked 100× write + read', () => {
      ring7.w.cork(() => {
        for (let i = 0; i < 100; i++) {
          ring7.w.writeSync(SMALL, (data) => {
            buf.copy(data.buffer, data.offset)
            return data.offset + SMALL
          })
        }
      })
      ring7.r.readSome(() => {})
    }).gc('inner')
  })
})

await run()

port1.close()
port2.close()
