export function log(fields: Record<string, unknown>): void {
  console.log({ city: "montreal", card: "watcher", environment: "solution", ...fields });
}
