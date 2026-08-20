# BrowserPilot for DeepSeek Harness

[English](README.en.md) · [BrowserPilot](https://github.com/Puxora/BrowserPilot) · [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness)

> 在 DeepSeek Harness（DSH）中安全地使用本机 Chrome，并将最终网页确认保留在 BrowserPilot 浏览器扩展中。

`@puxora/dsh-browserpilot` 是 BrowserPilot 的独立 DSH 双端插件。Host 端将 BrowserPilot MCP 工具提供给 Agent；Web 端提供专属设置入口、权限策略和管理面板按钮。

## 目录

- [核心能力](#核心能力)
- [前置条件](#前置条件)
- [完整使用教程](#完整使用教程)
- [DSH 设置与权限](#dsh-设置与权限)
- [管理面板](#管理面板)
- [工作原理](#工作原理)
- [常见问题](#常见问题)
- [开发与测试](#开发与测试)
- [发布与许可证](#发布与许可证)

## 核心能力

| 能力 | 说明 |
| --- | --- |
| 本机 Chrome 控制 | 让 DSH Agent 通过 BrowserPilot 操作用户本机 Chrome。 |
| 分级权限 | 分别管控只读、网页交互和敏感操作。 |
| 本地最终确认 | 需确认的网页操作仍由 BrowserPilot Chrome 扩展完成。 |
| 连接诊断 | 使用 `browserpilot_status` 查询 MCP 状态与已注册工具数量。 |
| 管理面板入口 | 从 DSH 设置直接打开 BrowserPilot 本地后台。 |

## 前置条件

- Node.js 18 或更高版本；
- 可正常运行的 DeepSeek Harness Web profile；
- Google Chrome；
- 对当前 Chrome 用户安装扩展的权限。

BrowserPilot 负责浏览器连接、标签页占用、令牌与网页确认。本插件不会把令牌、Cookie 或浏览器凭据保存到 DSH。

## 完整使用教程

### 1. 安装 BrowserPilot 并注册本地桥接

在 PowerShell 或终端中执行：

```bash
npm install -g @puxora/browserpilot
browserpilot install
```

`browserpilot install` 会注册当前 Windows 用户的 Chrome Native Messaging Host。请保存命令输出的 `chrome-extension` 目录路径，下一步需要选择该目录。

### 2. 安装 BrowserPilot Chrome 扩展

1. 在 Chrome 打开 `chrome://extensions`；
2. 开启右上角的 **开发者模式**；
3. 点击 **加载已解压的扩展程序**；
4. 选择上一步 `browserpilot install` 输出的 `chrome-extension` 目录；
5. 将 BrowserPilot 扩展固定到工具栏并打开它，确认状态显示为已连接。

> 此步骤不可省略。DSH 插件只提供 MCP 接入与权限控制，真实 Chrome 标签页由 BrowserPilot 扩展连接和操作。

### 3. 启动并检查 BrowserPilot

```bash
browserpilot start
browserpilot status
```

默认管理后台为 [http://127.0.0.1:9876/](http://127.0.0.1:9876/)。首次在本机浏览器打开时会创建仅限 loopback 的认证 Cookie。

若需要查看实时日志，可使用：

```bash
browserpilot start --foreground
```

### 4. 安装 DSH 插件

#### 正式安装（npm 发布后）

在可使用 `dsh` 命令的环境执行：

```bash
dsh plugin --profile web add @puxora/dsh-browserpilot@latest
dsh web
```

在 DeepSeek Harness 源码目录中运行时，请使用：

```bash
pnpm dsh plugin --profile web add @puxora/dsh-browserpilot@latest
pnpm dsh web
```

> `@latest` 在 npm 公网发布后可用。发布前请采用下方的本地开发安装方式。

#### 本地开发安装

```bash
pnpm dsh plugin --profile web add file:G:/github/dsh-browserpilot
pnpm dsh web
```

将示例路径替换为本地仓库路径。修改插件代码后，需要重新安装该 `file:` 依赖、重启 DSH 并刷新网页，才能加载新版本。

### 5. 在 DSH 中验证连接

1. 打开 **设置 → BrowserPilot**；
2. 确认 **启用浏览器工具** 已开启；
3. 在聊天中调用 `browserpilot_status`；
4. 当状态为 `connected` 时，即可使用以 `mcp__browserpilot__` 开头的浏览器工具。

插件默认通过下列标准输入输出 MCP 命令连接 BrowserPilot：

```bash
npx -y @puxora/browserpilot mcp
```

## DSH 设置与权限

在 **设置 → BrowserPilot** 中可配置以下策略：

| 类别 | 默认值 | 作用范围 |
| --- | --- | --- |
| 启用浏览器工具 | 开启 | 关闭后，DSH 不会调用任何 BrowserPilot 工具。 |
| 只读操作 | 允许 | 标签页、页面状态、DOM 观察和截图。 |
| 网页交互 | 由 BrowserPilot 确认 | 导航、点击、输入、按键、滚动和选择。 |
| 敏感操作 | 禁止 | 上传、下载、脚本、Cookie 与凭据相关操作。 |

「由 BrowserPilot 确认」不会绕过安全流程：最终授权仍由本机 BrowserPilot 扩展完成。关闭总开关或将类别设置为「禁止」时，DSH 会在 MCP 调用前阻断请求。

## 管理面板

设置页底部的 **打开管理面板** 会在新标签页打开：

```text
http://127.0.0.1:9876/
```

该面板属于 BrowserPilot，可查看连接、任务、日志、审批和浏览器策略。无法访问时，请确认 BrowserPilot daemon 正在运行，且未更改默认端口。

## 工作原理

```text
DSH Agent
   │
   ├── BrowserPilot DSH Host 插件 ── stdio MCP ── BrowserPilot daemon
   │                                               │
   │                                               └── Chrome 扩展 ── Chrome 标签页
   │
   └── BrowserPilot DSH Web 设置页 ── 权限校验 / 管理面板入口
```

DSH 加载时，插件立即注册设置页与 `browserpilot_status`；随后才在后台启动 MCP、握手并读取工具列表。因此 DSH Web 不会等待 `npx`、daemon 启动或 MCP 握手完成才开始监听。连接握手默认超时为 12 秒，单次工具调用默认超时为 60 秒。

## 常见问题

### Agent 看不到 BrowserPilot 工具

先调用 `browserpilot_status`。若状态不是 `connected`，请检查：BrowserPilot 是否已安装、Chrome 扩展是否显示已连接，以及下列命令能否在本机运行：

```bash
npx -y @puxora/browserpilot mcp
```

### 管理面板无法打开

检查 [http://127.0.0.1:9876/](http://127.0.0.1:9876/) 是否可访问。daemon 未启动或使用了自定义端口时，面板不会显示。

### 设置页仍显示旧版本

本地 `file:` 依赖可能被包管理器缓存。重新安装 profile 依赖，重启 `dsh web`，再刷新浏览器。

## 开发与测试

```bash
npm install
npm run check
npm test
```

测试覆盖后台连接延迟、连接超时、设置规范化、权限拦截、工具注册和状态输出。

## 发布与许可证

npm 包发布后，用户可使用 `dsh plugin --profile web add @puxora/dsh-browserpilot@latest` 安装。发布前请确认版本号、npm scope 权限、DSH 兼容性和 BrowserPilot 的端到端联调结果。

本项目采用 [MIT License](LICENSE)。
