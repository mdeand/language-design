This is the canonical grammar definition for Ribbon. Because Ribbon is a highly extensible language, no single document can possibly cover the full grammar. Instead, we define the productions that are available by default; before addition, modification, or deletion by extensions.

### Contents

+ [[Format]]
+ [[Walkthrough]]


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