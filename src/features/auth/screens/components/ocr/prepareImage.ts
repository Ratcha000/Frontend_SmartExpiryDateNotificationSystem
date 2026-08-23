import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import type { OcrImage } from './types';

/** ขนาดและตำแหน่งกรอบเล็ง หน่วยเป็น px ของ preview บนหน้าจอ */
export interface GuideBoxRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface SourcePhoto {
  uri: string;
  width: number;
  height: number;
}

/** ความกว้างที่ส่งเข้า OCR — ใหญ่พอให้อ่านออก แต่ยังไม่ชน limit 1MB ของ OCR.space */
const TARGET_WIDTH = 1280;

/**
 * เตรียมรูปก่อนส่งเข้า OCR: crop เฉพาะกรอบเล็ง → ย่อ → บีบเป็น JPEG + base64
 *
 * การ crop คือสิ่งที่ช่วยความแม่นมากที่สุด เพราะตัดข้อความอื่นบนฉลากทิ้ง
 * เหลือแต่บริเวณที่มีวันหมดอายุ (ดู doc/frontend-ocr.md หัวข้อเทคนิคเพิ่มความแม่น)
 *
 * @param photo   รูปที่ได้จากกล้องหรือคลังภาพ
 * @param preview ขนาดพื้นที่แสดงกล้องบนหน้าจอ (ไม่ระบุ = ไม่ crop เช่นรูปจากคลังภาพ)
 * @param box     กรอบเล็งในพิกัดของ preview
 */
export async function prepareImage(
  photo: SourcePhoto,
  preview?: { width: number; height: number },
  box?: GuideBoxRect
): Promise<OcrImage> {
  const context = ImageManipulator.manipulate(photo.uri);

  const crop = preview && box ? mapBoxToPhoto(photo, preview, box) : null;
  if (crop) context.crop(crop);

  const croppedWidth = crop?.width ?? photo.width;
  if (croppedWidth > TARGET_WIDTH) context.resize({ width: TARGET_WIDTH });

  const image = await context.renderAsync();
  const saved = await image.saveAsync({
    base64: true,
    compress: 0.7,
    format: SaveFormat.JPEG,
  });

  return { uri: saved.uri, base64: saved.base64 };
}

/**
 * แปลงพิกัดกรอบเล็งบนหน้าจอ ให้เป็นพิกัดบนรูปจริง
 *
 * preview ของกล้องแสดงผลแบบ "cover" คือขยายรูปให้เต็มกรอบแล้วตัดส่วนเกินทิ้ง
 * ถ้าคำนวณตรงๆ ด้วยสัดส่วนเฉยๆ กรอบที่ crop ได้จะเลื่อนไปจากที่ผู้ใช้เล็งไว้
 */
function mapBoxToPhoto(
  photo: SourcePhoto,
  preview: { width: number; height: number },
  box: GuideBoxRect
) {
  const scale = Math.max(preview.width / photo.width, preview.height / photo.height);

  // ระยะที่รูปถูกตัดออกไปข้างละเท่าไร (หน่วย px ของหน้าจอ)
  const offsetX = (photo.width * scale - preview.width) / 2;
  const offsetY = (photo.height * scale - preview.height) / 2;

  const originX = (box.x + offsetX) / scale;
  const originY = (box.y + offsetY) / scale;
  const width = box.width / scale;
  const height = box.height / scale;

  // กันค่าหลุดขอบรูป ซึ่งจะทำให้ native crop โยน error
  const safeX = clamp(originX, 0, photo.width - 1);
  const safeY = clamp(originY, 0, photo.height - 1);

  return {
    originX: Math.round(safeX),
    originY: Math.round(safeY),
    width: Math.round(clamp(width, 1, photo.width - safeX)),
    height: Math.round(clamp(height, 1, photo.height - safeY)),
  };
}

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);
