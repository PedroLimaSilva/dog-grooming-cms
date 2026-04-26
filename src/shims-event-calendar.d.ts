declare module '@event-calendar/core' {
  export const Calendar: import('svelte').Component<{
    plugins?: unknown[]
    options?: Record<string, unknown>
  }>

  export const DayGrid: unknown
  export const TimeGrid: unknown
  export const Interaction: unknown
  export const List: unknown
  export const ResourceTimeGrid: unknown
  export const ResourceTimeline: unknown
}

declare module '@event-calendar/core/index.css'
