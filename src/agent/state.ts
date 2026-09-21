import { z } from "zod";

import {
  isMaterialChange,
  materialKeySchema,
  type MaterialObservation,
} from "../services/materiality.js";

export const SNAPSHOT_LIMIT = 24;
export const ALERT_LIMIT = 24;

const timestampSchema = z.string().max(40).datetime({ offset: true });

export const targetSchema = z
  .string()
  .trim()
  .min(1)
  .max(2_048)
  .url()
  .refine((target) => {
    const protocol = new URL(target).protocol;
    return protocol === "http:" || protocol === "https:";
  }, "Target must use HTTP or HTTPS")
  .nullable();
export type WatchTarget = z.infer<typeof targetSchema>;

export const watcherStatusSchema = z.enum(["idle", "checking", "unchanged", "changed", "error"]);
export type WatcherStatus = z.infer<typeof watcherStatusSchema>;

export const snapshotSchema = z
  .object({
    materialKey: materialKeySchema,
    capturedAt: timestampSchema,
    cosmeticTimestamp: timestampSchema.nullable(),
  })
  .strict();
export type Snapshot = z.infer<typeof snapshotSchema>;

export const alertSchema = z
  .object({
    oldKey: materialKeySchema,
    newKey: materialKeySchema,
    createdAt: timestampSchema,
  })
  .strict()
  .refine((alert) => alert.oldKey !== alert.newKey, {
    message: "An alert must represent a material transition",
    path: ["newKey"],
  });
export type Alert = z.infer<typeof alertSchema>;

function sameTransition(left: Alert, right: Alert): boolean {
  return left.oldKey === right.oldKey && left.newKey === right.newKey;
}

export const watcherStateSchema = z
  .object({
    target: targetSchema,
    status: watcherStatusSchema,
    scheduleEnabled: z.boolean(),
    emailEnabled: z.boolean(),
    snapshots: z.array(snapshotSchema).max(SNAPSHOT_LIMIT),
    latestAlert: alertSchema.nullable(),
    alerts: z.array(alertSchema).max(ALERT_LIMIT),
  })
  .strict()
  .superRefine((state, context) => {
    const lastAlert = state.alerts.at(-1) ?? null;
    if (
      (state.latestAlert === null) !== (lastAlert === null) ||
      (state.latestAlert !== null &&
        lastAlert !== null &&
        !sameTransition(state.latestAlert, lastAlert)) ||
      (state.latestAlert !== null &&
        lastAlert !== null &&
        state.latestAlert.createdAt !== lastAlert.createdAt)
    ) {
      context.addIssue({
        code: "custom",
        message: "latestAlert must equal the last retained alert",
        path: ["latestAlert"],
      });
    }
  });
export type WatcherState = z.infer<typeof watcherStateSchema>;

export function createInitialState(target: WatchTarget = null): WatcherState {
  return watcherStateSchema.parse({
    target,
    status: "idle",
    scheduleEnabled: false,
    emailEnabled: false,
    snapshots: [],
    latestAlert: null,
    alerts: [],
  });
}

function updated(state: WatcherState, patch: Partial<WatcherState>): WatcherState {
  return watcherStateSchema.parse({ ...state, ...patch });
}

export function setTarget(state: WatcherState, target: WatchTarget): WatcherState {
  return updated(state, { target: targetSchema.parse(target) });
}

export function setWatcherStatus(state: WatcherState, status: WatcherStatus): WatcherState {
  return updated(state, { status: watcherStatusSchema.parse(status) });
}

export function setScheduleEnabled(state: WatcherState, enabled: boolean): WatcherState {
  return updated(state, { scheduleEnabled: z.boolean().parse(enabled) });
}

export function setEmailEnabled(state: WatcherState, enabled: boolean): WatcherState {
  return updated(state, { emailEnabled: z.boolean().parse(enabled) });
}

export function appendSnapshot(state: WatcherState, untrustedSnapshot: Snapshot): WatcherState {
  const snapshot = snapshotSchema.parse(untrustedSnapshot);
  return updated(state, {
    snapshots: [...state.snapshots, snapshot].slice(-SNAPSHOT_LIMIT),
  });
}

export function appendAlert(state: WatcherState, untrustedAlert: Alert): WatcherState {
  const alert = alertSchema.parse(untrustedAlert);

  // WORKSHOP TASK: Suppress an alert when this old-to-new transition was already emitted.
  const alerts = [...state.alerts, alert].slice(-ALERT_LIMIT);
  return updated(state, { alerts, latestAlert: alerts.at(-1) ?? null });
}

export function appendMaterialAlert(
  state: WatcherState,
  previous: MaterialObservation | null,
  current: MaterialObservation,
  createdAt = new Date().toISOString(),
): WatcherState {
  if (!isMaterialChange(previous, current) || previous === null) return state;
  return appendAlert(state, {
    oldKey: materialKeySchema.parse(previous.materialKey),
    newKey: materialKeySchema.parse(current.materialKey),
    createdAt,
  });
}
