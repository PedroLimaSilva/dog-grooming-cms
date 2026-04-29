<script lang="ts">
  import { Calendar, DayGrid, Interaction, TimeGrid } from '@event-calendar/core'
  import '@event-calendar/core/index.css'
  import { liveQuery } from 'dexie'
  import { onMount, tick } from 'svelte'
  import AppointmentFormModal from '../components/AppointmentFormModal.svelte'
  import MoveAppointmentSheet from '../components/MoveAppointmentSheet.svelte'
  import type { AppointmentRecord, DogRecord, OwnerRecord } from '../db'
  import { db, updateAppointmentTimes } from '../db'
  import { resetTopNav, setTopNav } from '../lib/topNav'

  const plugins = [DayGrid, TimeGrid, Interaction]

  type CalendarViewMode = 'timeGridDay' | 'timeGridWeek' | 'monthList'
  type Cal = {
    next: () => void
    prev: () => void
    unselect: () => void
    setOption: (name: string, value: unknown) => unknown
  }
  type DatesSetInfo = {
    start: Date
    end: Date
    view: { type: string; title?: string }
  }
  type MonthSection = {
    key: string
    label: string
    days: Date[]
  }

  /** Event Calendar instance; typed loosely because the package has no TS exports. */
  let calendarInst = $state<unknown>()
  const calendar = (): Cal | undefined => calendarInst as Cal | undefined
  let appointments = $state<AppointmentRecord[]>([])
  let dogs = $state<DogRecord[]>([])
  let owners = $state<OwnerRecord[]>([])

  let createOpen = $state(false)
  let createStart = $state(new Date())
  let createEnd = $state(new Date())
  let moveFor = $state<AppointmentRecord | null>(null)
  let viewMode = $state<CalendarViewMode>('timeGridWeek')
  let calendarDate = $state(new Date())
  let topTitle = $state(monthTitle(new Date()))
  let monthScroller = $state<HTMLDivElement>()
  let relevantMonthKey = $state(monthKey(new Date()))

  onMount(() => {
    const s1 = liveQuery(() => db.appointments.toArray()).subscribe({
      next: (v) => {
        appointments = v
      },
    })
    const s2 = liveQuery(() => db.dogs.toArray()).subscribe({
      next: (v) => {
        dogs = v
      },
    })
    const s3 = liveQuery(() => db.owners.toArray()).subscribe({
      next: (v) => {
        owners = v
      },
    })
    return () => {
      s1.unsubscribe()
      s2.unsubscribe()
      s3.unsubscribe()
    }
  })

  onMount(() => {
    return () => resetTopNav()
  })

  function ownerById(id: number | undefined) {
    return owners.find((o) => o.id === id)
  }

  function dogById(id: number) {
    return dogs.find((d) => d.id === id)
  }

  function eventsFromState() {
    return appointments
      .filter((a) => a.id != null)
      .map((a) => {
        const dog = dogById(a.dogId)
        const owner = dog ? ownerById(dog.primaryOwnerId) : undefined
        const title = dog
          ? `${dog.name}${owner ? ` · ${owner.phone}` : ''}`
          : `Dog #${a.dogId}`
        return {
          id: String(a.id),
          title,
          start: new Date(a.start),
          end: new Date(a.end),
          extendedProps: { appointmentId: a.id },
        }
      })
  }

  function startOfMonth(date: Date) {
    return new Date(date.getFullYear(), date.getMonth(), 1)
  }

  function addMonths(date: Date, amount: number) {
    return new Date(date.getFullYear(), date.getMonth() + amount, 1)
  }

  function monthKey(date: Date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
  }

  function monthTitle(date: Date) {
    return new Intl.DateTimeFormat(undefined, { month: 'long' }).format(date)
  }

  function yearTitle(date: Date) {
    return new Intl.DateTimeFormat(undefined, { year: 'numeric' }).format(date)
  }

  function monthListTitle(date: Date) {
    return yearTitle(date)
  }

  function sameMonth(a: Date, b: Date) {
    return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth()
  }

  function appointmentMonthStart(appointment: AppointmentRecord) {
    return startOfMonth(new Date(appointment.start))
  }

  function earliestAppointmentMonth() {
    if (appointments.length === 0) return addMonths(startOfMonth(new Date()), -1)
    const previousMonth = addMonths(startOfMonth(new Date()), -1)
    return appointments.reduce((earliest, appointment) => {
      const candidate = appointmentMonthStart(appointment)
      return candidate < earliest ? candidate : earliest
    }, previousMonth)
  }

  function chooseRelevantMonth() {
    const today = startOfMonth(new Date())
    const futureAppointment = appointments
      .map(appointmentMonthStart)
      .filter((date) => date >= today)
      .sort((a, b) => a.getTime() - b.getTime())[0]
    return futureAppointment ?? today
  }

  const monthSections = $derived.by<MonthSection[]>(() => {
    const current = startOfMonth(new Date())
    const end = addMonths(current, 1)
    const start = earliestAppointmentMonth()
    const sections: MonthSection[] = []

    for (let cursor = start; cursor <= end; cursor = addMonths(cursor, 1)) {
      const firstDay = new Date(cursor)
      const days = Array.from(
        { length: new Date(firstDay.getFullYear(), firstDay.getMonth() + 1, 0).getDate() },
        (_, i) => new Date(firstDay.getFullYear(), firstDay.getMonth(), i + 1),
      )
      sections.push({
        key: monthKey(firstDay),
        label: new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' }).format(firstDay),
        days,
      })
    }

    return sections
  })

  function appointmentsForDay(day: Date) {
    return eventsFromState()
      .filter((event) => {
        const start = event.start
        return (
          start.getFullYear() === day.getFullYear() &&
          start.getMonth() === day.getMonth() &&
          start.getDate() === day.getDate()
        )
      })
      .sort((a, b) => a.start.getTime() - b.start.getTime())
  }

  function formattedTime(date: Date) {
    return new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(date)
  }

  function weekdayLetter(date: Date) {
    return new Intl.DateTimeFormat(undefined, { weekday: 'narrow' }).format(date)
  }

  function formatTimeGridHeaders() {
    if (typeof document === 'undefined') return
    const headers = document.querySelectorAll<HTMLTimeElement>('.ec-time-grid .ec-header .ec-col-head time')
    headers.forEach((header) => {
      const date = new Date(`${header.dateTime}T00:00:00`)
      if (Number.isNaN(date.getTime())) return
      header.replaceChildren()
      const weekday = document.createElement('span')
      weekday.className = 'calendar-day-weekday'
      weekday.textContent = weekdayLetter(date)
      const day = document.createElement('span')
      day.className = 'calendar-day-number'
      day.textContent = String(date.getDate())
      header.append(weekday, day)
    })
  }

  function queueHeaderFormatting() {
    void tick().then(() => requestAnimationFrame(formatTimeGridHeaders))
  }

  function updateViewMode(mode: CalendarViewMode) {
    viewMode = mode
    if (mode !== 'monthList') {
      calendar()?.setOption('view', mode)
      calendar()?.setOption('date', calendarDate)
      queueHeaderFormatting()
    } else {
      const relevant = chooseRelevantMonth()
      calendarDate = relevant
      relevantMonthKey = monthKey(relevant)
      topTitle = monthListTitle(relevant)
    }
  }

  function goToday() {
    const today = new Date()
    calendarDate = today
    if (viewMode === 'monthList') {
      relevantMonthKey = monthKey(today)
      topTitle = monthListTitle(today)
    } else {
      calendar()?.setOption('date', today)
      calendar()?.setOption('scrollTime', currentScrollTime())
      queueHeaderFormatting()
    }
  }

  function currentScrollTime() {
    const now = new Date()
    const hour = String(Math.max(now.getHours() - 1, 0)).padStart(2, '0')
    return `${hour}:00:00`
  }

  function datesSet(info: DatesSetInfo) {
    calendarDate = info.start
    if (info.view.type === 'timeGridWeek') {
      const middleOfWeek = new Date((info.start.getTime() + info.end.getTime()) / 2)
      topTitle = monthTitle(middleOfWeek)
    } else if (info.view.type === 'timeGridDay') {
      topTitle = monthTitle(info.start)
    }
    queueHeaderFormatting()
  }

  function openAppointment(id: string) {
    void db.appointments.get(Number(id)).then((a) => {
      moveFor = a ?? null
    })
  }

  let options = $state({
    view: 'timeGridWeek',
    height: '100%',
    events: [] as ReturnType<typeof eventsFromState>,
    editable: true,
    selectable: true,
    eventStartEditable: true,
    eventDurationEditable: true,
    longPressDelay: 280,
    eventLongPressDelay: 350,
    selectLongPressDelay: 350,
    slotMinTime: '07:00:00',
    slotMaxTime: '24:00:00',
    scrollTime: '09:00:00',
    slotLabelFormat: { hour: '2-digit', minute: '2-digit', hour12: false },
    allDaySlot: false,
    nowIndicator: true,
    headerToolbar: { start: '', center: '', end: '' },
    dayHeaderFormat: { weekday: 'narrow', day: 'numeric' },
    titleFormat: { month: 'long' },
    datesSet,
    select: (info: { start: Date; end: Date | null }) => {
      createStart = info.start
      createEnd = info.end ?? new Date(info.start.getTime() + 60 * 60 * 1000)
      createOpen = true
      calendar()?.unselect()
    },
    eventClick: (info: { event: { id: string } }) => {
      void db.appointments.get(Number(info.event.id)).then((a) => {
        moveFor = a ?? null
      })
    },
    eventDrop: (info: {
      event: { id: string; start: Date; end: Date | null }
      revert: () => void
    }) => {
      const end = info.event.end ?? new Date(info.event.start.getTime() + 60 * 60 * 1000)
      void updateAppointmentTimes(
        Number(info.event.id),
        info.event.start.getTime(),
        end.getTime(),
      ).catch(() => info.revert())
    },
    eventResize: (info: {
      event: { id: string; start: Date; end: Date | null }
      revert: () => void
    }) => {
      const end = info.event.end ?? new Date(info.event.start.getTime() + 60 * 60 * 1000)
      void updateAppointmentTimes(
        Number(info.event.id),
        info.event.start.getTime(),
        end.getTime(),
      ).catch(() => info.revert())
    },
  })

  $effect(() => {
    setTopNav({
      title: topTitle,
      action: {
        label: 'Today',
        onclick: goToday,
      },
      overflow: [
        { label: 'Day', onclick: () => updateViewMode('timeGridDay') },
        { label: 'Week', onclick: () => updateViewMode('timeGridWeek') },
        { label: 'Month', onclick: () => updateViewMode('monthList') },
      ],
    })
  })

  $effect(() => {
    options.events = eventsFromState()
  })

  $effect(() => {
    if (viewMode !== 'monthList') return
    const relevant = chooseRelevantMonth()
    relevantMonthKey = monthKey(relevant)
    topTitle = monthListTitle(relevant)
  })

  $effect(() => {
    if (viewMode !== 'monthList' || !monthScroller) return
    const target = monthScroller.querySelector<HTMLElement>(`[data-month="${relevantMonthKey}"]`)
    target?.scrollIntoView({ block: 'start' })
  })

