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

### 6. Uninstall BrowserPilot and the DSH integration

The DSH plugin starts BrowserPilot MCP through `npx`. Removing only the BrowserPilot npm package leaves the DSH plugin installed but disconnected; removing only the DSH plugin leaves Chrome Native Messaging configuration and bridge files behind. Clean up in this order:

1. Stop DSH, then disable or remove `@puxora/dsh-browserpilot` using the plugin management flow of the environment where it was installed.
2. In the terminal where BrowserPilot is installed, run:

   ```bash
   browserpilot uninstall
   npm uninstall -g @puxora/browserpilot
   ```

3. Open `chrome://extensions` and remove the BrowserPilot extension manually.

`browserpilot uninstall` stops the daemon and removes BrowserPilot-created Native Messaging manifests, Chrome registry entries, and bridge files. It retains configuration, Tokens, tasks, and logs under `~/.browserpilot` by default. Run `browserpilot uninstall --purge` only when you have confirmed that this local data is no longer needed.

## DSH settings and permissions

**Settings → BrowserPilot** edits BrowserPilot's real global security policy. The DSH Host reads and writes these values with the local API Token. They share `~/.browserpilot/settings.json` with the BrowserPilot dashboard and affect Codex, DSH, and every other BrowserPilot client:

| Global policy | Default | Scope |
| --- | --- | --- |
| Automated writes | Ask every time | Clicks, typing, closing tabs, page scripts, and other writes. |
| Page JavaScript | Off | Whether agents may execute JavaScript in the page context. |
| Downloads | Ask every time | Downloads triggered by BrowserPilot-controlled tabs. |
| Uploads | Ask every time | Whether the web file picker may be opened. |

Site-specific exceptions remain in the BrowserPilot dashboard; updating the fields above does not overwrite those rules. The daemon enforces the final policy, and the DSH browser page never receives the API Token.

DSH also keeps an additional restriction layer that affects only this DSH installation:

| DSH-local policy | Default | Scope |
| --- | --- | --- |
| Enable browser tools | On | When off, DSH does not call BrowserPilot tools. |
| Read-only operations | Follow global policy | May be changed to **Deny in DSH**. |
| Web interaction | Follow global policy | May be changed to **Deny in DSH**. |
| Sensitive operations | Deny in DSH | Uploads, downloads, scripts, cookies, and credential-related operations. |

DSH-local policy can only restrict the global policy, never relax it. The plugin synchronizes global values every three seconds; global controls become read-only while the daemon is unavailable.

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
   └── BrowserPilot DSH Web settings ── DSH settings scope ── Host global-policy sync
```

At DSH startup, the plugin immediately registers its settings page and `browserpilot_status`. MCP startup, handshake, tool discovery, and authenticated global-policy synchronization then run in the background. DSH Web does not wait for `npx`, daemon startup, or MCP handshake before it begins listening. The connection handshake defaults to 12 seconds; individual tool calls default to 60 seconds.

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
