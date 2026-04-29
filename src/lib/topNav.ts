import { writable } from 'svelte/store'

export type OverflowAction = {
  label: string
  href?: string
  external?: boolean
  onclick?: () => void | Promise<void>
  danger?: boolean
}

export type TopNavAction = {
  label: string
  ariaLabel?: string
  icon?: 'chevron-left' | 'chevron-right'
  variant?: 'icon' | 'label'
  onclick: () => void | Promise<void>
}

export type TopNavConfig = {
  title?: string
  action?: TopNavAction
  actions?: TopNavAction[]
  onSave?: () => void | Promise<void>
  saving?: boolean
  overflow?: OverflowAction[]
}

const defaultTopNavConfig: TopNavConfig = {
  title: '',
  saving: false,
  actions: [],
  overflow: [],
}

export const topNavConfig = writable<TopNavConfig>(defaultTopNavConfig)

export function setTopNav(config: TopNavConfig): () => void {
  topNavConfig.set({
    title: config.title ?? '',
    action: config.action,
    actions: config.actions ?? (config.action ? [config.action] : []),
    onSave: config.onSave,
    saving: config.saving ?? false,
    overflow: config.overflow ?? [],
  })
  return resetTopNav
}

export function resetTopNav(): void {
  topNavConfig.set(defaultTopNavConfig)
}
