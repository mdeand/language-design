A phantom type is a type parameter that doesn't hold any data. Its sole purpose
is to add extra information to a type at compile time, allowing the type checker
to enforce more sophisticated invariants and rules about how that type can be
used. It's a way to embed more logic and guarantees directly into the type
system, and because it's a compile-time-only construct, it has zero runtime
cost.

The concept has been significantly popularized by [[Rust]], where it is used to
encode complex patterns, such as ensuring correct state transitions in a builder
pattern or enforcing that different units of measurement (e.g., `Length<Meters>`
vs. `Length<Feet>`) are not accidentally mixed.

#### Phantom Types in Ribbon

In Ribbon, phantom types are not just an advanced pattern for library authors;
they are a cornerstone of the language's core safety and concurrency models.

- **Tracking Memory Regions:** This is the most critical application. As
  described in [[Composable Allocation Strategies]], every allocator in Ribbon
  is given a unique symbolic "name." This name is used as a phantom type to
  "tag" any pointer to memory that originates from that allocator. A pointer's
  type isn't just `*Node`, but `*'my_arena Node`. The `'my_arena ` part is a
  phantom type that tells the compiler where this memory belongs. With this
  information, the compiler can statically prevent a pointer from a short-lived
  arena from being stored in a long-lived data structure, eliminating a whole
  class of memory safety bugs.

- **Enforcing Thread Affinity:** Similarly, Ribbon uses phantom types to enforce
  concurrency safety. Data structures and functions can be tagged with a phantom
  type representing the thread they belong to (e.g. `'main`, '`render`, etc).
  The type system can then ensure that this handle is only ever used by
  functions that are also marked as running on the same thread identity. This
  can prevent entire classes of data races at compile time, long before the code
  is ever run. It can also be used to annotate a common condition at FFI
  boundaries, where low level functions often expect the higher level code to
  only call them from a process' main thread.

#### A Tool for Developers

Beyond these core language features, phantom types are a powerful tool available
to any Ribbon developer for building their own robust abstractions. You can use
them to create APIs that are difficult or impossible to misuse.

For example, you could create a system for handling user input that guarantees
sanitization:

- A type `UserInput<Status>` where `Status` is a phantom type.
- A function `get_raw_input() -> UserInput<Unsanitized>`.
- A function `sanitize(input: UserInput<Unsanitized>) -> UserInput<Sanitized>`.
- A function `update_database(input: UserInput<Sanitized>)`.

The compiler will now enforce that you can never call `update_database` with
raw, unsanitized input. The only way to get a `UserInput<Sanitized>` is to call
the `sanitize` function. This moves the security check from a runtime assertion
to a compile-time guarantee.

Phantom types are a powerful, zero-cost abstraction that aligns perfectly with
Ribbon's philosophy: making implicit programmer knowledge an explicit,
verifiable part of the type system.