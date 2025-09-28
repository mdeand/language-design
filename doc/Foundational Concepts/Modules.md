A **Module** is the fundamental unit of compilation, linking, and code reuse in
Ribbon. Unlike in some languages where a module is synonymous with a single
source file, a Ribbon module is a collection of source files, dependencies, and
language configurations defined by a single **Module Definition File**.

This explicit definition is essential to Ribbon's design. Because the
[[Metaprogramming|Ribbon Meta-Language]] (RML) allows for powerful syntax
extension, the compiler cannot know how to parse a source file without first
being told which "dialect" of Ribbon it should be using. The module definition
file provides this critical, static context.

### The Module Definition File (`.rmod`)

Every module is defined by a `.rmod` file. This file uses a simple,
non-extensible subset of RML syntax, ensuring that the build orchestrator can
always parse it reliably. Its primary purpose is to act as a manifest for the
module.

#### Example

`graphics.rmod`:
```
;; `graphics` is the canonical name of this module, used for dependency resolution.
module graphics.
  ;; The list of source files that constitute this module's implementation.
  ;; Paths are relative to the .rmod file and can include directories,
  ;; which will be scanned recursively for `.rib` files.
  sources = [
    "renderer.rib",
    "shaders/",          ;; Includes all .rib files in this directory
    "mesh/",
  ]

  ;; A map of modules this module depends on.
  ;; The keys ('std', 'gpu') are the local aliases used in `import` statements.
  ;; The values are dependency specifiers (e.g., version strings, paths).
  dependencies = {
    std = package "core@0.1.0",
    gpu = github "tiny-bow/rgpu#W7SI6GbejPFWIbAPfm6uS623SVD",
    linalg = path "../linear-algebra",
  }

  ;; A list of language extension modules to activate for this module.
  ;; The compiler will load the public interfaces of these extensions
  ;; to configure the parser with their custom syntax rules and macros.
  extensions = [
    std/macros,
    std/dsl/operator-precedence,
    gpu/descriptors,
    linalg/vector-ops,
  ]
```

### The Two-Phase Parsing Model

This module system enables a robust, two-phase compilation process that fully
supports Ribbon's dynamic nature:

* **Phase 1: Static Configuration Parsing.** The build orchestrator first scans
  the project for `.rmod` files. It parses these simple, predictable files to
  build a complete dependency graph and understand the compilation requirements
  for each module, including which extensions it needs.

* **Phase 2: Extensible Source Parsing.** When compiling a specific module, the
  orchestrator invokes the frontend service. It provides the service with the
  list of source files *and* the list of active extensions from the `.rmod`
  file. The frontend service then configures its parser with the specified
  extensions and proceeds to parse the actual `.ribbon` source code.

This system allows the build orchestrator to operate deterministically on static
manifests while empowering the compiler to handle the fully dynamic and
extensible nature of the Ribbon language itself. It is the key to enabling a
powerful, LISP-like development experience on a modern, incrementally-compiled
foundation.