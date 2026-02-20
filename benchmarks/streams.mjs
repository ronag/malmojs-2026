// Benchmark: Web Streams vs Node.js Streams allocation + throughput
import { run, bench, group, summary, do_not_optimize } from 'mitata'
import { Readable, pipeline as nodePipeline } from 'node:stream'
import { promisify } from 'node:util'

const pipelineAsync = promisify(nodePipeline)

// --- Allocation ---

summary(() => {
  group('stream allocation (per HTTP request cost)', () => {
    bench('new ReadableStream (Web)', () => {
      const s = new ReadableStream({ start() {} })
      do_not_optimize(s)
    }).gc('inner')

    bench('new Readable (Node)', () => {
      const s = new Readable({ read() {} })
      do_not_optimize(s)
    }).gc('inner')
  })
})

const { Writable } = await import('node:stream')

const CHUNK_SIZE = 64 * 1024
const NUM_CHUNKS = 500
const chunks = Array.from({ length: NUM_CHUNKS }, () => Buffer.allocUnsafe(CHUNK_SIZE))

// --- Read-only: consume a stream source (64KB x 500) ---

summary(() => {
  group('read-only: consume stream (64KB x 500)', () => {
    bench('Web ReadableStream', async () => {
      let i = 0
      const src = new ReadableStream({
        pull(controller) {
          if (i < NUM_CHUNKS) controller.enqueue(chunks[i++])
          else controller.close()
        }
      })
      let bytes = 0
      for await (const chunk of src) bytes += chunk.byteLength
      do_not_optimize(bytes)
    })

    bench('Node Readable (events)', async () => {
      let i = 0
      const src = new Readable({
        read() {
          if (i < NUM_CHUNKS) this.push(chunks[i++])
          else this.push(null)
        }
      })
      let bytes = 0
      await new Promise((resolve, reject) => {
        src.on('data', (chunk) => { bytes += chunk.byteLength })
        src.on('end', resolve)
        src.on('error', reject)
      })
      do_not_optimize(bytes)
    })
  })
})

// --- Write-only: push data into a stream sink (64KB x 500) ---

summary(() => {
  group('write-only: push to stream sink (64KB x 500)', () => {
    bench('Web WritableStream', async () => {
      let bytes = 0
      const sink = new WritableStream({
        write(chunk) { bytes += chunk.byteLength }
      })
      const writer = sink.getWriter()
      for (let i = 0; i < NUM_CHUNKS; i++) await writer.write(chunks[i])
      await writer.close()
      do_not_optimize(bytes)
    })

    bench('Node Writable', async () => {
      let bytes = 0
      const sink = new Writable({
        write(chunk, _, cb) { bytes += chunk.byteLength; cb() }
      })
      await new Promise((resolve, reject) => {
        sink.on('finish', resolve).on('error', reject)
        for (let i = 0; i < NUM_CHUNKS; i++) sink.write(chunks[i])
        sink.end()
      })
      do_not_optimize(bytes)
    })
  })
})

// --- Pipeline passthrough: 64KB x 500 chunks ---

summary(() => {
  group('pipeline passthrough (64KB x 500)', () => {
    bench('Web Streams pipeline', async () => {
      let i = 0
      const src = new ReadableStream({
        pull(controller) {
          if (i < NUM_CHUNKS) controller.enqueue(chunks[i++])
          else controller.close()
        }
      })
      let bytes = 0
      const sink = new WritableStream({
        write(chunk) { bytes += chunk.byteLength }
      })
      await src.pipeTo(sink)
      do_not_optimize(bytes)
    })

    bench('Node Streams pipeline', async () => {
      let i = 0
      const src = new Readable({
        read() {
          if (i < NUM_CHUNKS) this.push(chunks[i++])
          else this.push(null)
        }
      })
      let bytes = 0
      const sink = new Writable({
        write(chunk, _, cb) { bytes += chunk.byteLength; cb() }
      })
      await pipelineAsync(src, sink)
      do_not_optimize(bytes)
    })
  })
})

await run()
