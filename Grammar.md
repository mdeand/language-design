[[The Ribbon Programming Language]]

This is the canonical grammar definition for Ribbon. Because Ribbon is a highly extensible language, no single document can possibly cover the full grammar. Instead, we define the productions that are available by default; before addition, modification, or deletion by extensions.

### Contents

+ [[#Format]]
	* [[#General Specification Syntax]]
	* [[#Lookahead Assertions]]
	* [[#Character Classes]]
	* [[#Lexical vs. Syntactic Grammar]]
+ [[#Grammar Walkthrough]]
	* [[#Lexical Grammar: Tokenization]]
	* [[#Syntactic Grammar: Parsing]]
+ [[#Definition]]

### Format

#### General Specification Syntax
We use a simple Extended Backus-Naur Form (EBNF) notation; based on the one [specified by the W3C here](https://www.w3.org/TR/xml/#sec-notation), and modified with additional regular expression conventions.

This particular notation was chosen because it is:
1. Mostly well-specified, by a respected organization.
2. Syntactically very similar to common Regular Expression syntax.


Each **Production** in the grammar defines one symbol, using the following form:
```ebnf
symbol ::= expression
```

To improve clarity for the language implementer, we use the following capitalization convention, which is guided by the production's role in the Abstract Syntax Tree (AST):
* Leaf nodes in the AST (atomic values and names) are written in `PascalCase`. Examples include `Integer`, `String`, and `Identifier`.
* Productions that represent compound nodes in the AST (structural rules) are written in `snake_case`. Examples include `expression`, `declaration_expr`, and `block_expr`.
**Note**: this is slightly different than the W3C rule, which refers to terminals/non-terminals for their use of case.

Within the expression on the right-hand side of a rule, the following expressions are used to match strings of one or more characters:

* `#xN` where `N` is a hexadecimal integer, the expression matches the character whose  codepoint number is `N`.

* `[a-zA-Z]`, `[#xN-#xN]` matches any codepoint with a value in the range(s) indicated (inclusive).

* `[abc]`, `[#xN#xN#xN]` matches any codepoint with a value among the characters enumerated. Enumerations and ranges can be mixed in one set of brackets.

* `[^a-z]`, `[^#xN-#xN]` matches any codepoint with a value outside the range indicated.

* `[^abc]`, `[^#xN#xN#xN]` matches any codepoint with a value not among the characters given. Enumerations and ranges of forbidden values can be mixed in one set of brackets.

* `"string"` matches a literal string matching that given inside the double quotes.

* `'string'` matches a literal string matching that given inside the single quotes.

* [EXTENSION] `\` is used to escape special characters such as [[#Character Classes|character class patterns]].


These symbols may be combined to match more complex patterns as follows, where `A` and `B` represent simple expressions:

* (`expression`) expression is treated as a unit and may be combined as described in this list.

* `A?` matches A or nothing; optional A.

* `A B` matches A followed by B. This operator has higher precedence than alternation; thus A B | C D is identical to (A B) | (C D).

* `A | B` matches A or B.

* `A - B` matches any string that matches A but does not match B.

* `A+` matches one or more occurrences of A. Concatenation has higher precedence than alternation; thus `A+ | B+` is identical to `(A+) | (B+)`.

* `A*` matches zero or more occurrences of A. Concatenation has higher precedence than alternation; thus `A* | B*` is identical to `(A*) | (B*)`.

* [EXTENSION] `A{n}` where `n` is a non-negative integer, matches exactly `n` occurrences of `A` .

* [EXTENSION] `A{n,}`  where `n` is a non-negative integer, matches at least `n` occurrences of `A`.  

* [EXTENSION] `A{n,m}` where `n` and `m` are non-negative integers and `m >= n`, matches at least `n` and at most `m` occurrences of `A`. 

* [EXTENSION] `A(?=B)`, `A(?!B)` encode [[#Lookahead Assertions]].


Other notations used in the productions are:

`/* ... */` comment.

`[ wfc: ... ]` well-formedness constraint; this identifies by name a constraint on well-formed documents associated with a production.

#### Lookahead Assertions

To improve precision we extend the W3C's EBNF notation with **lookahead assertions**. This syntax represent "looking ahead" in the source stream: it attempts to match the subsequent input with the given pattern, but it does not consume any of the input; if the match is successful, the current position in the input stays the same.

This extension is taken directly from existing regular expression notations, such as [the web standard detailed by MDN here](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Regular_expressions/Lookahead_assertion).

* `A(?=B)` matches if `A B` matches, but does not provide or consume the `B` source portion as part of its own match;  `A` is considered the actual match.
* `A(?!B)` matches if `A` matches but `B` does not; it does not consume source beyond `A`.

#### Character Classes

To improve readability and properly handle Unicode, we further extend the W3C's EBNF notation with regex-style **character classes** based on Unicode properties.

Common regex character class shortcuts are used, such as `\n`; `\p{...}` syntax is used to match characters belonging to a specific Unicode general category or script.

More information about character classes can be found on [MDN](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_expressions/Character_classes) and [TC39](https://tc39.es/ecma262/multipage/text-processing.html#table-nonbinary-unicode-properties).

##### Short-code Legend

| Abb. | Description                            |
| ---- | -------------------------------------- |
| `\n` | Ascii newline character `0A`           |
| `\d` | Ascii digit char `[0-9]`               |
| `\s` | Unicode whitespace **other than `\n`** |

##### `\p`-code Legend

| Abb. | Long form              | Abb. | Long form             | Abb. | Long form           |
| ---- | ---------------------- | ---- | --------------------- | ---- | ------------------- |
| L    | Letter                 | S    | Symbol                | Z    | Separator           |
| Lu   | Uppercase Letter       | Sm   | Math Symbol           | Zs   | Space Separator     |
| Ll   | Lowercase Letter       | Sc   | Currency Symbol       | Zl   | Line Separator      |
| Lt   | Titlecase Letter       | Sk   | Modifier Symbol       | Zp   | Paragraph Separator |
| Lm   | Modifier Letter        | So   | Other Symbol          | C    | Other               |
| Lo   | Other Letter           | P    | Punctuation           | Cc   | Control             |
| M    | Mark                   | Pc   | Connector Punctuation | Cf   | Format              |
| Mn   | Non-Spacing Mark       | Pd   | Dash Punctuation      | Cs   | Surrogate           |
| Mc   | Spacing Combining Mark | Ps   | Open Punctuation      | Co   | Private Use         |
| Me   | Enclosing Mark         | Pe   | Close Punctuation     | Cn   | Unassigned          |
| N    | Number                 | Pi   | Initial Punctuation   |      |                     |
| Nd   | Decimal Digit Number   | Pf   | Final Punctuation     |      |                     |
| Nl   | Letter Number          | Po   | Other Punctuation     |      |                     |
| No   | Other Number           |      |                       |      |                     |

#### Lexical vs. Syntactic Grammar

It is important to understand the relationship between the lexer (tokenizer) and the parser in the context of this grammar. Ribbon's design deliberately keeps the lexer's role minimal.

- The **Lexer** performs simple tokenization. It scans the source text and breaks it into a linear stream of the most basic tokens possible:
  * **Punctuation** - characters the lexer reserves as single-character tokens, such as `[`, and `;`.
  * **Linebreak** - any number of newlines that do not change the indentation level.
  * **Indent** - any number of newlines resulting in a new, deeper level of indentation
  * **Unindent** - any number of newlines resulting in a lower but existing level of indentation
  * **Sequence** - operators, identifiers, literals, essentially anything that is not one of the above
- The lexer is **not responsible** for understanding complex constructs like `Character` literals vs. Symbol literals.
- The **Parser** consumes this stream of tokens and builds a [[Concrete Syntax Tree|Concrete Syntax Tree (CST)]].
- A [[Concrete Syntax Tree|CST]] can then easily be trivially parsed into various [[Abstract Syntax Tree|Abstract Syntax Trees (AST)]] specified for the Ribbon meta-language, the typed language it defines, and any embedded [[Domain Specific Languages|DSL]]s created by users.

Therefore, once we move beyond the basic tokens defined in the [[#Lexical Grammar: Tokenization|Lexical Grammar]], the EBNF productions in this document define **syntactic grammar**. They describe the valid sequences of tokens that the parser accepts. A production should be interpreted from the parser's perspective of reading its token stream. 

##### Example

```ebnf
Symbol ::= "'" Sequence (?! "'")
```

This production describes the following parser behavior:
> Match a `Punctuation` token containing a single quote, followed by a `Sequence` token, but only if the next token in the stream is not another single-quote `Punctuation` token.

This approach allows the grammar to precisely specify parsing logic, including lookahead, while keeping the lexical analysis phase simple and fast.


---


### Grammar Walkthrough

This section walks through the grammar definition production by production for easier understanding.

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

---

### Definition

```ebnf
/* == LEXICAL GRAMMAR == */
Punctuation    ::= '(' | ')' | '{' | '}' | '['  | ']' | '.' | ',' | ';' | '`' | '\\' | '#' | '"' | "'"
SequenceChar   ::= [^\p{Z}\p{C}] - Punctuation
Sequence       ::= SequenceChar+
Linebreak      ::= (\s*\n\s*)+ [wfc: 3]
Indent         ::= (\s*\n\s*)+ [wfc: 4]
Unindent       ::= (\s*\n\s*)+ [wfc: 5]

/* == SYNTACTIC GRAMMAR (EXPRESSIONS) == */
/* Hierarchy */
expression           ::= sequence_expr
sequence_expr        ::= assignment_expr (sequence_operator assignment_expr)*
assignment_expr      ::= declaration_expr ('=' declaration_expr)?
declaration_expr     ::= application_expr (declaration_operator application_expr)?
application_expr     ::= primary_expr+
primary_expr         ::= Identifier | literal | block_expr | function_expr
/* Helpers */
sequence_operator    ::= Linebreak | ';'
declaration_operator ::= ':=' | ':' 'mut' '=' | ':' 'mut' expression '=' [wfc: 6]
block_expr           ::= Indent expression Unindent | '(' expression? ')' | '{' expression? '}' | '[' expression? ']'
function_expr        ::= 'fun' expression '.' expression
/* Atomics */
Identifier           ::= Sequence - literal
literal              ::= Integer | Float | String | Character | Symbol
Integer              ::= [0-9_]+ | ( "0x" [A-Fa-f0-9_]+ ) | ( "0b" [01_]+ ) [wfc: 1]
Float                ::= [0-9_]+ '.' [0-9_]+ ('e' [0-9_]+)? [wfc: 1, 2]
String               ::= '"' ( [^"\\] | EscapeSequence )* '"'
Character            ::= "'" ( [^'\\] | EscapeSequence ) "'"
Symbol               ::= "'" Sequence (?! "'")
EscapeSequence       ::= '\\' EscapePayload
EscapePayload        ::= 'n' | 't' | 'r' | '\\' | '"' | "'" | '0' | UnicodeEscape | AsciiEscape
UnicodeEscape        ::= "u{" [A-Fa-f0-9]{1,6} '}'
AsciiEscape          ::= "x" [A-Fa-f0-9][A-Fa-f0-9]

/* == SYNTACTIC GRAMMAR (PATTERNS) == */
/* Hierarchy */
pattern             ::= or_pattern
or_pattern          ::= as_pattern ('|' as_pattern)*
as_pattern          ::= application_pattern ('@' application_pattern)?
application_pattern ::= primary_pattern+
primary_pattern     ::= 'quote' pattern_content | literal_pattern | binding_pattern | type_pattern | composite_pattern | unquote_pattern
/* Helpers */
pattern_content     ::= expression
unquote_pattern     ::= '#' primary_pattern
/* Atomics */
literal_pattern     ::= literal
binding_pattern     ::= Identifier | '_'
type_pattern        ::= "of" expression
composite_pattern   ::= '(' pattern_sequence? ')' | '[' pattern_sequence? ']' | '{' pattern_sequence? '}'
pattern_sequence    ::= pattern_element (',' pattern_element)* ','?
pattern_element     ::= pattern | rest_pattern [wfc: 7]
rest_pattern        ::= '..' Identifier?

/* Well-formedness Constraints
    1. all forms must have at least one digit in at least one digit-accepting location
    2. all tokens must be source-adjacent
    3. indentation level after collecting last \s sequence must match level before production
    4. indentation level after collecting last \s sequence must be greater than before production
    5. indentation level after collecting last \s sequence must be equal to a stored level present before production
    6. requires typed language
    7. a `pattern_sequence` may contain at most one `rest_pattern`
*/
```