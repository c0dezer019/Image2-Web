export function drawSampleScene(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  const sky = ctx.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, "#0a1a3a");
  sky.addColorStop(1, "#b8632a");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);

  const sunX = w * 0.5;
  const sunY = h * 0.42;
  const sun = ctx.createRadialGradient(sunX, sunY, 8, sunX, sunY, 90);
  sun.addColorStop(0, "#fff3c4");
  sun.addColorStop(0.5, "#ffcf5c");
  sun.addColorStop(1, "rgba(255,180,60,0)");
  ctx.fillStyle = sun;
  ctx.beginPath();
  ctx.arc(sunX, sunY, 90, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#1a0f24";
  ctx.fillRect(0, h * 0.85, w, h * 0.15);

  ctx.fillStyle = "#2a1530";
  ctx.beginPath();
  ctx.moveTo(0, h);
  ctx.lineTo(w * 0.18, h * 0.62);
  ctx.lineTo(w * 0.36, h * 0.8);
  ctx.lineTo(w * 0.55, h * 0.55);
  ctx.lineTo(w * 0.78, h * 0.82);
  ctx.lineTo(w, h * 0.66);
  ctx.lineTo(w, h);
  ctx.closePath();
  ctx.fill();
}

export function createSampleImageBlob(): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = 420;
  canvas.height = 300;
  const ctx = canvas.getContext("2d");
  if (!ctx) return Promise.reject(new Error("Canvas not supported"));
  drawSampleScene(ctx, canvas.width, canvas.height);
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error("Failed to create sample image"));
        return;
      }
      resolve(blob);
    });
  });
}
