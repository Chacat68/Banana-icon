# Banana Icon

基于 Next.js + Cloudflare + Nano Banana API 的游戏素材生成与管理工具。

当前版本提供完整的素材工作流：
- 项目管理
- AI 生成任务（单个/批量）
- 素材资产库（检索/导入/删除）
- 风格模板（支持参考图 AI 分析）
- API 配置与连通性测试

## 功能概览

### 页面结构（与当前设计一致）
- `生成` (`/`): 主工作台。输入描述词、选择风格/背景/尺寸，支持参考图上传和批量模式。
- `生成任务` (`/tasks`): 查看当前会话任务和历史任务，轮询任务状态并展示生成结果。
- `资产库` (`/assets`): 展示所有素材，支持关键词搜索、批量导入和删除。
- `风格模板` (`/styles`): 创建风格模板，上传参考图后调用 AI 自动提取风格关键词。
- `项目` (`/projects`): 创建项目并查看项目维度的素材数/任务数统计。
- `设置` (`/settings`): 配置 Nano Banana API URL 与 API Key，支持连通性测试。

### 关键交互
- 单次生成和批量生成共用一套提示词模板。
- 参考图通过 `/api/upload` 上传到 R2（本地开发时回退到 `public/uploads`）。
- 任务提交后立即入库，再异步请求上游生成接口。
- 任务状态支持前端轮询 `/api/generate/[taskId]/status`。
- API Key 仅保存在浏览器 `localStorage`（优先级高于环境变量）。

## 技术栈

- `Next.js 15` (App Router)
- `React 18`
- `TypeScript`
- `Tailwind CSS 4`
- `Drizzle ORM`
- `Cloudflare D1` (数据库)
- `Cloudflare R2` (文件存储)
- `OpenNext Cloudflare` (构建/部署)
- `Zustand` (前端任务状态)

## 项目结构

```text
src/
	app/
		page.tsx                 # 生成工作台
		tasks/page.tsx           # 任务列表与状态轮询
		assets/page.tsx          # 资产库
		styles/page.tsx          # 风格模板
		projects/page.tsx        # 项目管理
		settings/page.tsx        # API 设置
		api/
			generate/              # 创建任务、查询任务
			projects/              # 项目 CRUD(当前含查询+创建)
			styles/                # 风格模板创建/查询
			assets/                # 资产查询/删除
			settings/              # 设置读取/更新
			upload/                # 图片上传
	lib/
		db.ts                    # D1 + 本地 SQLite 回退
		schema.ts                # Drizzle 数据表定义
		nano-banana.ts           # 上游 API 客户端
		r2.ts                    # R2 + 本地文件回退
```

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

复制 `.env.example` 为 `.env` 并按需修改：

```env
NANO_BANANA_API_KEY=your_api_key_here
NANO_BANANA_API_URL=https://api.nano-banana.example.com
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

说明：
- `NANO_BANANA_API_KEY` 可作为默认密钥。
- 实际运行时，若浏览器设置页保存了 Key，会优先使用浏览器中的 Key。
- `NANO_BANANA_API_URL` 也可在设置页写入数据库（优先于环境变量）。

### 3. 本地开发

```bash
npm run dev
```

或使用项目内脚本（会自动准备本地目录等）：

```bash
npm run local
```

打开 `http://localhost:3000`。

## 数据库与迁移

### Cloudflare D1

在 `wrangler.toml` 中绑定了 D1：`DB`。

执行迁移：

```bash
npm run db:migrate
```

本地 D1 迁移：

```bash
npm run db:migrate:local
```

### 本地回退模式

在非 Cloudflare 上下文下，`src/lib/db.ts` 会自动使用 `better-sqlite3` 创建 `local.db`。

## 对象存储

- 云端：使用 R2 绑定 `ASSETS_BUCKET`。
- 本地：自动写入 `public/uploads`。

上传后的 URL 规则：
- R2 模式返回 `/assets/<key>`
- 本地模式返回 `/uploads/<file>`

## API 一览

### 生成任务
- `POST /api/generate`: 创建生成任务。
- `GET /api/generate`: 查询任务列表（支持 `projectId`）。
- `GET /api/generate/[taskId]/status`: 轮询单任务状态并同步资产。

### 项目
- `GET /api/projects`: 查询项目列表（含 assets/tasks 计数）。
- `POST /api/projects`: 创建项目。

### 风格模板
- `GET /api/styles`: 查询风格模板（支持 `projectId`）。
- `POST /api/styles`: 创建风格模板。
- `POST /api/styles/analyze`: 根据参考图生成风格建议。

### 素材资产
- `GET /api/assets`: 查询资产（支持 `projectId`、`tag`、`limit`）。
- `DELETE /api/assets?id=...`: 删除单个资产。
- `POST /api/assets/batch`: 批量导入素材。

### 设置与上传
- `GET /api/settings`: 获取设置。
- `PUT /api/settings`: 更新设置（当前允许 `nano_banana_api_url`）。
- `POST /api/settings/test`: 测试上游 API 连通性。
- `POST /api/upload`: 上传单个参考图。

## Cloudflare 部署

### 1. 准备资源

1. 创建 D1：`wrangler d1 create banana-icon-db`
2. 创建 R2：`wrangler r2 bucket create banana-icon-assets`
3. 将返回值写入 `wrangler.toml` 中对应字段。

### 2. 配置 Secret

```bash
wrangler secret put NANO_BANANA_API_KEY
```

### 3. 构建与发布

```bash
npm run deploy
```

仅预览本地 Cloudflare 产物：

```bash
npm run preview
```

## 常用脚本

- `npm run dev`: Next.js 开发模式
- `npm run local`: 本地一键启动脚本
- `npm run build`: Next.js 构建
- `npm run cf:build`: OpenNext Cloudflare 构建
- `npm run preview`: Cloudflare 本地预览
- `npm run deploy`: Cloudflare 发布
- `npm run db:generate`: 生成 Drizzle 迁移
- `npm run db:migrate`: 执行远端 D1 迁移
- `npm run db:migrate:local`: 执行本地 D1 迁移

新增迁移说明：
- `0004_add_upstream_task_id.sql` 为生成任务补充上游任务 ID，用于异步轮询状态同步。

## 设计与安全说明

- API Key 不写入数据库，仅存在浏览器本地存储。
- 上游请求支持 `X-Api-Key` 透传，服务端统一转换为 `Authorization: Bearer`。
- `POST /api/styles/analyze` 对外部 URL 做了基础 SSRF 防护校验。

## License

ISC