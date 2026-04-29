<script lang="ts">
  import { Cloud, CloudOff, Info } from "@lucide/svelte";
  import { onMount } from "svelte";
  import {
    clearDropboxSyncPrefs,
    readDropboxSyncPrefs,
    writeDropboxSyncPrefs,
    type DropboxSyncPrefs,
  } from "../lib/dropboxSyncPrefs";
  import { resetTopNav } from "../lib/topNav";

  let prefs = $state<DropboxSyncPrefs>(readDropboxSyncPrefs());
  let connectBusy = $state(false);

  onMount(() => {
    return () => resetTopNav();
  });

  function refreshPrefs() {
    prefs = readDropboxSyncPrefs();
  }

  async function connectDropbox() {
    connectBusy = true;
    try {
      // OAuth + PKCE will replace this stub; prefs persist UI until then.
      await new Promise((r) => setTimeout(r, 400));
      writeDropboxSyncPrefs({
        linked: true,
        accountLabel: "Dropbox (demo)",
        linkedAt: new Date().toISOString(),
      });
      refreshPrefs();
    } finally {
      connectBusy = false;
    }
  }

  function disconnectDropbox() {
    if (!prefs.linked) return;
    if (
      !confirm(
        "Disconnect Dropbox on this device? Local data stays; sync and automatic upload stop.",
      )
    )
      return;
    clearDropboxSyncPrefs();
    refreshPrefs();
  }
</script>

<div class="panel">
  <p class="lede">
    Back up and sync your salon across devices using a single file in your
    Dropbox app folder.
  </p>

  <section class="card" aria-labelledby="sync-heading">
    <div class="card-head">
      <h2 id="sync-heading">Dropbox sync</h2>
      {#if prefs.linked}
        <span class="badge badge-on">On</span>
      {:else}
        <span class="badge">Off</span>
      {/if}
    </div>

    {#if prefs.linked}
      <p class="status-line">
        <Cloud size={18} strokeWidth={2.2} aria-hidden="true" />
        Linked{prefs.accountLabel ? ` as ${prefs.accountLabel}` : ""}.
        {#if prefs.linkedAt}
          <span class="muted"
            >Connected {new Date(prefs.linkedAt).toLocaleString()}.</span
          >
        {/if}
      </p>
      <p class="hint">
        When OAuth is wired up, local changes will upload here automatically
        (debounced). You can disconnect anytime; your data remains on this
        device.
      </p>
      <div class="row-actions">
        <button type="button" class="danger" onclick={disconnectDropbox}>
          <CloudOff size={18} strokeWidth={2.2} aria-hidden="true" />
          Disconnect Dropbox
        </button>
      </div>
    {:else}
      <p class="hint">
        Sign in with Dropbox to store <strong>grooming-data.json</strong> under the
        app folder only. The app never sees your full Dropbox.
      </p>
      <div class="row-actions">
        <button
          type="button"
          class="primary"
          disabled={connectBusy}
          onclick={connectDropbox}
        >
          {connectBusy ? "Connecting…" : "Connect Dropbox"}
        </button>
      </div>
      <p class="fineprint">
        Dropbox sign-in (OAuth with PKCE) will replace this placeholder once the
        app is registered.
      </p>
    {/if}
  </section>

  <section class="callout" aria-label="Privacy">
    <Info size={18} strokeWidth={2.2} aria-hidden="true" />
    <div>
      <strong>Privacy</strong>
      <p>
        Only the Dropbox app folder is used. Salon data leaves this device only
        through that authenticated file.
      </p>
    </div>
  </section>
</div>

<style>
  .panel {
    max-width: 560px;
    margin: 0 auto;
    padding: 0.75rem;
  }
  .lede {
    margin: 0 0 1.25rem;
    color: var(--color-muted);
    font-size: 0.95rem;
  }
  .card {
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 14px;
    padding: 1rem 1.1rem;
    margin-bottom: 1rem;
  }
  .card-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
    margin-bottom: 0.75rem;
  }
  .card h2 {
    margin: 0;
    font-size: 1.05rem;
    font-weight: 700;
  }
  .badge {
    font-size: 0.72rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    padding: 0.2rem 0.5rem;
    border-radius: 999px;
    border: 1px solid var(--color-border);
    color: var(--color-muted);
  }
  .badge-on {
    border-color: var(--color-primary-soft-border);
    background: var(--color-primary-soft-bg);
    color: var(--color-primary);
  }
  .status-line {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.35rem;
    margin: 0 0 0.5rem;
    font-weight: 600;
  }
  .status-line :global(svg) {
    flex-shrink: 0;
    color: var(--color-primary);
  }
  .hint {
    margin: 0 0 1rem;
    font-size: 0.9rem;
    color: var(--color-muted);
    line-height: 1.45;
  }
  .fineprint {
    margin: 0.75rem 0 0;
    font-size: 0.8rem;
    color: var(--color-muted);
    line-height: 1.4;
  }
  .muted {
    display: block;
    width: 100%;
    margin-top: 0.25rem;
    font-weight: 400;
    font-size: 0.85rem;
    color: var(--color-muted);
  }
  .row-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    margin-top: 0;
  }
  .row-actions button {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
  }
  .callout {
    display: flex;
    gap: 0.65rem;
    align-items: flex-start;
    padding: 0.85rem 1rem;
    border-radius: 12px;
    border: 1px solid var(--color-primary-soft-border);
    background: var(--color-primary-soft-bg);
    color: var(--color-text);
    font-size: 0.88rem;
  }
  .callout :global(svg) {
    flex-shrink: 0;
    margin-top: 0.1rem;
    color: var(--color-primary);
  }
  .callout strong {
    display: block;
    margin-bottom: 0.2rem;
    font-size: 0.82rem;
  }
  .callout p {
    margin: 0;
    color: var(--color-muted);
    line-height: 1.45;
  }
</style>
