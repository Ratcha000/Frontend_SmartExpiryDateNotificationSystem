import type { OcrImage } from './types';

export { OcrError } from './types';
export type { OcrImage, OcrProvider } from './types';
export { prepareImage, type GuideBoxRect } from './prepareImage';

/** ตอนนี้ใช้ provider ตัวไหนอยู่ — เอาไว้โชว์ตอน debug */
export const activeProviderName =
  process.env.EXPO_PUBLIC_OCR_PROVIDER === 'mlkit' ? 'ml-kit' : 'ocr.space';

/**
 * จุดสลับ OCR engine จุดเดียวของทั้งแอป — คุมด้วย EXPO_PUBLIC_OCR_PROVIDER ใน .env
 *   cloud (ค่าเริ่มต้น) = OCR.space ผ่าน HTTP → รันบน Expo Go ได้
 *   mlkit               = ML Kit ในเครื่อง   → ต้องมี development build
 *
 * ⚠️ ต้องเป็น dynamic import() เท่านั้น ห้ามย้ายไป import บนสุดของไฟล์
 * เพราะ mlkit.ts อ้างถึง native module ที่ไม่มีใน Expo Go ถ้า import ตรงๆ
 * bundle จะพังตั้งแต่ตอนโหลดแอป แม้จะไม่ได้เรียกใช้ก็ตาม
 */
export async function runOcr(image: OcrImage): Promise<string> {
  if (process.env.EXPO_PUBLIC_OCR_PROVIDER === 'mlkit') {
    const { mlkitProvider } = await import('./mlkit');
    return mlkitProvider.runOcr(image);
  }
  const { cloudProvider } = await import('./cloud');
  return cloudProvider.runOcr(image);
}
