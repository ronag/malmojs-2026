// Benchmark: Buffer.subarray() vs Slice (plain object mutation)
import { run, bench, group, summary, do_not_optimize } from 'mitata'

const SIZE = 4096
const buf = Buffer.allocUnsafe(SIZE)
buf.fill(0x42)

class Slice {
  buffer = null
  byteOffset = 0
  byteLength = 0
}

// Pre-allocate a reusable slice
const slice = new Slice()

summary(() => {
  group('subarray vs slice (split header + body)', () => {
    bench('Buffer.subarray()', () => {
      const header = buf.subarray(0, 4)
      const body = buf.subarray(4)
      do_not_optimize(header[0] + header[3] + body[0] + body[body.byteLength - 1])
    }).gc('inner')

    bench('Slice (mutate)', () => {
      slice.buffer = buf
      slice.byteOffset = 0
      slice.byteLength = 4
      const h = slice.buffer[slice.byteOffset] + slice.buffer[slice.byteOffset + 3]
      slice.byteOffset = 4
      slice.byteLength = SIZE - 4
      do_not_optimize(h + slice.buffer[slice.byteOffset] + slice.buffer[slice.byteOffset + slice.byteLength - 1])
    }).gc('inner')

    bench('Slice (new)', () => {
      const header = new Slice()
      header.buffer = buf
      header.byteOffset = 0
      header.byteLength = 4
      const body = new Slice()
      body.buffer = buf
      body.byteOffset = 4
      body.byteLength = SIZE - 4
      do_not_optimize(header.buffer[header.byteOffset] + header.buffer[header.byteOffset + 3] + body.buffer[body.byteOffset] + body.buffer[body.byteOffset + body.byteLength - 1])
    }).gc('inner')
  })
})

await run()
