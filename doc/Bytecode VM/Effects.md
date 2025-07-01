### Algebraic Effects in the Ribbon VM

The Ribbon Virtual Machine (RVM) has first-class support for [[Algebraic Effects]], a powerful mechanism for managing side effects and implementing sophisticated control flow. This document provides a holistic overview of how effects are implemented at the VM level, tying together the concepts from the [[Isa]], [[Fiber]], and [[ABI]] specifications.

While other documents specify the individual components, this one illustrates how they work together in a dynamic context.

### Design Rationale

The RVM's implementation of algebraic effects is deliberately chosen for performance, safety, and simplicity. Unlike systems that use one-shot or multi-shot delimited continuations, Ribbon's model is fundamentally **stack-based**. When an effect handler cancels, it does not capture a reified continuation object; instead, it performs a **destructive unwinding of the stack**.

This design presents a specific set of trade-offs that align perfectly with Ribbon's goals as a high-performance systems language.

#### Reliable Performance and Overhead

The primary motivation for this model is performance. Capturing a full continuation is an expensive operation. It requires heap allocation to store the captured stack segment and involves complex machinery to manage the continuation's lifecycle.

By relying on stack unwinding, the RVM avoids this entirely:
*   **No Heap Allocation for Control Flow:** A `cancel` operation involves no new memory allocations. It is purely a series of stack pointer adjustments and a single jump. This makes non-local exits extremely fast and predictable.
*   **Simplified VM Logic:** The VM does not need to manage complex continuation objects. The state is always on the stack, which simplifies the interpreter loop and makes the VM a much cleaner target for JIT compilation.

#### Enhanced Static Analysis and Safety

While the performance gains are significant, the safety implications are equally important. Full, re-invocable continuations (multi-shot) introduce immense complexity for static analysis. A captured continuation represents a "time travel" device for control flow, allowing code to be re-entered at arbitrary points with a potentially stale or confusing state. This can make reasoning about resource lifetimes, memory ownership, and data flow a nightmare.

Ribbon's stack-unwinding model provides much stronger guarantees:
*   **Linear Control Flow:** Despite allowing non-local jumps, control flow always moves *forward* or *up the stack*. A scope, once exited via `cancel`, can never be re-entered. This linearity is much easier for a static analyzer (and a human) to reason about.
*   **Predictable Resource Management:** Because a scope is destroyed when unwound, resources associated with that scope (e.g., memory allocations, file handles) can be deterministically cleaned up. There is no risk of a dangling continuation trying to access a resource that has since been freed. This model fits naturally with systems that track resource lifetimes.

#### Delimited, Not Undelimited

It's important to note that Ribbon's effects are **delimited**. The `push_set` and `pop_set` instructions create a clear boundary. An effect can only be handled by a handler within its dynamic scope. This prevents the "action at a distance" problems associated with undelimited, global exception systems and provides a clear, lexical structure for developers to follow.

In essence, Ribbon's effect system is not designed to be a general-purpose coroutine or continuation framework. It is a highly-optimized tool for one specific, powerful purpose: **structured, non-local control flow with static safety guarantees**. It provides the expressive power of effects without sacrificing the performance and predictability required by a true systems language.

### The Life of an Effect

From the VM's perspective, handling an effect involves three distinct phases:

1.  **Installation**: A set of handlers is brought into scope.
2.  **Invocation**: An effectful operation is performed, which triggers a search for the active handler and calls it.
3.  **Continuation or Cancellation**: The handler completes and either returns control to the point of invocation or performs a non-local exit, unwinding the stack to the point of installation.

#### 1. Installation: `push_set`

An effect handler doesn't exist in isolation; it's part of a `HandlerSet`. A handler set is made active for a dynamic scope using the `push_set` instruction.

**Walkthrough:**
1.  **The `push_set` Instruction:** The VM executes `push_set H`, where `H` is the ID of a `HandlerSet`.
2.  **Create `SetFrame`:** A new `SetFrame` is pushed onto the [[Fiber]]'s `SetStack`. This frame links the `HandlerSet` (`H`) to the current `CallFrame`, marking the boundary of the effect's scope.
3.  **Update `Evidence` Buffer:** For each effect handled by `H`, the VM performs the following:
    a. It allocates a new `Evidence` structure.
    b. The new `Evidence` stores a pointer to the handler function and a pointer back to the new `SetFrame`.
    c. It finds the entry in the fiber's `Evidence` array corresponding to the effect's ID.
    d. The `previous` pointer of the new `Evidence` is set to the value currently in the array slot.
    e. The array slot is updated to point to the new `Evidence`.

