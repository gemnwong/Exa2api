<p align="center">
  <img src="docs/logo.svg" width="120" alt="Exa2api logo" />
</p>
<h1 align="center">Exa2api</h1>
<p align="center">
  <strong>简体中文</strong>
</p>
<p align="center">
  面向 Exa 账号池的 OpenAI 兼容代理与管理面板。
</p>

## 简介

`Exa2api` 是一个 Docker 优先的 Exa 代理服务，提供：

- Exa 原生接口代理：`/search`、`/answer`、`/contents`、`/findSimilar`
- OpenAI 兼容接口：`/v1/models`、`/v1/chat/completions`、`/v1/responses`
- 多账号池轮询与失败切换
- 管理面板：账号、日志、监控、系统设置、数据库备份恢复
- MCP HTTP 入口：`/mcp`

> 当前仓库仅保留账号池代理与单人自用管理能力。

## 部署方式

推荐直接用 Docker Compose。

### 默认启动

```bash
docker compose up -d --build
```

默认监听本地：`127.0.0.1:7860`。

- 管理面板：`http://127.0.0.1:7860/#/login`
- 健康检查：`http://127.0.0.1:7860/health`

数据目录：`./data`

- SQLite 数据库：`./data/data.db`

默认管理员：

- 用户名：`admin`
- 密码：`123456`

首次登录后建议立即修改密码。

### 代理构建说明

当前 `docker-compose.yml` 默认**不走代理**也可直接构建。

如果本地 Docker 构建需要代理，可在当前终端先设置环境变量，再执行启动命令，例如：

```cmd
set HTTP_PROXY=http://host.docker.internal:7890
set HTTPS_PROXY=http://host.docker.internal:7890
docker compose up -d --build
```

## 账号导入

管理面板中点击 `添加账户`，仅保留批量导入。

支持：

- 多个 `.json` 文件一次导入
- 文本批量导入

JSON 支持两种结构：

```json
[{"id":"..."}]
```

或：

```json
{"accounts":[{"id":"..."}]}
```

文本支持常见导入格式：

- `duckmail----email----password`
- `moemail----email----emailId`
- `freemail----email`
- `gptmail----email`
- `cfmail----email----jwtToken`
- `apiKey`
- `email----password----clientId----refreshToken`

## 鉴权

业务接口与 OpenAI 兼容接口均使用：

`Authorization: Bearer <user_api_key>`

## OpenAI 兼容接口

### 1. 模型列表

`GET /v1/models`

当前内置模型：

- `exa-answer`：问答，适合直接回答问题
- `exa-search`：搜索，适合网页检索
- `exa-contents`：抓取 URL 内容
- `exa-findsimilar`：相似内容检索

### 2. Chat Completions

`POST /v1/chat/completions`

- 支持 `stream: true`
- 支持基础工具调用兼容
- 服务端会按模型自动路由到对应 Exa 接口

模型路由关系：

- `exa-answer` → `/answer`
- `exa-search` → `/search`
- `exa-contents` → `/contents`
- `exa-findsimilar` → `/findSimilar`

### 3. Responses API

`POST /v1/responses`

用于兼容偏向 OpenAI Responses API 的客户端。

## 原生接口

| 接口 | 方法 | 说明 |
|---|---|---|
| `/search` | POST | 搜索 |
| `/answer` | POST | 问答 |
| `/contents` | POST | 抓取内容 |
| `/findSimilar` | POST | 相似内容检索 |
| `/research/v1` | POST/GET | 研究任务 |
| `/health` | GET | 健康检查 |

## MCP

MCP HTTP 入口：`/mcp/`

示例：

```toml
[mcp_servers.exa2api]
url = "http://127.0.0.1:7860/mcp/"
http_headers = { "Authorization" = "Bearer your-user-api-key" }
```

## OpenClaw 示例

将 OpenAI Base URL 指向本服务即可，例如：

- Base URL: `http://127.0.0.1:7860/v1`
- API Key: 你的 `user_api_key`
- Model: `exa-answer` 或 `exa-search`

## 测试命令

以下命令可直接在 Windows `cmd` 中执行。

### 查看模型

```cmd
curl http://127.0.0.1:7860/v1/models -H "Authorization: Bearer your-user-api-key"
```

### `exa-answer`

```cmd
curl http://127.0.0.1:7860/v1/chat/completions -H "Authorization: Bearer your-user-api-key" -H "Content-Type: application/json" -d "{\"model\":\"exa-answer\",\"messages\":[{\"role\":\"user\",\"content\":\"What is Exa?\"}]}"
```

### `exa-search`

```cmd
curl http://127.0.0.1:7860/v1/chat/completions -H "Authorization: Bearer your-user-api-key" -H "Content-Type: application/json" -d "{\"model\":\"exa-search\",\"messages\":[{\"role\":\"user\",\"content\":\"Latest OpenAI news\"}]}"
```

### `exa-contents`

```cmd
curl http://127.0.0.1:7860/v1/chat/completions -H "Authorization: Bearer your-user-api-key" -H "Content-Type: application/json" -d "{\"model\":\"exa-contents\",\"messages\":[{\"role\":\"user\",\"content\":\"https://exa.ai\"}]}"
```

### `exa-findsimilar`

```cmd
curl http://127.0.0.1:7860/v1/chat/completions -H "Authorization: Bearer your-user-api-key" -H "Content-Type: application/json" -d "{\"model\":\"exa-findsimilar\",\"messages\":[{\"role\":\"user\",\"content\":\"https://exa.ai\"}]}"
```

### Responses API

```cmd
curl http://127.0.0.1:7860/v1/responses -H "Authorization: Bearer your-user-api-key" -H "Content-Type: application/json" -d "{\"model\":\"exa-answer\",\"input\":\"What is Exa?\"}"
```

## 系统设置与数据库

系统设置页保留与当前产品相关的配置项。

SQLite 模式下支持：

- 导出数据库
- 导入并覆盖数据库

接口：

- `GET /api/admin/database/export`
- `POST /api/admin/database/import`

## 许可证

- MIT，见 [LICENSE](LICENSE)
