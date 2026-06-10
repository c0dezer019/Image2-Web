"use client";

import { useRef, useState } from "react";
import { COLORS } from "@/lib/theme";
import { createSampleImageBlob } from "@/lib/sample-image";
import { validateImageFile } from "@/lib/validate";

interface DropZoneProps {
  fileName: string | null;
  onFile: (file: File) => void;
  onError: (message: string) => void;
}

export function DropZone({ fileName, onFile, onError }: DropZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  function handleFiles(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    const result = validateImageFile(file);
    if (!result.ok) {
      onError(result.error ?? "Invalid file");
      return;
    }
    onFile(file);
  }

  async function handleSample() {
    const blob = await createSampleImageBlob();
    onFile(new File([blob], "sample.png", { type: "image/png" }));
  }

  const borderColor = dragging ? COLORS.accent : "oklch(72% 0.02 240 / 0.45)";
  const bgColor = dragging ? "oklch(82% 0.16 182 / 0.08)" : COLORS.accentFaint;

  return (
    <div>
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          setDragging(false);
        }}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          handleFiles(e.dataTransfer.files);
        }}
        style={{
          border: `1.5px dashed ${borderColor}`,
          background: bgColor,
          borderRadius: 0,
          padding: "54px 24px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 14,
          cursor: "pointer",
          textAlign: "center",
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          style={{ display: "none" }}
          onChange={(e) => handleFiles(e.target.files)}
        />
        <div
          style={{
            width: 46,
            height: 46,
            border: `1px solid ${COLORS.accent}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={COLORS.accent} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 16V4M7 9l5-5 5 5" />
            <path d="M4 17v2a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-2" />
          </svg>
        </div>
        <div style={{ fontSize: 16, fontWeight: 500 }}>
          {fileName ?? "Drag & drop an image here"}
        </div>
        <div style={{ fontSize: 13, color: COLORS.muted }}>
          {fileName ? "click to replace · PNG, JPG, GIF, WebP" : "PNG, JPG, GIF, WebP — up to 10MB"}
        </div>
        <div
          style={{
            border: `1px solid ${COLORS.accent}`,
            color: COLORS.accent,
            fontSize: 12,
            padding: "6px 14px",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
          }}
        >
          Browse files
        </div>
      </div>
      <div style={{ textAlign: "right", marginTop: 10 }}>
        <button
          onClick={handleSample}
          style={{
            background: "none",
            border: "none",
            color: COLORS.muted,
            textDecoration: "underline",
            cursor: "pointer",
            fontSize: 13,
            padding: 0,
          }}
        >
          or try a sample image
        </button>
      </div>
    </div>
  );
}
