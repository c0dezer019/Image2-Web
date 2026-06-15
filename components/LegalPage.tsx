import Link from "next/link";
import { Footer } from "@/components/Footer";
import { COLORS, FONT_MONO } from "@/lib/theme";

export const SECTION_STYLE: React.CSSProperties = {
  marginBottom: 36,
};

export const SECTION_LABEL_STYLE: React.CSSProperties = {
  fontFamily: FONT_MONO,
  fontSize: 10,
  letterSpacing: "0.28em",
  textTransform: "uppercase",
  color: COLORS.accent,
  marginBottom: 10,
};

export const P_STYLE: React.CSSProperties = {
  fontSize: 15,
  lineHeight: 1.7,
  color: COLORS.text,
  margin: "0 0 12px",
  maxWidth: 720,
};

export const UL_STYLE: React.CSSProperties = {
  fontSize: 15,
  lineHeight: 1.7,
  color: COLORS.text,
  margin: "0 0 12px",
  paddingLeft: 22,
  maxWidth: 720,
};

export const EFFECTIVE_DATE_STYLE: React.CSSProperties = {
  fontFamily: FONT_MONO,
  fontSize: 11,
  letterSpacing: "0.1em",
  textTransform: "uppercase",
  color: COLORS.muted,
  marginBottom: 32,
};

interface LegalPageProps {
  title: string;
  children: React.ReactNode;
}

export function LegalPage({ title, children }: LegalPageProps) {
  return (
    <div style={{ minHeight: "100vh", background: COLORS.bg, color: COLORS.text }}>
      <div style={{ maxWidth: 1000, margin: "0 auto", padding: "46px 40px 120px" }}>
        <nav style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingBottom: 54 }}>
          <Link href="/" style={{ display: "flex", alignItems: "center", gap: 11, textDecoration: "none", color: COLORS.text }}>
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
          </Link>
          <div style={{ fontFamily: FONT_MONO, fontSize: 10, letterSpacing: "0.2em", textTransform: "uppercase", color: COLORS.muted }}>
            The App Foundry
          </div>
        </nav>

        <h1 style={{ fontSize: "clamp(32px, 5vw, 52px)", fontWeight: 700, letterSpacing: "-0.03em", margin: "0 0 12px" }}>
          {title}
        </h1>

        {children}

        <Footer />
      </div>
    </div>
  );
}
