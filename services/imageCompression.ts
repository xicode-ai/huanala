/**
 * 客户端图片压缩工具
 * 使用 Canvas API 将图片压缩为 JPEG，质量 0.7（约 83% 体积缩减）
 */

const DEFAULT_QUALITY = 0.7;
const MAX_DIMENSION = 2048;

/**
 * 将 File/Blob 图片压缩为 JPEG Blob。
 * - 缩放到 MAX_DIMENSION 以内（保持比例）
 * - 输出 JPEG，quality 0.65~0.8（默认 0.7）
 *
 * 对于非图片文件直接返回原文件。
 */
export async function compressImage(file: File, quality: number = DEFAULT_QUALITY): Promise<Blob> {
  if (!file.type.startsWith('image/')) {
    return file;
  }

  const bitmap = await createImageBitmap(file);
  const { width, height } = scaleToFit(bitmap.width, bitmap.height, MAX_DIMENSION);

  const canvas = new OffscreenCanvas(width, height);
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    // OffscreenCanvas 2d not supported — return original
    bitmap.close();
    return file;
  }

  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const blob = await canvas.convertToBlob({ type: 'image/jpeg', quality });
  return blob;
}

function scaleToFit(w: number, h: number, max: number): { width: number; height: number } {
  if (w <= max && h <= max) {
    return { width: w, height: h };
  }
  const ratio = Math.min(max / w, max / h);
  return {
    width: Math.round(w * ratio),
    height: Math.round(h * ratio),
  };
}
