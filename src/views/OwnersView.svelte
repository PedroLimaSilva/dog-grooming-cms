<script lang="ts">
  import { liveQuery } from 'dexie'
  import { onMount } from 'svelte'
  import type { OwnerRecord } from '../db'
  import { db, deleteOwner, upsertOwner } from '../db'

  let rows = $state<OwnerRecord[]>([])
  let name = $state('')
  let phone = $state('')
  let editing = $state<OwnerRecord | null>(null)
  let err = $state('')
  let saving = $state(false)

  onMount(() => {
    const sub = liveQuery(() => db.owners.orderBy('name').toArray()).subscribe({
      next: (v) => {
        rows = v
      },
    })
    return () => sub.unsubscribe()
  })

  function startCreate() {
    editing = null
    name = ''
    phone = ''
    err = ''
  }

  function startEdit(o: OwnerRecord) {
    editing = o
    name = o.name
    phone = o.phone
    err = ''
  }

  async function save() {
    err = ''
    if (!name.trim() || !phone.trim()) {
      err = 'Name and phone are required.'
      return
    }
    saving = true
    try {
      await upsertOwner({
        id: editing?.id,
        name: name.trim(),
        phone: phone.trim(),
      })
      startCreate()
    } catch (e) {
      err = e instanceof Error ? e.message : 'Could not save.'
    } finally {
      saving = false
    }
  }

  async function remove(o: OwnerRecord) {
    if (o.id == null) return
    if (!confirm(`Delete ${o.name}?`)) return
    err = ''
    try {
      await deleteOwner(o.id)
      if (editing?.id === o.id) startCreate()
    } catch (e) {
      err = e instanceof Error ? e.message : 'Could not delete.'
    }
  }
</script>

<div class="panel">
  <h2>Owners</h2>
  <p class="hint">Primary contact for one or more dogs.</p>

  <form
    onsubmit={(e) => {
      e.preventDefault()
      void save()
    }}
  >
    <div class="field">
      <label for="oname">Name</label>
      <input id="oname" bind:value={name} autocomplete="name" />
    </div>
    <div class="field">
      <label for="ophone">Phone</label>
      <input id="ophone" bind:value={phone} type="tel" autocomplete="tel" />
    </div>
    {#if err}<p class="error-text">{err}</p>{/if}
    <div class="row-actions">
      <button type="submit" class="primary" disabled={saving}>{editing ? 'Update' : 'Add'} owner</button>
      {#if editing}
        <button type="button" onclick={startCreate}>Cancel edit</button>
      {/if}
    </div>
  </form>

  <h3 class="sub">Directory</h3>
  {#if rows.length === 0}
    <p class="empty-hint">No owners yet.</p>
  {:else}
    {#each rows as o (o.id)}
      <div class="list-card">
        <h3>{o.name}</h3>
        <p>{o.phone}</p>
        <div class="row-actions">
          <button type="button" onclick={() => startEdit(o)}>Edit</button>
          <button type="button" onclick={() => remove(o)}>Delete</button>
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
</style>
