<script lang="ts">
  import { CalendarDays, ChevronLeft, Dog, Menu, Plus, Users } from '@lucide/svelte'
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

  const topTitle = $derived.by(() => {
    if (route.name === 'calendar') return 'Calendar'
    if (route.name === 'dogs') {
      if (route.segment === 'list') return 'Dogs'
      if (route.segment === 'new') return 'New dog'
      return 'Dog'
    }
    if (route.segment === 'list') return 'Owners'
    if (route.segment === 'new') return 'New owner'
    return 'Owner'
  })

  const backHref = $derived.by(() => {
    if (route.name === 'dogs' && route.segment !== 'list') return '#/dogs'
    if (route.name === 'owners' && route.segment !== 'list') return '#/owners'
    return ''
  })

  const createHref = $derived.by(() => {
    if (route.name === 'dogs' && route.segment === 'list') return '#/dogs/new'
    if (route.name === 'owners' && route.segment === 'list') return '#/owners/new'
    return ''
  })
</script>

<div class="app-root">
  <header class="topbar">
    <div class="topbar-slot topbar-slot-left">
      {#if backHref}
        <a class="nav-button" href={backHref} aria-label="Go back">
          <ChevronLeft size={20} strokeWidth={2.4} aria-hidden="true" />
        </a>
      {:else if createHref}
        <a class="nav-button" href={createHref} aria-label="Create">
          <Plus size={20} strokeWidth={2.5} aria-hidden="true" />
        </a>
      {/if}
    </div>

    <h1>{topTitle}</h1>

    <div class="topbar-slot topbar-slot-right">
      <details class="overflow">
        <summary class="nav-button" aria-label="More options">
          <Menu size={20} strokeWidth={2.4} aria-hidden="true" />
        </summary>
        <div class="overflow-panel">
          {#if route.name !== 'calendar'}
            <a href="#/calendar">Calendar</a>
          {/if}
          {#if route.name !== 'dogs' || route.segment !== 'list'}
            <a href="#/dogs">Dogs</a>
          {/if}
          {#if route.name !== 'owners' || route.segment !== 'list'}
            <a href="#/owners">Owners</a>
          {/if}
          {#if route.name !== 'dogs' || route.segment !== 'new'}
            <a href="#/dogs/new">New dog</a>
          {/if}
          {#if route.name !== 'owners' || route.segment !== 'new'}
            <a href="#/owners/new">New owner</a>
          {/if}
        </div>
      </details>
    </div>
  </header>

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
      <CalendarDays size={20} strokeWidth={2.2} aria-hidden="true" />
      <span>Calendar</span>
    </button>
    <button type="button" class:active={tabFromRoute(route) === 'dogs'} onclick={() => go('dogs')}>
      <Dog size={20} strokeWidth={2.2} aria-hidden="true" />
      <span>Dogs</span>
    </button>
    <button type="button" class:active={tabFromRoute(route) === 'owners'} onclick={() => go('owners')}>
      <Users size={20} strokeWidth={2.2} aria-hidden="true" />
      <span>Owners</span>
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
    padding: calc(0.75rem + var(--topbar-h)) 0.75rem calc(0.75rem + var(--tabbar-h));
    overflow: auto;
  }
  .topbar {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    z-index: 45;
    display: grid;
    grid-template-columns: minmax(72px, 1fr) auto minmax(72px, 1fr);
    align-items: center;
    gap: 0.5rem;
    height: var(--topbar-h);
    padding: calc(0.5rem + var(--safe-top)) 1rem 0.5rem;
    background: color-mix(in srgb, var(--color-bg) 88%, transparent);
    border-bottom: 1px solid color-mix(in srgb, var(--color-border) 70%, transparent);
    backdrop-filter: blur(16px);
  }
  .topbar h1 {
    margin: 0;
    font-size: 1.15rem;
    line-height: 1;
    text-align: center;
  }
  .topbar-slot {
    display: flex;
    align-items: center;
    min-width: 0;
  }
  .topbar-slot-left {
    justify-content: flex-start;
  }
  .topbar-slot-right {
    justify-content: flex-end;
  }
  .nav-button,
  .overflow summary.nav-button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 44px;
    height: 44px;
    min-width: 44px;
    padding: 0;
    border: 1px solid var(--color-border);
    border-radius: 999px;
    background: var(--color-surface);
    color: var(--color-text);
    text-decoration: none;
    box-shadow: 0 8px 22px rgba(0, 0, 0, 0.08);
  }
  .overflow {
    position: relative;
  }
  .overflow summary {
    list-style: none;
    cursor: pointer;
  }
  .overflow summary::-webkit-details-marker {
    display: none;
  }
  .overflow-panel {
    position: absolute;
    top: calc(100% + 0.5rem);
    right: 0;
    display: grid;
    min-width: 172px;
    padding: 0.35rem;
    border: 1px solid var(--color-border);
    border-radius: 14px;
    background: var(--color-surface);
    box-shadow: 0 16px 36px rgba(0, 0, 0, 0.18);
  }
  .overflow-panel a {
    padding: 0.65rem 0.75rem;
    border-radius: 10px;
    color: var(--color-text);
    font-weight: 600;
    text-decoration: none;
    white-space: nowrap;
  }
  .overflow-panel a:focus,
  .overflow-panel a:hover {
    background: var(--color-primary-soft-bg);
    color: var(--color-primary);
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
    background: color-mix(in srgb, var(--color-surface) 90%, transparent);
    border-top: 1px solid color-mix(in srgb, var(--color-border) 70%, transparent);
    box-shadow: var(--shadow-tabbar);
    backdrop-filter: blur(16px);
  }
  .tabbar button {
    display: inline-flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.15rem;
    min-height: 52px;
    border-radius: 12px;
    border: 1px solid transparent;
    background: transparent;
    font-weight: 600;
    font-size: 0.78rem;
  }
  .tabbar button.active {
    background: var(--color-primary-soft-bg);
    border-color: var(--color-primary-soft-border);
    color: var(--color-primary);
  }
</style>
