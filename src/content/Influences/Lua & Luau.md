---
title: Lua & Luau
---

*[Lua](https://www.lua.org/)* is a legendary scripting language, famous for its
simplicity, portability, and incredibly clean C API that makes it trivial to
embed into larger applications. For decades, it has been the gold standard for
adding a flexible, dynamic extension layer to software, most notably in the
video game industry. Games like *World of Warcraft*, *Roblox*, and countless
others have used Lua to empower developers and players alike to script gameplay,
create UI, and build entire worlds.

#### Lua at Scale

**[Luau](https://luau.org/)** is a gradually-typed superset of Lua developed and
open-sourced by Roblox to meet the massive demands of their platform. Faced with
a sprawling ecosystem of millions of developers, they needed to evolve Lua to
provide better performance, stronger safety guarantees (sandboxing), and modern
static analysis tools.

One of Luau's most brilliant innovations is its type system. To add static types
to a dynamically-typed language without breaking a universe of existing code,
Luau adopted a **structural type system** built on the principles of
[[Row Types]]. This allows developers to add type annotations incrementally. A
function can specify that it expects an object with a certain *shape* (e.g.,
`{x: number, y: number}`), and the type checker will accept any object that
meets this structural requirement, regardless of its original named type. This
provides tremendous flexibility and made it possible to introduce type safety to
one of the world's largest codebases.

#### Control and Performance

Ribbon is deeply indebted to the legacy of Lua and Luau. The goal of providing a
safe, simple, and powerful language for extending host applications is a direct
continuation of the path Lua pioneered. However, Ribbon is a systems language at
its core, and this foundation allows it to make different trade-offs that offer
significant advantages in control and performance.

- **Deeper Control:** Luau's structural typing is excellent for validating the
  logical shape of data at the script level. Ribbon's [[Structural Data]] system
  goes a step further by also giving the programmer control over the physical
  *memory layout*. While Luau can check that a table has an `x` and a `y`,
  Ribbon's layout polymorphism allows you to write functions that are generic
  over a field's precise memory offset (e.g., `{@8: u8}`). This level of control
  is essential for high-performance C interoperability and low-level systems
  programming—tasks that are outside the scope of what Luau is designed for.

- **Native Performance:** While Luau has made incredible strides in performance
  with its highly optimized interpreter and JIT compiler, it is still
  fundamentally an object-oriented language executing against a very abstract
  virtual machine. This is perfect for sandboxing untrusted code but introduces
  an unavoidable layer of overhead. Ribbon, by contrast, is designed from the
  ground up to also be compiled, ahead-of-time (AOT) and just-in-time (JIT), to
  native machine code. This means, for both host-side code and extensions alike,
  we can achieve "near-metal" speed with no interpretation overhead, allowing
  performance-critical systems to be written in Ribbon without compromise. For
  guest code and development automation, you still have the option to use a
  sandboxed VM; giving you the flexibility to choose the right trade-off for
  your use case.

Ribbon carries on the spirit of extensibility and developer empowerment from Lua
and Luau and marries it with the performance and fine-grained control of a
modern systems language.