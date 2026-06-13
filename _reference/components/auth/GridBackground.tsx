export function GridBackground() {
  return (
    <div
      aria-hidden
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        backgroundImage: [
          "linear-gradient(rgba(155, 90, 76, 0.08) 1px, transparent 1px)",
          "linear-gradient(90deg, rgba(155, 90, 76, 0.08) 1px, transparent 1px)",
        ].join(", "),
        backgroundSize: "28px 28px, 28px 28px",
      }}
    />
  );
}
