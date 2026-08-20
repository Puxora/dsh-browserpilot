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
      permissionTitle: '权限策略',
      permissionHint: '这些策略在每一次工具调用前校验。',
      read: '只读操作',
      readDesc: '标签页、页面状态、DOM 观察和截图，不改动网页内容。',
      interaction: '网页交互',
      interactionDesc: '导航、点击、输入、按键、滚动和选项选择。',
      sensitive: '敏感操作',
      sensitiveDesc: '上传、下载、脚本、Cookie 和凭据相关操作。',
      allow: '允许',
      ask: '由 BrowserPilot 确认',
      deny: '禁止',
      safetyTitle: '安全与连接',
      safetyBody: '选择“由 BrowserPilot 确认”时，最终确认会交给本机浏览器扩展；令牌和浏览器凭据不会存入 DSH。',
      statusBody: '需要排查连接时，在聊天中调用 browserpilot_status；它会返回连接状态和已注册工具数量。',
      openDashboard: '打开管理面板',
    }
    const MODES = [
      { value: 'allow', label: COPY.allow },
      { value: 'ask', label: COPY.ask },
      { value: 'deny', label: COPY.deny },
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
            h('strong', { style: sectionTitleStyle() }, COPY.permissionTitle),
            h('span', { style: mutedStyle() }, COPY.permissionHint),
          ),
          h(PermissionField, { scope, writable, field: 'readAccess', value: modeValue(value.readAccess, 'allow'), label: COPY.read, description: COPY.readDesc }),
          h(PermissionField, { scope, writable, field: 'interactionAccess', value: modeValue(value.interactionAccess, 'ask'), label: COPY.interaction, description: COPY.interactionDesc }),
          h(PermissionField, { scope, writable, field: 'sensitiveAccess', value: modeValue(value.sensitiveAccess, 'deny'), label: COPY.sensitive, description: COPY.sensitiveDesc, last: true }),
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

    function PermissionField({ scope, writable, field, value, label, description, last = false }) {
      return h('label', { style: permissionRowStyle(last), 'data-settings-item': field },
        h('span', { style: permissionCopyStyle() },
          h('strong', { style: sectionTitleStyle() }, label),
          h('small', { style: mutedStyle({ marginTop: '4px' }) }, description),
        ),
        h('select', {
          value, disabled: !writable, style: selectStyle(),
          onChange: event => void scope.set(field, event.target.value),
        }, MODES.map(mode => h('option', { key: mode.value, value: mode.value }, mode.label))),
      )
    }

    function modeValue(value, fallback) {
      return ['allow', 'ask', 'deny'].includes(value) ? value : fallback
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
