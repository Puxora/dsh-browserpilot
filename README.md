# @puxora/dsh-browserpilot

将 [BrowserPilot](https://github.com/Puxora/BrowserPilot) 的本机 Chrome 自动化能力接入 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness)。

它是一个独立的 DSH 双端插件：Host 端启动 BrowserPilot 的标准输入输出 MCP 服务并把工具注册到 DSH；Web 端在设置对话框添加 **BrowserPilot** 侧栏项（同时提供“插件”页配置卡兼容路径）。

## 前置条件

- Node.js 18 或更高版本；
- 已完成 BrowserPilot 的安装与 Chrome 扩展连接；
- DeepSeek Harness `0.1.0-rc.7` 或兼容版本。

BrowserPilot 本身负责本机浏览器连接、标签页占用及网页交互确认；本插件不会保存它的令牌、Cookie 或浏览器凭据。

## 本地开发安装

在 DSH Web profile 所在项目中安装此包，随后重新启动 DSH Web：

```bash
pnpm add github:Puxora/dsh-browserpilot
npx @deepseek-ai/dsh web
```

`cordis.patch.yml` 会自动插入 Host 插件 entry。开发阶段也可以将这个仓库通过 `file:` 依赖安装到 DSH profile。

默认会执行：

```bash
npx -y @puxora/browserpilot mcp
```

如需替换 BrowserPilot 的启动方式，可在 DSH 的 `cordis.yml` 中覆盖此 entry 的 `config`：

```yaml
- id: browserpilot
  name: '@puxora/dsh-browserpilot'
  config:
    command: npx
    args: ['-y', '@puxora/browserpilot', 'mcp']
    connectTimeoutMs: 12000
    toolCallTimeoutMs: 60000
```

不要在这里填写访问令牌；令牌应继续由 BrowserPilot 自己的安全配置管理。

## 接入与启动行为

DSH 加载插件时只完成设置注册和 `browserpilot_status` 工具注册；BrowserPilot MCP 的启动会被放到下一轮事件循环中执行，因此不会等待 `npx`、MCP 握手或工具列表读取后才绑定 DSH Web 服务。

后台连接通过标准输入输出协议执行三步：启动 `@puxora/browserpilot mcp`、MCP 握手、读取工具列表。成功后才把工具以 `mcp__browserpilot__` 前缀注册到 DSH。连接中的重复请求会复用同一个任务；握手或工具列表在 `connectTimeoutMs`（默认 12 秒）内没有完成时，会关闭子连接并保留可诊断的失败状态。单次浏览器工具调用另受 `toolCallTimeoutMs`（默认 60 秒）限制。

## 设置与安全策略

在 DSH 的“设置 → BrowserPilot”中可控制三类工具：

| 类别 | 默认值 | 范围 |
| --- | --- | --- |
| 只读操作 | 允许 | 标签页、页面状态、DOM 观察、截图 |
| 网页交互 | 由 BrowserPilot 询问 | 导航、点击、输入、滚动、选择 |
| 敏感操作 | 禁止 | 上传、下载、脚本、Cookie/凭据相关操作 |

“由 BrowserPilot 询问”并不绕过确认：最终授权仍由 BrowserPilot 的本机浏览器扩展完成。关闭总开关或将类别设为“禁止”时，DSH 会在 MCP 调用前直接阻断。

## 工具命名和诊断

BrowserPilot MCP 工具以 `mcp__browserpilot__` 为前缀注册，避免与其他 DSH/MCP 浏览器工具冲突。例如 `browser_list_tabs` 会呈现为 `mcp__browserpilot__browser_list_tabs`。

在聊天中调用 `browserpilot_status` 可以检查连接状态，并在断开时尝试重连。

## 发布准备

发布到 `Puxora/dsh-browserpilot` 后，建议：

1. 打上语义化版本标签并发布 npm 包；
2. 在 GitHub 仓库添加 `dsh-plugin` topic；
3. 在 README 中保留与 DSH、BrowserPilot 的版本兼容矩阵；
4. 以 DSH 社区当时公布的渠道提交插件信息。DeepSeek Harness 仍处于开发预览阶段，发布前应重新核对其最新的插件市场规则。
