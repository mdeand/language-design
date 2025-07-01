### A Guided Example of VM Execution

This document provides a step-by-step walkthrough of the Ribbon VM's execution model, demonstrating how the core components specified in the VM documentation work together. We will trace a small but feature-rich program from invocation to completion.

### The Example Scenario

Consider the following high-level Ribbon program. It defines an `Exception` effect, which can be performed by calling its `throw` operation. The `calculate` function uses this effect to signal a division-by-zero error. The `main` function calls `calculate` inside a `with...do` block that provides a handler for the `Exception` effect, catching the error and yielding a specific status code.

**Ribbon Source Code:**
```ribbon
;; Builtin function provided by the host
;; "host/print_val" (prints a u64)

;; Define the Exception effect and its 'throw' operation.
;; '!' is the bottom type (no return).
Exception := effect E.
  throw : E -> !

;; A function that might perform the Exception effect.
calculate := fun a, b.
  if b == 0 then
    Exception/throw 'DivisionByZero ;; Perform the effect, passing a symbol literal.
  else
    a / b

;; Main entry point
main := fun (). 
  result := ;; Use a 'with...do' block to handle effects performed by 'calculate'.
    with Exception _. ;; We don't care about the exception type, so we use a type hole.
      throw _ =>      ;; Handler for 'throw'. It takes one argument but ignores it.
        cancel -1     ;; Cancel the 'do' block and yield -1 as its result.
    do
      calculate 20 0 ;; Perform `calculate` with our handler bound to all `Exception/throw` prompts.
  
  ;; Print the final result, which will be the cancellation value.
  host/print_val result

  ;; Return an exit code from main.
  0
```

### The Compiled Bytecode (Disassembly)

A Ribbon compiler would translate the above code into bytecode. The `with...do` block is syntactic sugar that compiles down to a `push_set`, the call(s), and a `pop_set` at the cancellation address. The following is a plausible disassembly listing.

```
;; AddressTable IDs
;; F_main: Id.of(Function) for main
;; F_calc: Id.of(Function) for calculate
;; E_ex:   Id.of(Effect) for Exception
;; H_ex:   Id.of(HandlerSet) for the anonymous handler in main
;; B_prnt: Id.of(BuiltinAddress) for host/print_val
;; C_d0:   Id.of(Constant) for the symbol literal 'DivisionByZero

;; --- Function: calculate (F_calc) ---
;; Expects args in r0, r1.
calculate:
  i_eq64c   r2, r1, 0       ;; r2 = (r1 == 0)
  br_if     r2, handle_zero ;; if r1 was 0, jump
  u_div64   r0, r0, r1      ;; r0 = r0 / r1
  return    r0              ;; return result in r0
handle_zero:
  addr_c    r0, C_d0        ;; r0 = address of 'DivisionByZero symbol
  prompt    r0, E_ex, 1; r0 ;; prompt for the 'throw' handler, passing the symbol
  return    r0              ;; return result from handler (if it continues)

;; --- Function: main (F_main) ---
main:
  push_set    H_ex   ;; Make the handler active
  bit_copy64c r0, 20 ;; r0 = 20
  bit_copy64c r1, 0  ;; r1 = 0
  call_c      r0, F_calc, 2; r0, r1 ;; r0 = calculate(r0, r1)
cancellation_addr:
  pop_set                      ;; Deactivate the handler
  call_c      _, B_prnt, 1; r0 ;; host/print_val(r0)
  bit_copy64c r0, 0            ;; r0 = 0
  return      r0               ;; implicit (trailing expression) return from main

;; --- Handler for Exception/throw ---
;; This code is part of an anonymous function referenced by H_ex.
;; It takes one argument (in r0), which it ignores.
handler_exception_throw:
  bit_copy64c r0, -1 ;; Load the cancellation value into r0
  cancel      r0     ;; Initiate cancellation
```

*Note*: The `cancellation.address` for the `HandlerSet` `H_ex` would point to the `pop_set` instruction at `cancellation_addr`. The `handler` entry for `E_ex` would point to `handler_exception_throw`.

### The Walkthrough

Let's trace the execution of `interpreter.invokeBytecode(fiber, F_main, &[])`.

**1. Invoking `main`**

