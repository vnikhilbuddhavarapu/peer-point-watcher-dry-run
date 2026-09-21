import { Think, type ThinkScheduledTasks } from "@cloudflare/think";
import { callable } from "agents";
import type { LanguageModel } from "ai";

import { createWatcherModel } from "./model.js";
import {
  appendAlert,
  appendSnapshot,
  createInitialState,
  setEmailEnabled,
  setScheduleEnabled,
  setWatcherStatus,
  watcherStateSchema,
  type WatcherState,
} from "./state.js";
import { isMaterialChange } from "../services/materiality.js";
import { captureScreenshot, observePage } from "../services/browser.js";
import { log } from "../shared/logger.js";

export class WatcherAgent extends Think<Env, WatcherState> {
  override initialState = createInitialState();
  override includeMcpTools = false;
  override workspaceBash = false;
  override sendReasoning = false;
  override storeMessages = false;
  override storeTools = false;

  override getModel(): LanguageModel {
    return createWatcherModel(this.env);
  }

  override getScheduledTasks(): ThinkScheduledTasks {
    // WORKSHOP TASK: Add a declarative scheduled check that respects scheduleEnabled.
    return {};
  }

  override validateStateChange(nextState: WatcherState): void {
    watcherStateSchema.parse(nextState);
  }

  @callable()
  async checkNow(): Promise<{ material: boolean; materialKey: string; alertCreated: boolean }> {
    const target = this.target();
    this.setState(setWatcherStatus(this.state, "checking"));
    try {
      const observation = await observePage(this.env.BROWSER, target);
      const capturedAt = new Date().toISOString();
      const previous = this.state.snapshots.at(-1) ?? null;
      const material = isMaterialChange(previous, observation);
      const snapshot = {
        materialKey: observation.materialKey,
        cosmeticTimestamp: observation.cosmeticTimestamp,
        capturedAt,
      };
      let next = appendSnapshot(this.state, snapshot);
      const alertCount = next.alerts.length;
      if (previous && material) {
        next = appendAlert(next, {
          oldKey: previous.materialKey,
          newKey: observation.materialKey,
          createdAt: capturedAt,
        });
      }
      const alertCreated = next.alerts.length > alertCount;
      next = setWatcherStatus(next, material ? "changed" : "unchanged");
      this.setState(next);
      await this.env.SNAPSHOTS.put(
        `watcher/${capturedAt.replaceAll(":", "-")}-${observation.materialKey}.json`,
        JSON.stringify({
          target,
          ...snapshot,
          browserMs: observation.browserMs,
          material,
          alertCreated,
        }),
        { httpMetadata: { contentType: "application/json" } },
      );
      log({
        event: "watch_check",
        outcome: "success",
        material,
        alertCreated,
        browserMs: observation.browserMs,
      });
      return { material, materialKey: observation.materialKey, alertCreated };
    } catch (error) {
      this.setState(setWatcherStatus(this.state, "error"));
      log({
        event: "watch_check",
        outcome: "failure",
        errorCode: error instanceof Error ? error.message : "UNKNOWN",
      });
      throw error;
    }
  }

  @callable()
  toggleSchedule(enabled: boolean): boolean {
    this.setState(setScheduleEnabled(this.state, enabled));
    return enabled;
  }

  @callable()
  toggleEmail(enabled: boolean): boolean {
    this.setState(setEmailEnabled(this.state, enabled));
    return enabled;
  }

  @callable()
  async captureCurrentScreenshot(): Promise<{ key: string }> {
    const response = await captureScreenshot(this.env.BROWSER, this.target());
    const key = `watcher/screenshots/${new Date().toISOString().replaceAll(":", "-")}.png`;
    await this.env.SNAPSHOTS.put(key, await response.arrayBuffer(), {
      httpMetadata: { contentType: "image/png" },
    });
    return { key };
  }

  @callable()
  getWatcherState(): WatcherState {
    return watcherStateSchema.parse(this.state);
  }

  @callable()
  resetWatcher(): WatcherState {
    const next = createInitialState(this.target());
    this.setState(next);
    return next;
  }

  private target(): string {
    const configured = new URL(this.env.WATCH_PATH, this.env.MOCK_PAGE_BASE_URL).href;
    if (!this.state.target) {
      this.setState(watcherStateSchema.parse({ ...this.state, target: configured }));
    }
    return configured;
  }
}
