<script lang="ts">
  import { CalendarDays, Check, ChevronLeft, Dog, Menu, Plus, Users } from '@lucide/svelte'
  import { onMount } from 'svelte'
  import { seedIfEmpty } from './db'
  import { formatRoute, readRouteFromLocation, tabFromRoute, type AppRoute } from './lib/hashRoute'
  import { topNavConfig, type OverflowAction } from './lib/topNav'
  import CalendarView from './views/CalendarView.svelte'
  import DogDetailView from './views/DogDetailView.svelte'
  import DogsListView from './views/DogsListView.svelte'
  import OwnerDetailView from './views/OwnerDetailView.svelte'
  import OwnersListView from './views/OwnersListView.svelte'

  let route = $state<AppRoute>(readRouteFromLocation())
  let overflowOpen = $state(false)

  onMount(() => {
    void seedIfEmpty()
    const onHash = () => {
      route = readRouteFromLocation()
    }
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  })

  function go(tab: 'calendar' | 'dogs' | 'owners') {
    overflowOpen = false
    if (tab === 'calendar') window.location.hash = formatRoute({ name: 'calendar' })
    if (tab === 'dogs') window.location.hash = formatRoute({ name: 'dogs', segment: 'list' })
    if (tab === 'owners') window.location.hash = formatRoute({ name: 'owners', segment: 'list' })
  }

  const topTitle = $derived.by(() => {
    if ($topNavConfig.title) return $topNavConfig.title
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

  const createLabel = $derived.by(() => {
    if (route.name === 'dogs' && route.segment === 'list') return 'Dog'
    if (route.name === 'owners' && route.segment === 'list') return 'Owner'
    return ''
  })

  const showOverflow = $derived(($topNavConfig.overflow?.length ?? 0) > 0)
  const showAction = $derived(typeof $topNavConfig.action?.onclick === 'function')
  const showSave = $derived(typeof $topNavConfig.onSave === 'function')

  function actionIsLink(action: OverflowAction): action is OverflowAction & { href: string } {
    return typeof action.href === 'string' && action.href.length > 0
  }

  function runOverflowAction(action: OverflowAction) {
    overflowOpen = false
    action.onclick?.()
  }

  function closeOverflow() {
    overflowOpen = false
  }

  function closeOverflowFromWindow(event: MouseEvent) {
    const target = event.target
    if (target instanceof Element && target.closest('.overflow')) return
    closeOverflow()
  }
</script>

<svelte:window onclick={closeOverflowFromWindow} />

<div class="app-root">
  <header class="topbar">
    <div class="topbar-slot topbar-slot-left">
      {#if backHref}
        <a class="nav-button" href={backHref} aria-label="Go back">
          <ChevronLeft size={20} strokeWidth={2.4} aria-hidden="true" />
        </a>
      {/if}
      {#if showAction}
        <button
          type="button"
          class="nav-button nav-button-label"
          aria-label={$topNavConfig.action?.label}
          onclick={() => $topNavConfig.action?.onclick()}
        >
          {$topNavConfig.action?.label}
        </button>
      {/if}
    </div>

    <h1>{topTitle}</h1>

    <div class="topbar-slot topbar-slot-right">
      {#if createHref}
        <a class="nav-button nav-button-primary nav-button-label" href={createHref} aria-label="Add {createLabel}">
          <Plus size={18} strokeWidth={2.5} aria-hidden="true" />
          <span>{createLabel}</span>
        </a>
      {/if}
      {#if showOverflow}
        <div class="overflow">
          <button
            type="button"
            class="nav-button"
            aria-label="More options"
            aria-expanded={overflowOpen}
            onclick={() => (overflowOpen = !overflowOpen)}
          >
            <Menu size={20} strokeWidth={2.4} aria-hidden="true" />
          </button>
          {#if overflowOpen}
            <div class="overflow-panel">
              {#each $topNavConfig.overflow ?? [] as action (action.label)}
                {#if actionIsLink(action)}
                  <a
                    href={action.href}
                    target={action.external ? '_blank' : undefined}
                    rel={action.external ? 'noopener noreferrer' : undefined}
                    class:danger={action.danger}
                    onclick={closeOverflow}
                  >
                    {action.label}
                  </a>
                {:else}
                  <button type="button" class:danger={action.danger} onclick={() => runOverflowAction(action)}>
                    {action.label}
                  </button>
                {/if}
              {/each}
            </div>
          {/if}
        </div>
      {/if}
      {#if showSave}
        <button type="button" class="nav-button nav-button-save" aria-label="Save" disabled={$topNavConfig.saving} onclick={() => $topNavConfig.onSave?.()}>
          <Check size={20} strokeWidth={2.6} aria-hidden="true" />
        </button>
      {/if}
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
    grid-template-columns: minmax(56px, 1fr) minmax(0, auto) minmax(56px, 1fr);
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
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
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
    gap: 0.4rem;
  }
  .nav-button {
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
  .nav-button-primary {
    border-color: var(--color-primary);
    background: var(--color-primary);
    color: var(--color-primary-contrast);
  }
  .nav-button-label {
    width: auto;
    gap: 0.2rem;
    padding: 0 0.75rem;
    font-weight: 700;
    white-space: nowrap;
  }
  .nav-button-save {
    color: var(--color-primary);
  }
  .overflow {
    position: relative;
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
    display: block;
    padding: 0.65rem 0.75rem;
    border-radius: 10px;
    color: var(--color-text);
    font-weight: 600;
    text-decoration: none;
    white-space: nowrap;
  }
  .overflow-panel button {
    min-height: 0;
    min-width: 0;
    padding: 0.65rem 0.75rem;
    border: 0;
    border-radius: 10px;
    background: transparent;
    color: var(--color-text);
    font-weight: 600;
    text-align: left;
  }
  .overflow-panel a:focus,
  .overflow-panel a:hover,
  .overflow-panel button:focus,
  .overflow-panel button:hover {
    background: var(--color-primary-soft-bg);
    color: var(--color-primary);
  }
  .overflow-panel a.danger,
  .overflow-panel button.danger {
    color: var(--color-danger);
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
