import { describe, expect, it } from "vitest";

import { appendSnapshot, createInitialState, setScheduleEnabled } from "../src/agent/state.js";
import { parsePageContent } from "../src/services/browser.js";
import { isMaterialChange, materialStateEqual } from "../src/services/materiality.js";

describe("watcher starter", () => {
  it("extracts the stable key used by the manual Browser Run baseline", () => {
    expect(
      parsePageContent(
        '<meta name="mock-material-key" content="market-cycle:42"><time datetime="2026-09-21T18:30:00.000Z" data-cosmetic-timestamp>18:30 UTC</time>',
      ),
    ).toEqual({
      materialKey: "market-cycle:42",
      cosmeticTimestamp: "2026-09-21T18:30:00.000Z",
    });
  });

  it("stores a bounded baseline without treating the first observation as a change", () => {
    const observation = { materialKey: "market-cycle:42" };
    const state = appendSnapshot(createInitialState(), {
      ...observation,
      capturedAt: "2026-09-21T18:30:01.000Z",
      cosmeticTimestamp: "2026-09-21T18:30:00.000Z",
    });

    expect(isMaterialChange(null, observation)).toBe(false);
    expect(state.snapshots).toHaveLength(1);
    expect(state.snapshots[0]?.materialKey).toBe("market-cycle:42");
    expect(state.alerts).toEqual([]);
  });

  it("keeps schedule and email optional and off by default", () => {
    const initial = createInitialState();
    const scheduled = setScheduleEnabled(initial, true);

    expect(initial.scheduleEnabled).toBe(false);
    expect(initial.emailEnabled).toBe(false);
    expect(scheduled.scheduleEnabled).toBe(true);
    expect(scheduled.emailEnabled).toBe(false);
  });

  it.todo("detects a changed material key while ignoring cosmetic timestamp churn");
  it.todo("suppresses a repeated old-key to new-key alert transition");
  it.todo("runs the existing check path on schedule only when scheduling is enabled");

  it("validates both material keys at the comparison boundary", () => {
    expect(() =>
      materialStateEqual({ materialKey: "" }, { materialKey: "market-cycle:42" }),
    ).toThrow();
    expect(() =>
      materialStateEqual({ materialKey: "market-cycle:42" }, { materialKey: "" }),
    ).toThrow();
  });
});
