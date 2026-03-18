# Banana Icon

基于 Next.js、SQLite 和 Nano Banana API 的本地素材生成工具。

## 功能概览

- 生成单张或批量任务，支持参考图上传
- 管理项目、风格模板和素材资产
- 轮询上游任务状态并同步生成结果
- 在设置页配置上游 API 地址并测试连通性

## 快速开始

1. 安装依赖

```bash
npm install
```

2. 复制环境变量模板并填写占位值

```bash
copy .env.example .env
```

```env
NANO_BANANA_API_KEY=your_api_key_here
NANO_BANANA_API_URL=https://api.nano-banana.example.com
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

也可以只在设置页填写 API URL 和 API Key。浏览器本地保存的 API Key 优先级高于环境变量。

3. 初始化本地数据库

```bash
npm run db:migrate
```

4. 启动项目

```bash
npm run local
```

Windows 也可以直接运行：

```bat
start.bat
```

默认地址是 http://localhost:3000。

## 常用命令

- npm run local: 启动本地开发环境
- npm run start:win: 使用 PowerShell 启动 Windows 本地环境
- npm run build: 构建项目
- npm run db:migrate: 执行本地 SQLite 迁移
- npm run db:generate: 生成 Drizzle 迁移

## 本地数据与隐私

以下内容是运行期生成的本地数据，不应提交到仓库：

- local.db
- local.db-shm
- local.db-wal
- public/uploads/
- .env 及各类 .env.local 文件

这些文件可能包含：

- 项目名、提示词、任务记录和素材元数据
- 参考图和生成结果
- 本地 API 配置

仓库已经通过 .gitignore 忽略这些路径，但如果它们曾被提交过，仍需执行 git rm --cached 将其从 Git 索引移除。

## 安全说明

- API Key 不写入数据库，只保存在当前浏览器的 localStorage 中
- 服务端仅通过请求头接收 X-Api-Key，并在代理上游请求时转换为 Authorization: Bearer
- POST /api/styles/analyze 对外部 URL 做了基础 SSRF 防护校验
- 生成任务、风格模板、项目配置和上传素材默认保存在本地 SQLite 与本地文件系统中

## 主要页面

- /: 创建单张或批量生成任务
- /tasks: 查看任务状态和生成结果
- /assets: 浏览、导入、删除素材
- /styles: 保存风格模板，并根据参考图生成关键词建议
- /projects: 管理项目及其素材、任务统计
- /settings: 配置 Nano Banana API URL、API Key，并测试连通性

## API 一览

### 生成任务

- POST /api/generate: 创建生成任务
- GET /api/generate: 查询任务列表，支持 projectId
- GET /api/generate/[taskId]/status: 轮询单任务状态并同步资产

### 项目

- GET /api/projects: 查询项目列表，包含 assets/tasks 计数
- POST /api/projects: 创建项目

### 风格模板

- GET /api/styles: 查询风格模板，支持 projectId
- POST /api/styles: 创建风格模板
- POST /api/styles/analyze: 根据参考图生成风格建议

### 素材资产

- GET /api/assets: 查询资产，支持 projectId、tag、limit
- DELETE /api/assets?id=...: 删除单个资产
- POST /api/assets/batch: 批量导入素材

### 设置与上传

- GET /api/settings: 获取设置
- PUT /api/settings: 更新 nano_banana_api_url
- POST /api/settings/test: 测试上游 API 连通性
- POST /api/upload: 上传单个参考图

## License

ISC