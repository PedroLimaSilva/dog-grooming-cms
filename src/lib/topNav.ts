import { writable } from 'svelte/store'

export type OverflowAction = {
  label: string
  href?: string
  external?: boolean
  onclick?: () => void | Promise<void>
  danger?: boolean
}

export type TopNavConfig = {
  title?: string
  onSave?: () => void | Promise<void>
  saving?: boolean
  overflow?: OverflowAction[]
}

const defaultTopNavConfig: Required<TopNavConfig> = {
  title: '',
  onSave: undefined as never,
  saving: false,
  overflow: [],
}

export const topNavConfig = writable<TopNavConfig>(defaultTopNavConfig)

export function setTopNav(config: TopNavConfig): () => void {
  topNavConfig.set({
    title: config.title ?? '',
    onSave: config.onSave,
    saving: config.saving ?? false,
    overflow: config.overflow ?? [],
  })
  return resetTopNav
}

export function resetTopNav(): void {
  topNavConfig.set(defaultTopNavConfig)
}
