<script lang="ts">
  import type { BootstrapCounts } from "../lib/dropbox/bootstrap";
  import type { SyncFilePayload } from "../lib/dropbox/syncPayload";
  import { payloadHasAnyData } from "../lib/dropbox/syncPayload";

  type Props = {
    local: BootstrapCounts;
    remoteCounts: BootstrapCounts;
    remote: SyncFilePayload;
    onClose: () => void;
    onConfirm: (
      mode: "remote_only" | "local_only" | "merge_both",
    ) => Promise<void>;
  };

  let { local, remoteCounts, remote, onClose, onConfirm }: Props = $props();

  let includeRemote = $state(true);
  let includeLocal = $state(true);
  let busy = $state(false);
  let err = $state("");

  const remoteEmpty = $derived(!payloadHasAnyData(remote));

  function deriveMode(): "remote_only" | "local_only" | "merge_both" | null {
    if (!includeRemote && !includeLocal) return null;
    if (includeRemote && !includeLocal) return "remote_only";
    if (!includeRemote && includeLocal) return "local_only";
    return "merge_both";
  }

  async function submit() {
    const mode = deriveMode();
    if (!mode) return;
    err = "";
    busy = true;
    try {
      await onConfirm(mode);
      onClose();
    } catch (e) {
      err = e instanceof Error ? e.message : String(e);
    } finally {
      busy = false;
    }
  }
</script>

<div
  class="backdrop"
  role="dialog"
  aria-modal="true"
  aria-labelledby="sync-choice-title"
  tabindex="-1"
  onclick={(e) => e.target === e.currentTarget && !busy && onClose()}
  onkeydown={(e) => e.key === "Escape" && !busy && onClose()}
>
  <div class="modal">
    <h2 id="sync-choice-title">Choose what to keep</h2>
    <p class="intro">
      This device and Dropbox both have data. Pick which sources to include,
      then continue. Merge is the safest default when you are unsure.
    </p>

    <div class="summary">
      <div class="summary-card">
        <h3>This device</h3>
        <ul>
          <li>Owners: <strong>{local.owners}</strong></li>
          <li>Dogs: <strong>{local.dogs}</strong></li>
          <li>Appointments: <strong>{local.appointments}</strong></li>
        </ul>
      </div>
      <div class="summary-card">
        <h3>Dropbox file</h3>
        <ul>
          <li>Owners: <strong>{remoteCounts.owners}</strong></li>
          <li>Dogs: <strong>{remoteCounts.dogs}</strong></li>
          <li>Appointments: <strong>{remoteCounts.appointments}</strong></li>
        </ul>
      </div>
    </div>

    <fieldset class="choices">
      <legend class="sr-only">Sources to include</legend>
      <label class="check">
        <input type="checkbox" bind:checked={includeRemote} disabled={busy} />
        Include Dropbox data
      </label>
      <label class="check">
        <input type="checkbox" bind:checked={includeLocal} disabled={busy} />
        Include this device
      </label>
    </fieldset>

    <ul class="outcomes">
      <li>
        <strong>Dropbox only</strong> replaces this device with the Dropbox
        snapshot{remoteEmpty ? " (will clear local data)." : "."}
      </li>
      <li>
        <strong>This device only</strong> uploads here and can overwrite what is in
        Dropbox — other devices may lose unsynced changes.
      </li>
      <li>
        <strong>Both</strong> merges rows (new IDs where needed), then uploads one
        combined file.
      </li>
    </ul>

    {#if err}
      <p class="error-text">{err}</p>
    {/if}

    <div class="row-actions">
      <button type="button" disabled={busy} onclick={() => onClose()}
        >Not now</button
      >
      <button
        type="button"
        class="primary"
        disabled={busy || deriveMode() == null}
        onclick={() => void submit()}
      >
        {busy ? "Working…" : "Continue"}
      </button>
    </div>
  </div>
</div>

<style>
  .backdrop {
    position: fixed;
    inset: 0;
    z-index: 80;
    display: flex;
    align-items: flex-end;
    justify-content: center;
    padding: var(--safe-top) 0.75rem calc(0.75rem + var(--safe-bottom));
    background: rgba(0, 0, 0, 0.4);
  }
  @media (min-width: 560px) {
    .backdrop {
      align-items: center;
    }
  }
  .modal {
    width: 100%;
    max-width: 440px;
    max-height: min(88dvh, 720px);
    overflow: auto;
    padding: 1.1rem 1.15rem calc(1rem + var(--safe-bottom));
    border-radius: 16px 16px 0 0;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    box-shadow: 0 -12px 40px rgba(0, 0, 0, 0.18);
  }
  @media (min-width: 560px) {
    .modal {
      border-radius: 16px;
      padding: 1.25rem;
    }
  }
  h2 {
    margin: 0 0 0.5rem;
    font-size: 1.1rem;
  }
  .intro {
    margin: 0 0 1rem;
    font-size: 0.9rem;
    color: var(--color-muted);
    line-height: 1.45;
  }
  .summary {
    display: grid;
    gap: 0.5rem;
    margin-bottom: 1rem;
  }
  @media (min-width: 400px) {
    .summary {
      grid-template-columns: 1fr 1fr;
    }
  }
  .summary-card {
    padding: 0.65rem 0.75rem;
    border-radius: 12px;
    border: 1px solid var(--color-border);
    background: var(--color-bg);
  }
  .summary-card h3 {
    margin: 0 0 0.35rem;
    font-size: 0.78rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: var(--color-muted);
  }
  .summary-card ul {
    margin: 0;
    padding-left: 1rem;
    font-size: 0.88rem;
    color: var(--color-text);
  }
  .choices {
    margin: 0 0 0.75rem;
    padding: 0;
    border: 0;
  }
  .check {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0.45rem;
    font-weight: 600;
    font-size: 0.9rem;
    cursor: pointer;
  }
  .check input {
    width: 1.1rem;
    height: 1.1rem;
    min-height: 0;
    min-width: 0;
  }
  .outcomes {
    margin: 0 0 1rem;
    padding-left: 1.1rem;
    font-size: 0.82rem;
    color: var(--color-muted);
    line-height: 1.45;
  }
  .outcomes strong {
    color: var(--color-text);
  }
  .row-actions {
    display: flex;
    flex-wrap: wrap;
    justify-content: flex-end;
    gap: 0.5rem;
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
</style>
