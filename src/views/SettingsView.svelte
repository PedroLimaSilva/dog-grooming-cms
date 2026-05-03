<script lang="ts">
  import { Cloud, CloudOff, Info, RefreshCw } from "@lucide/svelte";
  import { onMount } from "svelte";
  import {
    clearDropboxSyncPrefs,
    readDropboxSyncPrefs,
    isDropboxLinked,
    type DropboxSyncPrefs,
  } from "../lib/dropboxSyncPrefs";
  import {
    beginDropboxAuthorization,
    getDropboxAppKey,
  } from "../lib/dropbox/oauth";
  import { syncDropboxNow } from "../lib/dropbox/manualSync";
  import {
    clearBootstrapOAuthError,
    readBootstrapOAuthError,
  } from "../lib/dropbox/bootstrap";
  import { resetTopNav } from "../lib/topNav";
  import { APP_VERSION } from "../lib/appVersion";

  let prefs = $state<DropboxSyncPrefs>(readDropboxSyncPrefs());
  let connectBusy = $state(false);
  let syncBusy = $state(false);
  let flashError = $state("");
  let flashOk = $state("");

  const connected = $derived(isDropboxLinked());
  const appKeyConfigured = $derived(getDropboxAppKey().length > 0);

  onMount(() => {
    const oauthErr = readBootstrapOAuthError();
    if (oauthErr) {
      flashError = oauthErr;
      clearBootstrapOAuthError();
    }
    return () => resetTopNav();
  });

  function refreshPrefs() {
    prefs = readDropboxSyncPrefs();
  }

  async function connectDropbox() {
    flashError = "";
    flashOk = "";
    if (!appKeyConfigured) {
      flashError =
        "Add VITE_DROPBOX_APP_KEY to .env locally, or as a GitHub Actions repository secret for Pages builds (see .env.example), then rebuild/redeploy.";
      return;
    }
    connectBusy = true;
    try {
      await beginDropboxAuthorization();
    } catch (e) {
      flashError = e instanceof Error ? e.message : String(e);
    } finally {
      connectBusy = false;
    }
  }

  async function syncNow() {
    flashError = "";
    flashOk = "";
    syncBusy = true;
    try {
      const result = await syncDropboxNow({
        confirmRemotePull: () =>
          confirm(
            "Dropbox has newer changes. Pull them to this device before uploading? This replaces the current data on this device with the Dropbox copy.",
          ),
      });
      if (result.kind === "cancelled") return;
      flashOk =
        result.kind === "pulled"
          ? "Pulled the latest Dropbox changes to this device."
          : "Dropbox is up to date.";
      refreshPrefs();
    } catch (e) {
      flashError = e instanceof Error ? e.message : String(e);
    } finally {
      syncBusy = false;
    }
  }

  function disconnectDropbox() {
    if (!connected) return;
    if (
      !confirm(
        "Disconnect Dropbox on this device? Local data stays; automatic upload stops.",
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

  {#if flashError}
    <p class="banner error">{flashError}</p>
  {/if}
  {#if flashOk}
    <p class="banner ok">{flashOk}</p>
  {/if}

  <section class="card" aria-labelledby="sync-heading">
    <div class="card-head">
      <h2 id="sync-heading">Dropbox sync</h2>
      {#if connected}
        <span class="badge badge-on">On</span>
      {:else}
        <span class="badge">Off</span>
      {/if}
    </div>

    {#if connected}
      <p class="status-line">
        <Cloud size={18} strokeWidth={2.2} aria-hidden="true" />
        Signed in{prefs.accountLabel ? ` as ${prefs.accountLabel}` : ""}.
        {#if prefs.linkedAt}
          <span class="muted"
            >Connected {new Date(prefs.linkedAt).toLocaleString()}.</span
          >
        {/if}
      </p>
      <p class="hint">
        Local changes upload automatically after a short delay. Sync now checks
        Dropbox first; if another device has newer changes, this device pulls
        them before uploading.
      </p>
      <div class="row-actions">
        <button
          type="button"
          class="primary"
          disabled={syncBusy}
          onclick={() => void syncNow()}
        >
          <RefreshCw size={18} strokeWidth={2.2} aria-hidden="true" />
          {syncBusy ? "Syncing…" : "Sync now"}
        </button>
        <button type="button" class="danger" onclick={disconnectDropbox}>
          <CloudOff size={18} strokeWidth={2.2} aria-hidden="true" />
          Disconnect
        </button>
      </div>
    {:else}
      <p class="hint">
        Sign in with Dropbox (PKCE, no app secret in the browser). Data is
        stored as <strong>grooming-data.json</strong> in the app folder only.
      </p>
      {#if !appKeyConfigured}
        <p class="warn">
          Local dev: set <code>VITE_DROPBOX_APP_KEY</code> in <code>.env</code>
          and restart Vite. GitHub Pages: add the same name as a
          <strong>repository secret</strong> (Actions → Secrets), because Vite
          bakes it in at build time — the Pages UI does not inject it. Then push
          to redeploy. Match your live URL as a Dropbox redirect URI (see
          <code>.env.example</code>).
        </p>
      {/if}
      <div class="row-actions">
        <button
          type="button"
          class="primary"
          disabled={connectBusy}
          onclick={() => void connectDropbox()}
        >
          {connectBusy ? "Redirecting…" : "Connect Dropbox"}
        </button>
      </div>
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

  <footer class="app-version" aria-label="App version">
    Version {APP_VERSION}
  </footer>
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
  .banner {
    margin: 0 0 1rem;
    padding: 0.65rem 0.85rem;
    border-radius: 10px;
    font-size: 0.88rem;
    line-height: 1.4;
  }
  .banner.error {
    background: color-mix(in srgb, var(--color-danger) 12%, transparent);
    color: var(--color-danger);
    border: 1px solid color-mix(in srgb, var(--color-danger) 35%, transparent);
  }
  .banner.ok {
    background: var(--color-primary-soft-bg);
    color: var(--color-primary);
    border: 1px solid var(--color-primary-soft-border);
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
  .warn {
    margin: 0 0 1rem;
    font-size: 0.85rem;
    color: var(--color-muted);
    line-height: 1.45;
  }
  .warn code {
    font-size: 0.8rem;
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
  .app-version {
    margin-top: 2rem;
    padding-top: 1rem;
    border-top: 1px solid var(--color-border);
    font-size: 0.78rem;
    color: var(--color-muted);
    text-align: center;
  }
</style>
