<script lang="ts">
  import { onMount } from 'svelte'
  import { seedIfEmpty } from './db'
  import { formatRoute, readRouteFromLocation, tabFromRoute, type AppRoute } from './lib/hashRoute'
  import CalendarView from './views/CalendarView.svelte'
  import DogDetailView from './views/DogDetailView.svelte'
  import DogsListView from './views/DogsListView.svelte'
  import OwnerDetailView from './views/OwnerDetailView.svelte'
  import OwnersListView from './views/OwnersListView.svelte'

  let route = $state<AppRoute>(readRouteFromLocation())

  onMount(() => {
    void seedIfEmpty()
    const onHash = () => {
      route = readRouteFromLocation()
    }
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  })

  function go(tab: 'calendar' | 'dogs' | 'owners') {
    if (tab === 'calendar') window.location.hash = formatRoute({ name: 'calendar' })
    if (tab === 'dogs') window.location.hash = formatRoute({ name: 'dogs', segment: 'list' })
    if (tab === 'owners') window.location.hash = formatRoute({ name: 'owners', segment: 'list' })
  }
</script>

<div class="app-root">
  <main class="main">
    {#if route.name === 'calendar'}
      <CalendarView />
    {:else if route.name === 'dogs'}
      {#if route.segment === 'list'}
        <DogsListView />
      {:else if route.segment === 'new'}
        <DogDetailView mode="new" />
      {:else}
        {#key route.segment.id}
          <DogDetailView mode="edit" dogId={route.segment.id} />
        {/key}
      {/if}
    {:else if route.segment === 'list'}
      <OwnersListView />
    {:else if route.segment === 'new'}
      <OwnerDetailView mode="new" />
    {:else}
      {#key route.segment.id}
        <OwnerDetailView mode="edit" ownerId={route.segment.id} />
      {/key}
    {/if}
  </main>

  <nav class="tabbar" aria-label="Main">
    <button type="button" class:active={tabFromRoute(route) === 'calendar'} onclick={() => go('calendar')}>
      Calendar
    </button>
    <button type="button" class:active={tabFromRoute(route) === 'dogs'} onclick={() => go('dogs')}>Dogs</button>
    <button type="button" class:active={tabFromRoute(route) === 'owners'} onclick={() => go('owners')}>
      Owners
    </button>
  </nav>
</div>

<style>
  .app-root {
    min-height: 100dvh;
    display: flex;
    flex-direction: column;
  }
  .main {
    flex: 1 1 auto;
    min-height: 0;
    padding: calc(0.65rem + var(--safe-top)) 0.75rem calc(0.5rem + var(--tabbar-h));
    overflow: auto;
  }
  .tabbar {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    z-index: 40;
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 0.35rem;
    padding: 0.5rem 0.75rem calc(0.5rem + var(--safe-bottom));
    background: var(--color-surface);
    border-top: 1px solid var(--color-border);
    box-shadow: var(--shadow-tabbar);
  }
  .tabbar button {
    min-height: 48px;
    border-radius: 12px;
    border: 1px solid transparent;
    background: transparent;
    font-weight: 600;
    font-size: 0.9rem;
  }
  .tabbar button.active {
    background: var(--color-primary-soft-bg);
    border-color: var(--color-primary-soft-border);
    color: var(--color-primary);
  }
</style>
