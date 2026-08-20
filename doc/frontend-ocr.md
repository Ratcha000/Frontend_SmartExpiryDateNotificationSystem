# Prompt สำหรับ Frontend — OCR / Scan Flow

> คัดลอกทั้งไฟล์นี้ไปวางให้คนทำ frontend หรือ AI agent ที่ช่วยเขียน frontend ได้เลย

---

## บริบท

ระบบชื่อ Smart Expiry Date Notification System เป็นระบบจัดการวัตถุดิบในร้านอาหาร
ฟีเจอร์ที่จะทำคือ **สแกนฉลากสินค้าด้วยกล้อง เพื่อดึงวันหมดอายุมากรอกให้อัตโนมัติ**

**สิ่งที่ต้องเข้าใจก่อนเป็นอันดับแรก: backend ไม่ได้ทำ OCR**

backend ไม่มี OCR engine ติดตั้งอยู่เลย (ไม่มี Tesseract, ไม่มี Cloud Vision, ไม่เรียก AI อ่านรูป)
สิ่งที่ backend ทำคือ **รับข้อความ (text) ที่ frontend OCR มาแล้ว ไปวิเคราะห์ว่าตัวไหนคือวันหมดอายุ**

ดังนั้น **frontend เป็นคนรับผิดชอบการอ่านตัวอักษรจากรูปทั้งหมด**

---

## แบ่งหน้าที่

```text
[frontend]  เปิดกล้อง / เลือกรูปจากเครื่อง
[frontend]  ทำ OCR อ่านตัวอักษรจากรูป  <-- งานหลักของ frontend
[frontend]  ส่ง rawText (string) ไป backend
[backend]   หาวันที่ในข้อความ + ตัดสินว่าอันไหนคือวันหมดอายุ + ให้ confidence
[frontend]  เอาผลมาเติมใน form ให้ผู้ใช้ตรวจสอบ/แก้ไข
[frontend]  ผู้ใช้กด Save -> เรียก POST /api/ingredients
```

backend **ไม่บันทึกอะไรลง database เลย** ใน flow OCR — เป็นแค่ตัวช่วยแปลงข้อความเป็นวันที่
การบันทึกวัตถุดิบเป็นคนละ endpoint ที่ frontend ต้องเรียกเองหลังผู้ใช้ยืนยัน

---

## API ที่ต้องใช้

### เส้นเดียวที่ต้องใช้: `POST /api/ocr/extract-expiry-date`

```http
POST /api/ocr/extract-expiry-date
Content-Type: application/json
Authorization: Bearer <token>
```

request body:

```json
{
  "restaurantId": "d2b8f24d-19e1-452c-840b-9b1c9ed7449a",
  "rawText": "Chicken Breast\nEXP 09/08/2026\nNET WT 1 KG",
  "source": "CAMERA"
}
```

- `restaurantId` — required ต้องเป็นร้านเดียวกับร้านของ user ที่ login อยู่ ไม่งั้นโดน 400
- `rawText` — required ห้ามเป็นค่าว่าง ส่งข้อความดิบจาก OCR มาทั้งก้อนได้เลย ขึ้นบรรทัดใหม่ได้
- `source` — optional default `CAMERA` ใช้ค่าเช่น `CAMERA`, `GALLERY`

response:

```json
{
  "rawText": "Chicken Breast\nEXP 09/08/2026\nNET WT 1 KG",
  "expiryDate": "2026-08-09",
  "matchedText": "09/08/2026",
  "confidence": "HIGH",
  "warnings": [],
  "suggestedIngredient": {
    "name": null,
    "category": null,
    "quantity": null,
    "unit": null
  },
  "scannedAt": "2026-08-20T04:00:00Z",
  "scannedBy": "user-id"
}
```

### อีก 2 เส้นในกลุ่มนี้ — อย่าใช้

| Endpoint | สถานะ |
| --- | --- |
| `POST /api/ocr/scan` | ทำงานเหมือน `extract-expiry-date` ทุกอย่าง (เป็น alias เฉยๆ) ไม่ต้องใช้ ใช้เส้นเดียวพอ |
| `POST /api/ocr/scan-image` | **ยังไม่เปิดใช้งาน** อัปโหลดรูปไปจะได้ 400 กลับมาเสมอ ห้ามใช้ |

