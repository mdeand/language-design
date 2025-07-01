This document details the core runtime structures of the Ribbon Virtual Machine (RVM). While the [[Isa]] document specifies the instructions the RVM executes, this document describes the state and memory layout of the execution environment itself.

The central component of the RVM is the `Fiber`.

### Contents

*   [[#The Fiber|The Fiber: A Lightweight Execution Context]]
    *   [[#Memory Layout]]
*   [[#The Fiber Header|The Fiber Header: The Control Panel]]
    *   [[#Stacks]]
    *   [[#Effect Handling Machinery]]
*   [[#Execution Model|Execution Model]]
    *   [[#Function Calls]]
    *   [[#Returning and Cancelling]]

### The Fiber: A Lightweight Execution Context

A `Fiber` encapsulates all the state required for an independent thread of execution within the RVM. Unlike OS threads, fibers are managed entirely in user space, making them extremely lightweight and efficient to create, manage, and switch between. A single OS thread can manage thousands of fibers.

Each `Fiber` is a single, contiguous block of memory, which allows for very fast allocation and deallocation and improves data locality.

#### Memory Layout

The memory for a `Fiber` is laid out sequentially to ensure no padding is needed between sections. The total size is typically only a few megabytes.

1.  **`FiberHeader`**: A fixed-size structure at the beginning of the memory block that contains pointers and stack-tops for all other sections. It acts as the control panel for the fiber.
2.  **Register Stack Block**: The memory region for the `RegisterStack`.
3.  **Data Stack Block**: The memory region for the `DataStack`.
4.  **Call Stack Block**: The memory region for the `CallStack`.
5.  **Set Stack Block**: The memory region for the `SetStack`.

This contiguous layout is a key design feature, enabling high performance and simplifying the VM's implementation.

### The Fiber Header: The Control Panel

The `FiberHeader` is the entry point to a fiber's state. It contains the top pointers for all stacks and the necessary metadata for execution.

#### Stacks

The RVM uses several distinct stacks, each with a specific purpose. These are simple stack allocators that manage regions of the fiber's contiguous memory block.

*   **Register Stack (`RegisterStack`)**: This stack holds arrays of virtual registers (`RegisterArray`). A new `RegisterArray` is pushed for each function call, providing the function with its own set of `256` 64-bit registers.
*   **Data Stack (`DataStack`)**: A general-purpose stack for operand data. It is used for values that are larger than a single register (64 bits) or values that need to be addressable in memory (e.g., via the `addr_l` instruction).
*   **Call Stack (`CallStack`)**: This stack tracks active function calls. Each time a function is called, a `CallFrame` is pushed onto this stack.
    *   A **`CallFrame`** contains:
        *   `ip`: The instruction pointer, pointing to the next instruction to execute in the function's bytecode.
        *   `function`: A pointer to the `core.Function` or `core.BuiltinFunction` being executed.
        *   `vregs`: A pointer to the current function's `RegisterArray` on the register stack.
        *   `data`: A pointer to the base of the current function's frame on the `DataStack`.
        *   `output`: The register in the *caller's* frame where the return value of this function should be stored.
        *   `set_frame`: A pointer to the current effect handler `SetFrame`.
        *   `evidence`: A pointer to the `Evidence` structure if this is an effect handler call.
*   **Set Stack (`SetStack`)**: This stack manages active [[Algebraic Effects|effect handler sets]]. When a `push_set` instruction is executed, a `SetFrame` is pushed onto this stack.
    *   A **`SetFrame`** links a `HandlerSet` to the `CallFrame` that activated it. It's used to find the correct cancellation context when an effect handler executes a `cancel` instruction.

#### Effect Handling Machinery

The RVM's static guarantees for [[Algebraic Effects]] are supported by two key runtime structures in the `FiberHeader`:

*   **Evidence Buffer**: A fixed-size array (`[pl.MAX_EFFECT_TYPES]?*Evidence`) that serves as a direct-access map. It is indexed by an effect's unique ID. When a `prompt` instruction needs to invoke a handler for a specific effect, it can find the current `Evidence` in O(1) time.
*   **`Evidence`**: A structure that represents a live, scoped effect handler. It contains:
    *   A pointer to the actual handler function.
    *   A pointer to the `SetFrame` that activated this handler.
    *   A pointer to the `previous` `Evidence` for the same effect, forming a linked list. When a `SetFrame` is popped, this allows the RVM to efficiently restore the previously active handler.

### Execution Model

The core of the VM is a dispatch loop that executes the instruction pointed to by the `ip` of the top-most `CallFrame`.

1.  **Fetch**: The VM reads the 64-bit word at the `ip`.
2.  **Decode**: The word is split into a 16-bit opcode and 48 bits of operand data.
3.  **Dispatch**: The opcode is used to jump to the logic for that instruction.
4.  **Execute**: The instruction logic is performed, modifying the `Fiber`'s state (e.g., writing to registers, changing the `ip`, pushing to stacks).
5.  **Loop**: The `ip` is advanced (unless it was a jump/branch instruction), and the process repeats.

This loop continues until a `halt` instruction is reached, an error occurs, or (in debugging mode) a `breakpoint` is hit.

#### Function Calls

The `call`, `call_c`, and `prompt` instructions follow a similar procedure to create a new stack frame:

1.  A new `CallFrame` is pushed onto the `CallStack`. Its `function` pointer is set to the target function.
2.  The `output` register is recorded in the new frame, indicating where the return value should be placed in the caller's register set.
3.  A new `RegisterArray` is pushed onto the `RegisterStack` and its pointer is stored in the new `CallFrame`'s `vregs` field.
4.  Arguments are copied from the caller's registers into the new register frame.
5.  The `ip` in the new `CallFrame` is set to the entry point of the target function.
6.  Execution transfers to the new frame.

#### Returning and Cancelling

*   **`return`**: The `return` instruction pops the current `CallFrame`, `RegisterArray`, and `DataStack` frame. It reads the `output` register from the popped frame and copies the return value into that register in the new top-most frame (the caller). Execution resumes at the caller's `ip`.

*   **`cancel`**: This instruction is only valid within an effect handler. It triggers a more significant stack unwinding. Instead of just popping one frame, it unwinds the `CallStack`, `RegisterStack`, `DataStack`, and `SetStack` until it reaches the `SetFrame` that initiated the effect. It then places the cancellation value in the designated register of that frame and jumps to the `cancellation.address` defined in the `HandlerSet`, effectively short-circuiting the computation back to the point after the effect was handled.