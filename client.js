window.__ModuleLoader__.load({
  id: '@puxora/dsh-browserpilot',
  factory: require => {
    const React = require('react')
    const h = React.createElement
    const inject = ['slots', 'settingsScope']
    const NAMESPACE = 'browserpilot'
    const DASHBOARD_URL = 'http://127.0.0.1:9876/'
    const COPY = {
      title: 'BrowserPilot',
      summary: '让 Agent 在明确权限范围内使用本机 Chrome；网页确认仍由 BrowserPilot 扩展完成。',
      loading: '正在读取 BrowserPilot 配置…',
      disabled: '当前账号没有修改这些设置的权限。',
      enabled: '启用浏览器工具',
      enabledDesc: '关闭后，DSH 不会调用任何 BrowserPilot 浏览器工具。',
      localPermissionTitle: 'DSH 额外限制',
      localPermissionHint: '这里只能进一步限制 DSH，不会放宽 BrowserPilot 全局安全策略。',
      read: '只读操作',
      readDesc: '标签页、页面状态、DOM 观察和截图，不改动网页内容。',
      interaction: '网页交互',
      interactionDesc: '导航、点击、输入、按键、滚动和选项选择。',
      sensitive: '敏感操作',
      sensitiveDesc: '上传、下载、脚本、Cookie 和凭据相关操作。',
      inherit: '遵循全局策略',
      deny: 'DSH 内禁止',
      globalTitle: 'BrowserPilot 全局安全策略',
      globalHint: '修改后写入本机 BrowserPilot，并影响 Codex、DSH 及其他 BrowserPilot 客户端。',
      globalUnavailable: '暂时无法连接 BrowserPilot 全局设置，已禁用修改。请确认 daemon 正在运行。',
      approval: '自动化写操作',
      approvalDesc: '控制点击、输入、关闭标签页和页面脚本等写操作是否需要审批。',
      approvalAlways: '每次询问审批',
      approvalNone: '直接运行不审批',
      cdp: '页面 JavaScript 开发者权限',
      cdpDesc: '允许 Agent 在网页上下文执行 JavaScript；仅应在受信任站点开启。',
      download: '文件下载权限',
      downloadDesc: '控制 BrowserPilot 已接管标签页触发的下载。',
      upload: '文件上传权限',
      uploadDesc: '控制 BrowserPilot 是否允许打开网页文件选择器。',
      transferAlways: '始终允许',
      transferAsk: '每次询问',
      transferNone: '严格禁止',
      safetyTitle: '安全与连接',
      safetyBody: '全局权限由 BrowserPilot daemon 统一执行；API Token 和浏览器凭据只在 DSH Host 端使用，不会发送到此页面。',
      statusBody: '需要排查连接时，在聊天中调用 browserpilot_status；它会返回连接状态和已注册工具数量。',
      openDashboard: '打开管理面板',
    }
    const LOCAL_MODES = [
      { value: 'allow', label: COPY.inherit },
      { value: 'deny', label: COPY.deny },
    ]
    const APPROVAL_MODES = [
      { value: 'always', label: COPY.approvalAlways },
      { value: 'none', label: COPY.approvalNone },
    ]
    const TRANSFER_MODES = [
      { value: 'always', label: COPY.transferAlways },
      { value: 'ask', label: COPY.transferAsk },
      { value: 'none', label: COPY.transferNone },
    ]

    function BrowserPilotSettings({ scope }) {
      const snapshot = React.useSyncExternalStore(
        listener => scope.subscribe(listener),
        () => scope.getSnapshot(),
      )
      const value = snapshot.value || {}
      const writable = snapshot.writable === true
      const busy = snapshot.status !== 'ready' || snapshot.value === undefined
      if (busy) return h('p', { style: mutedStyle() }, COPY.loading)

      const enabled = value.enabled !== false
      const globalAvailable = value.globalSettingsAvailable === true
      return h('div', { style: pageStyle() },
        h('header', { style: headerStyle() },
          h('h2', { style: titleStyle() }, COPY.title),
          h('p', { style: mutedStyle({ margin: '6px 0 0' }) }, COPY.summary),
        ),
        !writable ? h('p', { style: noticeStyle() }, COPY.disabled) : null,
        h('section', { style: primaryPanelStyle() },
          h('div', { style: primaryCopyStyle() },
            h('strong', { style: sectionTitleStyle() }, COPY.enabled),
            h('p', { style: mutedStyle({ margin: '5px 0 0' }) }, COPY.enabledDesc),
          ),
          h('input', {
            type: 'checkbox', checked: enabled, disabled: !writable, 'aria-label': COPY.enabled,
            style: toggleStyle(), onChange: event => void scope.set('enabled', event.target.checked),
          }),
        ),
        h('section', { style: permissionsPanelStyle() },
          h('div', { style: sectionHeaderStyle() },
            h('strong', { style: sectionTitleStyle() }, COPY.globalTitle),
            h('span', { style: mutedStyle() }, COPY.globalHint),
          ),
          !globalAvailable ? h('p', { style: syncNoticeStyle() }, COPY.globalUnavailable) : null,
          h(PermissionField, {
            scope, writable: writable && globalAvailable, field: 'globalApproval',
            value: enumValue(value.globalApproval, ['always', 'none'], 'always'), modes: APPROVAL_MODES,
            label: COPY.approval, description: COPY.approvalDesc,
          }),
          h(BooleanField, {
            scope, writable: writable && globalAvailable, field: 'globalCdpEnabled',
            value: value.globalCdpEnabled === true, label: COPY.cdp, description: COPY.cdpDesc,
          }),
          h(PermissionField, {
            scope, writable: writable && globalAvailable, field: 'globalDownload',
            value: enumValue(value.globalDownload, ['always', 'ask', 'none'], 'ask'), modes: TRANSFER_MODES,
            label: COPY.download, description: COPY.downloadDesc,
          }),
          h(PermissionField, {
            scope, writable: writable && globalAvailable, field: 'globalUpload',
            value: enumValue(value.globalUpload, ['always', 'ask', 'none'], 'ask'), modes: TRANSFER_MODES,
            label: COPY.upload, description: COPY.uploadDesc, last: true,
          }),
        ),
        h('section', { style: permissionsPanelStyle() },
          h('div', { style: sectionHeaderStyle() },
            h('strong', { style: sectionTitleStyle() }, COPY.localPermissionTitle),
            h('span', { style: mutedStyle() }, COPY.localPermissionHint),
          ),
          h(PermissionField, { scope, writable, field: 'readAccess', value: localModeValue(value.readAccess), modes: LOCAL_MODES, label: COPY.read, description: COPY.readDesc }),
          h(PermissionField, { scope, writable, field: 'interactionAccess', value: localModeValue(value.interactionAccess), modes: LOCAL_MODES, label: COPY.interaction, description: COPY.interactionDesc }),
          h(PermissionField, { scope, writable, field: 'sensitiveAccess', value: localModeValue(value.sensitiveAccess), modes: LOCAL_MODES, label: COPY.sensitive, description: COPY.sensitiveDesc, last: true }),
        ),
        h('section', { style: guidanceStyle() },
          h('strong', { style: sectionTitleStyle() }, COPY.safetyTitle),
          h('p', { style: mutedStyle({ margin: '6px 0 0' }) }, COPY.safetyBody),
          h('p', { style: mutedStyle({ margin: '8px 0 0' }) }, COPY.statusBody),
          h('button', {
            type: 'button', style: dashboardButtonStyle(), onClick: openDashboard,
          }, COPY.openDashboard),
        ),
      )
    }

    function PermissionField({ scope, writable, field, value, modes, label, description, last = false }) {
      return h('label', { style: permissionRowStyle(last), 'data-settings-item': field },
        h('span', { style: permissionCopyStyle() },
          h('strong', { style: sectionTitleStyle() }, label),
          h('small', { style: mutedStyle({ marginTop: '4px' }) }, description),
        ),
        h('select', {
          value, disabled: !writable, style: selectStyle(),
          onChange: event => void scope.set(field, event.target.value),
        }, modes.map(mode => h('option', { key: mode.value, value: mode.value }, mode.label))),
      )
    }

    function BooleanField({ scope, writable, field, value, label, description }) {
      return h('label', { style: permissionRowStyle(false), 'data-settings-item': field },
        h('span', { style: permissionCopyStyle() },
          h('strong', { style: sectionTitleStyle() }, label),
          h('small', { style: mutedStyle({ marginTop: '4px' }) }, description),
        ),
        h('input', {
          type: 'checkbox', checked: value, disabled: !writable, 'aria-label': label,
          style: toggleStyle(), onChange: event => void scope.set(field, event.target.checked),
        }),
      )
    }

    function localModeValue(value) {
      return value === 'deny' ? 'deny' : 'allow'
    }

    function enumValue(value, allowed, fallback) {
      return allowed.includes(value) ? value : fallback
    }

    function pageStyle() {
      return { display: 'grid', gap: '14px', color: 'var(--dsw-alias-label-primary)' }
    }

    function headerStyle() {
      return { display: 'grid', gap: '6px' }
    }

    function titleStyle() {
      return { margin: 0, fontSize: '20px', lineHeight: 1.25, letterSpacing: '-0.01em' }
    }

    function primaryPanelStyle() {
      return {
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '20px',
        padding: '18px', border: '1px solid var(--dsw-alias-border-l2)', borderRadius: '14px',
        background: 'var(--dsw-alias-bg-layer-1)',
      }
    }

    function primaryCopyStyle() {
      return { minWidth: 0 }
    }

    function permissionsPanelStyle() {
      return {
        border: '1px solid var(--dsw-alias-border-l2)', borderRadius: '14px',
        background: 'var(--dsw-alias-bg-layer-1)', overflow: 'hidden',
      }
    }

    function sectionHeaderStyle() {
      return { display: 'grid', gap: '4px', padding: '17px 18px 11px' }
    }

    function permissionRowStyle(last) {
      return {
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '18px',
        padding: '15px 18px', borderBottom: last ? 'none' : '1px solid var(--dsw-alias-border-l2)',
      }
    }

    function permissionCopyStyle() {
      return { display: 'grid', minWidth: 0 }
    }

    function guidanceStyle() {
      return {
        padding: '15px 18px', borderRadius: '14px', border: '1px solid var(--dsw-alias-border-l2)',
        background: 'var(--dsw-alias-bg-layer-2)',
      }
    }

    function dashboardButtonStyle() {
      return {
        width: '100%', marginTop: '14px', minHeight: '38px', padding: '0 14px',
        font: 'inherit', fontWeight: 600, color: 'var(--dsw-alias-brand-on-brand)',
        background: 'var(--dsw-alias-brand)', border: '1px solid var(--dsw-alias-brand)', borderRadius: '9px', cursor: 'pointer',
      }
    }

    function sectionTitleStyle() {
      return { fontWeight: 600, lineHeight: 1.4 }
    }

    function mutedStyle(extra = {}) {
      return { display: 'block', color: 'var(--dsw-alias-label-secondary)', lineHeight: 1.5, ...extra }
    }

    function noticeStyle() {
      return { margin: 0, color: 'var(--dsw-alias-label-secondary)' }
    }

    function syncNoticeStyle() {
      return {
        margin: '0 18px 8px', padding: '10px 12px', borderRadius: '9px',
        color: 'var(--dsw-alias-label-secondary)', background: 'var(--dsw-alias-bg-layer-2)', lineHeight: 1.5,
      }
    }

    function toggleStyle() {
      return { flex: '0 0 auto', width: '18px', height: '18px', margin: 0, accentColor: 'var(--dsw-alias-brand)' }
    }

    function selectStyle() {
      return {
        flex: '0 0 188px', height: '36px', padding: '0 10px', font: 'inherit',
        color: 'var(--dsw-alias-label-primary)', background: 'var(--dsw-specific-input-major)',
        border: '1px solid var(--dsw-alias-border-l2)', borderRadius: '9px',
      }
    }

    function openDashboard() {
      window.open(DASHBOARD_URL, '_blank', 'noopener,noreferrer')
    }

    function apply(ctx) {
      const scope = ctx.settingsScope.bind({ namespace: NAMESPACE })
      const registration = { inject: () => ({ scope }) }
      ctx.slots.inject('settings.section', () => ctx.slots.register({
        name: 'settings.section', id: NAMESPACE, order: 150, label: 'BrowserPilot', ...registration,
      }, BrowserPilotSettings))
    }

    return { inject, apply }
  },
})
