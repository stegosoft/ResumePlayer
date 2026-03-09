# Contributing

## Workflow

1. Fork the repository and create a feature branch from `main`.
2. Keep changes focused. Avoid mixing UI, backend, and release-process changes in one PR unless they are tightly related.
3. Use Conventional Commit prefixes such as `feat:`, `fix:`, `docs:`, and `chore:`.

Examples:

- `feat: add playlist import from folder`
- `fix: restore playback rate after app restart`

## Development Checks

Run the relevant checks before opening a pull request:

```bash
npm run lint
npm run build
cargo check --manifest-path src-tauri/Cargo.toml
```

If you changed Rust logic, add or update Rust tests when practical.

## Pull Requests

Each PR should include:

- A short description of the problem and the change
- Verification steps or command output summary
- Screenshots or a short recording for UI changes
- Linked issues when applicable

## Release Notes

User-visible changes should be added to `CHANGELOG.md` as part of the same pull request.
