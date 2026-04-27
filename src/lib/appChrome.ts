import { writable } from 'svelte/store'

/** When set, replaces the route-derived title in the app top bar (e.g. loaded entity name). */
export const appChromeTitleOverride = writable<string | null>(null)

export function setAppChromeTitle(title: string | null): void {
  appChromeTitleOverride.set(title)
}

/** Detail screens register overflow actions (e.g. delete) for the app chrome menu. */
export type TopOverflowDelegate = { onDelete?: () => void }

export const topOverflowDelegate = writable<TopOverflowDelegate | null>(null)

export function setTopOverflowDelegate(delegate: TopOverflowDelegate | null): void {
  topOverflowDelegate.set(delegate)
}

let calendarCreateHandler: (() => void) | null = null

/** Calendar view registers opening the "new appointment" flow from the app bar. */
export function setCalendarCreateHandler(fn: (() => void) | null): void {
  calendarCreateHandler = fn
}

export function triggerCalendarCreate(): void {
  calendarCreateHandler?.()
}
