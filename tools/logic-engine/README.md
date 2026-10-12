# Logic engine

Pure TypeScript functionality shared by browser and API code. This step implements parsing only; evaluation and truth-table generation follow next.

```ts
import { parseFormula } from '@logiclab/logic-engine';

const formula = parseFormula('!(P & Q) -> R');
// A discriminated AST of variable, not, and binary nodes.
```

## Grammar

```text
expression  = implication
implication = disjunction [ ("→" | "->") implication ]
disjunction = conjunction { ("∨" | "|") conjunction }
conjunction = unary { ("∧" | "&") unary }
unary       = ("¬" | "!") unary | "(" expression ")" | variable
variable    = "A" … "Z"
```

Precedence is negation, conjunction, disjunction, implication. Conjunction/disjunction associate left; implication associates right. Parentheses override grouping without adding AST nodes. Whitespace is allowed between tokens; `->` must be contiguous. Lowercase names, multi-letter variables, constants, biconditionals, `&&`, and `||` are outside the initial grammar.

`parseFormula` returns a `Formula` AST or throws `FormulaParseError` with a stable `code`, zero-based UTF-16 `position`, and a readable message displaying a one-based character position. At end-of-input, the offset equals the source length. If input contains multiple errors, the tokenizer may report an invalid character before the parser reports a grammatical error.

Initial bounds are exported in `FORMULA_LIMITS`: 256 UTF-16 code units (including whitespace), four distinct variables, and 32 levels of recursive grouping/negation/right-associated implication, combined along a parsing path. Repeated variable occurrences do not count as additional variables. These bounds keep the first practice experience small and guard recursive parsing; they can be revised explicitly later.

The package has no runtime dependencies and does not access a database or network. AST types are read-only at the TypeScript boundary; runtime objects are not frozen. Stable table column identifiers and normalized display formatting will be designed with table generation, rather than exposing parser offsets as persistent identifiers.

From the repository root:

```sh
npm test -w @logiclab/logic-engine
npm run build -w @logiclab/logic-engine
```

Root `npm test`, `npm run typecheck`, and `npm run build` include this package. Build before consuming it from another workspace. API/UI integration and a root development watcher can be introduced when those apps depend on the engine.
