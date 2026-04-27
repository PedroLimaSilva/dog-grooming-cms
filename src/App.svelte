<script lang="ts">
  import Calendar from '@lucide/svelte/icons/calendar'
  import Dog from '@lucide/svelte/icons/dog'
  import Users from '@lucide/svelte/icons/users'
  import { onMount } from 'svelte'
  import { get } from 'svelte/store'
  import AppTopBar from './components/AppTopBar.svelte'
  import type { OverflowItem } from './components/AppTopBar.svelte'
  import { seedIfEmpty } from './db'
  import {
    setAppChromeTitle,
    setTopOverflowDelegate,
    appChromeTitleOverride,
    topOverflowDelegate,
    triggerCalendarCreate,
  } from './lib/appChrome'
  import { formatRoute, readRouteFromLocation, tabFromRoute, type AppRoute } from './lib/hashRoute'
  import CalendarView from './views/CalendarView.svelte'
  import DogDetailView from './views/DogDetailView.svelte'
  import DogsListView from './views/DogsListView.svelte'
  import OwnerDetailView from './views/OwnerDetailView.svelte'
  import OwnersListView from './views/OwnersListView.svelte'

  let route = $state<AppRoute>(readRouteFromLocation())
  let titleOverride = $state<string | null>(get(appChromeTitleOverride))
  let overflowDel = $state(get(topOverflowDelegate))

  onMount(() => {
    void seedIfEmpty()
    const onHash = () => {
      route = readRouteFromLocation()
    }
    window.addEventListener('hashchange', onHash)
    const u1 = appChromeTitleOverride.subscribe((v) => (titleOverride = v))
    const u2 = topOverflowDelegate.subscribe((v) => (overflowDel = v))
    return () => {
      window.removeEventListener('hashchange', onHash)
      u1()
      u2()
    }
  })

  $effect(() => {
    route
    setAppChromeTitle(null)
    setTopOverflowDelegate(null)
  })

  function go(tab: 'calendar' | 'dogs' | 'owners') {
    if (tab === 'calendar') window.location.hash = formatRoute({ name: 'calendar' })
    if (tab === 'dogs') window.location.hash = formatRoute({ name: 'dogs', segment: 'list' })
    if (tab === 'owners') window.location.hash = formatRoute({ name: 'owners', segment: 'list' })
  }

  const tab = $derived(tabFromRoute(route))

  const topBar = $derived.by((): {
    title: string
    backHref: string | null
    backLabel: string
    primaryAction: { label: string; href: string } | { label: string; onActivate: () => void } | null
    overflowItems: OverflowItem[]
  } => {
    const o = titleOverride
    if (route.name === 'calendar') {
      return {
        title: 'Calendar',
        backHref: null,
        backLabel: 'Back',
        primaryAction: { label: 'New', onActivate: () => triggerCalendarCreate() },
        overflowItems: [
          { label: 'Add dog', href: '#/dogs/new' },
          { label: 'Add owner', href: '#/owners/new' },
        ],
      }
    }
    if (route.name === 'dogs') {
      if (route.segment === 'list') {
        return {
          title: 'Dogs',
          backHref: null,
          backLabel: 'Back',
          primaryAction: { label: 'Add dog', href: '#/dogs/new' },
          overflowItems: [{ label: 'Add owner', href: '#/owners/new' }],
        }
      }
      if (route.segment === 'new') {
        return {
          title: o ?? 'New dog',
          backHref: '#/dogs',
          backLabel: 'Back to dogs',
          primaryAction: null,
          overflowItems: [],
        }
      }
      const items: OverflowItem[] = []
      const del = overflowDel?.onDelete
      if (del) {
        items.push({ label: 'Delete…', onSelect: del })
      }
      return {
        title: o ?? 'Dog',
        backHref: '#/dogs',
        backLabel: 'Back to dogs',
        primaryAction: null,
        overflowItems: items,
      }
    }
    if (route.segment === 'list') {
      return {
        title: 'Owners',
        backHref: null,
        backLabel: 'Back',
        primaryAction: { label: 'Add owner', href: '#/owners/new' },
        overflowItems: [{ label: 'Add dog', href: '#/dogs/new' }],
      }
    }
    if (route.segment === 'new') {
      return {
        title: o ?? 'New owner',
        backHref: '#/owners',
        backLabel: 'Back to owners',
        primaryAction: null,
        overflowItems: [],
      }
    }
    const ownerItems: OverflowItem[] = []
    const delOwner = overflowDel?.onDelete
    if (delOwner) {
      ownerItems.push({ label: 'Delete…', onSelect: delOwner })
    }
    return {
      title: o ?? 'Owner',
      backHref: '#/owners',
      backLabel: 'Back to owners',
      primaryAction: null,
      overflowItems: ownerItems,
    }
  })
