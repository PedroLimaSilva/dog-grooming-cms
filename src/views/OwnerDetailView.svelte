<script lang="ts">
  import { liveQuery } from 'dexie'
  import { onMount } from 'svelte'
  import type { DogRecord, OwnerRecord } from '../db'
  import { db, deleteOwner, upsertOwner } from '../db'
  import { navigateTo } from '../lib/hashRoute'
  import { resetTopNav, setTopNav, type OverflowAction } from '../lib/topNav'
  import { phoneDigitsForWhatsApp, whatsAppChatUrl } from '../lib/whatsapp'

  type Props = { mode: 'new' | 'edit'; ownerId?: number }

  let { mode, ownerId }: Props = $props()

  let owner = $state<OwnerRecord | undefined>(undefined)
  let dogs = $state<DogRecord[]>([])
  let loaded = $state(false)

  let name = $state('')
  let phone = $state('')
  let err = $state('')
  let saving = $state(false)

  onMount(() => {
    let sOwner: { unsubscribe: () => void } | undefined
    let sDogs: { unsubscribe: () => void } | undefined

    if (mode === 'edit' && ownerId != null) {
      sOwner = liveQuery(() => db.owners.get(ownerId)).subscribe({
        next: (v) => {
          owner = v
          loaded = true
        },
      })
      sDogs = liveQuery(async () => {
        const rows = await db.dogs.where('primaryOwnerId').equals(ownerId).toArray()
        return rows.sort((a, b) => a.name.localeCompare(b.name))
      }).subscribe({
        next: (v) => {
          dogs = v
        },
      })
    }

    return () => {
      sOwner?.unsubscribe()
      sDogs?.unsubscribe()
    }
  })

  $effect(() => {
    if (mode !== 'edit' || !owner) return
    name = owner.name
    phone = owner.phone ?? ''
  })

  async function save() {
    err = ''
    if (!name.trim() || !phone.trim()) {
      err = 'Name and phone are required.'
      return
    }
    saving = true
    try {
      const id = await upsertOwner({
        id: mode === 'edit' ? ownerId : undefined,
        name: name.trim(),
        phone: phone.trim(),
      })
      navigateTo({ name: 'owners', segment: { id } })
    } catch (e) {
      err = e instanceof Error ? e.message : 'Could not save.'
    } finally {
      saving = false
    }
  }

  async function remove() {
    if (mode !== 'edit' || ownerId == null) return
    if (!owner) return
    if (!confirm(`Delete ${owner.name}?`)) return
    err = ''
    try {
      await deleteOwner(ownerId)
      navigateTo({ name: 'owners', segment: 'list' })
    } catch (e) {
      err = e instanceof Error ? e.message : 'Could not delete.'
    }
  }

  const whatsAppOwnerHref = $derived.by(() => {
    if (!phoneDigitsForWhatsApp(phone)) return ''
    return whatsAppChatUrl(phone, `Hi ${name.trim() || 'there'}, `)
  })

  $effect(() => {
    const overflow: OverflowAction[] =
      mode === 'edit'
        ? [
            ...(whatsAppOwnerHref
              ? [
                  {
                    label: 'Message owner',
                    href: whatsAppOwnerHref,
                    external: true,
                  },
                ]
              : []),
            {
              label: 'Add dog',
              href: '#/dogs/new',
            },
            {
              label: 'Delete owner',
              onclick: () => void remove(),
              danger: true,
            },
          ]
        : []

    setTopNav({
      title: mode === 'new' ? 'New owner' : owner?.name || name.trim() || 'Owner',
      onSave: () => void save(),
      saving,
      overflow,
    })
    return resetTopNav
  })
</script>

<div class="panel">
  {#if mode === 'edit' && ownerId != null && !loaded}
    <p class="empty-hint">Loading…</p>
  {:else if mode === 'edit' && ownerId != null && loaded && owner === undefined}
    <p class="empty-hint">This owner may have been removed.</p>
  {:else}
    <form
      onsubmit={(e) => {
        e.preventDefault()
        void save()
      }}
    >
      <div class="field">
        <label for="oname">Name</label>
        <input id="oname" bind:value={name} autocomplete="name" />
      </div>
      <div class="field">
        <label for="ophone">Phone</label>
        <input id="ophone" bind:value={phone} type="tel" autocomplete="tel" />
      </div>
      {#if err}<p class="error-text">{err}</p>{/if}
    </form>

    {#if mode === 'edit' && owner?.id != null}
      <h2 class="sub">Dogs</h2>
      {#if dogs.length === 0}
        <p class="empty-hint subtle">No dogs yet for this owner.</p>
      {:else}
        {#each dogs as d (d.id)}
          {#if d.id != null}
            <a class="list-card list-card-link" href="#/dogs/{d.id}">
              <h3>{d.name}</h3>
              <p>{d.breed}</p>
            </a>
          {/if}
        {/each}
      {/if}
    {/if}
  {/if}
</div>

<style>
  .panel {
    padding: 0 0 1rem;
    max-width: 560px;
    margin: 0 auto;
  }
  .sub {
    margin: 1.5rem 0 0.75rem;
    font-size: 1rem;
  }
  .list-card-link {
    display: block;
    text-decoration: none;
    color: inherit;
    margin-bottom: 0.5rem;
  }
  .list-card-link h3 {
    margin: 0 0 0.25rem;
    font-size: 1rem;
    font-weight: 700;
  }
  .subtle {
    padding-top: 0;
  }
</style>
