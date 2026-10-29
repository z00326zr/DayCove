# 技术架构

## 进程与职责

- Electron 主进程：窗口和菜单、密码会话、SQLite 数据库、图片附件协议、备份导入导出及自动快照。
- preload：使用 contextBridge 暴露固定 API，不暴露通用 IPC 通道、文件系统或进程执行能力。
- 渲染进程：原生 JavaScript、HTML、CSS，Tiptap/ProseMirror 可视化编辑与 Markdown 转换，Lucide 图标，自定义 SVG 品牌标识。
- 构建：Vite，electron-builder，Node.js 内置测试框架，sharp 仅用于开发期生成安装包图标。

桌面通过 file URL 加载安装包内资源，通过 IPC 调用本机主进程，没有 HTTP 服务，也不依赖浏览器。浏览器预览是开发工具，使用独立的 localStorage 适配器。

## 数据流

编辑器修改 → 生成 HTML 与 Markdown → 渲染端保存队列 → 验证 IPC 来源和解锁状态 → 校验记录 → 分离内嵌图片 → SQLite 事务更新变化记录 → 返回保存结果。

正文和 Markdown 中的图片使用 `ediary-asset://image/<sha256>.<ext>` 引用；图片原始二进制保存于 attachments。自定义协议仅接受严格的哈希文件名，按解锁状态提供图片内容。

备份时读取一致的记录集并将附件恢复为便携数据，生成带版本与 SHA-256 校验值的 `.ediary` 文件。恢复时先校验，再备份当前库、分离附件并合并记录。旧 JSON 库迁移前保存完整快照，原文件保留。

## 主要源文件

- `electron/main.cjs`：桌面生命周期、菜单、协议、IPC 和备份调度。
- `electron/security.cjs`：密码状态、错误等待、配置持久化与会话锁。
- `electron/auth.mjs`：共享的 Web Crypto 密码派生和验证。
- `electron/library.cjs`：SQLite、附件管理、旧库迁移和跨库恢复。
- `electron/storage.cjs`：便携格式校验、旧 JSON 兼容与冲突合并。
- `src/main.js`：写作、日历、配置和说明书交互。
- `src/calendar.js`：月历日期和日记日期索引。

## 当前限制

数据库使用 node:sqlite（由 Electron 内置 Node.js 提供）。页面目前仍将记录元数据与正文载入内存，并在主进程比较变化记录；海量日记可继续改进为分页、单记录 IPC 和数据库搜索。附件暂不自动清理，以防回收站或历史备份引用被误删。备份是可移植 JSON，未压缩、未加密；适合当前个人日记使用规模。启动密码不等于内容加密。
