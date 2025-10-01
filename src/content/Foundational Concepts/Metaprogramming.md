---
title: Metaprogramming
---

**Metaprogramming** is the art of writing code that writes code. It is one of
the most powerful and dangerous tools in a language's arsenal. It is the key to
unlocking zero-cost abstractions, creating expressive
[[Domain Specific Languages|DSLs]], and eliminating boilerplate. However, the
history of programming languages is littered with metaprogramming systems that
are unsafe, intractably complex, or so powerful they lead to fractured,
unmaintainable ecosystems.

Designing a metaprogramming system requires navigating a razor's edge of
trade-offs. Ribbon's approach, embodied in the Ribbon Meta-Language (RML), is a
direct and opinionated answer to this fundamental challenge.

#### A Brief Tour of Metaprogramming's Pitfalls and Triumphs

To understand Ribbon's design, it's useful to look at the landscape of what came before:

- **LISP's Unbounded Power:** LISP is the prime ancestor of modern
  metaprogramming. Its homoiconic nature, where code is just a data structure
  (the list); gives it unparalleled power. Macros are just functions that
  transform lists. This is an incredibly elegant and powerful model, but its
  unbounded nature is also its greatest weakness. It can, and has lead to a
  "diasporic ecosystem" where every project evolves its own dialect, making code
  difficult to share and understand.

- **The C Preprocessor's Simplicity and Terror:** At the other end of the
  spectrum, C's preprocessor is a simple textual substitution engine. It is fast
  and straightforward, but it is also completely unaware of the language's
  syntax or type system. This makes it notoriously unsafe, leading to unexpected
  variable captures, cryptic error messages, and bugs that are incredibly
  difficult to debug.

- **C++ Templates and Intractable Complexity:** C++ templates are a powerful
  system for compile-time polymorphism and computation. However, template
  metaprogramming is an accidentally Turing-complete language with a notoriously
  difficult syntax and error messages that can span pages. This immense
  complexity makes it a tool for only the most expert developers.

- **Rust's Safe and Stratified System:** [[Rust]] learned from these lessons and
  created a highly successful two-tier system. It offers simple, declarative
  macros for most use cases, and powerful, sandboxed procedural macros for more
  complex code generation. This creates strong safety guarantees by drawing a
  clear line between the macro system and the compiler. It is a pragmatic and
  effective, but explicitly stratified, approach.

#### A Unified Formal Language Toolkit

Ribbon aims to provide the power and unity of [[LISP]] with the safety of a
modern, effects-aware type system. Our solution is the **Ribbon Meta-Language (RML)**,
a dynamic language that acts as the foundational "glue" for the entire ecosystem.

- **A Single, Purpose-Built Language:** Unlike the stratified approaches of
  other languages, RML is a single, cohesive language designed explicitly for
  formal language processing. Whether you are writing a simple macro, a build
  script, a new DSL parser, or a custom linter, you are using the same powerful
  language and tools. It treats Concrete Syntax Trees (CSTs) as a first-class
  data type, making code transformation its primary and most ergonomic task.

- **Safety through Verification:** RML provides the dynamic flexibility of
  [[LISP]], but its output, the typed Ribbon code, is always handed off to the
  main compiler for full verification. This is where the combinatorial power of
  Ribbon's features comes into play. A metaprogram cannot generate code that
  accesses a restricted memory region or performs a forbidden side effect,
  because the type system will reject it. This is made possible by the
  integration of RML with [[Algebraic Effects]] and other higher-level features.
  An untrusted plugin's metaprogram is simply not capable of generating code
  that handles an `Unsafe` effect. This provides the safety of [[Rust]]'s
  system, with the flexibility of a single, unified metaprogramming model
  reminiscent of [[Terra]]'s power, and even better guardrails.

- **The Full Stack of Language Processing:** RML is not just a macro
  preprocessor. It is the language used to build the compiler itself, and it is
  fully exposed to the user as part of the [[Toolkit API]]. This means a
  platform developer can use RML to define completely new language extensions,
  provide custom syntax for a DSL, and give their users the power to safely and
  deeply integrate with the host application.

- **The Source of Truth:** To manage this power and prevent the "diaspora"
  problem seen with other powerful meta-languages, RML's extensibility is
  managed by an explicit, static configuration layer: [[Modules]]. Each module's
  definition file declares which language extensions are active, providing a
  clear boundary for RML's dynamic capabilities and making the language's syntax
  predictable and composable on a per-project basis.

Ribbon's metaprogramming story is not an afterthought or an
ad-hoc collection of tools. RML is a deliberate attempt to create a "best of all
worlds" system: a unified, powerful, and ergonomic language for writing code
that writes code, all grounded in a type system that guarantees safety and
control.