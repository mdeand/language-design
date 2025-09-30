---
title: Row Types
---

**Row Types** are a powerful concept from type theory that allows for flexible
and extensible descriptions of composite data types (like records or structs)
and other collections of labeled information. The core idea behind **row
polymorphism** is the ability to write functions that operate on records
containing a specific set of fields, while remaining agnostic about any *other*
fields that record might also contain.

First introduced in the context of functional programming languages, row types
formalize the idea of "and other stuff." They are the theoretical underpinning
for features in languages like OCaml (polymorphic variants), PureScript, and are
the subject of modern language extensions in Haskell.

#### The Core Concept

Imagine you want to write a function that logs the name of any entity that has
one. You don't care if the entity is a `User` with an `id` and `email`, or a
`Product` with a `price` and `sku`, you only care that it has a `name: String`.

A row type allows you to express this precisely. The function would accept a
type like:

`{ name: String | r }`

- `{ name: String ... }` specifies the fields we require.
- `| r` is the **row variable**. It is a placeholder that stands for "any
    other fields."

The type checker can then verify that your function only accesses the `name`
field, and it will accept any record that meets this minimum requirement. The
row variable `r` is what makes the type "open" and extensible, as opposed to a
"closed" type that must have *exactly* the specified fields.

#### Applications in Ribbon

In Ribbon, Row Types are not just an academic feature; they are the unified,
underlying mechanical principle for two of the language's most powerful
features:

- **[[Structural Data]]:** Row types are the engine that powers Ribbon's
  structural polymorphism. They allow functions to be generic over the *shape*
  of data. A function that operates on any struct with `x` and `y` coordinates
  is described using a row type `{ x: f32, y: f32 | r }`. This gives developers
  the flexibility of structural typing within Ribbon's otherwise safe,
  nominative type system.

- **[[Algebraic Effects]]:** A function's effect signature is also modeled as a
  row. This allows effect signatures to be composed and extended cleanly. A
  function can be generic over the effects of a function it takes as an
  argument, only requiring that it performs *at least* a certain set of effects.

Row types are a great compile-time mechanism for describing extensible, labeled
collections. In Ribbon, they are the elegant, unifying theory that enables
flexible data access and composable side-effects.