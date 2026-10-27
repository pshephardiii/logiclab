# Documentation

Start with the repository [README](../README.md) for local commands and project structure. For a quick project tour, start with the [reviewer walkthrough](development/demo-walkthrough.md) and [architecture overview](architecture/overview.md). Application hosting is still pending.

Documentation is grouped by purpose:

| Directory                      | Contents                                                                               |
| ------------------------------ | -------------------------------------------------------------------------------------- |
| [architecture/](architecture/) | Package boundaries, request/data flows, and implementation tradeoffs                   |
| [planning/](planning/)         | Product direction, proposed data model, delivery roadmap, and AWS deployment direction |
| [development/](development/)   | Local PostgreSQL/DBeaver, Cognito configuration, and GitHub setup                      |
| [api/](api/)                   | Authentication, classroom, problem, assignment, and student-work contracts             |
| [conventions/](conventions/)   | Codebase structure/style and numbered branch workflow                                  |
| [qa/](qa/)                     | Manual test instructions, case results, findings and fix history                       |
| [verification/](verification/) | Feature walkthroughs, checks performed, limitations, and supporting images             |

## Architecture

- [System overview and tradeoffs](architecture/overview.md)

## Planning

- [Unsaved work protection](planning/unsaved-work-protection.md)
- [Duplicate assignment](planning/duplicate-assignment.md)

- [Implementation plan](planning/initial-implementation-plan.md)
- [Product direction](planning/product-direction.md)
- [Assignment learning modes](planning/assignment-learning-modes.md)
- [Data design](planning/data-design.md)
- [Background jobs and reconciliation design](planning/background-jobs.md)
- [Public demo direction and implementation slices](planning/public-demo.md)
- [AWS deployment notes](planning/aws-deployment-notes.md)

## Development setup

- [Dependency installation and script approvals](development/dependency-installation.md)

- [Local database and DBeaver](development/local-database.md)
- [Cognito development](development/cognito-development.md)
- [Simulated billing development](development/simulated-billing.md)
- [Operator jobs CLI](development/operator-jobs.md)
- [Local isolated demo](development/public-demo.md)
- [Reviewer walkthrough](development/demo-walkthrough.md)
- [GitHub setup](development/github-setup.md)

## API reference

- [Authentication](api/auth-api.md)
- [Classes, invitations, and enrollment](api/classroom-api.md)
- [Truth-table practice](api/truth-table-api.md)
- [Private problem library](api/problem-library-api.md)
- [Instructor assignments](api/assignment-api.md)
- [Student assignment work](api/student-work-api.md)
- [Simulated billing](api/billing-api.md)
- [Isolated demo](api/demo-api.md)

## Conventions

- [Codebase conventions](conventions/codebase-conventions.md)
- [Branch naming and PR workflow](conventions/branch-naming-conventions.md)

## QA

- [Step-by-step manual QA runbook](qa/manual-qa-runbook.md)
- [QA results, findings and changes](qa/findings-and-changes.md)

## Verification

- [Duplicate assignment](verification/duplicate-assignment-verification.md)

- [Unsaved work protection](verification/unsaved-work-protection-verification.md)

- [Immediate answer feedback](verification/immediate-answer-feedback-verification.md)

- [Assignment learning modes](verification/assignment-learning-modes-verification.md)

- [Isolated demo foundation and browser evidence](verification/public-demo-verification.md)

- [Truth-table walkthrough and evidence](verification/truth-table-verification.md)
- [Classroom-access walkthrough and evidence](verification/classroom-access-verification.md)
- [Problem-library walkthrough and evidence](verification/problem-library-verification.md)
- [Assignments and progress walkthrough and evidence](verification/assignments-and-progress-verification.md)
- [Simulated billing walkthrough and evidence](verification/simulated-billing-verification.md)
- [Durable jobs and reconciliation evidence](verification/durable-jobs-verification.md)

Keep new documents in the most relevant group and add them to this index. Product decisions belong in planning, implementation/setup guidance in development or API reference, reusable engineering rules in conventions, and dated validation evidence in verification. Local PR drafts remain in the ignored `.codex-local/pr/` directory.