`scan-image` จะตอบแบบนี้เสมอ:

```json
{
  "status": 400,
  "message": "Backend image OCR is not enabled yet. Send OCR text to /api/ocr/extract-expiry-date."
}
```

---

## วิธีอ่าน response ให้ถูก

### `confidence` — ใช้ตัดสิน UX

| ค่า | ความหมาย | frontend ควรทำ |
| --- | --- | --- |
| `HIGH` | เจอวันที่เต็ม และมี keyword วันหมดอายุอยู่ใกล้ๆ ไม่มี warning | เติมวันที่ลง form ได้เลย แสดงเป็นเขียว |
| `MEDIUM` | เจอวันที่ แต่ไม่มั่นใจ หรือมี warning | เติมให้ แต่ **ต้อง highlight ให้ผู้ใช้ตรวจสอบ** แสดงเป็นเหลือง |
| `LOW` | ไม่เจอวันที่เลย (`expiryDate` จะเป็น `null`) | ไม่เติมอะไร ให้ผู้ใช้กรอกเอง หรือชวนถ่ายใหม่ |

**อย่า auto-save โดยไม่ให้ผู้ใช้ยืนยัน แม้ confidence เป็น HIGH** เพราะ OCR ผิดได้เสมอ

### `warnings` — เอาไปแสดงตรงๆ ได้

เป็น array ของ string ภาษาไทย มี 3 แบบ:

```text
"ไม่พบวันที่หมดอายุจากข้อความ OCR"
"วันที่หมดอายุผ่านไปแล้ว"
"วันที่ที่พบอยู่ใกล้ keyword วันที่ผลิต ควรตรวจสอบก่อนบันทึก"
```

อันสุดท้ายสำคัญมาก — แปลว่าวันที่ที่เจออาจเป็น **วันผลิต ไม่ใช่วันหมดอายุ** ต้องเตือนผู้ใช้ให้ชัด

### `matchedText`

คือข้อความวันที่ต้นฉบับที่ backend จับได้ เช่น `"09/08/2026"`
**ควรแสดงให้ผู้ใช้เห็น** ว่า "เราอ่านได้ว่า `09/08/2026` → ตีความเป็น 9 ส.ค. 2026 ถูกไหม"
ช่วยให้ผู้ใช้จับผิดได้ทันทีถ้า OCR อ่านเลขเพี้ยน

### `suggestedIngredient`

**ตอนนี้เป็น `null` ทุก field เสมอ** backend ยังไม่เดาชื่อ/หน่วย/จำนวนให้
อย่าไปเขียนโค้ดที่พึ่งค่านี้ — ชื่อวัตถุดิบ จำนวน หน่วย ผู้ใช้ต้องกรอกเองทั้งหมด

### `scannedAt` / `scannedBy`

ส่งต่อไปยัง `POST /api/ingredients` ได้เลย (field ชื่อเดียวกัน) เพื่อเก็บ audit ว่าข้อมูลนี้มาจากการสแกน

---

## รูปแบบวันที่ที่ backend อ่านออก

```text
09/08/2026     (วัน/เดือน/ปี)
09-08-2026
09/08/26       (ปี 2 หลัก จะแปลงเป็น 20xx)
2026-08-09     (ปี-เดือน-วัน)
08/2026        (เดือน/ปี -> จะได้วันสุดท้ายของเดือน = 2026-08-31)
09 AUG 2026    (เดือนเป็นตัวอักษรอังกฤษ ย่อหรือเต็มก็ได้)
```

**ข้อควรระวังสำคัญ:**
- รูปแบบ `09/08/2026` backend อ่านเป็น **วัน/เดือน/ปี** เสมอ ไม่ใช่ เดือน/วัน/ปี
- **ยังไม่รองรับชื่อเดือนภาษาไทย** (ส.ค., สิงหาคม) — ถ้า OCR ได้ภาษาไทยมา จะจับวันที่ไม่ได้
- **ยังไม่รองรับ พ.ศ.** — ถ้าฉลากเขียน 2569 จะได้วันที่ผิด ต้องเตือนผู้ใช้

---

