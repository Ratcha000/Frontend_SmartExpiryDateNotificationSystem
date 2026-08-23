import { OcrError, type OcrImage, type OcrProvider } from './types';

const ENDPOINT = 'https://api.ocr.space/parse/image';

/** OCR.space จำกัดไฟล์ 1MB ต่อรูปในแพ็กฟรี — base64 พองขึ้นราว 4/3 เท่าของไฟล์จริง */
const MAX_BASE64_LENGTH = 1_400_000;

/**
 * OCR ผ่าน REST API ของ OCR.space
 * ใช้ตอนรันบน Expo Go เพราะไม่ต้องพึ่ง native module — เป็นแค่ HTTP request
 * ขอ key ฟรี (ไม่ต้องใช้บัตรเครดิต) ได้ที่ https://ocr.space/ocrapi/freekey
 */
export const cloudProvider: OcrProvider = {
  name: 'ocr.space',

  async runOcr(image: OcrImage): Promise<string> {
    const apiKey = process.env.EXPO_PUBLIC_OCR_SPACE_KEY;
    if (!apiKey) {
      throw new OcrError('ยังไม่ได้ตั้งค่า EXPO_PUBLIC_OCR_SPACE_KEY ในไฟล์ .env');
    }
    if (!image.base64) {
      throw new OcrError('ไม่พบข้อมูลรูปภาพ กรุณาถ่ายใหม่');
    }
    if (image.base64.length > MAX_BASE64_LENGTH) {
      throw new OcrError('รูปมีขนาดใหญ่เกินไป กรุณาถ่ายใหม่โดยเล็งให้ฉลากอยู่ในกรอบ');
    }

    const form = new FormData();
    form.append('apikey', apiKey);
    form.append('base64Image', `data:image/jpeg;base64,${image.base64}`);
    form.append('language', 'eng');
    // เอนจิน 2 ไม่ใช้ dictionary จึงอ่านตัวเลข/วันที่ได้แม่นกว่าเอนจิน 1
    form.append('OCREngine', '2');
    form.append('detectOrientation', 'true');
    form.append('scale', 'true');
    form.append('isOverlayRequired', 'false');

    let json: any;
    try {
      const res = await fetch(ENDPOINT, { method: 'POST', body: form });
      json = await res.json();
    } catch {
      throw new OcrError('เชื่อมต่อบริการ OCR ไม่ได้ กรุณาตรวจสอบอินเทอร์เน็ต');
    }

    if (json?.IsErroredOnProcessing) {
      const detail = Array.isArray(json.ErrorMessage) ? json.ErrorMessage[0] : json.ErrorMessage;
      console.warn('[ocr.space]', detail);
      throw new OcrError('บริการ OCR อ่านรูปนี้ไม่สำเร็จ กรุณาถ่ายใหม่');
    }

    const parsed: string = json?.ParsedResults?.[0]?.ParsedText ?? '';
    // ParsedText คั่นบรรทัดด้วย \r\n — normalize ให้เหลือ \n อย่างเดียว (ลำดับบรรทัดคงเดิม)
    return parsed.replace(/\r\n/g, '\n').trim();
  },
};
