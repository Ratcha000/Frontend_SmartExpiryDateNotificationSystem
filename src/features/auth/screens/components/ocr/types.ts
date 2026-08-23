/** สัญญาเดียวที่หน้าจอรู้จัก — ข้างหลังจะเป็น cloud หรือ ML Kit ก็ได้ */
export interface OcrProvider {
  /** ชื่อไว้โชว์ตอน debug ว่าตอนนี้ใช้ตัวไหนอยู่ */
  name: string;
  /**
   * อ่านตัวอักษรจากรูป แล้วคืนข้อความดิบ
   *
   * กติกาที่ทุก provider ต้องทำเหมือนกัน (สำคัญมากต่อความแม่นของ backend):
   * - คืนข้อความ "ทั้งก้อน" พร้อม keyword (EXP / MFG) ห้ามตัดเหลือแต่ตัวเลข
   * - เรียงบรรทัดตามที่อยู่บนฉลากจริง และคั่นด้วย \n
   *   เพราะ backend ให้ +100 เมื่อ EXP/หมดอายุ อยู่ "ก่อนหน้า" วันที่ภายใน 40 ตัวอักษร
   *   และ -80 เมื่อเจอ MFG/ผลิต — สลับบรรทัดมั่ว = ได้วันผลิตแทนวันหมดอายุ
   * - ห้าม lowercase
   */
  runOcr(image: OcrImage): Promise<string>;
}

/** รูปที่ผ่าน crop/resize มาแล้ว พร้อมส่งเข้า OCR */
export interface OcrImage {
  /** path ไฟล์ในเครื่อง (ML Kit ใช้ตัวนี้) */
  uri: string;
  /** ข้อมูลรูปแบบ base64 ไม่มี prefix (provider แบบ cloud ใช้ตัวนี้) */
  base64?: string;
}

/** error ที่ผู้ใช้อ่านรู้เรื่อง — หน้าจอเอา message ไปแสดงได้เลย */
export class OcrError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'OcrError';
  }
}
