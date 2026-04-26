<script lang="ts">
  import { liveQuery } from 'dexie'
  import { onMount } from 'svelte'
  import type { OwnerRecord } from '../db'
  import { db } from '../db'

  let rows = $state<OwnerRecord[]>([])

  onMount(() => {
    const sub = liveQuery(() => db.owners.orderBy('name').toArray()).subscribe({
      next: (v) => {
        rows = v
      },
    })
    return () => sub.unsubscribe()
  })
</script>

<div class="panel">
  <div class="list-page-head">
    <div>
      <h1>Owners</h1>
      <p class="hint">Primary contacts. Tap an owner for details.</p>
    </div>
    <a href="#/owners/new" class="primary">Add owner</a>
  </div>

  {#if rows.length === 0}
    <p class="empty-hint">No owners yet. Add one before adding dogs.</p>
  {:else}
    {#each rows as o (o.id)}
      {#if o.id != null}
        <a class="list-card list-card-link" href="#/owners/{o.id}">
          <h2>{o.name}</h2>
          <p>{o.phone}</p>
        </a>
      {/if}
    {/each}
  {/if}
</div>

<style>
  .panel {
    padding: 0 0 1rem;
    max-width: 560px;
    margin: 0 auto;
  }
  .list-page-head {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 1rem;
    margin-bottom: 1rem;
  }
  h1 {
    margin: 0 0 0.35rem;
    font-size: 1.25rem;
  }
  .hint {
    margin: 0;
    color: var(--color-muted);
    font-size: 0.9rem;
  }
  .list-card-link {
    display: block;
    text-decoration: none;
    color: inherit;
    margin-bottom: 0.5rem;
  }
  .list-card-link h2 {
    margin: 0 0 0.25rem;
    font-size: 1rem;
    font-weight: 700;
  }
</style>
