import apiClient from './client';
import type { OcrExtractResponse, OcrSource } from '../types';

/**
 * POST /api/ocr/extract-expiry-date
 * ส่งข้อความดิบที่ OCR อ่านได้ไปให้ backend หาว่าตัวไหนคือวันหมดอายุ
 *
 * backend ไม่บันทึกอะไรลง database ใน flow นี้ — เป็นแค่ตัวช่วยแปลงข้อความเป็นวันที่
 * การบันทึกวัตถุดิบต้องเรียก POST /api/ingredients เองหลังผู้ใช้ยืนยัน
 *
 * หมายเหตุ: ส่ง rawText มาทั้งก้อนพร้อม keyword (EXP / MFG) และลำดับบรรทัดตามฉลาก
 * เพราะ backend ให้คะแนนวันที่จากตำแหน่ง keyword ที่อยู่ก่อนหน้า
 */
export const extractExpiryDate = (
  restaurantId: string,
  rawText: string,
  source: OcrSource = 'CAMERA'
) =>
  apiClient.post<OcrExtractResponse>('/ocr/extract-expiry-date', {
    restaurantId,
    rawText,
    source,
  });
