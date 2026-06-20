"use client";

import { forwardRef } from "react";
import { COLORS, FONT_MONO } from "@/lib/theme";

interface OutputCanvasProps {
  hasOutput: boolean;
  errorMessage: string | null;
}

const PLACEHOLDER_ART = `        .
       .:.
      .:::.
   ..:::::::..
 .::::::::::::::.
:::::::::::::::::::
 \`::::::::::::::::\`
   \`::::::::::::\`
      \`::::::\`
        \`::\`
         \`\``;

export const OutputCanvas = forwardRef<HTMLCanvasElement, OutputCanvasProps>(
  function OutputCanvas({ hasOutput, errorMessage }, ref) {
    return (
      <div
        style={{
          border: `1px solid ${COLORS.border}`,
          background: COLORS.bg,
          minHeight: 240,
          padding: 24,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflow: "auto",
        }}
      >
        {errorMessage ? (
          <div style={{ fontFamily: FONT_MONO, fontSize: 13, color: COLORS.muted, textAlign: "center" }}>
            {errorMessage}
          </div>
        ) : hasOutput ? (
          <canvas
            ref={ref}
            style={{
              display: "block",
              width: "100%",
              height: "auto",
              maxWidth: "100%",
              minWidth: 0,
            }}
          />
        ) : (
          <div style={{ textAlign: "center" }}>
            <pre
              style={{
                fontFamily: FONT_MONO,
                fontSize: 9,
                lineHeight: 1.15,
                color: "oklch(82% 0.16 182 / 0.28)",
                margin: "0 0 14px",
              }}
            >
              {PLACEHOLDER_ART}
            </pre>
            <div style={{ fontFamily: FONT_MONO, fontSize: 12, letterSpacing: "0.08em", textTransform: "uppercase", color: COLORS.muted }}>
              your forged output appears here
            </div>
          </div>
        )}
      </div>
    );
  },
);
