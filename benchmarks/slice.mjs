// Benchmark: Buffer vs @nxtedition/slice PoolAllocator
import { run, bench, group, summary } from 'mitata'
import { Slice, PoolAllocator } from '@nxtedition/slice'

const allocator = new PoolAllocator(128 * 1024 * 1024)

summary(() => {
  group('alloc/free 64 bytes', () => {
    bench('Buffer.alloc(64)', () => {
      Buffer.alloc(64)
    }).gc('inner')

    bench('PoolAllocator.realloc(64)', () => {
      const s = allocator.realloc(new Slice(), 64)
      allocator.realloc(s, 0)
    }).gc('inner')
  })
})

summary(() => {
  group('alloc/free 256 bytes', () => {
    bench('Buffer.alloc(256)', () => {
      Buffer.alloc(256)
    }).gc('inner')

    bench('PoolAllocator.realloc(256)', () => {
      const s = allocator.realloc(new Slice(), 256)
      allocator.realloc(s, 0)
    }).gc('inner')
  })
})

summary(() => {
  group('subarray 64 bytes', () => {
    const buf = Buffer.alloc(1024)

    bench('Buffer.subarray(0, 64)', () => {
      buf.subarray(0, 64)
    }).gc('inner')

    bench('new Slice(buffer, 0, 64)', () => {
      new Slice(buf, 0, 64, 64)
    }).gc('inner')
  })
})

summary(() => {
  group('realloc churn (64 → 128 → 64)', () => {
    bench('Buffer churn', () => {
      Buffer.alloc(64)
      Buffer.alloc(128)
      Buffer.alloc(64)
    }).gc('inner')

    bench('PoolAllocator churn', () => {
      const s = allocator.realloc(new Slice(), 64)
      allocator.realloc(s, 128)
      allocator.realloc(s, 64)
      allocator.realloc(s, 0)
    }).gc('inner')
  })
})

summary(() => {
  group('realloc in-place (grow within bucket)', () => {
    bench('Buffer realloc', () => {
      Buffer.alloc(32)
      Buffer.alloc(60)
    }).gc('inner')

    bench('PoolAllocator realloc in-place', () => {
      const s = allocator.realloc(new Slice(), 32)
      allocator.realloc(s, 60) // Same bucket (64), no move
      allocator.realloc(s, 0)
    }).gc('inner')
  })
})

// Batch pattern — shows GC cost at scale
summary(() => {
  group('batch 100 alloc then free', () => {
    bench('Buffer batch 100', () => {
      const bufs = []
      for (let i = 0; i < 100; i++) bufs.push(Buffer.alloc(64))
    }).gc('inner')

    bench('PoolAllocator batch 100', () => {
      const slices = []
      for (let i = 0; i < 100; i++) {
        slices.push(allocator.realloc(new Slice(), 64))
      }
      for (const s of slices) allocator.realloc(s, 0)
    })
  })
})

await run()
