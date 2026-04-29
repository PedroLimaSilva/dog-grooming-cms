<script lang="ts">
  import CreateSelectField from './CreateSelectField.svelte'
  import type { DogRecord } from '../db'
  import type { GroomingServiceLine } from '../types'
  import { createAppointment, createQuickDog } from '../db'

  type Props = {
    open: boolean
    dogs: DogRecord[]
    defaultStart: Date
    defaultEnd: Date
    onclose: () => void
    onsaved: () => void
  }

  let { open, dogs, defaultStart, defaultEnd, onclose, onsaved }: Props = $props()

  let dogId = $state<number | ''>('')
  /** Visit length; end = start + duration */
  let durationMinutes = $state(60)
  let notes = $state('')
  let bath = $state(true)
  let cut = $state(false)
  let nail = $state(false)
  let accessory = $state(false)
  let accessoryNote = $state('')
  let saving = $state(false)
  let err = $state('')

  $effect(() => {
    if (open) {
      err = ''
      if (dogs.length === 1 && dogs[0].id != null) dogId = dogs[0].id
      else dogId = ''
      const span = Math.round(
        (defaultEnd.getTime() - defaultStart.getTime()) / 60_000,
      )
      durationMinutes = Math.max(5, span || 60)
    }
  })

  const computedEnd = $derived.by(() => {
    const d = Number(durationMinutes)
    const add = Number.isFinite(d) && d >= 5 ? d * 60_000 : 60 * 60_000
    return new Date(defaultStart.getTime() + add)
  })

  function lines(): GroomingServiceLine[] {
    const out: GroomingServiceLine[] = []
    if (bath) out.push({ kind: 'bath' })
    if (cut) out.push({ kind: 'cut' })
    if (nail) out.push({ kind: 'nail_trim' })
    if (accessory) out.push({ kind: 'accessory_purchase', accessoryNote: accessoryNote || undefined })
    return out.length ? out : [{ kind: 'bath' }]
  }

  async function createDog(name: string): Promise<number> {
    return createQuickDog(name)
  }

  async function save() {
    err = ''
    if (dogId === '') {
      err = 'Choose a dog.'
      return
    }
    const d = Number(durationMinutes)
    if (!Number.isFinite(d) || d < 5) {
      err = 'Duration must be at least 5 minutes.'
      return
    }
    saving = true
    try {
      await createAppointment({
        dogId: Number(dogId),
        start: defaultStart.getTime(),
        end: defaultStart.getTime() + d * 60_000,
        services: lines(),
        notes: notes.trim() || undefined,
      })
      onsaved()
      onclose()
    } catch (e) {
      err = e instanceof Error ? e.message : 'Could not save.'
    } finally {
      saving = false
    }
  }
</script>

{#if open}
  <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
  <div
    class="sheet-backdrop"
    role="presentation"
    onclick={onclose}
    onkeydown={(e) => e.key === 'Escape' && onclose()}
  >
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <div
      class="sheet"
      role="dialog"
      tabindex="-1"
      aria-modal="true"
      aria-labelledby="appt-title"
      onclick={(e) => e.stopPropagation()}
      onkeydown={(e) => e.stopPropagation()}
    >
      <h2 id="appt-title">New appointment</h2>
      <p class="muted">
        Starts {defaultStart.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
      </p>

      <div class="field">
        <label for="dur">Duration (minutes)</label>
        <input id="dur" type="number" min="5" step="5" bind:value={durationMinutes} />
        <p class="muted end-line">Ends {computedEnd.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</p>
      </div>

      <div class="field">
        <CreateSelectField
          id="dog"
          label="Dog"
          items={dogs}
          bind:selectedId={dogId}
          placeholder="Search or add dog"
          createLabel="Add dog"
          emptyLabel="No dogs found."
          getLabel={(d) => d.name}
          getDetail={(d) => d.breed || 'Details can be added later'}
          oncreate={createDog}
        />
      </div>

      <fieldset>
        <legend>Services</legend>
        <label class="inline"><input type="checkbox" bind:checked={bath} /> Bath</label>
        <label class="inline"><input type="checkbox" bind:checked={cut} /> Cut</label>
        <label class="inline"><input type="checkbox" bind:checked={nail} /> Nail trim</label>
        <label class="inline"><input type="checkbox" bind:checked={accessory} /> Accessory</label>
        {#if accessory}
          <div class="field">
            <label for="acc">Accessory note</label>
            <input id="acc" bind:value={accessoryNote} placeholder="e.g. shampoo sold" />
          </div>
        {/if}
      </fieldset>

      <div class="field">
        <label for="notes">Notes</label>
        <textarea id="notes" rows="2" bind:value={notes} placeholder="Optional"></textarea>
      </div>

      {#if err}<p class="error-text">{err}</p>{/if}

      <div class="row-actions">
        <button type="button" class="primary" onclick={save} disabled={saving}>
          {saving ? 'Saving…' : 'Save'}
        </button>
        <button type="button" onclick={onclose}>Cancel</button>
      </div>
    </div>
  </div>
{/if}

<style>
  .muted {
    margin: 0 0 1rem;
    color: var(--color-muted);
    font-size: 0.9rem;
  }
  .end-line {
    margin: 0.35rem 0 0;
  }
  fieldset {
    border: 1px solid var(--color-border);
    border-radius: 12px;
    padding: 0.75rem 1rem 1rem;
    margin: 0 0 1rem;
  }
  legend {
    padding: 0 0.35rem;
    font-weight: 600;
    font-size: 0.875rem;
  }
  .inline {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-weight: normal;
    margin-bottom: 0.35rem;
    min-height: 44px;
  }
  .inline input {
    width: auto;
    min-height: auto;
  }
</style>
