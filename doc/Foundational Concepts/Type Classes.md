Type Classes are a powerful feature for achieving ad-hoc polymorphism, a way to
allow a function or data structure to operate on values of different types.
First introduced in Haskell and now a cornerstone of languages like [[Rust]]
(where they are called "traits"), type classes define a set of behaviors that a
type can implement. They are like an interface, but they can be implemented for
any type without needing to modify the original type's definition or forcing it
into a rigid inheritance hierarchy.

While Ribbon's implementation of type classes will feel familiar to developers
coming from Haskell or [[Rust]], they are a crucial piece of the language's
design. They act as the "glue" that allows high-level, generic abstractions to
be written that seamlessly integrate with Ribbon's unique, low-level features
like effects and phantom types.

#### Defining Behavior

At its simplest, a type class defines a contract. It specifies a set of
functions or associated types that a concrete type must provide to be considered
a member of that class.

For example, you could define a `Serializable` type class:

```
Serializable := class T.
    serialize: T -> String
```

Any type can now implement this behavior. A generic function can then be written
to work on *any* `Serializable` type, providing powerful code reuse without
sacrificing the performance of static dispatch.

```
save_to_disk := fn [T: Serializable] (value: T, path: String) -> () | { FileIO }
    ...
```

#### The Power of Combination

The true power of type classes in Ribbon emerges from how they integrate with
the language's other core concepts. They are the mechanism by which developers
can write generic code that is fully aware of Ribbon's safety and concurrency
models.

The [[Hot Module Reloading]] system provides a perfect example of this synergy
with the `Migratable` type class:

```
Migratable := class From, To.
    migrate: From -> To | { RemapAddress, Error String }
```

Let's break down how this composition works:

* **The Generic Contract:** The `Migratable` type class defines the abstract
  behavior: the ability to transform a value of an old type (`From`) into a
  value of a new type (`To`). This is the high-level, generic interface.

* **The Effectful Signature:** The `migrate` function's signature isn't just
  `From -> To`. It also includes a set, or [[Row Types|Row Type]] of effects,
  `{ RemapAddress, ... }`. This is the critical link. The type class contract
  explicitly states that any implementation of `migrate` is allowed to perform
  the `RemapAddress` [[Algebraic Effects|effect]]. This connects the generic
  behavior to the specific, powerful capabilities it needs from the runtime
  environment.

* **The Static Guarantees:** The `From` and `To` types are not just simple
  structs. They are tagged with [[Phantom Types]] that identify which code
  version and memory region they belong to. The `Migratable` implementation is
  the bridge that allows the compiler to safely reason about a transformation
  across these statically-enforced boundaries. If the migration involves C
  pointers, the signature would also naturally acquire an `Unsafe` effect,
  ensuring that this operation is explicitly handled at a trusted boundary.

Type classes in Ribbon are an essential tool for building abstractions. They
provide the familiar power of generic programming found in other modern
languages, but they are deeply integrated with the effect and type systems. This
allows developers to write clean, high-level, and reusable code that still has
full, statically-checked access to the low-level control that makes Ribbon a
true systems language.