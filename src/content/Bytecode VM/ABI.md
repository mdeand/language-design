---
title: The Ribbon Application Binary Interface
---

### The Ribbon Application Binary Interface

This document specifies the Application Binary Interface (ABI) for the Ribbon language. The ABI defines the low-level contracts for data layout and calling conventions, ensuring that code compiled by different compilers or linked against the Ribbon VM can interoperate correctly.

Ribbon's ABI design is guided by two core principles: **strict reproducibility** and **safe, direct memory access**. Unlike many managed languages, Ribbon does not use a universal "Value" type or perform costly data marshalling between functions. Instead, it operates on raw memory layouts and relies on its [[Algebraic Effects]] system to provide static safety guarantees, especially for untrusted guest code.

This approach allows for C-level performance while preventing guest code from accessing memory it was not explicitly granted permission to use.

### Contents

* [[#Data Layout]]
    * [[#Primitive Types]]
    * [[#Composite Types]]
* [[#Calling Conventions]]
    * [[#Bytecode]]
    * [[#Builtin]]
    * [[#Foreign]]
* [[#Effects and the ABI]]
    * [[The HandlerSet as a Runtime Contract]]
    * [[Scoping Handlers]]
    * [[Invoking Handlers]]
    * [[Non-Local Exits]]
    * [[ABI Limitations]]
* [[#The Safety Model: ABI and Effects|The Safety Model: ABI and Effects]]

### Data Layout

Ribbon's data layout is designed to be predictable and controllable. There is no "boxing" of primitive values; an integer is stored as an integer, and a float is stored as a float. All multi-byte values in the bytecode stream and in memory are little-endian.

Control over the memory layout of composite types is provided to the programmer via type attributes. The VM is aware of these different layout strategies and provides the necessary primitives to access data within them.

#### Primitive Types

| Type  | Size (bytes) | Alignment (bytes) | Description                            |
| :---: | :----------: | :---------------: | :------------------------------------: |
| `i8`  | 1            | 1                 | 8-bit signed integer                   |
| `i16` | 2            | 2                 | 16-bit signed integer                  |
| `i32` | 4            | 4                 | 32-bit signed integer                  |
| `i64` | 8            | 8                 | 64-bit signed integer                  |
| `u8`  | 1            | 1                 | 8-bit unsigned integer                 |
| `u16` | 2            | 2                 | 16-bit unsigned integer                |
| `u32` | 4            | 4                 | 32-bit unsigned integer                |
| `u64` | 8            | 8                 | 64-bit unsigned integer                |
| `f32` | 4            | 4                 | 32-bit IEEE 754 floating-point         |
| `f64` | 8            | 8                 | 64-bit IEEE 754 floating-point         |
| `ptr` | 8            | 8                 | A raw address                          |


#### Composite Types

Ribbon in general, the VM is not aware of these types. The type system however, supports multiple layout algorithms for product types (structs), controlled by attributes in the type definition. These definitions compile down to bytecode in different ways, but all methods reduce to one of the following schemes.

##### C-Compatible (Default)

This is the default layout algorithm, designed for predictable layout and seamless interoperability with the host platform's C ABI.

*   **Field Order**: The order of fields is taken exactly as specified in the type definition.
*   **Layout Rules**:
    1.  Fields are placed sequentially in memory.
    2.  Padding bytes are inserted before a field if its offset does not meet its natural alignment requirement.
    3.  The total size of the struct is padded at the end to be a multiple of the alignment of its most-strictly-aligned member. This ensures that in an array of these structs, every field of every element is correctly aligned.
*   **Memory Access**: All fields in a C-compatible struct are byte-addressable. They can be accessed using standard pointer arithmetic. The VM uses instructions like `load` and `store` with a base pointer and a calculated byte offset to read and write fields.

> **A Note on Optimal Layout:**
> The Ribbon type system also offers an "optimal" layout strategy. This is a compile-time transformation that re-sorts a struct's fields by alignment *before* applying the `C-Compatible` algorithm. From the VM's perspective, there is no difference; it simply receives a struct definition with a pre-arranged field order and applies the default layout rules. The optimization is transparent to the ABI.

##### Bit-Packed

The bit-packed layout is designed for maximum data density, used for tasks like serializing data for network protocols or mapping directly to hardware registers.

*   **Field Order**: Fields are laid out sequentially as specified in the type definition.
*   **Layout Rules**:
    1.  Fields are packed one after another at the bit level, with **no padding or alignment**.
    2.  The total size of the structure is the sum of the bit-widths of all fields, rounded up to the nearest byte.
*   **Memory Access**: Fields within a bit-packed struct are **not byte-addressable**.
    A pointer to a bit-packed struct refers to the beginning of a raw byte buffer. Standard instructions cannot be used to access individual fields. Instead, field access must be performed either by dedicated `builtin` functions or by sequences of instructions generated by the compiler. These sequences manually perform the necessary `load`, `store`, and bitwise operations (shifts and masks) to extract or insert values from the byte buffer at the correct bit offset.

### Calling Conventions

A function's calling convention is part of its type. The RVM natively understands three distinct ABIs, which are specified in the `call`, `call_c`, and `prompt` instructions.

#### Bytecode
*Ribbon-to-Ribbon ABI*

This is the standard, high-performance convention for calls between two Ribbon bytecode functions.

*   **State:** A new `CallFrame` is pushed to the call stack. A new `RegisterArray` is allocated on the register stack for the callee.
*   **Argument Passing:** Arguments are passed via virtual registers. The `call` and `call_c` instructions are immediately followed by a list of `Register` identifiers in the instruction stream. The RVM copies the values from these registers in the *caller's* frame to the first registers (r0, r1, r2...) of the *callee's* new register frame.
*   **Return Values:** The callee places its return value in a register (specified by the `return` instruction). The RVM pops the callee's frame and copies this value into the `output` register designated in the caller's `CallFrame`.

#### Builtin
*Ribbon-to-Host/Host-to-Ribbon ABI*

This convention is for host-provided functions that are exposed to the VM. These functions are expected to conform to the `core.BuiltinFunction` signature: `fn (*mem.FiberHeader) callconv(.c) BuiltinSignal`.

*   **Argument Passing:** There is a single argument: a pointer to the current `FiberHeader`. This gives the host function full access to the fiber's state, including its stacks and register file, allowing it to read any arguments it needs directly from the caller's registers.
*   **Return Values:** A `BuiltinSignal` is returned to the VM, indicating whether the function is returning normally (`return`), cancelling an effect (`cancel`), or signaling an error (`request_trap`, `overflow`, etc.). The actual return value for the Ribbon script is placed in `r0` of the builtin's own register frame before signaling. The VM then copies this value to the output register designated in the caller's `CallFrame`.
*   **No Marshalling:** The host function receives raw `RegisterBits` (64-bit unsigned integers) and is responsible for interpreting them as the correct types (e.g., pointers, floats).

#### Foreign
*Platform-specific C ABI*

This convention is used to call external functions that adhere to the platform's standard C ABI (e.g., System V AMD64). Direct invocation is a **JIT-only feature**.

*   **JIT Compiler Responsibility:** When the JIT compiler encounters a `call` instruction with the `foreign` ABI, it is responsible for generating the machine code prologue and epilogue needed to bridge Ribbon's `bytecode` convention and the C ABI. This includes:
    *   Moving arguments from virtual registers into the correct physical registers or onto the C stack.
    *   Aligning the stack as required by the C ABI.
    *   Moving the return value from the physical return register (e.g., `RAX`) back into a Ribbon virtual register.
*   **Interpreter Limitation:** The interpreter **cannot** perform this complex translation. A direct `foreign` call in the interpreter is an invalid operation. Host-provided `builtin` functions should be used to wrap complex C functions when running in interpreted-only mode.
*   **Future Development Possibility:** In future, the interpreter could provide a simplified version of the foreign call interface.

### Effects and the ABI

In Ribbon, [[Algebraic Effects]] are not merely a high-level language construct; they are a first-class component of the ABI, with dedicated instructions and runtime structures. This allows the VM to handle sophisticated, non-local control flow natively and efficiently.

#### The HandlerSet as a Runtime Contract

The core of the effect ABI is the `HandlerSet` structure. It's a runtime contract that defines a collection of handlers and their behavior. A `HandlerSet` contains:

*   **Handlers**: A collection of function pointers (either `bytecode` or `builtin` ABI) that implement the logic for one or more effects.
*   **Upvalues**: A list of stack offsets (`StackOffset`). These offsets are relative to the stack frame of the function that *installs* the handler set. This gives a handler the ability to read and write to variables in its defining scope, even though it may be called from a deeply nested function.
*   **Cancellation Context**: A `Cancellation` structure that specifies a `register` and an `address`. This defines a "non-local exit" point.

#### Scoping Handlers

Handlers are brought into scope dynamically using the `push_set` and `pop_set` instructions, which manipulate the [[Fiber]]'s `SetStack` and `Evidence` buffer.

1.  **`push_set`**: This instruction takes the ID of a `HandlerSet`. It pushes a new `SetFrame` onto the `SetStack`, linking the `HandlerSet` to the current `CallFrame`. Critically, it then updates the fiber's global `Evidence` buffer, making the new handlers the currently active ones for their respective effects. The previous handlers are preserved in a linked list within the new `Evidence` structures.
2.  **`pop_set`**: This instruction unwinds the changes made by `push_set`. It pops the current `SetFrame` and restores the `Evidence` buffer to point to the previously active handlers. This operation is strictly scoped; a `SetFrame` can only be popped by the same `CallFrame` that pushed it.

#### Invoking Handlers

The `prompt` instruction is a specialized function call for invoking an effect handler.

*   **Mechanism**: It takes an `Effect` ID and performs an O(1) lookup in the `Evidence` buffer to find the currently active handler. It then invokes that handler function using its specified ABI (`bytecode` or `builtin`).
*   **Context**: The handler function is called like any other function, with its own `CallFrame` and register set. It is also passed a pointer to the `Evidence` structure, which it can use to access upvalues or initiate a cancellation.

#### Non-Local Exits

The `cancel` instruction provides a powerful mechanism for non-local control flow, allowing a handler to terminate the entire computation block it is handling.

*   **Mechanism**: When `cancel` is executed, the VM uses the `Evidence` pointer from the current `CallFrame` to find the originating `SetFrame`.
*   **Stack Unwinding**: The VM rapidly unwinds the `CallStack`, `RegisterStack`, and `SetStack` back to the state of the `CallFrame` that pushed the handler set.
*   **Control Transfer**: The VM then reads the `cancellation` address and register from the `HandlerSet`. It sets the instruction pointer of the restored `CallFrame` to this address and places the value from the `cancel` instruction's register operand into the designated cancellation register. Execution then resumes from this new point, effectively skipping all intermediate code.

#### ABI Limitations

A function with a `foreign` (C) ABI **cannot** be an effect handler. Foreign functions lack the context and mechanism to interact with the RVM's internal state (like the `SetStack` or `Evidence` buffer) and cannot execute instructions like `cancel`. This boundary is strict and ensures the integrity of the VM's effect system. Any interaction with foreign code that needs to be part of an effect-driven workflow must be wrapped by a `builtin` function.

### The Safety Model: ABI and Effects

The direct memory access model of Ribbon's ABI is made safe for guest code by the type and effect system. When compiling guest code, the compiler enforces a "safe mode":

1.  **Forbidden Operations:** Instructions that would allow for arbitrary memory manipulation, such as pointer arithmetic or unsafe type casts, are forbidden and will fail to compile.
2.  **Effects as Capabilities:** All access to external state (like memory buffers provided by the host) must be done through functions that are typed with an appropriate [[Algebraic Effects|effect]]. For example, reading from a buffer is not a primitive `load` instruction but a call to an effectful function like `Buffer.read`.
3.  **Static Verification:** A guest function's type signature must declare every effect it performs. The host can inspect this signature *before* running the code and decide whether to provide handlers (i.e., grant capabilities) for those effects.

If a guest function attempts an operation for which it was not granted a capability, execution will trap. This combination allows the ABI to be simple and fast, pushing the burden of safety onto a static analysis phase rather than a costly runtime one.