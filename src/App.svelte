<script lang="ts">
  import { onMount } from 'svelte'
  import { seedIfEmpty } from './db'
  import CalendarView from './views/CalendarView.svelte'
  import DogsView from './views/DogsView.svelte'
  import OwnersView from './views/OwnersView.svelte'

  type Tab = 'calendar' | 'dogs' | 'owners'

  let tab = $state<Tab>('calendar')

  onMount(() => {
    void seedIfEmpty()
  })
</script>

<div class="app-root">
  <header class="top">
    <h1 class="brand">Grooming</h1>
    <p class="tag">On-device salon CMS</p>
  </header>

  <main class="main">
    {#if tab === 'calendar'}
      <CalendarView />
    {:else if tab === 'dogs'}
      <DogsView />
    {:else}
      <OwnersView />
    {/if}
  </main>

  <nav class="tabbar" aria-label="Main">
    <button type="button" class:active={tab === 'calendar'} onclick={() => (tab = 'calendar')}>
      Calendar
    </button>
    <button type="button" class:active={tab === 'dogs'} onclick={() => (tab = 'dogs')}>Dogs</button>
    <button type="button" class:active={tab === 'owners'} onclick={() => (tab = 'owners')}>
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
  .top {
    flex: 0 0 auto;
    padding: calc(0.65rem + var(--safe-top)) 1rem 0.65rem;
    background: var(--color-primary);
    color: var(--color-primary-contrast);
  }
  .brand {
    margin: 0;
    font-size: 1.35rem;
    font-weight: 700;
    letter-spacing: -0.02em;
  }
  .tag {
    margin: 0.15rem 0 0;
    font-size: 0.8rem;
    opacity: 0.9;
  }
  .main {
    flex: 1 1 auto;
    min-height: 0;
    padding: 0.65rem 0.75rem calc(0.5rem + var(--tabbar-h));
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