The interpreter sets up the initial `CallFrame` for `main`.

* **`CallStack`**: `[Frame(main)]`
* **`ip`**: points to the first instruction of `main`.
* **Registers**: All registers are zeroed.

---
**2. `push_set H_ex`**

The first instruction in `main` activates our effect handler.

* **Action**: A new `SetFrame` is pushed to the `SetStack`, linking `H_ex` to `Frame(main)`. The `Evidence` buffer slot for `E_ex` is updated to point to a new `Evidence` structure containing the handler and a pointer to this `SetFrame`.
* **`SetStack`**: `[SetFrame(H_ex)]`
* **`Evidence[E_ex]`**: `-> Evidence(for H_ex)`

---
**3. `call_c r0, F_calc, ...`**

`main` calls `calculate`. A new stack frame is created for `calculate`.

* **Action**: A new `CallFrame` for `calculate` is pushed. The arguments (`20` from `r0`, `0` from `r1` of `main`) are copied to `r0` and `r1` of the new `RegisterArray`.
* **`CallStack`**: `[Frame(main), Frame(calc)]`
* **`ip`**: points to the first instruction of `calculate`.
* **`Frame(calc).vregs`**: `{r0: 20, r1: 0, ...}`

---
**4. `i_eq64c r2, r1, 0` and `br_if r2, handle_zero`**

Inside `calculate`, we check if the denominator is zero.

* **Action**: `r1` (which is `0`) is compared to the immediate `0`. The result (`1`) is stored in `r2`. The `br_if` instruction sees that `r2` is non-zero and jumps to the `handle_zero` label.
* **`ip`**: now points to `addr_c r0, C_d0`.

---
**5. `prompt r0, E_ex, ...`**

The `Exception` effect is triggered. This is a critical step.

* **Action**:
    1. The `addr_c` instruction loads the address of the `'DivisionByZero` symbol into `r0`.
    2. The `prompt` instruction is executed. It looks up `E_ex` in the `Evidence` buffer and finds the handler from `H_ex`.
    3. A new `CallFrame` is pushed for the handler function (`handler_exception_throw`). The argument (`r0` from `Frame(calc)`) is copied to `r0` in the new handler frame.
    4. The new `CallFrame`'s `evidence` field is set to point to the `Evidence` structure that was just found.
* **`CallStack`**: `[Frame(main), Frame(calc), Frame(handler)]`
* **`ip`**: points to the first instruction of the handler (`bit_copy64c r0, -1`).

---
**6. `cancel r0`**

The handler executes `cancel`, triggering a non-local exit.

* **Action**:
    1. **Find Origin**: The VM inspects `Frame(handler)` and follows its `evidence` pointer to find the originating `SetFrame(H_ex)`. This `SetFrame` tells the VM that the scope to unwind to is `Frame(main)`.
    2. **Unwind Stacks**: The VM pops `Frame(handler)` and `Frame(calc)` from the `CallStack`, along with their corresponding `RegisterArray`s. It pops `SetFrame(H_ex)` from the `SetStack` and restores the `Evidence` buffer.
    3. **Transfer Control**: The VM is now back in `Frame(main)`. It looks at the `cancellation` information in `H_ex`.
       * It sets `Frame(main).ip` to `cancellation_addr`.
       * The handler first executes `bit_copy64c r0, -1`. Then, the `cancel r0` instruction takes this value (`-1`) and places it into the designated output register for the `with...do` block, which is `r0`.
* **`CallStack`**: `[Frame(main)]`
* **`ip`**: points to `cancellation_addr` (just after the `pop_set` instruction).
* **`Frame(main).vregs`**: `{r0: -1, ...}`

---
**7. `pop_set` and `call_c _, B_prnt, ...`**

Execution has resumed in `main` at the recovery point.

* **Action**: `pop_set` is skipped, as the handler set was already popped during the `cancel` unwind. The VM then calls the `host/print_val` builtin, passing the value in `r0` (`-1`). The host function prints the value to the console.

---
**8. `return 0`**

`main` finishes.

* **Action**: `main` implicitly returns its last value. The `return` instruction takes the value `0` from `r0` and concludes the execution. The initial `invokeBytecode` call in the host finally completes, returning `0`.