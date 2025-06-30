### Contents

* [[#General Specification Syntax]]
* [[#Lookahead Assertions]]
* [[#Character Classes]]
* [[#Lexical vs. Syntactic Grammar]]


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