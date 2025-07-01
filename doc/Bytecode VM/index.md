This section details the design and specification of the Ribbon Bytecode Virtual Machine (RVM), the core execution engine for the Ribbon language. The RVM is a high-performance, register-based virtual machine designed from the ground up to be safe, embeddable, and JIT-friendly, with first-class support for algebraic effects.

### Design Philosophy

The RVM's design directly reflects the core goals of the Ribbon language: to provide a powerful, high-performance systems language for host applications, and a safe, robust, and sandboxed extension language for guest code.

To achieve this, the VM is built around a few key principles:

* **Performance:** A register-based architecture was chosen for its efficiency and close mapping to physical CPU architectures, which is beneficial for both interpretation and Just-In-Time (JIT) compilation.
* **Safety & Sandboxing:** The VM provides the necessary primitives to statically prove memory safety for guest code. Its core runtime structure, the [[Fiber]], is a self-contained memory block that isolates execution state.
* **Effect-Awareness:** [[Algebraic Effects]] are not an afterthought; they are a fundamental part of the VM's control flow. The instruction set includes dedicated opcodes like `prompt` and `cancel` to manage effect handlers natively.

### Architecture at a Glance

The RVM's architecture is divided into two primary areas: the runtime state and the instruction set that manipulates it.

* **The [[Fiber]]**: The central runtime component is the [[Fiber]], a lightweight, self-contained execution context. It holds all the state for a single "thread" of Ribbon code, including its stacks, registers, and effect-handling machinery. This design makes fibers cheap to create and manage, allowing an application to run thousands of concurrent tasks efficiently.

* **Register-Based ISA**: The Ribbon bytecode is a low-level instruction set that operates on a large virtual register file. This avoids the overhead of stack manipulation for simple arithmetic and data movement, and provides a clean target for compilers.

* **Designed for JIT**: The instruction set is designed to be easily translated into machine code. The ISA documentation even marks certain instructions as being available only when the VM is compiled with JIT support, allowing for advanced optimizations.

### Section Contents

This section provides a complete specification of the RVM. For the best reading experience, it is recommended to proceed through the documents in the order they are listed.

* [[Isa]]: The Instruction Set Architecture. This is the definitive reference for every opcode in the Ribbon bytecode. It details each instruction's mnemonic, its binary encoding, its operands, and a description of its behavior. It specifies *what* language the VM speaks.

* [[Fiber]]: Describes the runtime heart of the VM. This document details the memory layout and purpose of the [[Fiber]], the various stacks it uses (`CallStack`, `RegisterStack`, etc.), and the data structures that enable its powerful effect-handling capabilities. It explains *how* the VM stores state.

* [[Effects]]: A holistic overview of how effects are implemented at the VM level, explaining the lifecycle of an effect from installation to invocation and cancellation.

* [[ABI]]: Specifies the Application Binary Interface (ABI) for the Ribbon language. It defines the low-level contracts for data layout and function calling conventions that bind the ISA and Fiber state together.

* [[Host Interface]]: A practical guide for embedding the RVM into a host application, covering how to define `builtin` functions and manage the boundary between host and guest code.

* [[Compilation]]: Outlines the process of compiling Ribbon source code into executable bytecode and the high-level strategy for JIT compilation.

* [[Walkthrough]]: A step-by-step trace of a sample program's execution, illustrating how all the previously described components interact in a dynamic context.