</script>

<div class="ec-shell ec-auto-dark">
  {#if viewMode === 'monthList'}
    <div class="month-list" bind:this={monthScroller}>
      {#each monthSections as month (month.key)}
        <section class="month-section" data-month={month.key}>
          <h2>{month.label}</h2>
          <div class="month-days">
            {#each month.days as day (day.toDateString())}
              {@const dayAppointments = appointmentsForDay(day)}
              <article class="month-day" class:today={sameMonth(day, new Date()) && day.getDate() === new Date().getDate()}>
                <div class="month-day-number">{day.getDate()}</div>
                <div class="month-day-content">
                  {#if dayAppointments.length > 0}
                    {#each dayAppointments as appointment (appointment.id)}
                      <button type="button" class="month-event" onclick={() => openAppointment(appointment.id)}>
                        <span>{formattedTime(appointment.start)}</span>
                        {appointment.title}
                      </button>
                    {/each}
                  {/if}
                </div>
              </article>
            {/each}
          </div>
        </section>
      {/each}
    </div>
  {:else}
    <Calendar bind:this={calendarInst} {plugins} {options} />
  {/if}
</div>

{#if dogs.length === 0}
  <p class="banner">
    Add at least one dog (and owner) in <a href="#/dogs/new">Dogs</a> before booking.
  </p>
{/if}

<AppointmentFormModal
  open={createOpen}
  {dogs}
  defaultStart={createStart}
  defaultEnd={createEnd}
  onclose={() => (createOpen = false)}
  onsaved={() => {}}
/>

<MoveAppointmentSheet
  open={moveFor != null}
  appointment={moveFor}
  {dogs}
  onclose={() => (moveFor = null)}
  onsaved={() => {}}
/>

<style>
  .banner {
    margin: 0.5rem 0 0;
    padding: 0.65rem 0.85rem;
    background: var(--color-primary-soft-bg);
    border-radius: 10px;
    font-size: 0.9rem;
  }
  .banner a {
    color: var(--color-primary);
    font-weight: 700;
  }
  :global(.ec-shell .ec-toolbar) {
    display: none;
  }
  :global(.ec-shell .ec-time-grid .ec-sidebar) {
    padding-inline: 0.3rem;
    font-size: 0.72rem;
  }
  :global(.ec-shell .ec-time-grid .ec-header .ec-col-head time) {
    display: grid;
    gap: 0.1rem;
    justify-items: center;
    line-height: 1.05;
  }
  :global(.ec-shell .ec-time-grid .calendar-day-weekday) {
    font-size: 0.72rem;
    font-weight: 700;
  }
  :global(.ec-shell .ec-time-grid .calendar-day-number) {
    font-size: 1rem;
  }
  :global(.ec-shell .ec-time-grid .ec-event-time) {
    display: none;
  }
  .month-list {
    height: 100%;
    overflow: auto;
    padding: 0 0.25rem 0.75rem;
    scroll-padding-top: 0.5rem;
  }
  .month-section {
    margin-bottom: 1rem;
  }
  .month-section h2 {
    position: sticky;
    top: 0;
    z-index: 1;
    margin: 0;
    padding: 0.75rem 0.25rem 0.5rem;
    background: var(--color-bg);
    font-size: 1rem;
  }
  .month-days {
    display: grid;
    grid-template-columns: repeat(7, minmax(0, 1fr));
    overflow: hidden;
    border: 1px solid var(--color-border);
    border-radius: 14px;
    background: var(--color-surface);
  }
  .month-day {
    min-height: 78px;
    padding: 0.35rem;
    border-right: 1px solid var(--color-border);
    border-bottom: 1px solid var(--color-border);
  }
  .month-day:nth-child(7n) {
    border-right: 0;
  }
  .month-day-number {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    border-radius: 999px;
    font-size: 0.8rem;
    font-weight: 700;
  }
  .month-day.today .month-day-number {
    background: var(--color-primary);
    color: var(--color-primary-contrast);
  }
  .month-day-content {
    display: grid;
    gap: 0.2rem;
    margin-top: 0.2rem;
  }
  .month-event {
    justify-content: flex-start;
    width: 100%;
    min-width: 0;
    min-height: 0;
    padding: 0.18rem 0.25rem;
    overflow: hidden;
    border: 0;
    border-radius: 6px;
    background: var(--color-primary-soft-bg);
    color: var(--color-text);
    font-size: 0.68rem;
    font-weight: 700;
    text-align: left;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .month-event span {
    color: var(--color-primary);
    margin-right: 0.2rem;
  }
</style>
