Stage all changes and create a conventional commit.

Steps:

1. Run `git diff HEAD --stat` to see what changed
2. Run `git diff HEAD` to read the full diff
3. Run `pnpm prettier --write .` to fix formatting
4. Generate a commit message following these rules:
   - use lowercase
   - max 72 chars
   - be concise and specific
   - choose the most important change
   - format: type(scope): description
5. Stage all changed files with `git add -A`
6. Run `git commit -m "<message>"` to create the commit
7. Confirm success with the commit hash

Examples of good messages:
feat(auth): add github oauth
fix(api): handle null response
refactor(ui): simplify modal state
