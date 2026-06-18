export type ReleaseAssets = {
  windows: string;
  linuxAmd64: string;
  linuxArm64: string;
  macArm64: string;
  macX64: string;
};

export type PlatformDownload = { label: string; url: string };

export function detectPlatform(ua: string, assets: ReleaseAssets): PlatformDownload | null {
  if (ua.includes("Windows")) {
    return { label: "Windows x86_64", url: assets.windows };
  }
  if (ua.includes("Linux")) {
    if (ua.includes("aarch64")) {
      return { label: "Linux arm64", url: assets.linuxArm64 };
    }
    return { label: "Linux x86_64", url: assets.linuxAmd64 };
  }
  if (ua.includes("Macintosh")) {
    return { label: "macOS (Apple Silicon)", url: assets.macArm64 };
  }
  return null;
}
