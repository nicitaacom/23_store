# Repository Instructions

Before coding, read:

- `plans/`
- `dev_readme-eslint.md`
- `commit-patterns.md`

Treat all three as mandatory project instructions.

`development` is the main branch and deployment source. Work on `development`; do not create
or switch to a feature branch for a plan. Merge existing migration work into `development`.
Before starting the next plan, commit all completed work and leave `development` clean.
Push `development` for an authorized release. Do not create a `production` branch or use
`production-vite` or locked branches. Vercel's Production environment is not a Git branch name.

Never read `.env.local`, including through test runners, development/build commands or Git hooks.
Use verification that disables environment-file reads. The pre-push key-check hook reads this file;
skip that hook for an authorized push without changing the persistent Git hook configuration.
