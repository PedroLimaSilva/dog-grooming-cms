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
  onclick: () => void | Promise<void>
}

export type TopNavConfig = {
  title?: string
  action?: TopNavAction
  onSave?: () => void | Promise<void>
  saving?: boolean
  overflow?: OverflowAction[]
}

const defaultTopNavConfig: Required<TopNavConfig> = {
  title: '',
  action: undefined as never,
  onSave: undefined as never,
  saving: false,
  overflow: [],
}

export const topNavConfig = writable<TopNavConfig>(defaultTopNavConfig)

export function setTopNav(config: TopNavConfig): () => void {
  topNavConfig.set({
    title: config.title ?? '',
    action: config.action,
    onSave: config.onSave,
    saving: config.saving ?? false,
    overflow: config.overflow ?? [],
  })
  return resetTopNav
}

export function resetTopNav(): void {
  topNavConfig.set(defaultTopNavConfig)
}
