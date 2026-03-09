# Security Policy

## Supported Versions

Security fixes are applied to the latest release branch and the current `main` branch.

## Reporting a Vulnerability

Please do not open a public issue for security-sensitive problems.

Report vulnerabilities privately with:

- A clear description of the issue
- Steps to reproduce
- Affected version or commit
- Impact assessment if known

If the issue involves local file access, database handling, or Tauri permissions, include the exact file or setting involved, for example `src-tauri/tauri.conf.json`.

## Scope

Please report issues such as:

- Unexpected filesystem access
- Tauri permission or protocol misconfiguration
- Unsafe handling of user-selected paths
- Crashes that may expose user data

Non-security bugs should go through the normal GitHub issue tracker.