## Keyword ที่ทำให้ผลลัพธ์แม่นขึ้น (สำคัญมากต่อประสิทธิภาพ)

backend ให้คะแนนวันที่แต่ละตัวที่เจอ แล้วเลือกตัวที่คะแนนสูงสุด กติกาคือ:

- ถ้ามี keyword พวกนี้อยู่ **ก่อนหน้าวันที่ ภายใน 40 ตัวอักษร** → **+100 คะแนน**
  `EXP`, `EXPIRY`, `EXPIRES`, `BBF`, `BEST BEFORE`, `วันหมดอายุ`, `หมดอายุ`, `ควรบริโภคก่อน`
- ถ้ามี keyword พวกนี้อยู่ก่อนหน้า → **-80 คะแนน**
  `MFG`, `MANUFACTURED`, `ผลิต`, `วันที่ผลิต`

**นี่คือจุดที่ frontend ทำให้ผลลัพธ์ดีขึ้นได้มากที่สุด:**

1. **ส่ง rawText มาทั้งก้อน อย่าตัดเหลือแต่ตัวเลข** — ถ้าตัดคำว่า `EXP` ออกไป backend จะแยกไม่ออกว่าอันไหนวันผลิตอันไหนวันหมดอายุ
2. **รักษาลำดับข้อความตามที่อยู่บนฉลาก** — เพราะ backend ดูว่า keyword อยู่ "ก่อนหน้า" วันที่หรือไม่ ถ้าสลับลำดับบรรทัดมั่ว คะแนนจะเพี้ยน
3. **รักษาการขึ้นบรรทัดใหม่ (`\n`)** ไว้ ส่งมาได้เลยใน JSON
4. **อย่าแปลงเป็นตัวพิมพ์เล็ก** — ไม่จำเป็น backend ไม่แคร์ตัวพิมพ์ แต่ไม่ต้องไปยุ่ง
5. **ถ้าฉลากมีทั้งวันผลิตและวันหมดอายุ ส่งมาทั้งคู่** backend จัดการเลือกให้เอง อย่าพยายามเลือกเองที่ frontend

---

## ข้อเสนอแนะเรื่อง OCR ฝั่ง frontend

เลือก library ตาม platform:

| Platform | ตัวเลือกแนะนำ | หมายเหตุ |
| --- | --- | --- |
| Web | `tesseract.js` | ทำงานใน browser ไม่ต้องส่งรูปออกไปไหน แต่ช้าและกิน memory |
| Web (แม่นกว่า) | Cloud Vision / Azure OCR ผ่าน proxy ของ frontend | แม่นกว่ามาก แต่มีค่าใช้จ่ายและต้องส่งรูปออกนอกเครื่อง |
| React Native | ML Kit Text Recognition | เร็ว ทำงาน offline แนะนำที่สุดสำหรับมือถือ |
| iOS native | Vision framework (`VNRecognizeTextRequest`) | ฟรี เร็ว แม่น |
| Android native | ML Kit Text Recognition | ฟรี เร็ว แม่น |

ตั้งค่า OCR ให้อ่านได้ทั้ง **อังกฤษ + ตัวเลข** เป็นอย่างน้อย
(ภาษาไทยอ่านได้ก็ดีต่อชื่อสินค้า แต่ backend ยังจับวันที่ภาษาไทยไม่ได้)

**เทคนิคเพิ่มความแม่นก่อนส่งเข้า OCR:**
- ให้ผู้ใช้ crop เฉพาะบริเวณที่มีวันที่ ก่อนส่งเข้า OCR — ช่วยได้มากที่สุด
- แปลงเป็น grayscale + เพิ่ม contrast
- บังคับ resolution ขั้นต่ำ ถ้ารูปเล็กเกินไปให้ถ่ายใหม่
- มี guide box ในหน้ากล้องให้ผู้ใช้เล็งบริเวณฉลาก

---

## Flow หน้าจอที่แนะนำ

