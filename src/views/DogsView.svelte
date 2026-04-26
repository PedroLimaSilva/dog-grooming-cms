<script lang="ts">
  import { liveQuery } from 'dexie'
  import { onMount } from 'svelte'
  import type { DogRecord, OwnerRecord } from '../db'
  import { db, deleteDog, upsertDog } from '../db'

  let dogs = $state<DogRecord[]>([])
  let owners = $state<OwnerRecord[]>([])

  let name = $state('')
  let breed = $state('')
  let specialCareNotes = $state('')
  let primaryOwnerId = $state<number | ''>('')
  let editing = $state<DogRecord | null>(null)
  let err = $state('')
  let saving = $state(false)

  onMount(() => {
    const s1 = liveQuery(() => db.dogs.orderBy('name').toArray()).subscribe({
      next: (v) => {
        dogs = v
      },
    })
    const s2 = liveQuery(() => db.owners.orderBy('name').toArray()).subscribe({
      next: (v) => {
        owners = v
      },
    })
    return () => {
      s1.unsubscribe()
      s2.unsubscribe()
    }
  })

  function startCreate() {
    editing = null
    name = ''
    breed = ''
    specialCareNotes = ''
    primaryOwnerId = owners.length === 1 && owners[0].id != null ? owners[0].id : ''
    err = ''
  }

  function startEdit(d: DogRecord) {
    editing = d
    name = d.name
    breed = d.breed
    specialCareNotes = d.specialCareNotes ?? ''
    primaryOwnerId = d.primaryOwnerId
    err = ''
  }

  $effect(() => {
    if (owners.length === 1 && owners[0].id != null && primaryOwnerId === '' && !editing) {
      primaryOwnerId = owners[0].id
    }
  })

  async function save() {
    err = ''
    if (!name.trim() || !breed.trim()) {
      err = 'Name and breed are required.'
      return
    }
    if (primaryOwnerId === '') {
      err = 'Choose an owner (add one under Owners if missing).'
      return
    }
    saving = true
    try {
      await upsertDog({
        id: editing?.id,
        name: name.trim(),
        breed: breed.trim(),
        specialCareNotes: specialCareNotes.trim() || undefined,
        primaryOwnerId: Number(primaryOwnerId),
      })
      startCreate()
    } catch (e) {
      err = e instanceof Error ? e.message : 'Could not save.'
    } finally {
      saving = false
    }
  }

  async function remove(d: DogRecord) {
    if (d.id == null) return
    if (!confirm(`Remove ${d.name} and their appointments?`)) return
    err = ''
    try {
      await deleteDog(d.id)
      if (editing?.id === d.id) startCreate()
    } catch (e) {
      err = e instanceof Error ? e.message : 'Could not delete.'
    }
  }

  function ownerLabel(id: number) {
    const o = owners.find((x) => x.id === id)
    return o ? o.name : `#${id}`
  }
</script>

<div class="panel">
  <h2>Dogs</h2>
  <p class="hint">Clients who receive grooming. Each dog has one primary owner in this MVP.</p>

  <form
    onsubmit={(e) => {
      e.preventDefault()
      void save()
    }}
  >
    <div class="field">
      <label for="dname">Name</label>
      <input id="dname" bind:value={name} autocomplete="off" />
    </div>
    <div class="field">
      <label for="dbreed">Breed</label>
      <input id="dbreed" bind:value={breed} />
    </div>
    <div class="field">
      <label for="dnotes">Special care</label>
      <textarea id="dnotes" rows="2" bind:value={specialCareNotes} placeholder="Allergies, behavior, vet notes…"></textarea>
    </div>
    <div class="field">
      <label for="downer">Owner</label>
      <select id="downer" bind:value={primaryOwnerId}>
        <option value="">Select…</option>
        {#each owners as o (o.id)}
          {#if o.id != null}
            <option value={o.id}>{o.name} — {o.phone}</option>
          {/if}
        {/each}
      </select>
    </div>
    {#if err}<p class="error-text">{err}</p>{/if}
    <div class="row-actions">
      <button type="submit" class="primary" disabled={saving}>{editing ? 'Update' : 'Add'} dog</button>
      {#if editing}
        <button type="button" onclick={startCreate}>Cancel edit</button>
      {/if}
    </div>
  </form>

  <h3 class="sub">Clients</h3>
  {#if dogs.length === 0}
    <p class="empty-hint">No dogs yet.</p>
  {:else}
    {#each dogs as d (d.id)}
      <div class="list-card">
        <h3>{d.name}</h3>
        <p>{d.breed} · Owner: {ownerLabel(d.primaryOwnerId)}</p>
        {#if d.specialCareNotes}
          <p class="care">{d.specialCareNotes}</p>
        {/if}
        <div class="row-actions">
          <button type="button" onclick={() => startEdit(d)}>Edit</button>
          <button type="button" onclick={() => remove(d)}>Delete</button>
        </div>
      </div>
    {/each}
  {/if}
</div>

<style>
  .panel {
    padding: 0 0 1rem;
    max-width: 560px;
    margin: 0 auto;
  }
  h2 {
    margin: 0 0 0.35rem;
    font-size: 1.25rem;
  }
  .hint {
    margin: 0 0 1rem;
    color: var(--color-muted);
    font-size: 0.9rem;
  }
  .sub {
    margin: 1.5rem 0 0.75rem;
    font-size: 1rem;
  }
  .care {
    font-size: 0.875rem;
    color: var(--color-muted);
    margin-top: 0.35rem;
  }
</style>
