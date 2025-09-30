---
title: Composable Allocation Strategies
---

In many systems languages, memory management is a monolithic concern. You use a
global allocator (`malloc`, `new`) for nearly everything, and while this is
flexible, it leads to performance bottlenecks, fragmentation, and makes
reasoning about memory lifetimes difficult. A core tenet of
[[Modern C Programming Methodologies]], popularized by languages like [[Zig]],
is the concept of **allocator passing**: functions should not reach for a global
allocator but should instead accept an `Allocator` object as a parameter.

This is a powerful pattern allowing the caller to decide where memory should
come from: a per-thread arena, a temporary "scratch" buffer, or the global
heap; making code more modular, testable, and performant. Ribbon embraces this
philosophy but elevates it to a first-class, type-safe language feature,
eliminating the primary drawback of the manual C/[[Zig]] approach: the cognitive
overhead of explicitly passing allocator arguments everywhere.

Ribbon's approach is built on three pillars: making allocation an effect, giving
allocators typed identities, and tracking memory regions within the type system.

#### Allocation as an Effect

In Ribbon, functions that need to allocate memory don't take an explicit
allocator parameter. Instead, their type signature declares that they perform an
`alloc` effect.

- **Requesting Memory:** A function that needs memory simply *requests* it from
  the environment: `let new_node = alloc(Node)`.
  
- **Handling the Request:** The caller provides an allocator that *handles* this
  effect for the scope of the call. For example,
  `with_allocator(my_arena, build_tree)`.

This achieves the same goal as manual allocator passing, but the compiler does
the plumbing for you. The code becomes cleaner and less verbose, while the
fundamental principle of caller-controlled allocation is preserved.

#### Typed Allocators and Regions

The true power of Ribbon's system comes from making these allocators visible to
the type system. In Ribbon, every allocator instance is given a unique,
compile-time "name" in the form of a **symbolic phantom type**.

When an allocator provides a block of memory, that memory region and any pointer
to it is "tagged" with the allocator's symbolic name. A pointer's type in Ribbon
doesn't just describe the data it points to; it describes *what region of memory
it belongs to*.

For example, a pointer might have the type `*'my_arena Node`, signifying it's a
pointer to a `Node` allocated within the `my_arena` region. This allows the type
system to reason about memory regions and enforce powerful safety guarantees at
compile time, and surfaces a wide region of previously implicit programmer
knowledge.

#### Advanced, Composable Memory Architectures

This combination of effect-based allocation and type-level region tracking makes
memory management a compositional and user-space concern, enabling incredibly
powerful architectures that are safe by construction. 

This architecture opens the door to a host of possibilities:

- Creating transient, "scratch" allocators for UI frames that are guaranteed by
  the type system to never leak into long-term state.
- Swapping in a debugging allocator to profile memory usage without changing any
  application logic.
- Building sandboxes for guest code where the guest is given an allocator for
  its own private memory region, and the type system can prove it never touches
  host memory.

Our [[Hot Module Reloading]] system is a great example of this.

In Ribbon, an allocator is not just a source of memory; it is a compositional
building block for creating robust, high-performance, and verifiable memory
architectures.