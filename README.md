# ResumePlayer

English | [繁體中文](./README.zh-TW.md)

ResumePlayer is a lightweight desktop video player built with Tauri, React, and Rust. It remembers playback position, restores the last playlist, and is designed for local media playback without a heavyweight media library.

## Features

- Resume playback from the last saved timestamp
- Persist playlist order and current item across sessions
- Add files with native dialogs or drag and drop
- Reorder playlist items by dragging
- Support A-B loop playback and speed control
- Store playback history locally in SQLite

## Download

Prebuilt installers are published on [GitHub Releases](../../releases).

- Windows: `.msi` and `.exe` installers
- Source code: zip / tarball on each tagged release

## Tech Stack

- Frontend: React 19, TypeScript, Vite
- Desktop shell: Tauri 2
- Backend: Rust, rusqlite

## Local Development

Requirements:

- Node.js 20+
- Rust stable
- Windows is the primary supported build target today

Install dependencies and start development:

```bash
npm install
npm run dev
```

Useful commands:

```bash
npm run lint
npm run build
cargo check --manifest-path src-tauri/Cargo.toml
```

## Project Structure

- `src/`: React UI, hooks, and Tauri bridge code
- `src-tauri/`: Rust commands, database logic, and app config
- `scripts/`: maintenance scripts such as icon generation
- `public/`: static assets
- `dist/`: generated frontend build output

## Privacy

ResumePlayer is intended for local playback. Media files are not uploaded anywhere. Playback progress and playlist state are stored on the local machine in the app data directory.

## Contributing

Contributions are welcome. See [CONTRIBUTING.md](./CONTRIBUTING.md) for the expected workflow and verification steps.

## License

This project is licensed under the [MIT License](./LICENSE).
