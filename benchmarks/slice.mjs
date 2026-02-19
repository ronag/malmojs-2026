// Benchmark: Buffer vs @nxtedition/slice PoolAllocator
import { run, bench, group, summary, do_not_optimize } from 'mitata'
import { Slice, PoolAllocator } from '@nxtedition/slice'

const allocator = new PoolAllocator(128 * 1024 * 1024)

summary(() => {
  group('alloc/free 1024 bytes', () => {
    bench('Buffer.allocUnsafe(1024)', () => {
      do_not_optimize(Buffer.allocUnsafe(1024))
    }).gc('inner')

    bench('PoolAllocator.realloc(1024)', () => {
      const s = allocator.realloc(new Slice(), 1024)
      do_not_optimize(s)
      allocator.realloc(s, 0)
    }).gc('inner')
  })
})

summary(() => {
  group('alloc/free 8192 bytes', () => {
    bench('Buffer.allocUnsafe(8192)', () => {
      do_not_optimize(Buffer.allocUnsafe(8192))
    }).gc('inner')

    bench('PoolAllocator.realloc(8192)', () => {
      const s = allocator.realloc(new Slice(), 8192)
      do_not_optimize(s)
      allocator.realloc(s, 0)
    }).gc('inner')
  })
})

summary(() => {
  group('subarray 64 bytes', () => {
    const buf = Buffer.alloc(1024)

    bench('Buffer.subarray(0, 64)', () => {
      do_not_optimize(buf.subarray(0, 64))
    }).gc('inner')

    bench('new Slice(buffer, 0, 64)', () => {
      do_not_optimize(new Slice(buf, 0, 64, 64))
    }).gc('inner')
  })
})

summary(() => {
  group('realloc churn (1024 → 2048 → 1024)', () => {
    bench('Buffer churn', () => {
      do_not_optimize(Buffer.allocUnsafe(1024))
      do_not_optimize(Buffer.allocUnsafe(2048))
      do_not_optimize(Buffer.allocUnsafe(1024))
    }).gc('inner')

    bench('PoolAllocator churn', () => {
      const s = allocator.realloc(new Slice(), 1024)
      allocator.realloc(s, 2048)
      allocator.realloc(s, 1024)
      do_not_optimize(s)
      allocator.realloc(s, 0)
    }).gc('inner')
  })
})

// Isolate just the realloc — pre-allocate outside the loop
{
  const s = allocator.realloc(new Slice(), 512)
  summary(() => {
    group('realloc in-place (same bucket, no GC)', () => {
      bench('PoolAllocator realloc 512→1000', () => {
        allocator.realloc(s, 1000) // Same bucket (1024), just update length
        allocator.realloc(s, 512)  // Back to 512, still same bucket
        do_not_optimize(s)
      })
    })
  })
}

// Batch pattern — shows GC cost at scale
summary(() => {
  group('batch 100 alloc then free', () => {
    bench('Buffer batch 100', () => {
      const bufs = []
      for (let i = 0; i < 100; i++) bufs.push(Buffer.allocUnsafe(1024))
      do_not_optimize(bufs)
    }).gc('inner')

    bench('PoolAllocator batch 100', () => {
      const slices = []
      for (let i = 0; i < 100; i++) {
        slices.push(allocator.realloc(new Slice(), 1024))
      }
      do_not_optimize(slices)
      for (const s of slices) allocator.realloc(s, 0)
    })
  })
})

await run()
