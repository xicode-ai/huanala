/**
 * 客户端图片压缩工具
 * 使用 OffscreenCanvas API 将图片压缩为 WebP（fallback JPEG），
 * 最大尺寸 1600px，目标 50%+ 体积压缩，针对 OCR 场景优化。
 */

const DEFAULT_WEBP_QUALITY = 0.55;
const FALLBACK_JPEG_QUALITY = 0.6;
const MAX_DIMENSION = 1600;

/**
 * 将 File/Blob 图片压缩为 WebP Blob（不支持时 fallback 到 JPEG）。
 * - 缩放到 MAX_DIMENSION（1600px）以内（保持比例）
 * - 优先输出 WebP（quality 0.55），不支持时 fallback 到 JPEG（quality 0.6）
 * - 启用 high-quality 平滑以保护文字边缘
 *
 * 对于非图片文件直接返回原文件。
 * 返回的 Blob 的 `.type` 属性反映实际输出格式（image/webp 或 image/jpeg）。
 */
export async function compressImage(file: File, quality: number = DEFAULT_WEBP_QUALITY): Promise<Blob> {
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

  // 启用高质量平滑，防止缩放时文字锯齿化影响 OCR
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  // 优先 WebP 输出，检测实际格式以处理不支持 WebP 的运行环境
  const blob = await canvas.convertToBlob({ type: 'image/webp', quality });

  if (blob.type === 'image/webp') {
    return blob;
  }

  // WebP 不支持 — fallback 到 JPEG
  const jpegBlob = await canvas.convertToBlob({ type: 'image/jpeg', quality: FALLBACK_JPEG_QUALITY });
  return jpegBlob;
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
