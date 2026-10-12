# Initial GitHub setup

The scaffold is ready for an initial public commit. It is an early project: the README describes the implemented health-check flow and planned features separately.

## Create an empty remote

1. Sign in to GitHub and open [New repository](https://github.com/new).
2. Choose your personal account as owner and use `logiclab` as the repository name.
3. Suggested description: “Interactive formal-logic learning platform built with React, TypeScript, and Node.js.”
4. Choose **Public** for employer visibility.
5. Leave README initialization unchecked and choose no `.gitignore` or license template. The local project already has a README and ignore rules; choose and add a license separately.
6. Click **Create repository** and copy its HTTPS or SSH URL from Quick Setup.

These steps follow [GitHub's repository creation guidance](https://docs.github.com/en/repositories/creating-and-managing-repositories/creating-a-new-repository). An empty remote avoids conflicting initial commits.

## Connect and push

Run from the project root if performing the initial push yourself. Replace `YOUR_USERNAME` with the actual repository owner. These commands assume the local directory has not yet been initialized with Git and that no `origin` remote exists.

```sh
git init -b main
git add .
git diff --cached --stat
git diff --cached
git commit -m "chore: bootstrap LogicLab monorepo"
git remote add origin https://github.com/YOUR_USERNAME/logiclab.git
git push -u origin main
```

Review the staged files before committing. `.gitignore` excludes dependency folders, build outputs, coverage, and private environment files while retaining `.env.example` templates.

Git needs a configured commit name/email and GitHub authentication. Use your existing credential manager or SSH setup; HTTPS authentication uses a token rather than your GitHub account password. Keep credentials outside this repository. The GitHub CLI is optional and is not currently installed in this environment.

See [GitHub's instructions for pushing local code](https://docs.github.com/en/migrations/importing-source-code/using-the-command-line-to-import-source-code/adding-locally-hosted-code-to-github) for authentication and setup details.

After pushing, check that `main` is the default branch and the Actions CI workflow passes. Continue development using [numbered work branches](branch-naming-conventions.md).
