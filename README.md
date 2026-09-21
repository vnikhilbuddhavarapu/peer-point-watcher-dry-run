# Watcher Agent

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/vnikhilbuddhavarapu/peer-point-card-5-watcher)

Build an Agent that watches a rendered page, stores bounded snapshot metadata, detects meaningful changes without reacting to cosmetic churn, and emits one alert per transition.

## Learning objective

Use Browser Run, R2, durable Agent state, and Think scheduled tasks as one reliable monitoring loop. The starter already produces a safe baseline; your work is the decision and automation logic.

## What is already complete

- Think Agent, Workers AI model, AI Gateway metadata, chat, and WebSocket state updates
- Browser Run content extraction and screenshot capture
- A manual **Check now** path that extracts the stable page marker and stores snapshot metadata in R2
- Strict, bounded Zod schemas for targets, snapshots, alerts, and durable state
- Watcher dashboard, alert history, independent schedule/email switches, logging, and observability
- Email off by default; no email is sent by the base starter

A first manual check is a baseline, not a change. It should work before you edit anything.

## What you build

Edit only these three primary files:

1. `src/services/materiality.ts` — compare stable material state while ignoring cosmetic timestamps.
2. `src/agent/state.ts` — suppress a repeated `oldKey` to `newKey` alert transition.
3. `src/agent/agent.ts` — declare a scheduled check and honor `scheduleEnabled` in its handler.

Search for `WORKSHOP TASK` to find each incomplete implementation. Keep the existing schemas, bounds, Browser Run extraction, manual R2 write, and error handling.

Email delivery is optional stretch work and must remain off unless you explicitly configure it.

## First successful run

The lab deployment flow provisions the Worker bindings. For local development:

```bash
npm ci
npm run verify
npm run dev
```

Open the local URL, wait for the target to appear, and select **Check now**. Confirm that:

- the dashboard shows one saved baseline;
- the material key came from the rendered deterministic page;
- no alert was emitted for the first observation; and
- the check completed without changing any workshop task code.

Suggested Agent prompt:

```text
Check the watched page now. Tell me the material key and whether this was a baseline or a material change.
```

## Contracts

### Browser observation

```ts
interface PageObservation {
  materialKey: string;
  cosmeticTimestamp: string | null;
  browserMs: number | null;
}
```

`materialKey` is the stable page state. `cosmeticTimestamp` is evidence that may change on every render and must not decide materiality.

### Manual check result

```ts
type CheckResult = {
  material: boolean;
  materialKey: string;
  alertCreated: boolean;
};
```

Every successful check appends bounded snapshot metadata and writes JSON to `SNAPSHOTS`. The first observation establishes the baseline. A later meaningful transition may append an alert.

### Alert identity

```ts
type AlertTransition = {
  oldKey: string;
  newKey: string;
};
```

Two alerts with the same `oldKey` and `newKey` are duplicates even when their `createdAt` values differ.

### Scheduled task

Return a `ThinkScheduledTasks` declaration from `getScheduledTasks()`. Use a bounded retry policy and call the existing `checkNow()` path only when `this.state.scheduleEnabled` is true. Do not create a second monitoring implementation.

## Base checklist

- [ ] The first observation remains a non-alerting baseline.
- [ ] Equal material keys compare as unchanged even when cosmetic timestamps differ.
- [ ] Different material keys compare as a material change.
- [ ] A repeated old-to-new transition creates only one alert.
- [ ] Scheduled checks use `checkNow()` and respect the schedule switch.
- [ ] Manual Browser Run extraction and R2 snapshot storage still work.
- [ ] `npm run verify` passes.

## Stretch checklist

- [ ] Store and display screenshot history.
- [ ] Replace marker extraction with bounded structured extraction.
- [ ] Add an optional email notification for newly created alerts only, with email off by default.

## Test and deploy

```bash
npm run test
npm run typecheck
npm run build
npm run deploy
```

After deployment, run two manual checks before enabling the schedule. Demo the baseline, a material transition, cosmetic timestamp suppression, and a repeated transition that does not add another alert. If scheduled execution is unavailable, use **Check now** as the supported fallback.

## Common failures

- **`MATERIAL_KEY_NOT_FOUND`**: verify that the configured target is the workshop market-cycle page and that Browser Run can render it.
- **Browser content or screenshot status error**: retry once, then use the manual fallback and ask an instructor to check Browser Run entitlement.
- **R2 binding or bucket error**: confirm `SNAPSHOTS` is bound in the assigned lab account; do not substitute credentials in source.
- **Schedule switch is on but no checks run**: confirm `getScheduledTasks()` returns a declaration and that its handler checks durable state before calling `checkNow()`.
- **Duplicate alerts**: compare transition identity, not timestamps or array object identity.

## Security constraints

- Do not add secrets, account IDs, R2 credentials, private endpoints, or email addresses to source or logs.
- Keep target URL validation restricted to HTTP and HTTPS.
- Keep page content and retained state bounded; never store the full rendered page in durable state.
- Keep structured logs free of prompts, page bodies, credentials, and email content.
- Do not remove generated binding types, schema validation, observability, or the manual fallback.

## Start with Peer Point OS

After the Deploy to Cloudflare flow creates your repository and first deployment, give the generated Git URL to Peer Point OS with this prompt:

```text
Clone this repository in an isolated Container MCP environment. Read the complete README before editing. Run npm ci and npm run verify to establish a baseline. Implement a working Watcher Agent using the required Cloudflare primitives and preserving its safety constraints. You may choose a different architecture from the suggested path. Run focused tests and npm run verify, inspect the diff, then push through the GitHub gatekeeper. Do not claim success until verification passes. After the push, inspect Workers Builds and give me the deployed URL and demo checklist.
```

## Start with your own IDE

```bash
npm ci
npm run verify
npm run dev
```

Before pushing or deploying:

```bash
npm run verify
```

Deploy only to the temporary lab account assigned for the event.
