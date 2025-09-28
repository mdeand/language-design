### A Decade-Long Detour

*by [noxabellus](https://noxabell.us), Founder/CEO*

---

The line between the developer and the user is often arbitrary and ultimately
futile in its designation: a sufficiently motivated community will always erase
it.

The choice is whether they have to fight the system to do it, through reverse
engineering; or if the system is designed to welcome them.

The fundamental difference here is between building a product and building an *ecosystem*.

A product is a sealed artifact. Its features are defined by its creator.

An ecosystem is a platform. It provides a core set of capabilities and,
crucially, a stable, powerful framework for others to build upon. Its value is
defined not just by the original creator, but by the collective creativity of
its entire community.

Some concrete examples to illustrate the economic and cultural power of this
distinction:

* **Pixar vs. Autodesk**: This is the classic failure case. Autodesk built a
  product. It was a very good product, but it was fundamentally closed. Pixar,
  as a power user, hit the ceiling of what that product could do. Their needs
  evolved faster than Autodesk could meet them. Because the platform wasn't
  truly extensible, they were forced to abandon it and build their own, a
  massive "money pit" that could have been avoided if the original tool had been
  designed as an ecosystem.

* **Bethesda**: This is the fascinating, almost paradoxical success case. They
  ship products with undeniable flaws, yet they are one of the most successful
  studios in history. Why? Because they aren't just selling a game; they are
  selling a platform for creativity. The Creation Kit isn't an afterthought;
  it's arguably their most important product. The modding community doesn't just
  fix bugs; they generate endless content, keeping games like Morrowind and
  Skyrim relevant and selling copies decades later. Bethesda built an ecosystem,
  and that ecosystem is so powerful it makes them nearly immune to problems that
  would sink other studios.

This philosophy ties directly back to language design. A language can either
encourage or discourage the creation of ecosystems. Ribbon is a language
designed with extensibility in mind: one with a powerful metaprogramming story
that can be leveraged by plugins, a clear path to a stable ABI, and tools for
sandboxing; it is a language for building ecosystems.

It's a language where the "build meta program" isn't a cludgeonly tool or a
responsibility for the original developer to bear. It's a first-class feature
that can be exposed to plugins, allowing them to deeply and safely integrate
with the host application in a way that just isn't possible in many other
systems languages.

My journey with this design began around a decade ago, born from a deep
appreciation for extensible software. I started by studying established
open-source languages, initially captivated by [[Lua & Luau|Lua]]. The ideas I
found in [[Terra]], however, were world-changing for me. They brought back the
golden age of [[LISP]]-like metaprogramming and solidified my view of
programming languages as powerful toolkits.

But even with [[Terra]]'s incredible freedom, I found myself wanting more;
specifically, more control. I was working on projects where I needed to run
untrusted, user-submitted code, and my attempts to build sandboxes for my
[[Terra]]-based extensions were easily escaped. Its power was its weakness in
this context. It’s worth noting that at the time, [[Lua & Luau|Luau]] hadn't yet
open-sourced their fantastic, gradually-typed, and sandboxed version of
[[Lua & Luau|Lua]], which would have been a game-changer. I was facing a
problem: how do you give users immense power without exposing the system to
chaos?

This challenge became a core motivator. While I deeply respect the languages
that inspired me, and I believe good community management is the first line of
defense against exploits, I felt there was room for a different approach. I
wanted to ease the security burden on both developers and end-users. So, with
several years of prototyping already behind me, I decided to go back to the
drawing board and dive deep into academic research.

My focus turned to type systems, and I crawled through hundreds of papers. Many
of the most profound insights I found were either written by or referenced the
authors of the [[Koka]] programming language, which became another major source
of inspiration. My goal was to synthesize these modern academic ideas with the
toolkit approach I'd grown to love, while staying true to my imperative,
performance-focused roots in game development.

The result of that deep dive is a language where you can piece together a
[[Domain Specific Languages|DSL]] in minutes, from either side of the embedded
line, with a high degree of safety.

Ribbon's component design: lightweight, composable, and built on simple,
structured allocations; is deeply inspired by
[[Modern C Programming Methodologies|modern C programming methodologies]]. I
drew particular influence from the work of
[Ryan Fleury](https://www.rfleury.com/), the philosophy of the
[Our Machinery](https://ruby0x1.github.io/machinery_blog_archive/) team (RIP),
and the principles embodied by [[Zig]]. This gives Ribbon a minimal runtime,
often requiring only a few megabytes of memory for a Fiber to execute. For
host-side code, this design offers incredible performance. Using the Ribbon C
API, you get near-metal speed, but it also means you could easily cause a
segfault if you're new to memory management in C.

This created the central dilemma: I wanted that raw performance for host code,
but for guest code, often written by programmers new to an ecosystem, that level
of risk was unacceptable. The divide between guest and host code needed to be
minimal for efficiency and to make it easy to graduate trusted extensions into
the core application, but the safety guarantees had to be worlds apart.

The solution, as it often does, came from making implicit programmer knowledge
explicit in the type system. In Ribbon, the type system tracks what allocator
every region of memory belongs to. A pointer's type includes a reference to the
allocator that owns the memory it points to. This is similar in spirit to how
[[Rust]] annotates references with lifetimes, but the mechanism is much simpler.
By focusing on the allocator's lifetime instead of individual value lifetimes,
Ribbon can perform these annotations entirely through standard type inference,
with no need for manual annotation or complex borrow-checking algorithms.

So far, this gives us static guarantees about where pointers can point. To use
this for safety, we rely on another key feature: [[Algebraic Effects]] tracking.
When any region of memory is accessed, the type system tracks this as a
side-effect. This allows you to communicate and statically check memory access
patterns, which is invaluable in real-time applications like game engines. It
helps developers pack data efficiently, avoid cache misses, and reason about
performance in a way that’s often left to runtime profiling.

This approach deliberately makes different trade-offs than a system like
[[Rust]]'s borrow checker. It prioritizes developer ergonomics and provides
explicit control when performance is paramount, getting out of your way when you
know what you're doing. It doesn't, by itself, prevent all memory errors like
use-after-free or out-of-bounds access. However, it makes the implicit explicit,
which is the first and most important step.

My primary concern for Ribbon's safety was ensuring guest code cannot access
memory it wasn't given permission to. When compiling guest code, we can
statically enforce this. We simply disallow unsafe casts and pointer arithmetic.
Combined with the allocator and effect tracking, it can be statically proven
that guest code only touches the memory it's supposed to.

This journey also led me to realize that the right execution method depends on
the use case. For a public modding API, you can compile guest code with runtime
checks that intercept every memory access, either through the [[Bytecode VM]] or
by dynamically inserting machine code. For an internal tool written by a trusted
developer, you can compile it with all checks disabled for maximum speed.

This flexibility extends to data marshalling; you can safely pass data between
Ribbon and your host without complex serialization, because for guest code, we
can always verify where a pointer came from and whether it has permission to be
there. You can even intercept memory access events to build your own virtual
address spaces, a setup that is straightforward to implement with Ribbon's
[[Toolkit API]].

Finally, if the syntax of the language can be extended, how does the compiler
know which "dialect" of Ribbon a file is written in? A simple file-traversal
based compilation model is possible, but my experience with other languages has
shown it to be counter productive at times, particularly for a multi-threaded
compiler architecture. Additionally, if making your own [[Domain Specific Languages|DSL]]
is a common and encouraged practice, how do we mitigate the kind of community
fragmentation problems that have plagued [[LISP]]?

The solution I chose was to address both of these issues at once: make the unit
of compilation fully explicit. In Ribbon, code is organized into [[Modules]].
Each module is defined by a manifest file that statically declares its source
files, its dependencies, and the language extensions it uses. This provides the
compiler with a predictable, static context for parsing and compiling a
dynamically extensible language.

Ribbon is the culmination of this journey. It’s a language designed to be a
powerful, high-performance systems language for hosts; and a safe, robust, and
easy-to-use extension language for guests. All within a single, unified
framework.