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
2. Syntactically very similar to common regular expression syntax.


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

Therefore, once we move beyond the basic tokens defined in the [[#Lexical Grammar: Tokenization|Lexical Grammar]], the EBNF productions in this document define **syntactic grammar**. Some of these are part of the core CST syntax, like `Integer` and `Symbol`; others are part of both the meta-language and the typed language, such as the constant declaration operator `:=`; and a few are specific to the typed language, like the explicitly-typed constant declaration operator `: mut expression =`. In all cases, though, they describe the valid sequences of tokens that the parser accepts. A production should be interpreted from the parser's perspective of reading its token stream. 

##### Example

```ebnf
Symbol ::= "'" Sequence (?!"'")
```

This production describes the following parser behavior:
> Match a `Punctuation` token containing a single quote, followed by a `Sequence` token, but only if the next token in the stream is not another single-quote `Punctuation` token.

This approach allows the grammar to precisely specify parsing logic, including lookahead, while keeping the lexical analysis phase simple and fast.


---


### Grammar Walkthrough

This section walks through the grammar definition production by production for easier understanding.

#### Contents

* [[#Precedence Climbing]]
	* [[#Precedence Table]]
* [[#Lexical Grammar: Tokenization]]
    * [[#Punctuation]]
    * [[#Sequences]]
    * [[#Layout]]
* [[#Syntactic Grammar: Parsing]]
	* [[#Atomic Forms: Classifying Tokens]]
	* [[#Compound Expressions: Building the Tree]]


#### Precedence Climbing

The Ribbon grammar is designed around specific algorithms for lexical analysis and precedence climbing algorithms such as [[Pratt Parsing]]. This design choice was made in order to support robust language extension in the form of new syntax, including prefix and infix operators.


##### Precedence Table

A comprehensive listing of all operator precedences within the grammar. See below for their definitions.

| Operator                           | Production         | Precedence | Associativity |
| ---------------------------------- | ------------------ | ---------- | ------------- |
| `Integer`*, etc literal terminals* | `literal`          | `max(i16)` | n/a           |
| `Indent`                           | `block_expr`       | `max(i16)` | n/a           |
| `fun`                              | `function_expr`    | `max(i16)` | n/a           |
| `:=`,`: mut =`, `: mut _ =`        | `declaration_expr` | `min(i16)` | none          |
| `=`                                | `assignment_expr`  | `min(i16)` | none          |
| `Linebreak`, `;`                   | `sequence_expr`    | `min(i16)` | left          |

In `Associativity`:
* a value of `none` indicates the operator cannot be chained, for example:
  `a = b = c` is not considered a well-formed expression.
* `n/a` indicates associativity does not apply to the production, such as in the case of atomic, leaf-node values like `1`.


#### Lexical Grammar: Tokenization
This section defines the raw tokens produced by the lexer. These are the most fundamental building blocks of the language, forming the token stream that is consumed by the parser.

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
```

A `Sequence` is simply one or more `SequenceChar` characters.

```ebnf
Sequence ::= SequenceChar+
```

##### Layout
Ribbon's syntax is sensitive to layout. `Linebreak`s can terminate expressions, and changes in indentation are used to create nested blocks of code, much like in [[Python]].

Therefore, the lexer is stateful and generates special tokens for these layout cues. Additionally, end of input must trigger the generation of one or more `Unindent` tokens if the final indentation level is greater than the base level.

A `Linebreak` corresponds to a newline character that does not change the indentation level.

```ebnf
Linebreak ::= (\s*\n\s*)+
```

```
[wfc: indentation level after collecting last \s sequence must match level before Linebreak production]
```

An `Indent` token is generated for an increase in the current indentation level.

```ebnf
Indent ::= (\s*\n\s*)+
```

```
[wfc: indentation level after collecting last \s sequence must be greater than before Indent production]
```

An `Unindent` token is generated for a decrease to a previous indentation level.

```ebnf
Unindent ::= (\s*\n\s*)+
```

```
[wfc: indentation level after collecting last \s sequence must be equal to a stored level present before Unindent production]
```

---

#### Syntactic Grammar: Parsing
These productions describe how the parser consumes the token stream to build syntactic structures.

##### Atomic Forms: Classifying Tokens
These productions define how the parser takes generic tokens from the lexer (like `Sequence` and `Punctuation`) and classifies them into more specific, meaningful atomic forms.

###### Escapes
`EscapeSequence`s can be used inside `String` and `Character` literals.

```ebnf
UnicodeEscape ::= "u{" [A-Fa-f0-9]{1,6} '}'
```

```ebnf
AsciiEscape ::= "x" [A-Fa-f0-9][A-Fa-f0-9]
```

```ebnf
EscapePayload ::= 'n' | 't' | 'r' | '\\' | '"' | "'" | '0'
                | UnicodeEscape | AsciiEscape
```

```ebnf
EscapeSequence ::= '\\' EscapePayload
```

###### Identifiers and Literals
An `Identifier` is any `Sequence` that is not a literal. This broad definition is intentional and powerful. It means that traditional identifiers like `my_var`, [[LISP]]-style kebab case identifiers like `my-var`, keywords like `if`, and operators like `+` are all parsed from the same `Sequence` token. The distinction between them is handled by the parser.

```ebnf
Identifier ::= Sequence - literal
```

An `Integer` literal is parsed from a `Sequence` token. Alternative base notations are provided for convenience.

```ebnf
Integer ::= [0-9_]+ | ( "0x" [A-Fa-f0-9_]+ ) | ( "0b" [01_]+ )
```

```
[wfc: all forms must have at least one digit in at least one digit-accepting location; ie, '0b_' and '0x' are not well-formed]
```

A `Float` literal is a compound token sequence, formed from `Sequence` and `Punctuation` tokens, with an optional exponent. The grammar is intentionally kept strict here to avoid potential ambiguity in derived grammars, for example with [[Rust]]-like `my_tuple.0` member access. While this may present a slight hurdle for new users, it seems to have worked out fine for [[Rust]]. 

```ebnf
Float ::= [0-9_]+ '.' [0-9_]+ ('e' [0-9_]+)?
```

```
[wfc: all tokens must be source-adjacent]
[wfc: all forms must have at least one digit in at least one digit-accepting location; ie `_._` and `_._e_` are not well-formed]
```

A `String` literal is parsed from a sequence of a `"` token, a `Sequence` token, and a final `"` token. It can contain various escape sequences.

```ebnf
String ::= '"' ( [^"\\] | EscapeSequence )* '"'
```

```
[wfc: all tokens must be source-adjacent]
```

A `Character` literal is a single character or an escape sequence enclosed in single quotes.

```ebnf
Character ::= "'" ( [^'\\] | EscapeSequence ) "'"
```

```
[wfc: all tokens must be source-adjacent]
```

A `Symbol` is a special literal, similar to symbols in [[LISP]] or [[Ruby]]. As detailed in the [[#Lexical vs. Syntactic Grammar]] section, its syntax is disambiguated from `Character` at parse time.

```ebnf
Symbol ::= "'" Sequence (?!"'")
```

```
[wfc: all tokens must be source-adjacent]
```

##### Compound Expressions: Building the Tree
These productions describe how the atomic forms are combined to create more complex syntactic structures, like expressions. They are defined starting with the most fundamental expressions and building up in layers of complexity, mirroring the operator-precedence parsing model used in the reference implementation.

###### Primary Expressions
This is the set of the most atomic expressions. They form the foundation of the precedence climbing model used by the parser, corresponding to the expressions handled by `nud` ([[Pratt Parsing|Null Denotation]]) parsing functions. These are the values and basic constructs that operators will act upon.

`literal` is provided for definitional convenience, we simply group all our literal types into a single production.

```ebnf
literal ::= Integer | Float | String | Character | Symbol
```

The `block_expr` allows Ribbon code to be grouped in several ways: with parentheses `()`, braces `{}`, brackets `[]`, or by `Indent`/`Unindent`. The `expression` within a delimited block is optional to allow for empty constructs like `()`.

```ebnf
block_expr ::= Indent expression Unindent
            | '(' expression? ')'
            | '{' expression? '}'
            | '[' expression? ']'
```

The `function_expr` production defines the structure of a functional abstraction, also known as anonymous functions or lambdas. These consist of the `fun` keyword, an `expression` that defines the function's parameters, a `.` separator, and another `expression` that constitutes the function's body.

```ebnf
function_expr ::= 'fun' expression '.' expression
```

> **Note**
> `function_expr` is considered primary, rather than a prefix expression, because it has *maximum precedence*; it will always consume the rest of the current expression in order to form its body.

Now we can define `primary_expr`. These represent anything that can be considered a standalone value or a base for operators to act upon. This includes any `literal`, an `Identifier`, a `block_expr`, or a `function_expr`.

```ebnf
primary_expr ::= Identifier | literal | block_expr | function_expr
```

[TODO: effect definition & import productions]
[TODO: productions that are present by default in the typed language, ie type classes, structs etc]

###### Infix Expressions
Where `nud` functions handle expressions that stand on their own (like literals and identifiers), `led` functions ([[Pratt Parsing|Left Denotation]]) handle infix and postfix operators. They are called when the parser has already processed an expression (the "left-hand side") and encounters a token that operates on it.

Our first and lowest-precedence infix operation is declaration. This is used to bind a value to a name.

The `declaration_operator` defines the syntax for creating a new binding.

```ebnf
declaration_operator ::= ':='
                       | ':' 'mut' '='
                       | ':' 'mut' expression '='
```

```
[wfc: form 3 requires typed language]
```

A `declaration_expr` uses this operator to bind the result of an expression on the right to the expression on the left. This production has the lowest possible binding power, meaning it will be one of the last operators to be grouped during parsing. For example, in `my_var := 1 + 2`, the addition is evaluated before the declaration.

The `declaration_expr` allows full expressions on both sides to support destructuring declarations, ie `(a, b) := (1, 2)`.

```ebnf
declaration_expr ::= expression declaration_operator expression
```
[TODO: this can be refined to pattern grammars once that is fleshed out better]

An `assignment_expr` uses a similar operator, but there is only one kind of assignment. This production also has the lowest possible binding power.

```ebnf
assignment_expr ::= expression '=' expression
```

Declarations and assignments are of course useless without sequencing. A `sequence_expr` can be used to perform multiple expressions, one after the other; the result of the final expression is the result of the sequence expression. The `sequence_operator` is available under two terminals: a line ending with no indentation change, or a semicolon.

```ebnf
sequence_operator ::= Linebreak | ';'
```

The `sequence_expr` is then defined with this operator, and two sub-`expression`s. This production also has the lowest possible binding power.

```ebnf
sequence_expr ::= expression sequence_operator expression
```

An `expression` can be a `declaration_expr`, `assignment_expr`, a `sequence_expr`, or a `primary_expr`. We list the lower-precedence expressions first to indicate their lower rank in the precedence climbing hierarchy; see also the [[#Precedence Table|full list of precedences.]].

```ebnf
expression ::= declaration_expr
             | assignment_expr
             | sequence_expr
             | primary_expr
```

[TODO: additional productions present by default & in the meta language, ie +, -, ==, assignment, etc]
[TODO: productions that are present by default in the typed language, ie type classes, structs etc]

---

### Definition

```ebnf
/* Precedences
	NOTE: Currently, without consideration of this table the grammar below is formally ambiguous, due to left-recursive definitions. The two are meant to be taken together until such time as the full set of productions are well defined and we can create a cohesive hierarchy without left-recursion.
	
	literal          ::= max(i16), atomic
	block_expr       ::= max(i16), atomic
	function_expr    ::= max(i16), atomic (consumes avail. stream)
    declaration_expr ::= min(i16), non-associative
    assignment_expr  ::= min(i16), non-associative
    sequence_expr    ::= min(i16), left associative
*/

/* == LEXICAL GRAMMAR == */

/* Raw tokens produced by the lexer */
Punctuation    ::= '(' | ')' | '{' | '}' | '['  | ']'
                 | '.' | ',' | ';' | '`' | '\\' | '#'
                 | '"' | "'"
SequenceChar   ::= [^\p{Z}\p{C}] - Punctuation
Sequence       ::= SequenceChar+
Linebreak      ::= (\s*\n\s*)+ [wfc: 3]
Indent         ::= (\s*\n\s*)+ [wfc: 4]
Unindent       ::= (\s*\n\s*)+ [wfc: 5]

/* == SYNTACTIC GRAMMAR == */

/* Atomic Forms (classifying tokens) */
Identifier     ::= Sequence - literal
UnicodeEscape  ::= "u{" [A-Fa-f0-9]{1,6} '}'
AsciiEscape    ::= "x" [A-Fa-f0-9][A-Fa-f0-9]
EscapePayload  ::= 'n' | 't' | 'r' | '\\' | '"' | "'" | '0'
                 | UnicodeEscape | AsciiEscape
EscapeSequence ::= '\\' EscapePayload
Integer        ::= [0-9_]+ | ( "0x" [A-Fa-f0-9_]+ ) | ( "0b" [01_]+ ) [wfc: 1]
Float          ::= [0-9_]+ '.' [0-9_]+ ('e' [0-9_]+)? [wfc: 1, 2]
String         ::= '"' ( [^"\\] | EscapeSequence )* '"' [wfc: 2]
Character      ::= "'" ( [^'\\] | EscapeSequence ) "'" [wfc: 2]
Symbol         ::= "'" Sequence (?!"'") [wfc: 2]

/* Compound Expressions (building the tree) */
literal              ::= Integer | Float | String | Character | Symbol
block_expr           ::= Indent expression Unindent
                       | '(' expression? ')'
                       | '{' expression? '}'
                       | '[' expression? ']'
function_expr        ::= 'fun' expression '.' expression
primary_expr         ::= literal | Identifier | block_expr | function_expr
declaration_operator ::= ':='
                       | ':' 'mut' '='
                       | ':' 'mut' expression '=' [wfc: 6]
declaration_expr     ::= expression declaration_operator expression
assignment_expr      ::= expression '=' expression
sequence_operator    ::= Linebreak | ';'
sequence_expr        ::= expression sequence_operator expression
expression           ::= declaration_expr
                       | assignment_expr
                       | sequence_expr
                       | primary_expr

/* Well-formedness Constraints
	NOTE: Well-formedness in this context means that the associated formal language presented must apply to the associated production match for the match to be accepted.
	
    1. all forms must have at least one digit in at least one digit-accepting location;
       '0b_', '0x', `_._` and `_._e_` are not well-formed integers or floats
    2. all tokens must be source-adjacent
    3. indentation level after collecting last \s sequence must match level before production
    4. indentation level after collecting last \s sequence must be greater than before production
    5. indentation level after collecting last \s sequence must be equal to a stored level present before production
    6. requires typed language
*/
```