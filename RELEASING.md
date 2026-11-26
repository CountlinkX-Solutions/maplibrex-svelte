# Releasing

Releases are published by hand from a maintainer's machine. Nothing here needs a paid service or a stored credential.

## Before you start

- You are on `main`, up to date, with a clean working tree.
- CI is green on the commit you are releasing.
- `CHANGELOG.md` has an entry for the new version, and `package.json` carries that version.

## Steps

1. Log in to npm. The command prints a URL; open it in a browser, sign in and approve. Under WSL the browser may not open by itself, so copy the URL by hand and leave the terminal waiting.

   ```sh
   npm login
   npm whoami
   ```

   `npm whoami` must print the account that owns the package.

2. Optionally look at what would be published.

   ```sh
   npm publish --dry-run
   ```

3. Publish. This runs the type check and the test suite, builds the package and validates it with publint. If any of them fails, nothing is published. The tests start a headless Chromium, so check free memory first.

   ```sh
   npm publish
   ```

4. Confirm the registry has it.

   ```sh
   npm view maplibrex-svelte version
   ```

5. Tag the released commit and push the tag. Tags are annotated and start with `v`.

   ```sh
   git tag -a v0.2.0 -m "v0.2.0 — one line on what the release is"
   git push origin v0.2.0
   ```

## Preparing the next version

1. Add a section to the top of `CHANGELOG.md`: what was added, changed and fixed, in words a user of the library would use, with issue numbers.
2. Set the version without creating a tag:

   ```sh
   npm version 0.2.0 --no-git-tag-version
   ```

3. Commit both, open the pull request, and merge it once the checks pass.

## The docs site

It deploys by itself after CI passes on `main`. To redeploy without a new commit, run the "Docs site" workflow by hand from the Actions tab.
