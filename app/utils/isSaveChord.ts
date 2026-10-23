export function isSaveChord(event: { key: string; ctrlKey: boolean; metaKey: boolean; altKey: boolean; shiftKey: boolean }) {
  return event.key === "Enter" && (event.ctrlKey || event.metaKey) && !event.altKey && !event.shiftKey
}
