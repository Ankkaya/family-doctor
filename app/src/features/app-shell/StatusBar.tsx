export function StatusBar() {
  return (
    <div
      aria-hidden
      className="shrink-0"
      style={{ paddingTop: "max(env(safe-area-inset-top), 0px)" }}
    />
  );
}

