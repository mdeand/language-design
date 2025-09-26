The Ribbon type system is founded on the principles of **Monoidal Rows**, a
powerful and flexible approach to typing based on extensible records and
effects. This system, inspired by established academic research, is extended
with several novel features designed to meet Ribbon's core goals: providing high
performance and C-level memory layout control for host code, while guaranteeing
static safety and sand boxing for guest code.

The type system described in this document was implemented as a
[Haskell](https://github.com/noxabellus/monoidal-rows) prototype. This was an
experimental system based on [[Resources#External|various works]], most notably
[Abstracting Extensible Data Types or Rows By Any Other Name](https://dl.acm.org/doi/10.1145/3290325).
The initial implementation was a fairly exact replica of the row theory termed
"simple rows" in that paper. It was then extended with a number of features of
varying ambition and theoretical soundness. This work formed the proving ground
and fundamental basis for the type system within Ribbon, and is presented here
to serve as a simplified window into the basic concepts that underlay Ribbon
itself.

*Please note that syntax presented in this document is either abstract notation, Haskell, or  pseudocode. Ribbon syntax is defined in [[Grammar]].*

## Contents

- [Usage](https://www.noxabell.us/monoidal-rows.html#section-usage)
- [Features](https://www.noxabell.us/monoidal-rows.html#section-features)
    - [Monoidal rows](https://www.noxabell.us/monoidal-rows.html#section-monoidal-rows)
    - [Pattern matching inference](https://www.noxabell.us/monoidal-rows.html#section-pattern-matching-inference)
    - [Effect rows](https://www.noxabell.us/monoidal-rows.html#section-effect-rows)
    - [Data constraints](https://www.noxabell.us/monoidal-rows.html#section-data-constraints)
    - [Layout polymorphism](https://www.noxabell.us/monoidal-rows.html#section-layout-polymorphism)

## Usage

This pragmatic study laid the initial groundwork and served as a proof of
concept for the Ribbon type system.

There is no parser or driver here. The expected usage is as a reference, but the
inference can be tested via a convenient test function in `Main` for use in
[GHCi](https://www.haskell.org/ghcup/).

While these concepts form the basis of the Ribbon project's work, the code and
concepts explored here are **Public Domain**; do whatever you like with them.

## Features

### Monoidal rows

**Rationale:** To support the creation of extensible and composable
Domain-Specific Languages (DSLs), Ribbon requires a type system that can fluidly
combine and subset structured data. Simple record extension is insufficient; a
more compositional approach is needed.

**Design:** The system is built on two primary row operations:
1.  **Concatenation (`⊙`):** Combines two disjoint rows into a new, larger row.
2.  **Subtyping (`◁`):** Constrains a row to be a subset of another.

This presents a contrast to systems based on single-field extension. By treating
combination as a constraint-solving problem, the system offers greater
flexibility in how types are composed.

**Example:**
```rust
// Define two distinct records (data rows)
type Name = { first: String, last: String }
type ContactInfo = { email: String }

// The concatenation constraint `Name ⊙ ContactInfo ~ User`
// allows the creation of a composite type.
type User = { first: String, last: String, email: String }

// The subtyping constraint allows functions to operate on partial data.
// This function accepts any record that contains at least a 'first' and 'last' name.
fun get_full_name(name: T): String where T ◁ Name {
    return name.first + " " + name.last
}
```

#### Details
The basic concept here is the inclusion of the row concatenation constraint
`ζ₁ ⊙ ζ₂ ~ ζ₃`, which is the only way to combine rows in this system and stands
in contrast to other systems where the usual method is extension.

i.e., rather than type constructors like:
```haskell
data Type
    = ...
    | TRowExtend Field Type
    | TRowNil
```
The system has only a type constructor like:
```haskell
data Type
    = ...
    | TRow (Map Name Type)
```
Combination is then handled via constraint solving.

Additionally, there is a constraint for row subtyping `ζ₁ ◁ ζ₂`, which allows
constraining a row to a subset of another. This is representable in terms of the
concatenation constraint, and in other implementations based on this paper, it
is. However, it provides a useful syntactic simplification for many constraints
and was therefore kept as a distinct constraint constructor in this
implementation.

Despite the `⊙` operation being associative and commutative, the rows are still
only partial monoids, as the union produced is expected to be disjoint.

---

### Pattern matching inference

**Rationale:** While the underlying theory uses a primitive branch operation
(`Δ`), a practical language requires expressive, safe, and familiar control
flow.

**Design:** The type system integrates a robust pattern matching implementation.
`match` expressions are a first-class feature, and the type checker desugars
them into the appropriate row-based constraints. This allows for exhaustive
checking and sophisticated deconstructing of data. Patterns can be defined to
enforce either an exact type match or a sub-row match (e.g., via a `...`
pattern), providing fine-grained control over a function's accepted inputs.

**Example:**
```rust
fun greet(user: User) {
    match user {
        // This pattern requires an exact match on the User type.
        { first, last, email } => {
            print("Hello " + first + " " + last + " (" + email + ")")
        },
        // This pattern would match any record that *at least* has a name.
        { first, last, ... } => {
            print("Hello " + first + " " + last)
        }
    }
}
```

#### Details
The first extension made in comparison to the original paper was to replace the
branch operation `Δ` with a pattern matching implementation. This is a very
straightforward addition, and the features implemented here could be extended
further. For example, product row patterns are designed to always produce a
sub-row constraint, but this could be extended by other pattern types, such as
making the current system accessible via an additive `...` pattern and expecting
patterns without this qualifier to emit an exact constraint.

This required extending the AST with a `Patt` type and mirroring the `infer` and
`check` functions as `inferPatt` and `checkPatt`.

---

### Effect rows

**Rationale:** A core design goal of Ribbon is to statically enforce safety
boundaries between host and guest code. To achieve this, the type system must be
able to track and control side-effects like memory access, I/O, or foreign
function calls.

**Design:** The system uses **Effect Rows**—polymorphic lists that track the
computational effects a function may perform. A key innovation is that effect
rows permit multiple, distinct instances of the same effect type. This allows
the system to reason about separate resources individually, even when accessed
via the same kind of effect.

This mechanism is the foundation of Ribbon's security model. It makes the
implicit explicit, allowing the compiler to statically prove that a piece of
guest code only ever interacts with the resources it was granted permission to
access.

**Example:**
```rust
// This function is polymorphic over two distinct Read effects, 'a' and 'b'.
// The type system can reason about them as separate capabilities.
fun get_config<a><b>(path: a, fallback_path: b) -> String
    | performs Read<a>, Read<b>
{
    // ... implementation
}
```

#### Details
A novel addition here is the distinction between existing rows (re-termed data
rows) and effect rows, with the effect rows being simple lists of types rather
than maps. The novelty stems from allowing the instantiation of effect
constructors at multiple different parameters in the same row. This leads to a
rather complicated constraint reduction/unification strategy, and the
consequences of this implementation have not been fully explored.

Notably, because effect constructors can be instantiated at multiple types,
variables cannot always be unified immediately. The chosen strategy in the
prototype was to unify where there was only one option and to emit a sub-row
constraint where there are multiple. One can imagine this may lead to
unsoundness in some scenarios, though testing has not yet revealed any such
problems. A couple of alternative solutions exist, such as simply not unifying
variables within these rows; early testing has showed minimal loss of inference
fidelity with this option.

Various things were added to the implementation to support effect rows,
including a handler term, evidence passing during inference, and an extension to
the environment containing effect definitions.

---

### Data constraints

**Rationale:** Purely structural typing, while flexible, has limitations. For
example, it cannot distinguish between two records that happen to have the same
fields, such as a `Point {x, y}` and a `Vector {x, y}`. This ambiguity
complicates the creation of distinct APIs and integration with systems like type
classes.

**Design:** Data constraints bridge the gap between structural and nominal
typing. This feature allows a structural row to be bound to a nominal type name.
This provides the best of both worlds: the flexibility of row polymorphism for
data manipulation, combined with the safety and clarity of a nominal type system
for defining APIs.

**Example:**
```rust
// Bind the structural row to a nominal type 'Point'.
type Point = { x: Int, y: Int }

// Bind an identical row to a different nominal type 'Vector'.
type Vector = { x: Int, y: Int }

// Now, functions can be defined to operate specifically on one or the other.
fun scale_vector(v: Vector, s: Int) -> Vector { /* ... */ }

// The compiler would reject `scale_vector(my_point, 2)`, even though
// the underlying structure is identical.
```

#### Details
This simple extension adds a new member to the environment containing `τ → ρ`
data type associations and two new constraints allowing the binding of a type to
be a data type of either product or row construction. The `TProd` and `TSum`
type constructors become ephemeral constraint-passing markers for use with
`check`. Instead of inferring all uses of rows as instantiations of `TProd` or
`TRow`, the system infers them to be instantiations of a variable type
constrained to an appropriate row association.

The inclusion of this feature is designed to counter the usual problems of
structural typing, such as incompatibility with systems like type classes and
the need for complex methods to work with recursive aliases. This allows for row
polymorphism with the same level of expressivity while maintaining nominative
type system features. This has no impact on theoretic soundness but does lead to
more verbose signatures. This could be combated by adding inline constraints
like those used in the original paper, which would presumably be lifted into the
current qualifier system at kind inference.

### Layout polymorphism

**Rationale:** For a systems language, control over memory layout is paramount
for performance and interoperability with C. In most structurally-typed
languages, layout is an opaque compiler implementation detail. Ribbon surfaces
this control to the programmer.

**Design:** In Ribbon's type system, a field label is not just a name; it is a
pair of types: `(Name, Layout)`. `Layout` is typically an integer representing
the memory offset. This design allows for polymorphism over either the name or
the layout of a field. A programmer can define a data structure with a precise,
fixed memory layout for performance, while functions that consume that data can
be written to access fields by name, ignoring the specific layout.

This feature provides C-level control when needed, enables powerful syntactic
sugar like positional-vs-named arguments, and makes foreign function interfaces
(FFI) safer and more efficient.

#### Details

This is another large addition but did not have the same theoretical
implications as effect rows, though the method of solving is quite similar.

Essentially, concepts from implementations of first-class labels (à la
[First Class Labels for Extensible Rows](https://www.microsoft.com/en-us/research/wp-content/uploads/2016/02/fclabels.pdf))
are borrowed and extended to allow a new kind of polymorphic variance over data.
In data rows, instead of a map from strings to types, there is now an
associative array of labels to types, where labels are themselves a pair of
types. The types contained in this pair are expected to always be of the kinds
`Int` and `String` respectively; in other words, integers and strings are lifted
to the type level to serve together as a label. The string serves the same
purpose as before, while the addition of the integer allows discussion of the
data's layout.

Unlike in systems with true first-class labels, this implementation does not
allow full polymorphic variance over the entire label of a given field. Instead,
either the layout or the name must always be specified. This limitation
simplifies constraint solving to a great degree and allows it to be easily shown
as sound, avoiding the problem encountered in effect rows. Multiple possible
unifications of labels are invariably an error.

To support this feature, new forms were added to the AST in terms and pattern
matching that each allow either variance over layout or naming of their
specified structures. This is fairly straightforward and just leads to a bit of
code repetition as fresh meta variables are created for either the layout or
name in labels. As it is quite verbose, the syntax extension has been kept
simple, but a more expressive syntax should only require an equally
straightforward modification. One could imagine, for example, allowing variance
over some fields but not others with optional syntax.

The rationale for this feature was to circumvent another typical problem with
row types: layout is generally chosen by the compiler, making it somewhat
incompatible with usage in systems-level languages. The concept here is that,
when defining a data type, the layout is always that given by the programmer,
and when utilizing the data type at the term (and pattern) level, the layout can
be ignored. The simple addition of allowing the programmer to talk about the
layout at the term level also leads to syntactic conveniences, such as (in the
case of un-curried functions using tuples for n-ary argument passing) a simple
implementation of positional and named argument syntax. It also allows
dual-construction syntax like that of Haskell data types. The usage of rows was
also extended this way for sums, which at a term/pattern level may have limited
use; however, being able to define the discriminator in data type definitions is
obviously of some utility if a language gives access to the underlying structure
of sums.