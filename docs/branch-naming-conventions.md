# Branch naming conventions

Use `main` for the integrated project and short-lived numbered branches for subsequent work.

## Format

```text
NNN-type-short-description
```

- `NNN`: a project-wide sequential work number, padded to at least three digits: `001`, `002`, `003`. Keep counting beyond `999` without truncating numbers.
- `type`: `feat`, `fix`, `chore`, `docs`, `refactor`, or `test`.
- `short-description`: lowercase words separated by hyphens, describing the intended outcome.

Examples:

```text
001-chore-project-foundation
002-feat-truth-table-practice
003-feat-classroom-access
008-fix-invitation-expiry
009-docs-demo-walkthrough
```

The number identifies a unit of work; it does not imply priority, release version, merge order, or a GitHub issue number. Link a related issue in the pull request when one exists. `main` and release tags do not need this prefix.

## Assigning numbers

The initial implementation plan reserves `001` through `007` for its proposed branches. The scaffold can be committed directly to `main` as the initial baseline; `001` then covers remaining foundation work. For additional work, choose the next unused number after checking the plan, existing branches, and pull request history. Do not reuse numbers from merged or abandoned work. If a planned branch is split, keep its original number for one part and assign fresh numbers to the other parts.

## Workflow

1. Start from an up-to-date `main` and create the numbered branch.
2. Keep each branch focused on a reviewable outcome, including its relevant tests and documentation.
3. Open a pull request to `main` explaining the resulting behavior and validation.
4. Merge after CI passes and the change is reviewed; delete the merged branch when convenient.

Example after the initial repository push:

```sh
git switch main
git pull --ff-only
git switch -c 001-chore-project-foundation
```

The naming convention is documented guidance; no branch-name enforcement has been added to CI.
