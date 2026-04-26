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
