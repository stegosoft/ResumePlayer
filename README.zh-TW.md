# ResumePlayer

[English](./README.md) | 繁體中文

ResumePlayer 是一個以 Tauri、React 與 Rust 開發的輕量桌面影片播放器。它會記住播放進度、還原上次播放清單，專注於本機媒體播放，不走大型媒體庫管理路線。

## 主要功能

- 自動記住播放時間並於下次續播
- 保留播放清單順序與目前項目
- 支援原生檔案選擇與拖放開啟
- 支援播放清單拖曳排序
- 提供 A-B Loop 與倍速播放
- 使用本機 SQLite 儲存播放紀錄

## 下載

可直接從 [GitHub Releases](../../releases) 下載已建置好的安裝檔。

- Windows: `.msi` 與 `.exe`
- 每個版本也會附上原始碼壓縮檔

## 本機開發

需求：

- Node.js 20+
- Rust stable
- 目前以 Windows 為主要建置平台

```bash
npm install
npm run dev
```

常用驗證指令：

```bash
npm run lint
npm run build
cargo check --manifest-path src-tauri/Cargo.toml
```

## 專案結構

- `src/`: React UI、hooks、Tauri 溝通層
- `src-tauri/`: Rust 指令、資料庫邏輯、應用程式設定
- `scripts/`: 維護用腳本，例如圖示產生工具
- `public/`: 靜態資產
- `dist/`: 前端建置輸出

## 隱私說明

ResumePlayer 只處理本機檔案，不會上傳影片內容。播放進度與播放清單狀態會儲存在使用者本機的 app data 目錄。

## 貢獻

歡迎提交 issue 與 pull request。協作流程請見 [CONTRIBUTING.md](./CONTRIBUTING.md)。

## 授權

本專案採用 [MIT License](./LICENSE)。
