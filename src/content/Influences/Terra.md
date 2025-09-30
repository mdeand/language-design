---
title: Terra
---

**[Terra](https://terralang.org/)** is a low-level system programming language
that is embedded in and meta-programmed by the [[Lua & Luau|Lua]] programming
language. It is a brilliant and deeply influential project that demonstrated how
a dynamic, high-level language could be used to generate highly-specialized,
high-performance, low-level code at runtime.

#### The Toolkit Philosophy

Terra's design is the direct spiritual ancestor to Ribbon's [[Toolkit API]]
philosophy. The core idea is a powerful two-language system:

- **Lua, the Metaprogrammer:** You don't write most Terra code by hand. Instead,
  you write Lua code that *writes Terra code for you*. Lua acts as a dynamic,
  flexible, and powerful code generation engine.
  
- **Terra, the Low-Level Worker:** The generated Terra code is a simple, C-like
  language that can be JIT-compiled by LLVM into machine code that often matches
  or exceeds the performance of C.

This allows developers to build abstractions in Lua that create zero-cost,
specialized Terra code. It's a model that excels in domains like scientific
computing, GPU programming, and the in-house development of domain-specific
languages, where the programmer is fully trusted and needs to rapidly generate
high-performance code.

#### The Safety Dilemma for Extensible Platforms

The power of the Terra model is also its primary challenge when building
extensible ecosystems: the boundary between the Lua metaprogrammer and the Terra
worker is completely permeable. The Lua code has total, unchecked power to
generate any Terra code it wants, including raw pointer arithmetic and unsafe
memory casts.

This creates an "all-or-nothing" trust model. If you expose the Lua environment
to an untrusted user, such as a plugin author or modder, you are effectively
giving them the keys to the entire system. They can use Lua's logic to generate
Terra code that can read or write arbitrary memory, completely bypassing any
sandbox you might attempt to build at the Lua level. This makes Terra an
outstanding tool for a trusted team of developers, but a risky choice for
building a platform that needs to safely run community-created code.

#### Verified Metaprogramming

Ribbon is deeply inspired by Terra's vision of language as a toolkit, but it
addresses this safety dilemma by making the boundary between the metaprogram and
the generated code a core concern of the type system.

Instead of implicitly trusting the metaprogrammer, Ribbon *verifies* its output.

- **Effects-Aware Metaprogramming:** In Ribbon, metaprograms that generate code
  are themselves subject to the [[Algebraic Effects]] system. A guest's
  metaprogram is not allowed to generate code that performs an `Unsafe` effect
  if the guest module itself is not trusted to handle it.

- **Static Region Checking:** Thanks to [[Composable Allocation Strategies]] and
  [[Phantom Types]], the type system can statically prove what memory regions a
  piece of generated code is allowed to access. A plugin simply cannot construct
  a program that touches memory it wasn't given permission to.

Ribbon follows in the footsteps of Terra's brilliant and powerful
metaprogramming model, while integrating it into a rich type system. This
provides the static guarantees necessary to expose that power safely, making it
possible to build the kind of open, extensible, and secure ecosystems that were
the original motivation for Ribbon's creation.