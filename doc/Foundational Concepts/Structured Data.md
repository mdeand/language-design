Programming languages generally fall into one of two camps for their type
systems: *nominative* or *structural*.

- A **nominative type system**, used by languages like C++, Java, and [[Rust]],
  identifies types by the *name* they are given at their definition. If you
  define `struct Vector2 { x: f32, y: f32 }` and
  `struct Point2 { x: f32, y: f32 }`, they are considered two completely
  distinct and incompatible types, even though they have the same structure.
  This is great for preventing accidental type confusion.

- A **structural type system**, used by languages like Go (for interfaces),
  TypeScript, and OCaml, identifies types by their *shape*. In such a system,
  `Vector2` and `Point2` would be compatible because they have the same fields
  and types. This offers great flexibility.

Ribbon has a **nominative type system** for the clarity and safety it provides.
However, it uses the power of [[Row Types]] to offer a sophisticated, opt-in
form of **structural polymorphism**, giving developers the best of both worlds.

#### Structural Polymorphism

With structural polymorphism, you can write a single function that operates on
multiple named types, as long as they share a common structure. This is a common
problem solved in other languages with [[Type Classes]]/traits, but those often
require manually implementing accessor methods. Ribbon allows you to talk about
the data's shape directly.

This signature describes a function that works on any struct-like type:

```
magnitude2 : {x: n, y: n, ..} -> n
```

This function will accept any struct (e.g., a `Vector2` or `Point2`) as long as
it has `x` and `y` fields of the same numeric type (`n`). The `{..}` syntax,
powered by row types, signifies that the input type can have any other
additional fields. The function still operates on the original nominative type,
preserving safety while providing immense flexibility.

#### Layout Polymorphism

For a systems language, the logical shape of data is only half the story. The
precise *memory layout* is paramount for performance and C interoperability.
Ribbon surfaces this critical dimension directly into the type system by
recognizing that every field has both a logical **Name** and a physical
**Layout** (its memory offset).

This unified model allows you to define structs with a guaranteed, C-compatible
memory layout:

```
;; A struct with a precise, C-compatible memory layout
C_UserData := struct {
    id     @ 0 : u64,
    status @ 8 : u8,
    -- 3 bytes of implicit padding --
    score  @ 12: f32,
}
```

While this explicit control is powerful, it is not always necessary. Ribbon
provides three powerful automatic layout strategies. By default, when you do not
specify any offsets, the compiler is free to reorder fields to minimize padding
and reduce the struct's overall size for optimal performance. For seamless
interoperability, you can also instruct the compiler to use a C-compatible
layout, guaranteeing a standard, predictable memory arrangement that matches the
target platform's C ABI. Finally, we also offer a bit-packing mode, that will
ignore alignment and fit all fields into the smallest space possible. Together,
these systems give you a full spectrum of control, from fully-automatic
optimization to bit-level manual placement.

Whether explicitly written or compiler-inferred, this duality unlocks a second,
powerful form of polymorphism. Functions can be generic over either a field's
name or its physical layout:

```
;; 1. Polymorphism by Name:
;; Works on any struct with a 'score' field, regardless of its offset.
get_score := fn(p: {score: f32, ..}) -> f32.
    p.score

;; 2. Polymorphism by Layout:
;; Works on any struct with a u8 at offset 8, regardless of its name.
get_status_byte := fn(p: {@8: u8, ..}) -> u8.
    p@8
```

This system provides an unparalleled combination of control and abstraction. It
allows for unambiguous C interoperability, enables low-level systems design
patterns like custom object headers, and transparently unifies concepts like
structs and tuples under one robust, statically-checked, and fully-inferred
system.