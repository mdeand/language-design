[[The Ribbon Programming Language]]

This is the canonical grammar definition for Ribbon. Because Ribbon is a highly extensible language, no single document can possibly cover the full grammar. Instead, we define the productions that are available by default; before addition, modification, or deletion by extensions.

### Contents

+ [[#Format]]
+ [[#Grammar Walkthrough]]
+ [[#Definition]]

### Format

We use a simple Extended Backus-Naur Form (EBNF) notation; based on the one [specified by the W3C here](https://www.w3.org/TR/xml/#sec-notation).

This particular notation was chosen because it is:
1. Well specified by a respected organization.
2. Syntactically very similar to common Regular Expression syntax.

In addition, to improve readability and properly handle Unicode, we further extend the W3C's EBNF notation with regex-style character classes based on Unicode properties.
#### Character Classes
The `\p{...}` syntax is used to match characters belonging to a specific Unicode general category or script.

More information about character classes can be found on [MDN](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_expressions/Character_classes) and [TC39](https://tc39.es/ecma262/multipage/text-processing.html#table-nonbinary-unicode-properties).

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


---


### Grammar Walkthrough

#### Contents
* [[#Precedence Climbing]]
	* [[#Precedence Table]]
* [[#Terminal Productions]]
    * [[#Names and Operators]]
    * [[#Escapes]]
    * [[#Literals]]
    * [[#Layout and Punctuation]]
* [[#Non-Terminal Productions]]
	* [[#Primary Expressions]]
	* [[#Infix Expressions]]

#### Precedence Climbing

As with the lexical grammar's mechanically-oriented design, the Ribbon grammar is designed for precedence climbing algorithms such as [[Pratt Parsing]]. This design choice was made in order to support robust language extension in the form of new syntax, including prefix and infix operators.

##### Precedence Table

A comprehensive listing of all operator precedences within the grammar. See below for their definitions.

| Operator                           | Production        | Precedence | Associativity |
| ---------------------------------- | ----------------- | ---------- | ------------- |
| `Integer`*, etc literal terminals* | `Literal`         | `max(i16)` | none          |
| `Indent`                           | `BlockExpr`       | `max(i16)` | none          |
| `fun`                              | `FunctionExpr`    | `max(i16)` | none          |
| `:=`,`: mut =`, `: mut _ =`        | `DeclarationExpr` | `min(i16)` | none          |
| `=`                                | `AssignmentExpr`  | `min(i16)` | none          |
| `Linebreak`, `;`                   | `SequenceExpr`    | `min(i16)` | left          |

#### Terminal Productions

These productions define the *lexical* building blocks of the language.

##### Names and Operators

The lexer is minimalistic and groups many characters into a generic 'Sequence' token. The parser then introspects these sequences to differentiate between things like identifiers and integers. A `SequenceChar` is any character that is not whitespace, a control character, or a reserved punctuation mark.

```ebnf
SequenceChar ::= [^\p{Z}\p{C}`.,;{}()\[\]\\#] | "'" | '"'
```

A `Sequence` is simply one or more `SequenceChar` characters.

```ebnf
Sequence ::= SequenceChar+
```

An `Identifier` is any `Sequence` that is not a [[#Literals|Literal]]. This broad definition is intentional and powerful. It means that traditional identifiers like `my_var`, [[LISP]]-style kebab case identifiers like `my-var`, keywords like `if`, and operators like `+` are all *[[Lexical Analysis|lexically analyzed]]* using the same rule. The distinction between them is handled later by the parser. The `-` in this rule indicates subtraction, as per the W3C EBNF notation.

```ebnf
Identifier ::= Sequence - Integer
```


#### Escapes
`EscapeSequence`s can be used inside `String` and `Character` literals.

```ebnf
UnicodeEscape ::= "u{" [A-Fa-f0-9]+ '}'
```

```
[wfc: hex code within curly braces must be 1-6 digits]
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


##### Literals

An `Integer` literal is, at its most basic, a sequence of one or more Unicode decimal digits. Alternative base notations are provided for convenience.

```ebnf
Integer ::= [\p{Nd}_]+ | ( "0x" [A-Fa-f0-9_]+ ) | ( "0b" [01_]+ )
```

A `Float` literal is a compound token sequence, formed from integer literals and a dot, with an optional exponent Sequence.
```ebnf
Float ::= Integer '.' Integer ('e' Integer)?
```

```
[wfc: all tokens must be source-adjacent]
```


A `String` literal is a sequence of characters enclosed in double quotes. It can contain various escape sequences.

```ebnf
String ::= '"' ( [^"\\] | EscapeSequence )* '"'
```

```
[wfc: all tokens must be source-adjacent]
```

A `Character` literal is a single character or an escape sequence enclosed in single quotes. It can contain various escape sequences.

```ebnf
Character ::= "'" ( [^'\\] | EscapeSequence ) "'"
```

```
[wfc: all tokens must be source-adjacent]
```

A `Symbol` is a special literal, similar to symbols in [[LISP]] or [[Ruby]]. It is represented by a sequence of characters preceded by a single quote, where the content is longer than a single character or does not have a closing quote.

```ebnf
Symbol ::= "'" Sequence
```

```
[wfc: all tokens must be source-adjacent]
```


##### Layout and Punctuation

Ribbon's syntax is sensitive to layout. `Linebreak`s can terminate expressions, and changes in indentation are used to create nested blocks of code, much like in [[Python]]. The lexer generates special tokens for these layout cues.

A `Linebreak` corresponds to a newline character.

```ebnf
Linebreak ::= ([\p{Zs}]*\n[\p{Zs}]*)+
```

```
[wfc: indentation level after collecting last [\p{Zs}] sequence must match level before Linebreak production]
```

An `Indent` token is generated for an increase in the current indentation level.

```ebnf
Indent ::= ([\p{Zs}]*\n[\p{Zs}]*)+
```

```
[wfc: indentation level after collecting last [\p{Zs}] sequence must be greater than before Indent production]
```

An `Unindent` token is generated for a decrease to a previous indentation level.

```ebnf
Unindent ::= ([\p{Zs}]*\n[\p{Zs}]*)+
```

```
[wfc: indentation level after collecting last [\p{Zs}] sequence must be equal to a stored level present before Unindent production]
```

The following punctuation characters are explicitly reserved by the lexer and are treated as individual tokens. They are used to structure the code.

```ebnf
Punctuation ::= '(' | ')' | '{' | '}' | '[' | ']'
              | '.' | ',' | ';' | '`' | '\\' | '#'
```


---

#### Non-Terminal Productions

These productions describe how the terminal tokens defined in the previous section are combined to form more complex syntactic structures, like expressions. They are defined starting with the most fundamental expressions and building up in layers of complexity, mirroring the operator-precedence parsing model used in the reference implementation.


##### Primary Expressions

This is the set of the most atomic expressions. They form the foundation of the precedence climbing model used by the parser, corresponding to the expressions handled by `nud` ([[Pratt Parsing|Null Denotation]]) parsing functions. These are the values and basic constructs that operators will act upon.

`Literal` is provided for definitional convenience, we simply group all our literal types into a single production.

```ebnf
Literal ::= Integer | Float | String | Character | Symbol
```

The `BlockExpr` allows Ribbon code to be grouped in several ways: with parentheses `()`, braces `{}`, brackets `[]`, or by `Indent`/`Unindent`. The `Expression` within a delimited block is optional to allow for empty constructs like `()`.

```ebnf
BlockExpr ::= Indent Expression Unindent
            | '(' Expression? ')'
            | '{' Expression? '}'
            | '[' Expression? ']'
```

The `FunctionExpr` production defines the structure of a functional abstraction, also known as anonymous functions or lambdas. These consist of the `fun` keyword, an `Expression` that defines the function's parameters, a `.` separator, and another `Expression` that constitutes the function's body.

```ebnf
FunctionExpr ::= 'fun' Expression '.' Expression
```

> **Note**
> `FunctionExpr` is considered primary, rather than a prefix expression, because it has *maximum precedence*; it will always consume the rest of the current expression in order to form its body.

Now we can define `PrimaryExpr`. These represent anything that can be considered a standalone value or a base for operators to act upon. This includes any `Literal`, an `Identifier`, a `BlockExpr`, or a `FunctionExpr`.

```ebnf
PrimaryExpr ::= Literal | Identifier | BlockExpr | FunctionExpr
```

[TODO: effect definition & import productions]
[TODO: productions that are present by default in the typed language, ie type classes, structs etc]


##### Infix Expressions

Where `nud` functions handle expressions that stand on their own (like literals and identifiers), `led` functions ([[Pratt Parsing|Left Denotation]]) handle infix and postfix operators. They are called when the parser has already processed an expression (the "left-hand side") and encounters a token that operates on it.

Our first and lowest-precedence infix operation is declaration. This is used to bind a value to a name.

The `DeclarationOperator` defines the syntax for creating a new binding.

```ebnf
DeclarationOperator ::= ':='
                      | ':' 'mut' '='
                      | ':' 'mut' Expression '='
```

```
[wfc: form 3 requires typed language]
```

A `DeclarationExpr` uses this operator to bind the result of an expression on the right to the expression on the left. Within the meta-language, which is untyped, we provide the following two forms of this production:

*   The `:=` form creates an immutable binding.
*   The `: mut =` form creates a mutable binding, allowing its value to be changed later with the assignment operator.

In the full, typed language, the additional form `: mut Expression =` is available, for the purposes of explicitly providing the type of the declaration.

This production has the lowest possible binding power, meaning it will be one of the last operators to be grouped during parsing. For example, in `my_var := 1 + 2`, the addition is evaluated before the declaration.

The `DeclarationExpr` allows full expressions on both sides to support destructuring declarations, ie `(a, b) := (1, 2)`.

```ebnf
DeclarationExpr ::= Expression DeclarationOperator Expression
```
[TODO: this can be refined to pattern grammars once that is fleshed out better]

An `AssignmentExpr` uses a similar operator, but there is only one kind of assignment. This production also has the lowest possible binding power.

```ebnf
AssignmentExpr ::= Expression '=' Expression
```

Declarations and assignments are of course useless without sequencing.

A `SequenceExpr` can be used to perform multiple expressions, one after the other; the result of the final expression is the result of the sequence expression.

The `SequenceOperator` is available under two terminals: a line ending with no indentation change, or a semicolon.

```ebnf
SequenceOperator ::= Linebreak | ';'
```

The `SequenceExpr` is then defined with this operator, and two sub-`Expression`s. This production also has the lowest possible binding power.

```ebnf
SequenceExpr ::= Expression SequenceOperator Expression
```

An `Expression` can be a `DeclarationExpr`, `AssignmentExpr`, a `SequenceExpr`, or a `PrimaryExpr`. We list the lower-precedence expressions first to indicate their lower rank in the precedence climbing hierarchy; see also the [[#Precedence Table|full list of precedences.]].

```ebnf
Expression ::= DeclarationExpr
             | AssignmentExpr
             | SequenceExpr
             | PrimaryExpr
```

[TODO: additional productions present by default & in the meta language, ie +, -, ==, assignment, etc]

[TODO: productions that are present by default in the typed language, ie type classes, structs etc]


---

### Definition

```ebnf
(* Well Formedness Constraints:
    1. hex code within curly braces must be 1-6 digits
    2. all tokens must be source-adjacent
    3. indentation level after collecting last [\p{Zs}] sequence must match level before production
    4. indentation level after collecting last [\p{Zs}] sequence must be greater than before production
    5. indentation level after collecting last [\p{Zs}] sequence must be equal to a stored level present before production
    6. requires typed language
*)

(* Precedences:
	Literal         ::= max(i16), not associative
	BlockExpr       ::= max(i16), not associative
	FunctionExpr    ::= max(i16), not associative
    DeclarationExpr ::= min(i16), not associative
    AssignmentExpr  ::= min(i16), not associative
    SequenceExpr    ::= min(i16), left associative
*)

(* Terminals *)
SequenceChar   ::= [^\p{Z}\p{C}`.,;{}()\[\]\\#] | "'" | '"'
Sequence       ::= SequenceChar+
Identifier     ::= Sequence - Integer
UnicodeEscape  ::= "u{" [A-Fa-f0-9]+ '}' [wfc: 1]
AsciiEscape    ::= "x" [A-Fa-f0-9][A-Fa-f0-9]
EscapePayload  ::= 'n' | 't' | 'r' | '\\' | '"' | "'" | '0'
                 | UnicodeEscape | AsciiEscape
EscapeSequence ::= '\\' EscapePayload
Integer        ::= [\p{Nd}_]+ | ( "0x" [A-Fa-f0-9_]+ ) | ( "0b" [01_]+ )
Float          ::= Integer '.' Integer ('e' Integer)? [wfc: 2]
String         ::= '"' ( [^"\\] | EscapeSequence )* '"' [wfc: 2]
Character      ::= "'" ( [^'\\] | EscapeSequence ) "'" [wfc: 2]
Symbol         ::= "'" Sequence [wfc: 2]
Linebreak      ::= ([\p{Zs}]*\n[\p{Zs}]*)+ [wfc: 3]
Indent         ::= ([\p{Zs}]*\n[\p{Zs}]*)+ [wfc: 4]
Unindent       ::= ([\p{Zs}]*\n[\p{Zs}]*)+ [wfc: 5]
Punctuation    ::= '(' | ')' | '{' | '}' | '[' | ']'
                 | '.' | ',' | ';' | '`' | '\\' | '#'

(* Primary Expressions *)
Literal      ::= Integer | Float | String | Character | Symbol
BlockExpr    ::= Indent Expression Unindent
               | '(' Expression? ')'
               | '{' Expression? '}'
               | '[' Expression? ']'
FunctionExpr ::= 'fun' Expression '.' Expression
PrimaryExpr  ::= Literal | Identifier | BlockExpr | FunctionExpr

(* Infix Expressions *)
DeclarationOperator ::= ':='
                      | ':' 'mut' '='
                      | ':' 'mut' Expression '=' [wfc: 6]
DeclarationExpr     ::= Expression DeclarationOperator Expression
AssignmentExpr      ::= Expression '=' Expression
SequenceOperator    ::= Linebreak | ';'
SequenceExpr        ::= Expression SequenceOperator Expression
Expression          ::= DeclarationExpr
                      | AssignmentExpr
                      | SequenceExpr
                      | PrimaryExpr
```
