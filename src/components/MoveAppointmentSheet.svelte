<script lang="ts">
  import type { AppointmentRecord, DogRecord } from "../db";
  import type { GroomingServiceLine } from "../types";
  import { deleteAppointment, updateAppointment } from "../db";

  type Props = {
    open: boolean;
    appointment: AppointmentRecord | null;
    dogs: DogRecord[];
    onclose: () => void;
    onsaved: () => void;
  };

  let { open, appointment, dogs, onclose, onsaved }: Props = $props();

  let dogId = $state<number | "">("");
  let startLocal = $state("");
  /** Length of visit in minutes; end = start + duration */
  let durationMinutes = $state(60);
  let notes = $state("");
  let bath = $state(false);
  let cut = $state(false);
  let nail = $state(false);
  let accessory = $state(false);
  let accessoryNote = $state("");
  let saving = $state(false);
  let err = $state("");

  function toLocalInput(ms: number): string {
    const d = new Date(ms);
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  function fromLocalInput(s: string): number {
    return new Date(s).getTime();
  }

  function readLines(): GroomingServiceLine[] {
    const out: GroomingServiceLine[] = [];
    if (bath) out.push({ kind: "bath" });
    if (cut) out.push({ kind: "cut" });
    if (nail) out.push({ kind: "nail_trim" });
    if (accessory)
      out.push({
        kind: "accessory_purchase",
        accessoryNote: accessoryNote || undefined,
      });
    return out.length ? out : [{ kind: "bath" }];
  }

  function applyLines(services: GroomingServiceLine[]) {
    bath = services.some((s) => s.kind === "bath");
    cut = services.some((s) => s.kind === "cut");
    nail = services.some((s) => s.kind === "nail_trim");
    const ap = services.find((s) => s.kind === "accessory_purchase");
    accessory = !!ap;
    accessoryNote =
      ap && ap.kind === "accessory_purchase" ? (ap.accessoryNote ?? "") : "";
  }

  $effect(() => {
    if (open && appointment?.id != null) {
      err = "";
      dogId = appointment.dogId;
      startLocal = toLocalInput(appointment.start);
      durationMinutes = Math.max(
        5,
        Math.round((appointment.end - appointment.start) / 60_000) || 60,
      );
      notes = appointment.notes ?? "";
      applyLines(appointment.services ?? [{ kind: "bath" }]);
    }
  });

  const computedEndMs = $derived.by(() => {
    if (!startLocal) return 0;
    const start = fromLocalInput(startLocal);
    const d = Number(durationMinutes);
    if (!Number.isFinite(d) || d < 5) return start;
    return start + d * 60_000;
  });

  async function save() {
    if (!appointment?.id) return;
    err = "";
    if (dogId === "") {
      err = "Choose a dog.";
      return;
    }
    const start = fromLocalInput(startLocal);
    const d = Number(durationMinutes);
    if (!Number.isFinite(d) || d < 5) {
      err = "Duration must be at least 5 minutes.";
      return;
    }
    const end = start + d * 60_000;
    saving = true;
    try {
      await updateAppointment({
        id: appointment.id,
        dogId: Number(dogId),
        start,
        end,
        services: readLines(),
        notes: notes.trim() || undefined,
      });
      onsaved();
      onclose();
    } catch (e) {
      err = e instanceof Error ? e.message : "Could not save.";
    } finally {
      saving = false;
    }
  }

  async function remove() {
    if (!appointment?.id) return;
    if (!confirm("Delete this appointment?")) return;
    saving = true;
    try {
      await deleteAppointment(appointment.id);
      onsaved();
      onclose();
    } catch (e) {
      err = e instanceof Error ? e.message : "Could not delete.";
    } finally {
      saving = false;
    }
  }
</script>

{#if open && appointment}
  <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
  <div
    class="sheet-backdrop"
    role="presentation"
    onclick={onclose}
    onkeydown={(e) => e.key === "Escape" && onclose()}
  >
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <div
      class="sheet"
      role="dialog"
      tabindex="-1"
      aria-modal="true"
      aria-labelledby="move-title"
      onclick={(e) => e.stopPropagation()}
      onkeydown={(e) => e.stopPropagation()}
    >
      <h2 id="move-title">Appointment</h2>

      <div class="field">
        <label for="mdog">Dog</label>
        <select id="mdog" bind:value={dogId}>
          {#each dogs as d (d.id)}
            {#if d.id != null}
              <option value={d.id}>{d.name}</option>
            {/if}
          {/each}
        </select>
      </div>

      <div class="field">
        <label for="mstart">Start</label>
        <input id="mstart" type="datetime-local" bind:value={startLocal} />
      </div>
      <div class="field">
        <label for="mdur">Duration (minutes)</label>
        <input
          id="mdur"
          type="number"
          min="5"
          step="5"
          bind:value={durationMinutes}
        />
        <p class="end-preview">
          Ends {new Date(computedEndMs).toLocaleString([], {
            dateStyle: "medium",
            timeStyle: "short",
          })}
        </p>
      </div>

      <fieldset>
        <legend>Services</legend>
        <label class="inline"
          ><input type="checkbox" bind:checked={bath} /> Bath</label
        >
        <label class="inline"
          ><input type="checkbox" bind:checked={cut} /> Cut</label
        >
        <label class="inline"
          ><input type="checkbox" bind:checked={nail} /> Nail trim</label
        >
        <label class="inline"
          ><input type="checkbox" bind:checked={accessory} /> Accessory</label
        >
        {#if accessory}
          <div class="field">
            <label for="macc">Accessory note</label>
            <input id="macc" bind:value={accessoryNote} />
          </div>
        {/if}
      </fieldset>

      <div class="field">
        <label for="mnotes">Notes</label>
        <textarea id="mnotes" rows="2" bind:value={notes}></textarea>
      </div>

      {#if err}<p class="error-text">{err}</p>{/if}

      <div class="row-actions">
        <button type="button" class="primary" onclick={save} disabled={saving}
          >Save</button
        >
        <button type="button" onclick={onclose}>Close</button>
        <button type="button" class="danger" onclick={remove} disabled={saving}
          >Delete</button
        >
      </div>
    </div>
  </div>
{/if}

<style>
  .end-preview {
    margin: 0.4rem 0 0;
    font-size: 0.875rem;
    color: var(--color-muted);
  }
  fieldset {
    border: 1px solid var(--color-border);
    border-radius: 12px;
    padding: 0.75rem 1rem 1rem;
    margin: 0 0 1rem;
  }
  legend {
    padding: 0 0.35rem;
    font-weight: 600;
    font-size: 0.875rem;
  }
  .inline {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-weight: normal;
    margin-bottom: 0.35rem;
    min-height: 44px;
  }
  .inline input {
    width: auto;
    min-height: auto;
  }
</style>
