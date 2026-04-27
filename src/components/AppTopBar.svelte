<script lang="ts">
  export type OverflowItem =
    | { label: string; href: string }
    | { label: string; onSelect: () => void }

  type PrimaryAction =
    | { label: string; href: string }
    | { label: string; onActivate: () => void }

  type Props = {
    title: string
    backHref?: string | null
    backLabel?: string
    primaryAction?: PrimaryAction | null
    overflowItems?: OverflowItem[]
  }

  let {
    title,
    backHref = null,
    backLabel = 'Back',
    primaryAction = null,
    overflowItems = [],
  }: Props = $props()

  let menuOpen = $state(false)
  let menuBtn: HTMLButtonElement | undefined = $state()

  function toggleMenu(e: MouseEvent) {
    e.stopPropagation()
    menuOpen = !menuOpen
  }

  $effect(() => {
    if (!menuOpen || typeof window === 'undefined') return
    const close = (ev: MouseEvent) => {
      const t = ev.target as Node
      if (menuBtn?.contains(t)) return
      menuOpen = false
    }
    window.addEventListener('click', close, true)
    return () => window.removeEventListener('click', close, true)
  })
</script>

<header class="app-top-bar">
  <div class="app-top-bar__inner">
    <div class="app-top-bar__side app-top-bar__side--start">
      {#if backHref}
        <a class="app-top-bar__back" href={backHref} aria-label={backLabel}>←</a>
      {:else}
        <span class="app-top-bar__spacer" aria-hidden="true"></span>
      {/if}
    </div>
    <h1 class="app-top-bar__title">{title}</h1>
    <div class="app-top-bar__side app-top-bar__side--end">
      {#if primaryAction}
        {#if 'href' in primaryAction}
          <a class="app-top-bar__pill" href={primaryAction.href}>{primaryAction.label}</a>
        {:else}
          <button type="button" class="app-top-bar__pill app-top-bar__pill--button" onclick={() => primaryAction.onActivate()}>
            {primaryAction.label}
          </button>
        {/if}
      {/if}
      {#if overflowItems.length > 0}
        <div class="app-top-bar__menu-wrap">
          <button
            type="button"
            class="app-top-bar__icon-btn"
            aria-label="More options"
            aria-expanded={menuOpen}
            aria-haspopup="true"
            bind:this={menuBtn}
            onclick={toggleMenu}
          >
            <span class="app-top-bar__burger" aria-hidden="true"></span>
          </button>
          {#if menuOpen}
            <div class="app-top-bar__dropdown" role="menu">
              {#each overflowItems as item (`${item.label}-${'href' in item ? item.href : 'action'}`)}
                {#if 'href' in item}
                  <a
                    role="menuitem"
                    class="app-top-bar__menu-item"
                    href={item.href}
                    onclick={() => (menuOpen = false)}
                  >
                    {item.label}
                  </a>
                {:else}
                  <button
                    type="button"
                    role="menuitem"
                    class="app-top-bar__menu-item app-top-bar__menu-item--button"
                    onclick={() => {
                      menuOpen = false
                      item.onSelect()
                    }}
                  >
                    {item.label}
                  </button>
                {/if}
              {/each}
            </div>
          {/if}
        </div>
      {:else}
        <span class="app-top-bar__spacer" aria-hidden="true"></span>
      {/if}
    </div>
  </div>
</header>

<style>
  .app-top-bar {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    z-index: 50;
    padding-top: var(--safe-top);
    padding-left: max(0.75rem, env(safe-area-inset-left, 0px));
    padding-right: max(0.75rem, env(safe-area-inset-right, 0px));
    background: color-mix(in srgb, var(--color-surface) 92%, transparent);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    border-bottom: 1px solid var(--color-border);
    box-shadow: 0 1px 0 rgba(0, 0, 0, 0.04);
  }
  .app-top-bar__inner {
    display: grid;
    grid-template-columns: minmax(44px, 1fr) minmax(0, 2.2fr) minmax(44px, 1fr);
    align-items: center;
    gap: 0.35rem;
    min-height: 48px;
    padding: 0.35rem 0 0.45rem;
  }
  .app-top-bar__side {
    display: flex;
    align-items: center;
    gap: 0.35rem;
    min-width: 0;
  }
  .app-top-bar__side--start {
    justify-content: flex-start;
  }
  .app-top-bar__side--end {
    justify-content: flex-end;
  }
  .app-top-bar__title {
    margin: 0;
    font-size: 1.05rem;
    font-weight: 700;
    text-align: center;
    line-height: 1.2;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .app-top-bar__back {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 44px;
    height: 44px;
    border-radius: 12px;
    border: 1px solid transparent;
    background: transparent;
    color: var(--color-primary);
    font-size: 1.25rem;
    font-weight: 700;
    text-decoration: none;
    line-height: 1;
  }
  .app-top-bar__back:focus-visible {
    outline: 2px solid var(--color-primary);
    outline-offset: 2px;
  }
  .app-top-bar__pill {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-height: 36px;
    padding: 0.35rem 0.85rem;
    border-radius: 999px;
    border: 1px solid var(--color-border);
    background: var(--color-bg);
    color: var(--color-text);
    font-weight: 600;
    font-size: 0.8rem;
    text-decoration: none;
    white-space: nowrap;
  }
  .app-top-bar__pill:focus-visible {
    outline: 2px solid var(--color-primary);
    outline-offset: 2px;
  }
  .app-top-bar__pill--button {
    cursor: pointer;
    font: inherit;
  }
  .app-top-bar__icon-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 44px;
    height: 44px;
    padding: 0;
    border-radius: 999px;
    border: 1px solid var(--color-border);
    background: var(--color-bg);
    cursor: pointer;
    color: var(--color-text);
  }
  .app-top-bar__icon-btn:focus-visible {
    outline: 2px solid var(--color-primary);
    outline-offset: 2px;
  }
  .app-top-bar__burger {
    display: block;
    width: 18px;
    height: 2px;
    border-radius: 1px;
    background: currentColor;
    box-shadow:
      0 -6px 0 currentColor,
      0 6px 0 currentColor;
  }
  .app-top-bar__menu-wrap {
    position: relative;
  }
  .app-top-bar__dropdown {
    position: absolute;
    top: calc(100% + 6px);
    right: 0;
    min-width: 11rem;
    padding: 0.35rem;
    border-radius: 12px;
    border: 1px solid var(--color-border);
    background: var(--color-surface);
    box-shadow: 0 12px 40px rgba(0, 0, 0, 0.18);
    z-index: 60;
  }
  .app-top-bar__menu-item {
    display: block;
    padding: 0.65rem 0.75rem;
    border-radius: 8px;
    color: var(--color-text);
    font-size: 0.9rem;
    font-weight: 600;
    text-decoration: none;
  }
  .app-top-bar__menu-item:focus-visible {
    outline: 2px solid var(--color-primary);
    outline-offset: 0;
  }
  .app-top-bar__menu-item:hover {
    background: var(--color-primary-highlight);
  }
  .app-top-bar__menu-item--button {
    width: 100%;
    text-align: left;
    border: 0;
    background: transparent;
    font: inherit;
    color: var(--color-danger);
    cursor: pointer;
    min-height: unset;
  }
  .app-top-bar__menu-item--button:hover {
    background: var(--color-primary-highlight);
  }
  .app-top-bar__spacer {
    width: 44px;
    height: 44px;
    flex-shrink: 0;
  }
</style>
