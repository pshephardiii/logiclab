# Documentation

Start with the repository [README](../README.md) for local commands and project structure. Documentation is grouped by purpose:

| Directory                      | Contents                                                                               |
| ------------------------------ | -------------------------------------------------------------------------------------- |
| [planning/](planning/)         | Product direction, proposed data model, delivery roadmap, and AWS deployment direction |
| [development/](development/)   | Local PostgreSQL/DBeaver, Cognito configuration, and GitHub setup                      |
| [api/](api/)                   | Authentication, classes/enrollment, and truth-table endpoint contracts                 |
| [conventions/](conventions/)   | Codebase structure/style and numbered branch workflow                                  |
| [verification/](verification/) | Feature walkthroughs, checks performed, limitations, and supporting images             |

## Planning

- [Implementation plan](planning/initial-implementation-plan.md)
- [Product direction](planning/product-direction.md)
- [Data design](planning/data-design.md)
- [AWS deployment notes](planning/aws-deployment-notes.md)

## Development setup

- [Local database and DBeaver](development/local-database.md)
- [Cognito development](development/cognito-development.md)
- [GitHub setup](development/github-setup.md)

## API reference

- [Authentication](api/auth-api.md)
- [Classes, invitations, and enrollment](api/classroom-api.md)
- [Truth-table practice](api/truth-table-api.md)
- [Private problem library](api/problem-library-api.md)
- [Instructor assignments](api/assignment-api.md)
- [Student assignment work](api/student-work-api.md)

## Conventions

- [Codebase conventions](conventions/codebase-conventions.md)
- [Branch naming and PR workflow](conventions/branch-naming-conventions.md)

## Verification

- [Truth-table walkthrough and evidence](verification/truth-table-verification.md)
- [Classroom-access walkthrough and evidence](verification/classroom-access-verification.md)
- [Problem-library walkthrough and evidence](verification/problem-library-verification.md)

Keep new documents in the most relevant group and add them to this index. Product decisions belong in planning, implementation/setup guidance in development or API reference, reusable engineering rules in conventions, and dated validation evidence in verification. Local PR drafts remain in the ignored `.codex-local/pr/` directory.
