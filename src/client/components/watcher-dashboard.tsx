import type { Alert, Snapshot, WatcherState, WatcherStatus } from "../../agent/state.js";

interface WatcherDashboardProps {
  state: WatcherState;
  onCheckNow: () => void;
  onToggleSchedule: () => void;
  onToggleEmail: () => void;
}

function formatTimestamp(timestamp: string): string {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  }).format(new Date(timestamp));
}

function statusLabel(status: WatcherStatus): string {
  return status.replace(/^\w/u, (letter) => letter.toUpperCase());
}

function statusTone(status: WatcherStatus): "active" | "error" | "neutral" | "success" {
  if (status === "checking") return "active";
  if (status === "error") return "error";
  if (status === "changed" || status === "unchanged") return "success";
  return "neutral";
}

function SnapshotPanel({ snapshots }: { snapshots: readonly Snapshot[] }) {
  const latest = snapshots.at(-1);
  const previous = snapshots.at(-2);
  const changed = previous !== undefined && previous.materialKey !== latest?.materialKey;

  return (
    <section className="watcher-panel watcher-snapshot" aria-labelledby="watcher-snapshot-title">
      <header className="watcher-panel__header">
        <div>
          <p>Page evidence</p>
          <h2 id="watcher-snapshot-title">Latest snapshot</h2>
        </div>
        <span aria-label={`${String(snapshots.length)} snapshots`}>{snapshots.length} saved</span>
      </header>
      {latest === undefined ? (
        <p className="watcher-empty">No snapshots yet. Run a check to capture the target page.</p>
      ) : (
        <div className="watcher-snapshot__body">
          <div className="watcher-snapshot__meta">
            <div>
              <span>Captured</span>
              <time dateTime={latest.capturedAt}>{formatTimestamp(latest.capturedAt)}</time>
            </div>
            <div>
              <span>Material state</span>
              <code>{latest.materialKey}</code>
            </div>
            {latest.cosmeticTimestamp ? (
              <div>
                <span>Page timestamp</span>
                <time dateTime={latest.cosmeticTimestamp}>
                  {formatTimestamp(latest.cosmeticTimestamp)}
                </time>
              </div>
            ) : null}
          </div>
          <div className={`watcher-change watcher-change--${changed ? "material" : "quiet"}`}>
            <strong>
              {changed
                ? "Material change detected"
                : previous === undefined
                  ? "Baseline captured"
                  : "No material change"}
            </strong>
            <p>
              {changed && previous
                ? `${previous.materialKey} → ${latest.materialKey}`
                : previous === undefined
                  ? "Future checks will compare against this material state."
                  : "The material state is unchanged; cosmetic timestamps do not trigger alerts."}
            </p>
          </div>
        </div>
      )}
    </section>
  );
}

function AlertTransition({ alert }: { alert: Alert }) {
  return (
    <>
      <strong>
        {alert.oldKey} → {alert.newKey}
      </strong>
      <time dateTime={alert.createdAt}>{formatTimestamp(alert.createdAt)}</time>
    </>
  );
}

function AlertPanel({ latestAlert, alerts }: Pick<WatcherState, "latestAlert" | "alerts">) {
  return (
    <section className="watcher-panel watcher-alerts" aria-labelledby="watcher-alerts-title">
      <header className="watcher-panel__header">
        <div>
          <p>Material changes</p>
          <h2 id="watcher-alerts-title">Alert history</h2>
        </div>
        <span aria-label={`${String(alerts.length)} alerts`}>{alerts.length} total</span>
      </header>
      <div className="watcher-latest-alert" aria-live="polite">
        <span>Latest alert</span>
        {latestAlert ? (
          <AlertTransition alert={latestAlert} />
        ) : (
          <strong>No alert emitted yet</strong>
        )}
      </div>
      {alerts.length === 0 ? (
        <p className="watcher-empty">No alerts yet. Material changes will appear here.</p>
      ) : (
        <ol className="watcher-alert-list">
          {[...alerts].reverse().map((alert) => (
            <li key={`${alert.oldKey}-${alert.newKey}-${alert.createdAt}`}>
              <div>
                <AlertTransition alert={alert} />
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

export function WatcherDashboard({
  state,
  onCheckNow,
  onToggleSchedule,
  onToggleEmail,
}: WatcherDashboardProps) {
  const isChecking = state.status === "checking";

  return (
    <div className="watcher-dashboard">
      <section className="watcher-panel watcher-target" aria-labelledby="watcher-target-title">
        <header className="watcher-panel__header">
          <div>
            <p>Monitored page</p>
            <h2 id="watcher-target-title">Watch target</h2>
          </div>
          <span
            className={`watcher-status watcher-status--${statusTone(state.status)}`}
            aria-live="polite"
          >
            {statusLabel(state.status)}
          </span>
        </header>
        <div className="watcher-target__body">
          <div className="watcher-target__identity">
            {state.target ? (
              <a href={state.target} target="_blank" rel="noreferrer">
                {state.target}
              </a>
            ) : (
              <strong>No target configured</strong>
            )}
          </div>
          <button type="button" onClick={onCheckNow} disabled={isChecking || !state.target}>
            {isChecking ? "Checking…" : "Check now"}
          </button>
        </div>
      </section>

      <section className="watcher-panel watcher-controls" aria-labelledby="watcher-controls-title">
        <header className="watcher-panel__header">
          <div>
            <p>Automation</p>
            <h2 id="watcher-controls-title">Monitoring controls</h2>
          </div>
        </header>
        <div className="watcher-control-list">
          <label>
            <span>
              <strong>Scheduled checks</strong>
              <small id="watcher-schedule-help">
                Run checks automatically on the configured cadence.
              </small>
            </span>
            <input
              type="checkbox"
              role="switch"
              checked={state.scheduleEnabled}
              aria-describedby="watcher-schedule-help"
              onChange={onToggleSchedule}
            />
          </label>
          <label>
            <span>
              <strong>Email alerts</strong>
              <small id="watcher-email-help">
                Send email only when a material change creates an alert.
              </small>
            </span>
            <input
              type="checkbox"
              role="switch"
              checked={state.emailEnabled}
              aria-describedby="watcher-email-help"
              onChange={onToggleEmail}
            />
          </label>
        </div>
      </section>

      <SnapshotPanel snapshots={state.snapshots} />
      <AlertPanel latestAlert={state.latestAlert} alerts={state.alerts} />
    </div>
  );
}
