# GitHub Open Source Release Guide

## Goal

Use this checklist when publishing a local project to GitHub as an open source repository with a clean public history, clear documentation, and optional release assets.

## Before Publishing

Prepare these files first:

- `README.md`: English primary README
- `README.zh-TW.md`: Traditional Chinese README if needed
- `LICENSE`: usually `MIT`
- `CONTRIBUTING.md`
- `CHANGELOG.md`
- `SECURITY.md`
- `.github/workflows/release.yml` if you want GitHub Actions to build installers

Recommended repo metadata:

- Repository name: project name in PascalCase or existing product name
- Description: one-line product summary
- Visibility: `Public`
- Do not let GitHub auto-create `README`, `.gitignore`, or `LICENSE` if they already exist locally

## Keep Public History Clean

Recommended workflow:

- Keep development commits on a local or private `dev` branch
- Publish only a cleaned `main` branch
- Avoid pushing noisy experimental commits to the public repo
- Remove `Co-authored-by` trailers if you do not want `Copilot` shown in GitHub contributors

Practical branch model:

- `dev`: full internal development history
- `main`: public-ready history only
- Create release tags from `main` only

If `main` already contains noisy development commits:

1. Create or update `dev` to preserve the current full history.
2. Rebuild `main` into a small number of clean public commits.
3. Bring changes from `dev` into `main` with a squash-style publish commit.
4. Push the cleaned `main` to GitHub.

Before publishing, confirm git identity:

```bash
git config user.name "your-name"
git config user.email "you@example.com"
```

Check author data:

```bash
git log --format="%h %an <%ae> | %cn <%ce>"
```

## Publish To GitHub

Set the remote:

```bash
git remote add origin git@github.com:YOUR_ACCOUNT/YOUR_REPO.git
```

Push the public branch:

```bash
git push -u origin main
```

If you keep `dev` private and only want a clean public `main`, a common flow is:

```bash
git checkout dev
# continue normal development here

git checkout main
git merge --squash dev
git commit -m "chore: prepare public release"
git push origin main
```

Create a release tag:

```bash
git tag v0.1.0
git push origin v0.1.0
```

If the tag must move to a newer commit:

```bash
git tag -f v0.1.0
git push origin +refs/tags/v0.1.0:refs/tags/v0.1.0
```

## Release Workflow Notes

If GitHub Actions does not start:

1. Check the `Actions` tab and enable workflows for the repository.
2. Confirm the workflow file exists on `main`.
3. Confirm the tag matches the workflow trigger, for example `v*`.
4. If needed, create a new tag such as `v0.1.1` and push it again.

Verify remote refs:

```bash
git ls-remote origin refs/heads/main refs/tags/v0.1.0
```

## Contributor Hygiene

If old names still show on GitHub:

- Check commit author and committer emails
- Check commit messages for `Co-authored-by`
- Check old tags and releases that may still point to older history
- Remember GitHub contributor stats can take time to refresh

For a brand-new public release, the cleanest option is often:

1. Keep full development history locally
2. Push only the cleaned public branch to GitHub
3. Tag releases from that cleaned branch only

## Final Check

Before calling the release done, confirm:

- `README` and license are visible on GitHub
- `main` is the default branch
- `Tags` contains the release tag
- `Actions` completed successfully
- `Releases` contains built assets if applicable
- No unintended files were committed, for example local notes or agent-only files
