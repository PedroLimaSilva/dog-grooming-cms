<script lang="ts">
  import { liveQuery } from 'dexie'
  import { onMount } from 'svelte'
  import type { DogRecord, OwnerRecord } from '../db'
  import { db, deleteDog, upsertDog } from '../db'
  import { navigateTo } from '../lib/hashRoute'

  type Props = { mode: 'new' | 'edit'; dogId?: number }

  let { mode, dogId }: Props = $props()

  let owners = $state<OwnerRecord[]>([])
  let dog = $state<DogRecord | undefined>(undefined)
  /** Set after first `get` result in edit mode. */
  let loaded = $state(false)

  let name = $state('')
  let breed = $state('')
  let specialCareNotes = $state('')
  let primaryOwnerId = $state<number | ''>('')
  let err = $state('')
  let saving = $state(false)

  onMount(() => {
    const sOwners = liveQuery(() => db.owners.orderBy('name').toArray()).subscribe({
      next: (v) => {
        owners = v
      },
    })

    let sDog: { unsubscribe: () => void } | undefined
    if (mode === 'edit' && dogId != null) {
      sDog = liveQuery(() => db.dogs.get(dogId)).subscribe({
        next: (v) => {
          dog = v
          loaded = true
        },
      })
    }

    return () => {
      sOwners.unsubscribe()
      sDog?.unsubscribe()
    }
  })

  $effect(() => {
    if (mode !== 'edit' || !dog) return
    name = dog.name
    breed = dog.breed
    specialCareNotes = dog.specialCareNotes ?? ''
    primaryOwnerId = dog.primaryOwnerId
  })

  $effect(() => {
    if (mode !== 'new') return
    if (owners.length === 1 && owners[0].id != null && primaryOwnerId === '') {
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
      const id = await upsertDog({
        id: mode === 'edit' ? dogId : undefined,
        name: name.trim(),
        breed: breed.trim(),
        specialCareNotes: specialCareNotes.trim() || undefined,
        primaryOwnerId: Number(primaryOwnerId),
      })
      navigateTo({ name: 'dogs', segment: { id } })
    } catch (e) {
      err = e instanceof Error ? e.message : 'Could not save.'
    } finally {
      saving = false
    }
  }

  async function remove() {
    if (mode !== 'edit' || dogId == null) return
    if (!dog) return
    if (!confirm(`Remove ${dog.name} and their appointments?`)) return
    err = ''
    try {
      await deleteDog(dogId)
      navigateTo({ name: 'dogs', segment: 'list' })
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
  {#if mode === 'edit' && dogId != null && !loaded}
    <p class="empty-hint">Loading…</p>
  {:else if mode === 'edit' && dogId != null && loaded && dog === undefined}
    <header class="page-head">
      <a href="#/dogs" class="back">← Dogs</a>
      <h1>Dog not found</h1>
    </header>
    <p class="empty-hint">This dog may have been removed.</p>
  {:else}
    <header class="page-head">
      <a href="#/dogs" class="back">← Dogs</a>
      <h1>{mode === 'new' ? 'New dog' : dog?.name ?? 'Dog'}</h1>
    </header>

    {#if mode === 'edit' && dog?.id != null}
      <p class="meta">
        Owner:
        <a class="inline-link" href="#/owners/{dog.primaryOwnerId}">{ownerLabel(dog.primaryOwnerId)}</a>
      </p>
    {/if}

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
        <textarea id="dnotes" rows="3" bind:value={specialCareNotes} placeholder="Allergies, behavior, vet notes…"></textarea>
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
        <button type="submit" class="primary" disabled={saving}>
          {mode === 'new' ? 'Add dog' : 'Save changes'}
        </button>
        {#if mode === 'edit'}
          <button type="button" class="danger" onclick={() => void remove()}>Delete</button>
        {/if}
      </div>
    </form>
  {/if}
</div>

<style>
  .panel {
    padding: 0 0 1rem;
    max-width: 560px;
    margin: 0 auto;
  }
  .page-head .back {
    display: inline-block;
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--color-primary);
    text-decoration: none;
    margin-bottom: 0.35rem;
  }
  .page-head h1 {
    margin: 0;
    font-size: 1.35rem;
  }
  .meta {
    margin: 0 0 1rem;
    font-size: 0.9rem;
    color: var(--color-muted);
  }
  .inline-link {
    color: var(--color-primary);
    font-weight: 600;
  }
</style>