</script>

<div class="app-root">
  <AppTopBar
    title={topBar.title}
    backHref={topBar.backHref}
    backLabel={topBar.backLabel}
    primaryAction={topBar.primaryAction}
    overflowItems={topBar.overflowItems}
  />

  <div class="app-scroll">
    <div class="app-scroll__pad">
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
    </div>
  </div>

  <nav class="tabbar" aria-label="Main">
    <button type="button" class="tabbar__item" class:active={tab === 'calendar'} onclick={() => go('calendar')}>
      <span class="tabbar__icon" aria-hidden="true"><Calendar size={22} strokeWidth={2} /></span>
      <span class="tabbar__label">Calendar</span>
    </button>
    <button type="button" class="tabbar__item" class:active={tab === 'dogs'} onclick={() => go('dogs')}>
      <span class="tabbar__icon" aria-hidden="true"><Dog size={22} strokeWidth={2} /></span>
      <span class="tabbar__label">Dogs</span>
    </button>
    <button type="button" class="tabbar__item" class:active={tab === 'owners'} onclick={() => go('owners')}>
      <span class="tabbar__icon" aria-hidden="true"><Users size={22} strokeWidth={2} /></span>
      <span class="tabbar__label">Owners</span>
    </button>
  </nav>
</div>

<style>
  .app-root {
    min-height: 100dvh;
    position: relative;
    background: var(--color-bg);
  }
  .app-scroll {
    position: fixed;
    top: var(--app-top-h);
    left: 0;
    right: 0;
    bottom: 0;
    overflow: auto;
    -webkit-overflow-scrolling: touch;
  }
  .app-scroll__pad {
    padding: 0.65rem 0.75rem calc(var(--tabbar-float-gap) + var(--tabbar-float-h) + var(--safe-bottom) + 0.5rem);
    min-height: 100%;
  }
  .tabbar {
    position: fixed;
    left: 50%;
    transform: translateX(-50%);
    bottom: calc(0.65rem + var(--safe-bottom));
    z-index: 40;
    display: flex;
    align-items: stretch;
    justify-content: space-around;
    gap: 0.15rem;
    width: calc(100% - 1.5rem);
    max-width: 420px;
    padding: 0.4rem 0.35rem;
    border-radius: 999px;
    background: color-mix(in srgb, var(--color-surface) 88%, transparent);
    backdrop-filter: blur(14px);
    -webkit-backdrop-filter: blur(14px);
    border: 1px solid var(--color-border);
    box-shadow: var(--shadow-tabbar);
  }
  .tabbar__item {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.15rem;
    min-height: unset;
    min-width: 0;
    padding: 0.35rem 0.25rem;
    border: none;
    background: transparent;
    color: var(--color-muted);
    font-size: 0.65rem;
    font-weight: 600;
    border-radius: 999px;
  }
  .tabbar__item.active {
    background: var(--color-primary-soft-bg);
    color: var(--color-primary);
  }
  .tabbar__icon {
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .tabbar__label {
    line-height: 1.1;
    white-space: nowrap;
  }
</style>
