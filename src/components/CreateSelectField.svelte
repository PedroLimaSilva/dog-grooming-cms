<script lang="ts" generics="Item extends { id?: number }">

  type Props = {
    id: string
    label: string
    items: Item[]
    selectedId?: number | ''
    placeholder?: string
    createLabel?: string
    emptyLabel?: string
    getLabel: (item: Item) => string
    getDetail?: (item: Item) => string
    oncreate: (name: string) => Promise<number>
  }

  let {
    id,
    label,
    items,
    selectedId = $bindable<number | ''>(''),
    placeholder = 'Search…',
    createLabel = 'Create',
    emptyLabel = 'No matches',
    getLabel,
    getDetail,
    oncreate,
  }: Props = $props()

  let query = $state('')
  let focused = $state(false)
  let creating = $state(false)
  let err = $state('')

  const normalizedQuery = $derived(query.trim().toLocaleLowerCase())
  const selectedItem = $derived.by(() => {
    if (selectedId === '') return undefined
    return items.find((item) => item.id === Number(selectedId))
  })
  const filteredItems = $derived.by(() => {
    if (!normalizedQuery) return items.slice(0, 8)
    return items
      .filter((item) => {
        const detail = getDetail?.(item) ?? ''
        return [getLabel(item), detail].some((value) => value.toLocaleLowerCase().includes(normalizedQuery))
      })
      .slice(0, 8)
  })
  const exactMatch = $derived.by(() =>
    items.some((item) => getLabel(item).trim().toLocaleLowerCase() === normalizedQuery),
  )
  const canCreate = $derived(normalizedQuery.length > 0 && !exactMatch)
  const listOpen = $derived(focused && (filteredItems.length > 0 || canCreate || items.length === 0))

  $effect(() => {
    if (!selectedItem) return
    query = getLabel(selectedItem)
  })

  function choose(item: Item) {
    if (item.id == null) return
    selectedId = item.id
    query = getLabel(item)
    focused = false
    err = ''
  }

  async function createFromQuery() {
    const name = query.trim()
    if (!name || creating) return
    err = ''
    creating = true
    try {
      const newId = await oncreate(name)
      selectedId = newId
      query = name
      focused = false
    } catch (e) {
      err = e instanceof Error ? e.message : 'Could not create.'
    } finally {
      creating = false
    }
  }

  function onInput() {
    selectedId = ''
    err = ''
  }
</script>

<div
  class="create-select"
  onfocusout={(e) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node | null)) focused = false
  }}
>
  <label for={id}>{label}</label>
  <input
    {id}
    bind:value={query}
    {placeholder}
    autocomplete="off"
    role="combobox"
    aria-expanded={listOpen}
    aria-controls="{id}-list"
    aria-autocomplete="list"
    onfocus={() => (focused = true)}
    oninput={onInput}
    onkeydown={(e) => {
      if (e.key === 'Enter' && canCreate) {
        e.preventDefault()
        void createFromQuery()
      }
      if (e.key === 'Escape') focused = false
    }}
  />

  {#if listOpen}
    <div id="{id}-list" class="menu" role="listbox">
      {#each filteredItems as item (item.id)}
        {#if item.id != null}
          <button
            type="button"
            role="option"
            aria-selected={selectedId === item.id}
            class="option"
            onpointerdown={(e) => e.preventDefault()}
            onclick={() => choose(item)}
          >
            <span>{getLabel(item)}</span>
            {#if getDetail?.(item)}
              <small>{getDetail?.(item)}</small>
            {/if}
          </button>
        {/if}
      {/each}
      {#if canCreate}
        <button
          type="button"
          class="option create"
          onpointerdown={(e) => e.preventDefault()}
          onclick={createFromQuery}
          disabled={creating}
        >
          {creating ? 'Creating…' : `${createLabel} "${query.trim()}"`}
        </button>
      {:else if filteredItems.length === 0}
        <p class="empty">{emptyLabel}</p>
      {/if}
    </div>
  {/if}

  {#if err}<p class="error-text">{err}</p>{/if}
</div>

<style>
  .create-select {
    position: relative;
  }
  .menu {
    position: absolute;
    z-index: 60;
    top: calc(100% + 0.25rem);
    left: 0;
    right: 0;
    max-height: 240px;
    overflow: auto;
    padding: 0.35rem;
    border: 1px solid var(--color-border);
    border-radius: 12px;
    background: var(--color-surface);
    box-shadow: 0 16px 36px rgba(0, 0, 0, 0.18);
  }
  .option {
    display: block;
    width: 100%;
    min-height: 42px;
    min-width: 0;
    padding: 0.55rem 0.65rem;
    border: 0;
    border-radius: 10px;
    background: transparent;
    color: var(--color-text);
    text-align: left;
  }
  .option:hover,
  .option:focus {
    background: var(--color-primary-soft-bg);
    color: var(--color-primary);
  }
  .option span {
    display: block;
    font-weight: 700;
  }
  .option small {
    display: block;
    margin-top: 0.1rem;
    color: var(--color-muted);
  }
  .create {
    font-weight: 700;
    color: var(--color-primary);
  }
  .empty {
    margin: 0;
    padding: 0.55rem 0.65rem;
    color: var(--color-muted);
    font-size: 0.875rem;
  }
</style>
