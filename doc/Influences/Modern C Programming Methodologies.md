The term "modern C" in the context of Ribbon's design does not refer to recent C
language standards (like C11 or C23), but to a specific philosophy and set of
programming methodologies that have gained prominence in performance-critical
fields like game development and systems tooling. It is a subculture of C/C++
programming that favors simplicity, explicitness, and a deep understanding of
the underlying hardware.

This approach stands in contrast to the more traditional C++ style, which often
emphasizes heavy abstraction, object-oriented hierarchies, and hidden control
flow (e.g., complex constructors/destructors, exceptions). The "modern C"
philosophy is a direct ancestor of the principles found in languages like
[[Zig]] and was championed by figures like
[Ryan Fleury](https://www.rfleury.com/) and the team behind the
[Our Machinery](https://ruby0x1.github.io/machinery_blog_archive/) engine.

The core tenets of this philosophy are:

#### Data-Oriented Design (DOD)

Instead of organizing code around objects and their behaviors (Object-Oriented
Programming), DOD organizes code around the data itself and how it is laid out
in memory. The primary goal is to work *with* the hardware, not against it. This
means arranging data to be friendly to the CPU cache, which is crucial for high
performance.

- **Key Idea:** Structures are just plain old data (PODs). Code is organized
  into functions that transform batches of this data, often processing
  contiguous arrays of structures to maximize cache hits.
  
- **Impact:** This leads to simpler, more predictable, and often dramatically
  faster code than a heavily object-oriented equivalent where data is scattered
  across memory. Ribbon's lightweight, composable component design is a direct
  application of this principle.

#### Explicit, Structured Memory Management

This is perhaps the most defining characteristic of the methodology. It's a
rejection of the ubiquitous `malloc`/`free` pattern for every small allocation.
Individual, un-scoped allocations are seen as a source of performance loss (due
to overhead and locking), memory fragmentation, and complex bugs (like
use-after-free).

The solution is to manage memory in large, contiguous blocks with clear
ownership and lifetimes.

**Arena (or Region) Allocation:** The most common pattern is the **arena
allocator** (also called a region or bump allocator).

- **How it works:** You allocate a single, large block of memory from the
  operating system at the start of a process or frame.

- **Allocating:** To allocate memory from the arena, you simply "bump" a pointer
  forward by the requested size. This is incredibly fast: often just a single
  instruction.

- **Deallocating:** You don't `free` individual objects. Instead, you deallocate
  the *entire* arena at once by resetting the bump pointer to the beginning.

This model is perfect for data that shares a common lifetime, such as all the
assets loaded for a single game level, all the data for a single frame of
computation, or all the nodes in a compiler's Abstract Syntax Tree.

**Composable Allocators:** A key insight, heavily popularized by [[Zig]], is
that functions should not be hard-coded to use a single global allocator
(`malloc`). Instead, they should accept an `Allocator` interface as a parameter.
This makes code more modular, testable, and flexible. The caller can decide
whether a function's memory should come from the global heap, a temporary frame
arena, or a fixed-size buffer on the stack.

#### Minimal Runtime and Hidden Complexity

This philosophy advocates for keeping things simple and transparent.

- **No Hidden Code:** Avoid language features that hide expensive operations or
  control flow. This means being wary of complex constructors that might
  allocate memory or heavy RAII patterns that can make the lifetime of resources
  difficult to track.

- **Minimal Dependencies:** The final executable should be lean, with a minimal,
  optional runtime. You only pay for what you explicitly use.

- **Simple Tooling:** The build process should be straightforward and fast.

#### Relevance to Ribbon

Ribbon is deeply inspired by this entire philosophy. We aim to take these
powerful C methodologies, which often rely on programmer discipline; and elevate
them into first-class, safer language constructs.

- **Structured Allocation as a Language Feature:** Ribbon's type system, which
  tracks the allocator that owns a piece of memory, is a formalization of the
  composable allocator pattern. It makes an implicit C convention an explicit,
  statically-checked guarantee.

- **Performance:** The "near-metal speed" of Ribbon's host-side API is a direct
  result of embracing these memory management strategies. Using arenas and
  simple data structures is the key to our minimal runtime and low memory
  footprint.

- **Safety and Control:** While the C approach provides raw power, it's also
  prone to segfaults. Ribbon's central design challenge was to keep this
  performance and control for host code while providing verifiable safety for
  guest code. Our type system, which understands memory regions and ownership,
  is the bridge that makes this possible.