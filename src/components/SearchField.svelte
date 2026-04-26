<script lang="ts">
  import Search from '@lucide/svelte/icons/search'

  type Props = {
    value?: string
    placeholder?: string
    label?: string
  }

  let { value = $bindable(''), placeholder = 'Search', label = 'Search' }: Props = $props()
</script>

<label class="search-field">
  <span class="sr-only">{label}</span>
  <span class="search-icon" aria-hidden="true">
    <Search size={18.4} stroke-width={2} absoluteStrokeWidth />
  </span>
  <input type="search" bind:value {placeholder} autocomplete="off" spellcheck="false" />
</label>

<style>
  .search-field {
    position: relative;
    display: block;
    margin: 0 0 1rem;
  }

  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }

  .search-icon {
    position: absolute;
    top: 50%;
    left: 0.85rem;
    width: 1.15rem;
    height: 1.15rem;
    color: var(--color-muted);
    fill: none;
    stroke: currentColor;
    stroke-width: 2;
    stroke-linecap: round;
    stroke-linejoin: round;
    transform: translateY(-50%);
    pointer-events: none;
  }

  input {
    min-height: 48px;
    padding-left: 2.65rem;
    border-radius: 999px;
    background: var(--color-surface);
    box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.02);
  }

  input::-webkit-search-cancel-button {
    cursor: pointer;
  }
</style>