```text
1. หน้ากล้อง — มี guide box + ปุ่มเลือกรูปจาก gallery
2. ผู้ใช้ถ่าย / เลือกรูป
3. (แนะนำ) หน้า crop ให้เลือกเฉพาะส่วนที่มีวันหมดอายุ
4. แสดง loading ระหว่าง OCR ทำงานในเครื่อง
5. เรียก POST /api/ocr/extract-expiry-date
6. หน้า preview:
   - แสดงรูปที่ถ่าย
   - แสดง matchedText ที่อ่านได้ + expiryDate ที่ตีความ
   - แสดง warnings ทั้งหมด (ถ้ามี)
   - สีตาม confidence
   - ปุ่ม "ถ่ายใหม่"
7. Form กรอกข้อมูล — expiryDate เติมมาให้แล้ว แก้ไขได้
   ผู้ใช้กรอกเอง: name, category, quantity, unit, notifyDaysBefore
8. กด Save -> POST /api/ingredients
```

---

## บันทึกวัตถุดิบหลังผู้ใช้ยืนยัน

```http
POST /api/ingredients
Authorization: Bearer <token>
```

```json
{
  "restaurantId": "d2b8f24d-19e1-452c-840b-9b1c9ed7449a",
  "name": "Chicken Breast",
  "category": "meat",
  "initialQuantity": 10,
  "quantity": 10,
  "unit": "kg",
  "expiryDate": "2026-08-09",
  "notifyDaysBefore": 3,
  "scannedBy": "user-id",
  "scannedAt": "2026-08-20T04:00:00Z"
}
```

field ที่ required: `restaurantId`, `name`, `category`, `initialQuantity` (ต้อง >= 0.001),
`quantity` (>= 0), `unit`, `expiryDate`, `notifyDaysBefore` (>= 0)

`scannedBy` / `scannedAt` เอามาจาก response ของ OCR ได้เลย

ถ้าสแกนทีเดียวแล้วได้หลายชิ้นในล็อตเดียวกัน (วันหมดอายุเดียวกัน) ใช้ `POST /api/ingredients/batch` แทน

---

## Error handling

error ทุกตัวคืน HTTP 400 พร้อม body หน้าตาแบบนี้:

```json
{
  "timestamp": "2026-08-20T04:00:00Z",
  "status": 400,
  "error": "Bad Request",
  "message": "Unauthorized to access this restaurant"
}
```

อ่านจาก field `message` ได้เลย

| message | สาเหตุ | frontend ควรทำ |
| --- | --- | --- |
| `restaurantId is required` | ลืมส่ง restaurantId | bug ฝั่ง frontend แก้โค้ด |
| `User is not assigned to any restaurant` | user ยังไม่ผูกกับร้าน | แจ้งให้ติดต่อ Manager |
| `Unauthorized to access this restaurant` | ส่ง restaurantId ผิดร้าน | ใช้ restaurantId จาก user profile ที่ login เสมอ |
| `Restaurant not found` | ไม่มีร้านนี้ | แจ้ง error ทั่วไป |
| `rawText: must not be blank` | OCR อ่านไม่ได้เลย แล้วส่งค่าว่างมา | **เช็คก่อนยิง** ถ้า OCR ได้ค่าว่าง ให้บอกผู้ใช้ถ่ายใหม่ อย่ายิง API |

---

## สรุป Do / Don't

**ทำ**
- OCR ให้เสร็จที่ frontend แล้วส่งเป็น text
- ส่ง rawText ทั้งก้อน พร้อม keyword และลำดับบรรทัดตามฉลาก
- เช็คว่า rawText ไม่ว่างก่อนยิง API
- ให้ผู้ใช้ยืนยันเสมอก่อนบันทึก
- แสดง matchedText + warnings ให้ผู้ใช้เห็น
- ใช้ restaurantId จาก profile ของ user ที่ login

**ไม่ทำ**
- อย่าส่งรูปไป `/api/ocr/scan-image` (ยังไม่เปิดใช้ ได้ 400 เสมอ)
- อย่าคาดหวังว่า backend จะเดาชื่อวัตถุดิบให้ (`suggestedIngredient` เป็น null เสมอ)
- อย่า auto-save โดยข้ามการยืนยันของผู้ใช้
- อย่าตัด rawText เหลือแต่ตัวเลขวันที่
- อย่าคิดว่า OCR flow บันทึกข้อมูลให้แล้ว — ต้องเรียก `POST /api/ingredients` เอง
