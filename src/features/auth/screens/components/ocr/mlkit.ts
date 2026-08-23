import { OcrError, type OcrImage, type OcrProvider } from './types';
import type { TextRecognitionResult } from '@react-native-ml-kit/text-recognition';

/**
 * OCR ในเครื่องด้วย Google ML Kit — เร็ว ฟรี ไม่ต้องต่อเน็ต
 *
 * ⚠️ ใช้กับ Expo Go ไม่ได้ ต้องทำ development build ก่อน:
 *     npx expo install expo-dev-client
 *     eas build -p android --profile development
 * แล้วตั้ง EXPO_PUBLIC_OCR_PROVIDER=mlkit ใน .env
 *
 * ไฟล์นี้ถูกโหลดผ่าน dynamic import เท่านั้น (ดู index.ts) บน Expo Go จึงไม่ถูกแตะเลย
 */
export const mlkitProvider: OcrProvider = {
  name: 'ml-kit',

  async runOcr(image: OcrImage): Promise<string> {
    const TextRecognition = require('@react-native-ml-kit/text-recognition').default;

    let result: TextRecognitionResult;
    try {
      result = await TextRecognition.recognize(image.uri);
    } catch (error: any) {
      // ตัว native module ยังไม่ถูก link — เกิดเมื่อรันบน Expo Go หรือยังไม่ได้ rebuild
      if (String(error?.message).includes("doesn't seem to be linked")) {
        throw new OcrError(
          'ML Kit ยังใช้งานไม่ได้บนแอปตัวนี้ — ต้องรันบน development build ' +
            'หรือเปลี่ยน EXPO_PUBLIC_OCR_PROVIDER กลับเป็น cloud'
        );
      }
      throw error;
    }

    return flattenInReadingOrder(result);
  },
};

/**
 * ML Kit คืนผลเป็น block > line ซึ่งลำดับไม่ได้เรียงจากบนลงล่างเสมอไป
 * แต่ backend ให้คะแนนจากตำแหน่ง keyword ที่อยู่ "ก่อนหน้า" วันที่
 * จึงต้องเรียงบรรทัดตามพิกัดจริงบนรูปก่อน ไม่งั้น EXP อาจไปอยู่หลังวันที่ แล้วได้วันผลิตมาแทน
 */
function flattenInReadingOrder(result: TextRecognitionResult): string {
  const lines: { text: string; top: number; left: number }[] = [];

  for (const block of result?.blocks ?? []) {
    for (const line of block?.lines ?? []) {
      if (!line?.text) continue;
      // บาง platform ไม่ส่ง frame มา — ถอยไปใช้ข้อความรวมที่ ML Kit จัดลำดับมาให้
      if (!line.frame) return (result?.text ?? '').trim();
      lines.push({ text: line.text, top: line.frame.top, left: line.frame.left });
    }
  }

  if (lines.length === 0) return (result?.text ?? '').trim();

  lines.sort((a, b) => (a.top === b.top ? a.left - b.left : a.top - b.top));
  return lines.map((l) => l.text).join('\n').trim();
}
