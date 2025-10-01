---
title: Grammar Walkthrough
---

This section walks through the grammar definition in small production sets for easier understanding.

#### Contents

* [[#Precedence Climbing]]
* [[#Lexical Grammar: Tokenization]]
* [[#Syntactic Grammar: Parsing]]
* [[#Pattern Grammar]]


#### Precedence Climbing

While the grammar in this document is written to be formally unambiguous by encoding precedence directly into the productions, it is still designed with a precedence climbing parser (e.g., [[Pratt Parsing]]) in mind. This design choice supports robust language extension. For an extensible parser, a **precedence table** is often used as the direct source of truth rather than a fixed grammar hierarchy. The following table illustrates the intended precedence for the default operators:

##### Precedence Table

| Precedence | Operator(s)                     | Production         | Associativity |
| :--------: | ------------------------------- | ------------------ | ------------- |
| 1          | `;`, `Linebreak`                | `sequence_expr`    | left          |
| 2          | `=`, `:=`, `: mut =`, `: mut _ =`| `assignment_expr`, `declaration_expr` | none          |
| ...        | *User-defined infix operators*  |                    |               |
| 10         | Juxtaposition (e.g., `f x`)     | `application_expr` | left          |
| 11 (Max)   | Literals, `(...)`, `fun`, etc.  | `primary_expr`     | n/a           |

#### Lexical Grammar: Tokenization
This section defines the raw tokens produced by the lexer. These are the most fundamental building blocks of the language.

##### Punctuation
The following punctuation characters are explicitly reserved by the lexer and are treated as individual tokens. They are used to structure the code.

```ebnf
Punctuation ::= '(' | ')' | '{' | '}' | '['  | ']'
              | '.' | ',' | ';' | '`' | '\\' | '#'
              | '"' | "'"
```

##### Sequences
The lexer is minimalistic and groups many characters into a generic 'Sequence' token. The parser then introspects these sequences to differentiate between things like identifiers and integers. A `SequenceChar` is any character that is not whitespace, a control character, or a reserved punctuation mark.

```ebnf
SequenceChar ::= [^\p{Z}\p{C}] - Punctuation
Sequence     ::= SequenceChar+
```

##### Layout
Ribbon's syntax is sensitive to layout. The lexer must be stateful and generate special tokens for these layout cues. End of input must trigger the generation of one or more `Unindent` tokens if the final indentation level is greater than the base level.

```ebnf
Linebreak ::= (\s*\n\s*)+ [wfc: 3]
Indent    ::= (\s*\n\s*)+ [wfc: 4]
Unindent  ::= (\s*\n\s*)+ [wfc: 5]
```

```
3. indentation level after collecting last \s sequence must match level before Linebreak production
4. indentation level after collecting last \s sequence must be greater than before Indent production
5. indentation level after collecting last \s sequence must be equal to a stored level present before Unindent production
```

---

#### Syntactic Grammar: Parsing
These productions describe how the parser consumes the token stream to build syntactic structures. The grammar is presented as an unambiguous **precedence ladder**, from the lowest precedence (`expression`) to the highest (`primary_expr`).

##### Expression Hierarchy
```ebnf
expression           ::= sequence_expr
sequence_expr        ::= assignment_expr (sequence_operator assignment_expr)*
assignment_expr      ::= declaration_expr ('=' declaration_expr)?
declaration_expr     ::= application_expr (declaration_operator application_expr)?
application_expr     ::= primary_expr+
primary_expr         ::= Identifier
                       | literal
                       | block_expr
                       | function_expr
```

##### Helper Productions
```ebnf
sequence_operator    ::= Linebreak | ';'
declaration_operator ::= ':='
                       | ':' 'mut' '='
                       | ':' 'mut' expression '=' [wfc: 6]
block_expr           ::= Indent expression Unindent
                       | '(' expression? ')'
                       | '{' expression? '}'
                       | '[' expression? ']'
function_expr        ::= 'fun' expression '.' expression
```

```
6. requires typed language
```

##### Atomic Forms
These productions define the leaf nodes of the expression grammar.
```ebnf
Identifier       ::= Sequence - literal
literal          ::= Integer | Float | String | Character | Symbol
Integer          ::= [0-9_]+ | ( "0x" [A-Fa-f0-9_]+ ) | ( "0b" [01_]+ ) [wfc: 1]
Float            ::= [0-9_]+ '.' [0-9_]+ ('e' [0-9_]+)? [wfc: 1, 2]
String           ::= '"' ( [^"\\] | EscapeSequence )* '"'
Character        ::= "'" ( [^'\\] | EscapeSequence ) "'"
Symbol           ::= "'" Sequence (?! "'")
EscapeSequence   ::= '\\' EscapePayload
EscapePayload    ::= 'n' | 't' | 'r' | '\\' | '"' | "'" | '0'
                   | UnicodeEscape | AsciiEscape
UnicodeEscape    ::= "u{" [A-Fa-f0-9]{1,6} '}'
AsciiEscape      ::= "x" [A-Fa-f0-9][A-Fa-f0-9]
```

```
1. all forms must have at least one digit in at least one digit-accepting location
2. all tokens must be source-adjacent
```

---

### Pattern Grammar

This grammar defines the `pattern` production for deconstructing values and expressions. It mirrors the expression grammar's unambiguous, precedence-ladder structure.

*[[Refutability]]* (whether a pattern can fail) and *[[Exhaustiveness]]* (whether a set of patterns covers all possibilities) are semantic concerns handled by a later compiler pass.

##### Pattern Hierarchy
```ebnf
pattern             ::= or_pattern
or_pattern          ::= as_pattern ('|' as_pattern)*
as_pattern          ::= application_pattern ('@' application_pattern)?
application_pattern ::= primary_pattern+
primary_pattern     ::= 'quote' pattern_content
                      | literal_pattern
                      | binding_pattern
                      | type_pattern
                      | composite_pattern
                      | unquote_pattern
```

##### Helper Productions
```ebnf
pattern_content   ::= expression
unquote_pattern   ::= '#' primary_pattern
```

##### Atomic Patterns
```ebnf
literal_pattern   ::= literal
binding_pattern   ::= Identifier | '_'
type_pattern      ::= "of" expression
composite_pattern ::= '(' pattern_sequence? ')'
                    | '[' pattern_sequence? ']'
                    | '{' pattern_sequence? '}'
pattern_sequence  ::= pattern_element (',' pattern_element)* ','?
pattern_element   ::= pattern | rest_pattern [wfc: 7]
rest_pattern      ::= '..' Identifier?
```

```
7. a `pattern_sequence` may contain at most one `rest_pattern`
```