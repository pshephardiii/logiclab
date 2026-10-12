# Repository workflow

When a branch is ready to finish, prepare a local PR description in
`.codex-local/pr/<branch-name>.md`. Replace any `/` in the branch name with `-`.
Create the directory if needed; its contents are ignored by Git.

Include:

- A summary of the problem and resulting behavior.
- A list of updates/changes covering the final branch scope.
- Validation performed and material limitations, without claiming checks that
  were not run.
- For feature branches, a suggested next feature branch name and a short summary
  of its purpose, scope, and dependencies. Follow the numbering convention in
  `docs/branch-naming-conventions.md`.

Write for a reviewer who has not read the conversation. Update an existing draft
to reflect the final implementation when scope changes. Creating the draft does
not itself authorize posting to GitHub, merging, or starting the next branch.

See `docs/branch-naming-conventions.md` for the template and completion workflow.
