# Repository Instructions

Before coding, read:

- `plans/`
- `dev_readme-eslint.md`
- `commit-patterns.md`

Treat all three as mandatory project instructions.

Work on `development`. Do not create or switch to a feature branch for a plan. Before starting
the next plan, commit all completed work and leave `development` clean. Merge into and push
`production` when the user requests a production release; keep the working checkout on
`development`.

Never read `.env.local`, including through test runners, development/build commands or Git hooks.
Use verification that disables environment-file reads. The pre-push key-check hook reads this file;
skip that hook for an authorized push without changing the persistent Git hook configuration.
