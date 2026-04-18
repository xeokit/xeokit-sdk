# docs-build Branch Spec

## Chosen Approach

Option A — manual rebase, script-assisted.

`docs-build` = `master` + exactly 1 squashed tip commit that adds all esdoc tooling back.
When `master` advances, a developer runs `scripts/sync-docs-branch.sh` to rebase and force-push.

---

## Scope

**S1** — Stripped from `master`:
- `package.json`: 5 devDependencies removed (`esdoc`, `esdoc-custom-theme`, `esdoc-ecmascript-proposal-plugin`, `esdoc-publish-html-plugin`, `esdoc-standard-plugin`) and the `docs` script removed
- `.esdoc.json` deleted
- `assets/esdocTemplate/` deleted (directory + all contents)
- `docs/.scripts/` deleted (directory + all contents, including `fix-doc-links.mjs`)

**S2** — `docs-build` branch created from `master` HEAD with one commit restoring all of S1.

**S3** — `scripts/sync-docs-branch.sh` added to `master`:
- fetch origin
- checkout `docs-build`
- rebase onto `origin/master`
- force-push with lease
- return to previous branch

**S4** — `docs/` generated output: unchanged in both branches (kept tracked as-is).

---

## Constraints

**C1** — `docs-build` history is always linear: master commits + exactly 1 tip commit. No merges.

**C2** — `master` must build cleanly after S1 removals (`npm run build`, `npm run check-types`).

**C3** — `npm run docs` is only functional on `docs-build`.

---

## Deferred

**D1** — CI automation (auto-rebase `docs-build` on push to `master`).

**D2** — Docs publish pipeline (GitHub Pages, S3, etc.).

---

## Non-goals

- No changes to generated `docs/` content or `.gitignore`.
- No changes to rollup/build config.
- `assets/esdocTemplate/` is esdoc-only; nothing else in `master` depends on it.
