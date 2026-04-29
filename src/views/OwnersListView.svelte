<script lang="ts">
  import { liveQuery } from 'dexie'
  import { onMount } from 'svelte'
  import SearchField from '../components/SearchField.svelte'
  import type { OwnerRecord } from '../db'
  import { db } from '../db'

  let rows = $state<OwnerRecord[]>([])
  let searchQuery = $state('')

  onMount(() => {
    const sub = liveQuery(() => db.owners.orderBy('name').toArray()).subscribe({
      next: (v) => {
        rows = v
      },
    })
    return () => sub.unsubscribe()
  })

  const normalizedSearch = $derived(searchQuery.trim().toLocaleLowerCase())
  const filteredRows = $derived(
    normalizedSearch
      ? rows.filter((o) => [o.name, o.phone, o.email].some((v) => v?.toLocaleLowerCase().includes(normalizedSearch)))
      : rows,
  )
</script>

<div class="panel">

  <SearchField bind:value={searchQuery} placeholder="Search owners" label="Search owners" />

  {#if rows.length === 0}
    <p class="empty-hint">No owners yet. Add one before adding dogs.</p>
  {:else if filteredRows.length === 0}
    <p class="empty-hint">No owners match "{searchQuery.trim()}".</p>
  {:else}
    {#each filteredRows as o (o.id)}
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
    padding: 0.75rem;
    max-width: 560px;
    margin: 0 auto;
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
