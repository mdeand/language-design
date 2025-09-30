---
title: A Guide to the basic Ribbon VM Host API
---

### A Guide to the basic Ribbon VM Host API

This document provides a practical guide for embedding the Ribbon Virtual Machine (RVM) into a host application using Zig. It details the API and the patterns used to load code, interact with the `Fiber`, define custom functions, and handle data.

### The Core Components

Interacting with the RVM involves a few key data structures from the `core` module:

* **`core.Bytecode`**: A handle to a compiled block of Ribbon code and its metadata.
* **`core.Fiber`**: The execution context. You create one or more fibers to run your code.
* **`interpreter`**: The module containing the functions to drive execution, like `invokeBytecode` and `eval`.

### 1. Loading and Running Ribbon Code

The most fundamental interaction is loading compiled bytecode and executing a function within it.

**Example Workflow:**

0. **Add Ribbon to your Zig build**

1. **Load Bytecode**: First, you must obtain a `core.Bytecode` object. This typically involves reading a pre-compiled file into memory or using the `bytecode` module to generate it on the fly. For this example, we assume you have a `core.Header` pointer.

2. **Initialize a Fiber**: Every execution requires a `core.Fiber`. The host is responsible for its allocation and lifetime.
```zig
const std = @import("std");
const ribbon = @import("ribbon");
const core = ribbon.core;
const interpreter = ribbon.interpreter;

// An allocator is needed for the fiber's memory.
var gpa = std.heap.GeneralPurposeAllocator(.{}){};
const allocator = gpa.allocator();

// Allocate memory for the Fiber and its internal stacks.
const my_fiber = try core.Fiber.init(allocator);
defer my_fiber.deinit(allocator);
```

3. **Find the Target Function**: Use the `core.Header` to look up the function you wish to call by its fully-qualified name.
```zig
// `header` is from your loaded core.Bytecode object.
const my_function = try header.lookupAddressOf(core.Function, "my_module::main") orelse {
    std.log.err("Function 'my_module::main' not found!", .{});
    return error.FunctionNotFound;
};
```

4. **Invoke the Function**: Use `interpreter.invokeBytecode` to run the function. This is a blocking call that will execute the fiber until the function returns or a `halt` instruction is encountered.
```zig
// Arguments are passed as a simple slice of 64-bit values.
const args = &[_]u64{ 10, 20 }; // e.g., passing two integers

// The invoke function handles pushing a new call frame and copying arguments.
const result = try interpreter.invokeBytecode(my_fiber, my_function, args);

std.debug.print("Ribbon function returned: {d}\n", .{result});
```

### 2. Defining Host Functions (`builtins`)

To allow Ribbon code to call back into the host application, you must define "builtin" functions. A builtin is a native Zig function that adheres to the `core.BuiltinFunction` signature.

**Signature:** `fn (*core.mem.FiberHeader) callconv(.c) core.BuiltinSignal`

For convenience, since `core.Fiber` is a transparent wrapper around `*core.mem.FiberHeader`, you can write your functions to accept `core.Fiber` directly.

**Steps to Define and Expose a Builtin:**

1. **Write the Function**: Write a Zig function with a `core.Fiber` argument and the correct return type and calling convention.
```zig
// Example: A builtin that adds two numbers from the caller's registers.
fn myAdd(fiber: core.Fiber) callconv(.c) core.BuiltinSignal {
    // The current (top) call frame belongs to this builtin. The caller's
    // frame is one level down on the stack.
    const caller_frame = fiber.header.calls.top() - 1;
    const registers = caller_frame.vregs;

    // Read arguments from r0 and r1 of the caller.
    const arg1 = registers[core.Register.r0.getIndex()];
    const arg2 = registers[core.Register.r1.getIndex()];

    // The actual return value is placed in the `native_ret` register (r0)
    // of the *builtin's own frame*.
    const my_frame_registers = fiber.header.calls.top().vregs;
    my_frame_registers[core.Register.native_ret.getIndex()] = arg1 + arg2;

    // Signal to the interpreter that we are returning normally.
    return .@"return";
}
```

2. **Bind it to the Bytecode**: During your compilation process, you must cast your function to `*const core.BuiltinFunction` and bind it to a name in an `AddressTable` and `SymbolTable` (likely using `bytecode.Table`).
```zig
// When building your core.Bytecode unit...
var my_table = bytecode.Table{};
defer my_table.deinit(allocator);

// The builtin (likely) must outlive the current call frame, in which case we need to allocate.
const builtin_addr = try allocator.create(core.BuiltinAddress);
errdefer allocator.destroy(builtin_addr); // Destroying it later is up to you.

// Create the BuiltinAddress from the function pointer.
builtin_addr.* = core.BuiltinAddress.fromPointer(&myAdd, 0);

// Bind it to a name the Ribbon compiler can see.
_ = try my_table.bindBuiltinAddress(allocator, "host::my_add", builtin_addr);
```

Now, Ribbon code compiled with access to this `my_table` can call `host::my_add` as if it were a regular function.

### 3. Data Model and "Marshalling"

Ribbon's host interface is designed to avoid data marshalling wherever possible. It operates on the principle of **direct memory access, secured by the effect system**.

* **No "Value" Type**: There is no universal, tagged `Value` type. A 64-bit `RegisterBits` value can hold an integer, a float, or a raw pointer address. It is up to the host and the Ribbon code to agree on the interpretation of this data.
* **Pointers are Just Integers**: When you pass a pointer from the host to Ribbon, you are simply passing the memory address as a `u64`. Ribbon code can then use `load` and `store` instructions to interact with that memory directly.
* **Host Responsibility**: The host is responsible for managing the memory it shares with Ribbon. If the host passes a pointer to a buffer, it must ensure that buffer remains valid for as long as the Ribbon `Fiber` might use it.

This model is extremely fast, but requires a robust safety contract. For guest code, this contract is enforced by the compiler and the effect system. Untrusted code is compiled in a "safe mode" that cannot perform raw pointer arithmetic and can only interact with host memory via effectful `builtin` functions provided and controlled by the host. The host can then statically verify that a piece of guest code only declares the effects it is permitted to use before execution.


#### Design Note: The `BuiltinAddress` Wrapper

A reader of the implementation might wonder why the `AddressTable` stores a pointer to a `core.BuiltinAddress` struct, which in turn holds a pointer to the actual host resource, rather than storing a direct `*const core.BuiltinFunction`. This extra layer of indirection is a deliberate design choice motivated by **flexibility and uniformity**.

The `builtin` ABI is designed to be a unified interface for *all* host-provided resources, not just functions. The `BuiltinAddress` struct, with its `{ptr, len}` fields, acts as a "fat pointer" that can represent two distinct kinds of resources:

1.  **Host Functions**: When the resource is a callable function, `ptr` holds the function's address and `len` is typically zero. The VM uses this pointer for execution.
2.  **Host Data Buffers**: When the resource is a block of data (e.g., a configuration struct, a memory-mapped file, or a shared buffer), `ptr` holds the base address of the buffer and `len` holds its size.

By using this wrapper, the Ribbon VM can treat "builtins" as a single, consistent category. This simplifies the compiler and runtime systems, which can handle references to host resources without needing to differentiate between callable code and readable/writable data at every turn. Instructions like `addr_b` ("address of builtin") can uniformly return a pointer, regardless of what the host resource actually is.

The trade-off is a minor increase in complexity and an extra pointer dereference at runtime. However, the benefit is a more generalized and flexible host interface, which is a core tenet of Ribbon's design.