---
title: Koka
---

**[Koka](https://koka-lang.github.io/)** is a research-oriented functional
programming language developed by Daan Leijen and his team at Microsoft
Research. It is a beautifully designed language that introduced the world to the
modern, practical application of **algebraic effects**, a concept that is a
cornerstone of Ribbon's entire design. Our debt to the profound insights and
academic rigor of the Koka project is immense.

#### The Power of Algebraic Effects

Koka's primary innovation is its first-class support for algebraic effects. It
provides a clean, elegant, and powerful way to separate pure, logical code from
the messy, side-effect-ful code it needs to interact with. An effect system
allows a function to be defined purely in terms of the *what* (its logic) while
deferring the *how* (the implementation of its side effects) to a
caller-provided handler.

This makes code incredibly modular, highly testable, and easy to reason about.
The ability to swap in different effect handlers for testing, or to compose
complex behaviors from simple handlers, is a paradigm shift for software
architecture. Nearly everything Ribbon has to say about the power of
[[Algebraic Effects]] was said first and with more academic precision by the
Koka team.

#### A Different Foundation

Where Ribbon's philosophy diverges from Koka's is at the most fundamental level:
the memory model and runtime.

Koka is a purely functional language that provides automatic memory management.
It uses a state-of-the-art system of reference counting combined with its novel
Perceus algorithm for compile-time reuse analysis. This is a brilliant approach
that makes memory management both efficient and highly predictable within a
functional paradigm, eliminating entire classes of programmer concerns.

However, for Ribbon, whose roots are in imperative, performance-focused game
development, any form of automatic, non-deterministic memory management, even
one as advanced as Perceus; was a trade-off we couldn't make. The core
requirement for a true systems language is giving the programmer explicit,
deterministic control over the layout and lifetime of memory.

- **Koka's Goal:** Abstract away memory management to provide the programmer
  with a pure, safe, and highly productive environment.
  
- **Ribbon's Goal:** Expose memory management as a first-class, controllable
  part of the system, via [[Composable Allocation Strategies]] and arena-based
  allocation.

#### Koka's Interface, a Systems Implementation

Ribbon's design is a synthesis of these two worldviews. We fell in love with
Koka's beautiful *interface* for effects but knew we needed a different
*implementation* to meet our performance goals.

The result is that Ribbon's effect system, while conceptually identical to
Koka's, is implemented in a way that is familiar to a systems programmer. It is
built on a foundation of stack unwinding and direct jumps, mechanically similar
to a highly-optimized "typed exception" system. This provides the powerful
separation-of-concerns benefits pioneered by Koka, but with a runtime model that
has zero overhead on the "happy path" and a predictable, low-level execution
model that is suitable for the most performance-critical applications.