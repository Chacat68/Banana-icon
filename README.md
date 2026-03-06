# Banana Icon

基于 Next.js + 本地 SQLite + Nano Banana API 的本地素材生成工具。

## 快速开始

1. 安装依赖

```bash
npm install
```

2. 配置 `.env`

```env
NANO_BANANA_API_KEY=your_api_key_here
NANO_BANANA_API_URL=https://api.nano-banana.example.com
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

也可以只在设置页填写 API URL 与 API Key。浏览器中保存的 API Key 优先级高于环境变量。

3. 初始化本地数据库

```bash
npm run db:migrate
```

4. 启动项目

Windows:

```bat
start.bat
```

或：

```bash
npm run start:win
```

通用方式：

```bash
npm run local
```

默认地址：`http://localhost:3000`

## Windows 启动脚本

`start.bat` 和 `scripts/start-local.ps1` 会自动执行这些步骤：

- 检查 Node.js 和 npm
- 首次运行时安装依赖
- 缺少 `.env` 时从 `.env.example` 复制
- 创建 `public/uploads`
- 执行 `npm run db:migrate`
- 启动本地开发服务器

## 主要页面

- `生成` (`/`): 创建单张或批量生成任务，支持参考图上传。
- `生成任务` (`/tasks`): 查看任务状态和生成结果。
- `资产库` (`/assets`): 浏览、导入、删除素材。
- `风格模板` (`/styles`): 保存风格模板，并根据参考图生成关键词建议。
- `项目` (`/projects`): 管理项目及其素材、任务统计。
- `设置` (`/settings`): 配置 Nano Banana API URL、API Key，并测试连通性。

## 本地存储

- 数据库：`local.db`
- 上传目录：`public/uploads`
- 上传路径：`/uploads/<file>`

## 常用命令

- `npm run local`: 启动本地开发环境
- `npm run start:win`: 使用 PowerShell 启动 Windows 本地环境
- `npm run build`: 构建项目
- `npm run db:migrate`: 执行本地 SQLite 迁移
- `npm run db:generate`: 生成 Drizzle 迁移

## API

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

## 说明

- API Key 不写入数据库，仅保存在浏览器本地存储。
- 上游请求支持 `X-Api-Key` 透传，服务端统一转换为 `Authorization: Bearer`。
- `POST /api/styles/analyze` 对外部 URL 做了基础 SSRF 防护校验。
- `0004_add_upstream_task_id.sql` 为生成任务补充了上游任务 ID，用于异步轮询状态同步。

## License

ISC

```bash
npm run db:migrate:local
```

## 对象存储

- 本地开发时，上传文件会自动写入 `public/uploads`。

上传后的 URL 规则：
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

## 常用脚本

- `npm run dev`: Next.js 开发模式
- `npm run local`: 本地一键启动脚本
- `npm run build`: Next.js 构建
- `npm run db:generate`: 生成 Drizzle 迁移
- `npm run db:migrate`: 执行本地 SQLite 迁移
- `npm run db:migrate:local`: 执行本地 SQLite 迁移

迁移补充：
- `0004_add_upstream_task_id.sql` 为生成任务补充上游任务 ID，用于异步轮询状态同步。

## 设计与安全说明

- API Key 不写入数据库，仅存在浏览器本地存储。
- 上游请求支持 `X-Api-Key` 透传，服务端统一转换为 `Authorization: Bearer`。
- `POST /api/styles/analyze` 对外部 URL 做了基础 SSRF 防护校验。

## License

ISC