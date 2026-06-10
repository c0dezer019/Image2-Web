import { COLORS, FONT_MONO } from "@/lib/theme";

export default function Home() {
  return (
    <div style={{ minHeight: "100vh", background: COLORS.bg, color: COLORS.text, position: "relative", overflow: "hidden" }}>
      <div
        style={{
          position: "fixed",
          inset: "-72px",
          pointerEvents: "none",
          opacity: 0.5,
          backgroundImage: `linear-gradient(${COLORS.accentDim} 1px, transparent 1px), linear-gradient(90deg, ${COLORS.accentDim} 1px, transparent 1px)`,
          backgroundSize: "72px 72px",
          animation: "gridDrift 36s linear infinite",
        }}
      />
      <div
        style={{
          position: "fixed",
          inset: 0,
          pointerEvents: "none",
          background: `radial-gradient(120% 80% at 50% -10%, transparent 50%, ${COLORS.bg} 100%)`,
        }}
      />
      <div style={{ position: "relative", zIndex: 2, maxWidth: 1000, margin: "0 auto", padding: "46px 40px 120px" }}>
        <nav style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingBottom: 54 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
            <div
              style={{
                width: 24,
                height: 24,
                border: `1px solid ${COLORS.accent}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: FONT_MONO,
                fontSize: 12,
                color: COLORS.accent,
              }}
            >
              &gt;
            </div>
            <div style={{ fontFamily: FONT_MONO, fontSize: 13, letterSpacing: "0.18em", textTransform: "uppercase", fontWeight: 500 }}>
              Image2
            </div>
          </div>
          <div style={{ fontFamily: FONT_MONO, fontSize: 10, letterSpacing: "0.2em", textTransform: "uppercase", color: COLORS.muted }}>
            The App Foundry
          </div>
        </nav>

        <header style={{ textAlign: "center", paddingBottom: 44 }}>
          <div style={{ fontFamily: FONT_MONO, fontSize: 10, letterSpacing: "0.28em", textTransform: "uppercase", color: COLORS.accent, marginBottom: 18 }}>
            01 / IMAGE &rarr; TEXT ART
          </div>
          <h1 style={{ fontSize: "clamp(38px, 5.6vw, 68px)", fontWeight: 700, letterSpacing: "-0.035em", lineHeight: 0.96, margin: "0 0 18px" }}>
            Turn any image
            <br />
            into text art.
          </h1>
          <p style={{ maxWidth: 470, margin: "0 auto", fontSize: 17, lineHeight: 1.5, color: COLORS.muted }}>
            Drop a picture below. We forge it into crisp ASCII or full-color ANSI — tune it, then copy or export.
          </p>
        </header>
      </div>
    </div>
  );
}
