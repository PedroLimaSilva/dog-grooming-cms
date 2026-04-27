<script lang="ts">
  import { Calendar, DayGrid, Interaction, TimeGrid } from '@event-calendar/core'
  import '@event-calendar/core/index.css'
  import { liveQuery } from 'dexie'
  import { onMount } from 'svelte'
  import AppointmentFormModal from '../components/AppointmentFormModal.svelte'
  import MoveAppointmentSheet from '../components/MoveAppointmentSheet.svelte'
  import type { AppointmentRecord, DogRecord, OwnerRecord } from '../db'
  import { db, updateAppointmentTimes } from '../db'
  import { setCalendarCreateHandler } from '../lib/appChrome'

  const plugins = [DayGrid, TimeGrid, Interaction]

  type Cal = { unselect: () => void; setOption: (name: string, value: unknown) => unknown }

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

  onMount(() => {
    setCalendarCreateHandler(() => {
      const start = new Date()
      const end = new Date(start.getTime() + 60 * 60 * 1000)
      createStart = start
      createEnd = end
      createOpen = true
    })
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
      setCalendarCreateHandler(null)
      s1.unsubscribe()
      s2.unsubscribe()
      s3.unsubscribe()
    }
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
    nowIndicator: true,
    headerToolbar: {
      start: 'prev,next today',
      center: 'title',
      end: 'dayGridMonth,timeGridWeek,timeGridDay',
    },
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
    options.events = eventsFromState()
  })

  $effect(() => {
    if (!calendarInst || typeof window === 'undefined') return
    const mq = window.matchMedia('(max-width: 640px)')
    const apply = () => {
      calendar()?.setOption('view', mq.matches ? 'timeGridDay' : 'timeGridWeek')
    }
    apply()
    mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
  })
</script>

<div class="ec-shell ec-auto-dark">
  <Calendar bind:this={calendarInst} {plugins} {options} />
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
</style>
