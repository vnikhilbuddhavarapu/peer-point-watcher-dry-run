import { MODEL_DEFINITIONS, MODEL_IDS } from "@peer-point/workshop-config";
import { WorkshopShell } from "@peer-point/workshop-ui";
import { useAgentChat } from "@cloudflare/ai-chat/react";
import { useAgent } from "agents/react";
import { useMemo, useState } from "react";

import type { WatcherAgent } from "../agent/agent.js";
import { createInitialState, type WatcherState } from "../agent/state.js";
import { WatcherDashboard } from "./components/watcher-dashboard.js";
import { toDisplayMessages } from "./lib/messages.js";

export function App() {
  const [state, setState] = useState<WatcherState>(createInitialState());
  const [input, setInput] = useState("");
  const [error, setError] = useState<string>();
  const agent = useAgent<WatcherAgent, WatcherState>({
    agent: "WatcherAgent",
    name: "watcher",
    onStateUpdate: setState,
  });
  const chat = useAgentChat({ agent, syncMessagesToServer: false });
  const messages = useMemo(() => toDisplayMessages(chat.messages), [chat.messages]);
  function checkNow(): void {
    setError(undefined);
    void agent.stub.checkNow().catch(() => setError("Browser check failed."));
  }
  return (
    <WorkshopShell
      aside={
        <WatcherDashboard
          state={state}
          onCheckNow={checkNow}
          onToggleSchedule={() => void agent.stub.toggleSchedule(!state.scheduleEnabled)}
          onToggleEmail={() => void agent.stub.toggleEmail(!state.emailEnabled)}
        />
      }
      description="Watch a deterministic page with Browser Run Quick Actions, keep bounded R2 snapshots, ignore cosmetic timestamps, and alert once per material transition."
      {...(error === undefined ? {} : { error })}
      input={input}
      inputPlaceholder="Ask about the latest observed change…"
      messages={messages}
      models={MODEL_DEFINITIONS}
      onInputChange={setInput}
      onModelChange={() => undefined}
      onReset={() => {
        chat.clearHistory();
        void agent.stub.resetWatcher();
      }}
      onStop={() => void chat.stop()}
      onSubmit={() => {
        const text = input.trim();
        if (!text) return;
        void chat.sendMessage({ text });
        setInput("");
      }}
      resetLabel="Reset watcher"
      selectedModel={MODEL_IDS[5]}
      status={agent.readyState === WebSocket.OPEN ? "ready" : "connecting"}
      title="Watcher Agent"
    />
  );
}
