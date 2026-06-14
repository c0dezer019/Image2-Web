/**
 * Reads the natural pixel dimensions of an image file via a temporary
 * `<img>` element + object URL. Used to pre-fill the "Image width/height"
 * controls on upload with the source image's actual dimensions, mirroring
 * the image2 CLI's use of the real image size when deriving cols/rows.
 */
export function getImageDimensions(file: Blob): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not read image dimensions"));
    };
    img.src = url;
  });
}
