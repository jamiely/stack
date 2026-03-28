# Git Hooks

This repo keeps local git hooks in `.githooks/`.

Activate them with:

```sh
git config core.hooksPath .githooks
chmod +x .githooks/pre-commit .githooks/pre-push
```

Expected behavior:

- `pre-commit` runs `npm run test:unit` and `npm run test:e2e`
- `pre-push` runs `npm run test:e2e`

Both hooks safely no-op until `package.json` and the required scripts exist.
