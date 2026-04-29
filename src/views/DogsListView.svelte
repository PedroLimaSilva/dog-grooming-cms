<script lang="ts">
  import { liveQuery } from "dexie";
  import { onMount } from "svelte";
  import SearchField from "../components/SearchField.svelte";
  import type { DogRecord, OwnerRecord } from "../db";
  import { db } from "../db";

  let dogs = $state<DogRecord[]>([]);
  let owners = $state<OwnerRecord[]>([]);
  let searchQuery = $state("");

  onMount(() => {
    const s1 = liveQuery(() => db.dogs.orderBy("name").toArray()).subscribe({
      next: (v) => {
        dogs = v;
      },
    });
    const s2 = liveQuery(() => db.owners.toArray()).subscribe({
      next: (v) => {
        owners = v;
      },
    });
    return () => {
      s1.unsubscribe();
      s2.unsubscribe();
    };
  });

  function ownerLabel(id: number | undefined) {
    if (id == null) return "No owner";
    const o = owners.find((x) => x.id === id);
    return o ? o.name : `#${id}`;
  }

  function normalize(value: string | undefined) {
    return (value ?? "").trim().toLocaleLowerCase();
  }

  const filteredDogs = $derived.by(() => {
    const query = normalize(searchQuery);
    if (!query) return dogs;

    return dogs.filter((d) =>
      [
        d.name,
        d.breed,
        d.dateOfBirth,
        ownerLabel(d.primaryOwnerId),
        d.specialCareNotes,
      ].some((value) => normalize(value).includes(query)),
    );
  });
</script>

<div class="panel">
  <SearchField
    bind:value={searchQuery}
    placeholder="Search dogs"
    label="Search dogs"
  />

  {#if dogs.length === 0}
    <p class="empty-hint">No dogs yet. Add one to start booking.</p>
  {:else if filteredDogs.length === 0}
    <p class="empty-hint">No dogs match "{searchQuery.trim()}".</p>
  {:else}
    {#each filteredDogs as d (d.id)}
      {#if d.id != null}
        <a class="list-card list-card-link" href="#/dogs/{d.id}">
          <h2>{d.name}</h2>
          <p>
            {d.breed || "Breed not set"} · {ownerLabel(d.primaryOwnerId)}
            {#if d.dateOfBirth}
              · born {d.dateOfBirth}
            {/if}
          </p>
          {#if d.specialCareNotes}
            <p class="care">{d.specialCareNotes}</p>
          {/if}
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
  .care {
    font-size: 0.875rem;
    color: var(--color-muted);
    margin-top: 0.35rem;
    margin-bottom: 0;
  }
</style>
