import Link from "next/link";
import { COLORS, FONT_MONO } from "@/lib/theme";

const LINK_STYLE: React.CSSProperties = {
  color: COLORS.muted,
  textDecoration: "none",
};

export function Footer() {
  return (
    <footer
      style={{
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 16,
        marginTop: 64,
        paddingTop: 24,
        borderTop: `1px solid ${COLORS.border}`,
        fontFamily: FONT_MONO,
        fontSize: 10,
        letterSpacing: "0.18em",
        textTransform: "uppercase",
        color: COLORS.muted,
      }}
    >
      <span>The App Foundry</span>
      <div style={{ display: "flex", gap: 20 }}>
        <Link href="/terms" style={LINK_STYLE}>
          Terms
        </Link>
        <Link href="/eula" style={LINK_STYLE}>
          EULA
        </Link>
        <Link href="/privacy" style={LINK_STYLE}>
          Privacy
        </Link>
      </div>
    </footer>
  );
}
