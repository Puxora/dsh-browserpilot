# BrowserPilot for DeepSeek Harness

[简体中文](README.md) · [BrowserPilot](https://github.com/Puxora/BrowserPilot) · [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness)

> Use local Chrome safely from DeepSeek Harness (DSH), while keeping final web confirmation in the BrowserPilot browser extension.

`@puxora/dsh-browserpilot` is BrowserPilot's standalone dual-sided DSH plugin. The Host side exposes BrowserPilot MCP tools to the agent; the Web side provides a dedicated settings page, permission policies, and a dashboard button.

## Contents

- [Highlights](#highlights)
- [Prerequisites](#prerequisites)
- [Complete tutorial](#complete-tutorial)
- [DSH settings and permissions](#dsh-settings-and-permissions)
- [Dashboard](#dashboard)
- [How it works](#how-it-works)
- [Troubleshooting](#troubleshooting)
- [Development and tests](#development-and-tests)
- [Release and license](#release-and-license)

## Highlights

| Capability | Description |
| --- | --- |
| Local Chrome control | Lets DSH agents control the user's local Chrome through BrowserPilot. |
| Tiered permissions | Independently govern read-only, web-interaction, and sensitive operations. |
| Local final approval | Interactions requiring approval still complete in the BrowserPilot Chrome extension. |
| Connection diagnostics | Use `browserpilot_status` to inspect the MCP state and registered tool count. |
| Dashboard entry point | Open the local BrowserPilot dashboard directly from DSH settings. |

## Prerequisites

- Node.js 18 or later;
- A working DeepSeek Harness Web profile;
- Google Chrome;
- Permission to install an extension for the current Chrome profile.

BrowserPilot owns browser connectivity, tab ownership, tokens, and web confirmation. This plugin does not store tokens, cookies, or browser credentials in DSH.

## Complete tutorial

### 1. Install BrowserPilot and register the local bridge

Run in PowerShell or a terminal:

```bash
npm install -g @puxora/browserpilot
browserpilot install
```

`browserpilot install` registers the Chrome Native Messaging Host for the current Windows user. Keep the `chrome-extension` directory printed by the command; you will select it in the next step.

### 2. Install the BrowserPilot Chrome extension

1. Open `chrome://extensions` in Chrome.
2. Turn on **Developer mode**.
3. Select **Load unpacked**.
4. Choose the `chrome-extension` directory reported by `browserpilot install`.
5. Pin and open the BrowserPilot extension, then confirm that it reports a connected state.

> This step is required. The DSH plugin provides MCP integration and policies, while the BrowserPilot extension connects to and controls real Chrome tabs.

### 3. Start and check BrowserPilot

```bash
browserpilot start
browserpilot status
```

The default dashboard is [http://127.0.0.1:9876/](http://127.0.0.1:9876/). The first visit from a local browser creates a loopback-only authentication cookie.

Use this command when you need live logs:

```bash
browserpilot start --foreground
```

### 4. Install the DSH plugin

#### Production installation (after npm publication)

Run this where the `dsh` command is available:

```bash
dsh plugin --profile web add @puxora/dsh-browserpilot@latest
dsh web
```

When running from the DeepSeek Harness source checkout, use:

```bash
pnpm dsh plugin --profile web add @puxora/dsh-browserpilot@latest
pnpm dsh web
```

> `@latest` becomes available after publication to the public npm registry. Use local development installation before publication.

#### Local development installation

```bash
pnpm dsh plugin --profile web add file:G:/github/dsh-browserpilot
pnpm dsh web
```

Replace the example with your local repository path. After changing plugin code, reinstall the `file:` dependency, restart DSH, and refresh the browser to load the new version.

### 5. Verify the connection in DSH

1. Open **Settings → BrowserPilot**.
2. Ensure **Enable browser tools** is on.
3. Call `browserpilot_status` in chat.
4. When its status is `connected`, the agent can use browser tools prefixed with `mcp__browserpilot__`.

The plugin creates its stdio MCP connection with:

```bash
npx -y @puxora/browserpilot mcp
```

## DSH settings and permissions

Configure these options in **Settings → BrowserPilot**:

| Category | Default | Scope |
| --- | --- | --- |
| Enable browser tools | On | When off, DSH does not call BrowserPilot tools. |
| Read-only operations | Allow | Tabs, page state, DOM observation, and screenshots. |
| Web interaction | Ask BrowserPilot | Navigation, clicks, typing, key presses, scrolling, and selections. |
| Sensitive operations | Deny | Uploads, downloads, scripts, cookies, and credential-related operations. |

**Ask BrowserPilot** never bypasses the safety flow. Final approval still occurs in the local BrowserPilot extension. Disabling the master switch or selecting **Deny** blocks the request before an MCP call is made.

## Dashboard

The **Open dashboard** button at the bottom of the settings page opens this address in a new tab:

```text
http://127.0.0.1:9876/
```

The dashboard belongs to BrowserPilot and shows connections, tasks, logs, approvals, and browser policies. If it is unavailable, make sure the BrowserPilot daemon is running and that the default port was not changed.

## How it works

```text
DSH Agent
   │
   ├── BrowserPilot DSH Host plugin ── stdio MCP ── BrowserPilot daemon
   │                                               │
   │                                               └── Chrome extension ── Chrome tabs
   │
   └── BrowserPilot DSH Web settings ── permission checks / dashboard entry point
```

At DSH startup, the plugin immediately registers its settings page and `browserpilot_status`. MCP startup, handshake, and tool discovery then run in the background. DSH Web does not wait for `npx`, daemon startup, or MCP handshake before it begins listening. The connection handshake defaults to 12 seconds; individual tool calls default to 60 seconds.

## Troubleshooting

### The agent cannot see BrowserPilot tools

Call `browserpilot_status`. If it is not `connected`, check that BrowserPilot is installed, the Chrome extension is connected, and this command can run locally:

```bash
npx -y @puxora/browserpilot mcp
```

### The dashboard does not open

Check whether [http://127.0.0.1:9876/](http://127.0.0.1:9876/) is reachable. The dashboard is unavailable when the daemon is stopped or configured with a custom port.

### The settings page still shows an old version

Local `file:` dependencies can be cached by the package manager. Reinstall the profile dependency, restart `dsh web`, and refresh the browser.

## Development and tests

```bash
npm install
npm run check
npm test
```

The test suite covers deferred background connection, timeout handling, settings normalization, policy enforcement, tool registration, and status output.

## Release and license

After the npm package is published, users can install it with `dsh plugin --profile web add @puxora/dsh-browserpilot@latest`. Before release, verify the version number, npm scope access, DSH compatibility, and BrowserPilot end-to-end integration.

Licensed under the [MIT License](LICENSE).