This creates a linked list of handlers for each effect type, with the head of the list always being the most recently installed one.

**State Before `push_set`:**
```
CallStack: [..., CallerFrame]
SetStack:  [..., OldSetFrame]
Evidence[E]: -> OldEvidence
```

**State After `push_set H`:**
```
CallStack: [..., CallerFrame]
SetStack:  [..., OldSetFrame, NewSetFrame(for H on CallerFrame)]
Evidence[E]: -> NewEvidence(for H) -> OldEvidence
```

#### 2. Invocation: `prompt`

The `prompt` instruction is the mechanism for calling an effect handler.

**Walkthrough:**
1.  **The `prompt` Instruction:** The VM executes `prompt R, E, A, I`, where `E` is the ID of the effect to perform.
2.  **Find Handler:** The VM uses `E` as a direct index into the `Evidence` buffer to find the currently active `Evidence` structure in O(1) time. If the entry is null, it's a runtime error (`MissingEvidence`).
3.  **Function Call:** A standard function call is initiated using the handler function pointer and ABI (`A`) stored in the `Evidence`. A new `CallFrame` is pushed, arguments are copied, and execution jumps to the handler's code.
4.  **Passing Context:** Crucially, a pointer to the `Evidence` structure itself is stored in the new `CallFrame`. This gives the handler the context it needs to access upvalues or initiate a cancellation.

#### 3. Continuation or Cancellation

Once a handler is executing, it has two ways to conclude.

##### Normal Continuation: `return`

If the handler completes its work and executes a `return` instruction, it behaves like any normal function call.

1.  The handler's `CallFrame` is popped.
2.  The return value is copied into the `output` register of the caller (the function that executed `prompt`).
3.  Execution continues at the instruction immediately following the `prompt`.

##### Non-Local Exit: `cancel`

The `cancel` instruction triggers a non-local exit, unwinding the stack. This is the most complex operation in the effect ABI.

**Walkthrough:**
1.  **The `cancel` Instruction:** Inside a handler, the VM executes `cancel R`.
2.  **Find Origin Scope:** The VM retrieves the `Evidence` pointer from the current (handler's) `CallFrame`. From there, it follows the pointer to the `SetFrame` that installed this handler. This `SetFrame` points to the *originating* `CallFrame`—the one whose scope the handler is tied to.
3.  **Unwind Stacks:** The VM begins popping frames from the `CallStack`, `RegisterStack`, and `DataStack` until the top of each stack is the originating `CallFrame` and its associated data. As it pops each `SetFrame` from the `SetStack` during this process, it also restores the `Evidence` buffer, effectively de-registering all nested handlers.
4.  **Transfer Control:** Once the stack is unwound, the VM consults the `HandlerSet` associated with the `SetFrame`.
    a. It reads the `cancellation.address` and sets the `ip` of the now-current `CallFrame` to that address.
    b. It reads the `cancellation.register` and copies the value from `R` (the operand to `cancel`) into that register in the `CallFrame`.
5.  **Resume Execution:** The VM's main loop continues from the new `ip`. The computation has effectively "jumped" out of the handler and all intermediate functions, resuming at a designated recovery point.

**State Before `cancel` (deep inside a call stack):**
```
CallStack: [..., OriginFrame, ..., InnerFrame, HandlerFrame]
SetStack:  [..., OriginSetFrame, ...]
```
*`OriginSetFrame` was pushed by `OriginFrame`.*
*`HandlerFrame` is executing the handler from `OriginSetFrame`.*

**State After `cancel`:**
```
Call-Stack: [..., OriginFrame]
SetStack:   [..., (frame before OriginSetFrame)]
```
*The `ip` of `OriginFrame` now points to the cancellation address.*
*The cancellation value is now in the designated register of `OriginFrame`.*