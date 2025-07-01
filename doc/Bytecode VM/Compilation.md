### Compilation and Code Generation

This document outlines the process of compiling Ribbon code into executable bytecode and the optional, high-performance path of Just-In-Time (JIT) compilation to native machine code. The entire system is designed around a central principle: **simplicity and modularity**. The core VM interpreter is completely unaware of the JIT's existence; it only knows how to execute bytecode and call functions that adhere to the `builtin` ABI.

### The Compilation Artifact: `core.Bytecode`

The fundamental unit of compiled Ribbon code is a `core.Bytecode` object. This is a self-contained block of memory that holds everything needed to execute one or more functions. It consists of two main parts:

1. **`core.Header`**: A metadata section at the beginning of the block. The header contains:
    * **`AddressTable`**: The heart of the linking strategy. This table is an array of pointers that maps the `Id`s used in instruction operands (like `Id.of(core.Function)`) to the actual memory addresses of functions, globals, and constants. This indirection is what makes dynamic linking and JIT compilation possible.
    * **`SymbolTable`**: Optional metadata that maps human-readable names (e.g., `"my_module/my_function"`) to their corresponding `Id`s. This is primarily used for debugging, reflection, and dynamic linking by name.
2. **Instruction Data**: A contiguous block of raw `InstructionBits` that immediately follows the header. The `AddressTable` contains pointers into this region for each defined function.

### The Standard Compilation Process (AOT)

The default Ahead-of-Time (AOT) compilation path transforms Ribbon source code into an executable `core.Bytecode` unit in memory.

1. **Parsing**: Source code is parsed into an Abstract Syntax Tree (AST).
2. **Code Generation**: A compiler backend traverses the AST and uses the `bytecode.Builder` API to generate a high-level, unencoded representation of the instructions for each function.
3. **Encoding**: The `bytecode.Encoder` takes the unencoded instructions and writes them out as a stream of `InstructionBits` into a memory buffer. It populates the `AddressTable` and `SymbolTable` within the header as it goes.
4. **Finalization**: The final result is a single, contiguous block of memory representing the `core.Bytecode` unit, ready to be loaded and executed by a `Fiber`.

At this stage, all functions in the unit are standard bytecode functions, and the `call` instructions targeting them will use the `bytecode` ABI.

### The JIT Compilation Process (Optional Optimization)

The JIT compiler is an optional layer that dramatically improves performance by translating "hot" functions from bytecode into native machine code. Its integration is designed to be seamless and invisible to the core VM.

**The Base Strategy: From `bytecode` to `builtin`**

The JIT compiler is a specialized function that:
* **Takes as Input**: A `core.Function` (i.e., a pointer to a function's bytecode and its associated metadata) within a `core.Bytecode` unit.
* **Produces as Output**: A `core.AllocatedBuiltinFunction`. This is a block of executable machine code with a function signature that matches the `builtin` ABI: `fn (*mem.FiberHeader) callconv(.c) BuiltinSignal`.

The "magic" happens in the final step:

**The "Swap":** After generating the native code, the JIT (or the host environment managing it) modifies the `AddressTable` within the `Header`. It finds the entry for the original `core.Function` and **replaces the pointer** to point to the new `core.AllocatedBuiltinFunction`.

From this point on, any `call_c` instruction that uses the ID of the JIT-compiled function will be dispatched by the interpreter as a standard `builtin` call. The interpreter simply calls the function pointer; it has no knowledge that the native code it's executing was generated just moments before. This allows JIT-compiled code and interpreted code to coexist and call each other transparently.

#### Handling Foreign (C) Calls

Directly calling C functions requires conforming to the platform's specific C ABI (e.g., passing arguments in specific physical registers). The VM interpreter cannot perform this complex task. This is a primary responsibility of the JIT compiler.

When the JIT encounters a `call` instruction with the `foreign` ABI, it generates the necessary "glue" code to marshal arguments from the `Fiber`'s virtual registers into the correct physical registers and stack layout required by the C ABI, and then performs the native call.

#### JIT-only Instructions

The ISA includes instructions marked with a `jit` tag. These instructions serve as hints or directives for an optimizing JIT compiler.

* **Behavior:** The interpreter must treat all `jit` instructions as `nop`. This ensures that bytecode containing these optimizations can still be executed correctly by the baseline VM, maintaining forward compatibility.
* **Purpose:** These instructions can be used to pass higher-level information to the JIT that would be difficult to recover from the bytecode alone, such as aliasing information, loop metadata, or profile-guided optimization hints.