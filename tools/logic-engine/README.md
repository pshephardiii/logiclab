# Logic engine

Pure TypeScript parsing, evaluation, and truth-table generation. The API uses this package for stateless practice; the practice UI also uses its parser for local formula feedback.

```ts
import { parseFormula, evaluateFormula, generateTruthTable } from '@logiclab/logic-engine';

const formula = parseFormula('!(P & Q) -> R');
// A discriminated AST of variable, not, and binary nodes.
const result = evaluateFormula(formula, { P: true, Q: true, R: false });
// true: a false antecedent implies any conclusion.
const table = generateTruthTable('!(P & Q) -> R');
// Alphabetical given columns, intermediate expression columns, and eight rows.
```

## Grammar

```text
expression  = implication [ ("↔" | "<->") implication ]
implication = disjunction [ ("→" | "->") implication ]
disjunction = conjunction { ("∨" | "v" | "|") conjunction }
conjunction = unary { ("∧" | "&") unary }
unary       = ("¬" | "!" | "~") unary | "(" expression ")" | "[" expression "]" | variable
variable    = "A" … "Z"
```

Precedence is negation, conjunction, disjunction, implication, then biconditional (tightest to loosest). Conjunction/disjunction associate left; implication associates right. Repeated biconditionals require explicit grouping: use `(P ↔ Q) ↔ R` or `P ↔ (Q ↔ R)` rather than `P ↔ Q ↔ R`. Thus `P -> Q <-> R` means `(P -> Q) <-> R`, and `P <-> Q -> R` means `P <-> (Q -> R)`. Parentheses and square brackets override grouping without adding AST nodes. Both forms can be nested together; each opening delimiter must have its matching closing delimiter. Canonical column labels continue to use parentheses, so equivalent grouping notation preserves structural IDs. Whitespace is allowed between tokens; `->` and `<->` must be contiguous. Negation accepts `¬`, `!` and `~`, all canonicalized as `¬`. Lowercase `v` is an OR operator; uppercase `V` remains a variable. Other lowercase names, multi-letter variables, constants, `&&`, and `||` are outside the initial grammar.

`parseFormula` returns a `Formula` AST or throws `FormulaParseError` with a stable `code`, zero-based UTF-16 `position`, and a readable message displaying a one-based character position. At end-of-input, the offset equals the source length. If input contains multiple errors, the tokenizer may report an invalid character before the parser reports a grammatical error.

Initial bounds are exported in `FORMULA_LIMITS`: 256 UTF-16 code units (including whitespace), four distinct variables, and 32 levels of recursive grouping/negation/right-associated implication, combined along a parsing path. Repeated variable occurrences do not count as additional variables. These bounds keep the first practice experience small and guard recursive parsing; they can be revised explicitly later.

The new biconditional operator has its own canonical `↔` label and structural column IDs. Existing operators, formulas and row/column identifiers are unchanged; `~` is an alias of existing negation, not a new node type.

The package has no runtime dependencies and does not access a database or network. AST and table types are read-only at the TypeScript boundary; runtime objects are not frozen.

## Evaluation

`evaluateFormula` accepts a parser-produced AST and a mapping of variable names to booleans. Negation inverts its operand; conjunction requires both operands; disjunction requires either; implication is false only when the antecedent is true and the consequent is false. Biconditional (`iff` in the AST) is true exactly when both operands have the same truth value.

Every referenced variable must have its own boolean property in the mapping. Missing or non-boolean values throw `FormulaEvaluationError`, exposing `code` and `variable`. Both operands are evaluated, so short-circuiting cannot hide missing assignments. Extra variable values are allowed. Arbitrary external AST objects require validation before using this function; parse user input through `parseFormula` instead.

## Truth tables and stable identifiers

`generateTruthTable` accepts formula text and applies the parser's limits. It returns alphabetical `variables`, ordered `columns`, and `rows`:

- Given columns come first; answer columns contain every distinct compound subexpression, with children before parents and the final formula last. Negations are compound expressions too.
- Identical syntax structures share one column; logically equivalent but differently structured expressions remain separate. A lone variable still gets a final answer column distinct from its given column.
- Labels normalize aliases to symbols and fully parenthesize binary expressions to preserve grouping.
- Rows start with all T and end with all F; the first alphabetical variable changes slowest. Each row's `values` maps column IDs to boolean values.

Identifiers use an explicit `v1` convention:

```text
var:v1:P                 Given column for P
expr:v1:(P ∧ Q)          Answer column for a canonical expression
row:v1:P=T;Q=F           Row for a named variable assignment
```

Column IDs depend on structure, not source offsets, whitespace, aliases, or redundant parentheses. They remain stable when the same expression is reused within another formula. Row IDs contain the complete variable assignment; a different variable set produces a different row ID. A cell is addressed by its row ID and column ID within a problem version. Any future change to canonicalization or identifier rules needs an explicit version change.

**Generated tables include expected answers.** They are internal engine results, not a student API response contract. The future API must omit answer values when creating an exercise and disclose solutions/feedback only through the permitted workflow.

From the repository root:

```sh
npm test -w @logiclab/logic-engine
npm run build -w @logiclab/logic-engine
```

Root `npm test`, `npm run typecheck`, and `npm run build` include this package. Build before consuming it from another workspace. Root development builds and watches the engine alongside schema, API, and web.
