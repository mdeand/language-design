---
title: LISP
---

**[LISP](http://jmc.stanford.edu/articles/lisp.html)** is not just a programming
language; it is an entire family of languages and a paradigm of thought that has
been a profound source of innovation for over sixty years. Its influence can be
seen in countless modern language features, but its most revolutionary and
enduring contribution is the principle of **homoiconicity**: the idea that code
is represented as a fundamental data structure of the language itself.

In LISP, code is data. A function call is simply a list. This elegant simplicity
unlocks the most powerful metaprogramming capabilities ever devised: because
code is just a list, you can write functions (macros) that operate on code as
easily as you operate on any other data.

#### The Ribbon Meta-Language

This LISP philosophy is the direct and primary influence for the
[[Metaprogramming|Ribbon Meta-Language]] (RML), the dynamic, underlying system
that the typed Ribbon language is built upon. RML is a language designed for a
singular purpose: formal language processing. It is the engine that enables the
creation of [[Domain Specific Languages|DSLs]] and the powerful extensibility of
the [[Toolkit API]].

While not an S-Expression language, RML is deeply inspired by homoiconicity.
Instead of lists, it treats **Concrete Syntax Trees (CSTs) as a first-class data type.**

- **Macros as Functions:** Just like in LISP, macros in RML are simply
  functions. They take CSTs as input and produce new CSTs as output.

- **Quasiquotes and Pattern Matching:** RML provides first-class support for
  quasiquotes and pattern matching on CSTs, giving the developer an ergonomic
  and powerful toolkit for deconstructing, transforming, and constructing code.

#### Pragmatism for Systems Programming

A traditional LISP environment relies heavily on a garbage collector for its
dynamic nature. For a systems language like Ribbon, where predictable
performance and memory control are paramount, this was not a viable path. RML
re-imagines the LISP environment with a systems-first foundation.

- **Zero-GC:** RML adheres strictly to the Zero-GC principle. It is built on a
  high-performance, session-based arena memory model, ensuring that all the
  power of dynamic metaprogramming comes with predictable, deterministic memory
  usage.

- **The Dynamic Glue for a Static Language:** RML acts as the dynamic "glue"
  that binds the ecosystem together. You use the RML to write the powerful,
  transformative code that generates the final, statically-typed, and
  highly-optimized Ribbon code. This two-language model provides the best of
  both worlds: the boundless flexibility of a LISP-like environment for
  metaprogramming, and the rock-solid safety and performance of a modern, typed
  systems language for the final application.

#### Data Notation

The "code is data" philosophy naturally extends to configuration and data
serialization. The Ribbon ecosystem includes a stripped-down, data-focused
version of RML syntax called Ribbon Object notation (`.ro`). It is designed to
replace formats like JSON or YAML, reducing cognitive overhead by allowing you
to define static data using the same familiar syntax you use everywhere else.

```
;; game-settings.ro
{
  window_title = "My Awesome Game",
  resolution = (width = 1920, height = 1080),
  graphics = (vsync = true, quality = 'ultra),
}
```

Ribbon's RML is a tribute to the ever-revolutionary ideas of LISP. It takes the
vision of a truly programmable programming language and rebuilds it on a
foundation of modern, high-performance systems principles, delivering a
metaprogramming experience that is both profoundly powerful and deeply
practical.