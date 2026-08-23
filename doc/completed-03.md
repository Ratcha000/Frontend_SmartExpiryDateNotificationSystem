# Backend API Reference - Purchase Planning with AI

เอกสารนี้อธิบาย Purchase Planning เวอร์ชันใหม่ที่ใช้ “วันซื้อของในสัปดาห์” และให้ AI วิเคราะห์ว่าควรซื้ออะไรเท่าไหร่

อ้างอิงโค้ดหลัก:
- [PurchasePlanningController.java]
- [PurchasePlanningService.java]
- [PurchasePlanningScheduler.java]
- [NotificationController.java]

## 1. ภาพรวม

Purchase Planning ใช้ช่วย Manager รู้ตั้งแต่ต้นวันซื้อของว่า:

```text
วันนี้ควรซื้อวัตถุดิบอะไร
ควรซื้อเพิ่มเท่าไหร่
เพราะอะไร
คำแนะนำน่าเชื่อถือแค่ไหน
```

แนวคิดใหม่:
- ร้านไม่ได้ตั้งว่า “ซื้อทุกกี่วัน”
- ร้านตั้งเป็น “ซื้อวันไหนของสัปดาห์”
- เช่น `MONDAY`, `FRIDAY`
- ถ้าซื้อทุกวัน ให้ส่งครบ 7 วัน
- ระบบรันอัตโนมัติตามเวลา `notificationTime` เช่น `00:01`
- ถ้าวันนั้นเป็นวันซื้อของ ระบบจะให้ AI generate รายการซื้อของ แล้วสร้าง notification ให้ Manager

## 2. Access Control

Purchase Planning endpoints เป็น Manager only:
- `GET /api/purchase-settings/{restaurantId}`
- `PUT /api/purchase-settings/{restaurantId}`
- `GET /api/purchase-recommendations?restaurantId=`
- `POST /api/purchase-recommendations/generate`

Notifications:
- `GET /api/notifications`
- `PATCH /api/notifications/{id}/read`

ทุก endpoint ต้องส่ง:

```http
Authorization: Bearer <token>
```

## 3. Purchase Settings

### Data Shape

```json
{
  "restaurantId": "restaurant-id",
  "purchaseDays": ["MONDAY", "FRIDAY"],
  "lookbackPurchaseRuns": 4,
  "notificationTime": "00:01:00",
  "safetyBufferPercent": 10,
  "updatedAt": "2026-08-08T11:00:00Z"
}
```

ความหมาย:
- `purchaseDays`: วันที่ร้านซื้อของ เช่น จันทร์/ศุกร์
- `lookbackPurchaseRuns`: ให้ AI ดูข้อมูลย้อนหลังกลับไปกี่รอบซื้อ
- `notificationTime`: เวลาที่ให้ระบบ generate และแจ้งเตือน
- `safetyBufferPercent`: buffer เผื่อของขาด เช่น 10%

default ถ้ายังไม่เคยตั้งค่า:

```json
{
  "restaurantId": "restaurant-id",
  "purchaseDays": ["MONDAY"],
  "lookbackPurchaseRuns": 4,
  "notificationTime": "00:01:00",
  "safetyBufferPercent": 10,
  "updatedAt": null
}
```

### `GET /api/purchase-settings/{restaurantId}`

ใช้ดู setting ปัจจุบันของร้าน

ตัวอย่าง:

```http
GET /api/purchase-settings/d2b8f24d-19e1-452c-840b-9b1c9ed7449a
```

### `PUT /api/purchase-settings/{restaurantId}`

ใช้สร้างหรือแก้ setting

ตัวอย่างร้านซื้อของทุกวันจันทร์และศุกร์:

```json
{
  "purchaseDays": ["MONDAY", "FRIDAY"],
  "lookbackPurchaseRuns": 4,
  "notificationTime": "00:01:00",
  "safetyBufferPercent": 10
}
```

ตัวอย่างร้านซื้อของทุกวัน:

```json
{
  "purchaseDays": [
    "MONDAY",
    "TUESDAY",
    "WEDNESDAY",
    "THURSDAY",
    "FRIDAY",
    "SATURDAY",
    "SUNDAY"
  ],
  "lookbackPurchaseRuns": 7,
  "notificationTime": "00:01:00",
  "safetyBufferPercent": 10
}
```

validation:
- `purchaseDays` ห้ามว่าง
- `lookbackPurchaseRuns` อยู่ระหว่าง `1` ถึง `30`
- `notificationTime` required
- `safetyBufferPercent` อยู่ระหว่าง `0` ถึง `100`

## 4. AI Purchase Recommendation

### `POST /api/purchase-recommendations/generate`

ใช้สั่ง generate เองจาก Swagger/frontend

request body:

```json
{
  "restaurantId": "d2b8f24d-19e1-452c-840b-9b1c9ed7449a"
}
```

ระบบจะ:
- ดึง purchase setting ของร้าน
- ดึง stock ปัจจุบัน
- group วัตถุดิบตามชื่อ/category/unit
- ดึง usage history action `CONSUMED` และ `USED`
- ตัดช่วงย้อนหลังตาม `lookbackPurchaseRuns`
- ส่งข้อมูลให้ KKU AI วิเคราะห์
- parse JSON response จาก AI
- ลบ recommendation เดิมของร้าน
- save recommendation ชุดใหม่
- คืนรายการใหม่ทันที

### AI JSON Schema

AI ต้องตอบ JSON แบบนี้:

```json
{
  "recommendations": [
    {
      "ingredientName": "Chicken Breast",
      "category": "meat",
      "unit": "kg",
      "currentQuantity": 3,
      "averageDailyUsage": 1.2,
      "estimatedConsumptionUntilNextCycle": 4.8,
      "recommendedBuyQuantity": 3,
      "reason": "ควรซื้อเพิ่มเพราะ stock ปัจจุบันไม่พอถึงรอบซื้อถัดไป",
      "confidence": "HIGH"
    }
  ]
}
```

ถ้า AI ตอบผิดรูปแบบ backend จะคืน `400 Bad Request`

### `GET /api/purchase-recommendations?restaurantId=`

ใช้ดู recommendation ล่าสุดที่ save ไว้

ตัวอย่าง response:

```json
[
  {
    "id": "recommendation-id",
    "restaurantId": "restaurant-id",
    "ingredientName": "Chicken Breast",
    "category": "meat",
    "unit": "kg",
    "currentQuantity": 3.000,
    "averageDailyUsage": 1.200,
    "estimatedConsumptionUntilNextCycle": 4.800,
    "recommendedBuyQuantity": 3.000,
    "reason": "ควรซื้อเพิ่มเพราะ stock ปัจจุบันไม่พอถึงรอบซื้อถัดไป",
    "confidence": "HIGH",
    "generatedAt": "2026-08-08T11:00:00Z"
  }
]
```

รายการจะเรียงตาม `recommendedBuyQuantity` มากไปน้อย แล้วตามชื่อวัตถุดิบ

## 5. Scheduled Flow

ระบบเปิด Spring Scheduler แล้ว

job จะรันทุกนาที แต่จะทำงานจริงเฉพาะเวลาที่ตรงกับ setting ของร้าน เช่น:

```text
00:01 Asia/Bangkok
```

flow:

```text
ทุกนาที
  ดึง purchase settings ทั้งหมด
  ถ้าเวลาปัจจุบันตรงกับ notificationTime
  และวันนี้อยู่ใน purchaseDays
    generate purchase recommendations ด้วย AI
    สร้าง notification ให้ Manager ของร้าน
```

ตัวอย่าง:

```json
{
  "purchaseDays": ["MONDAY", "FRIDAY"],
  "notificationTime": "00:01:00"
}
```

ถ้าวันนี้เป็นวันจันทร์ เวลา 00:01:
- backend generate recommendation
- backend save recommendation
- backend สร้าง notification ให้ Manager

ถ้า AI error:
- backend ไม่ล่ม
- backend สร้าง notification แบบ failed ให้ Manager

## 6. Notifications

### `GET /api/notifications`

ใช้ดึง notification ของ user ที่ login อยู่

ตัวอย่าง response:

```json
[
  {
    "id": "notification-id",
    "restaurantId": "restaurant-id",
    "userId": "manager-user-id",
    "type": "PURCHASE_RECOMMENDATION",
    "title": "รายการซื้อวัตถุดิบวันนี้",
    "message": "มีรายการแนะนำ 5 รายการสำหรับรอบซื้อวันนี้",
    "read": false,
    "createdAt": "2026-08-09T00:01:00Z"
  }
]
```

notification types:
- `PURCHASE_RECOMMENDATION`
- `PURCHASE_RECOMMENDATION_FAILED`

### `PATCH /api/notifications/{id}/read`

ใช้ mark notification ว่าอ่านแล้ว

```http
PATCH /api/notifications/notification-id/read
```

## 7. ตัวอย่าง Flow ที่ควรใช้จริง

### ตั้งค่าร้านซื้อทุกจันทร์และศุกร์

```http
PUT /api/purchase-settings/{restaurantId}
```

```json
{
  "purchaseDays": ["MONDAY", "FRIDAY"],
  "lookbackPurchaseRuns": 4,
  "notificationTime": "00:01:00",
  "safetyBufferPercent": 10
}
```

### ตอนเช้าวันซื้อของ

ระบบทำเอง:

```text
00:01
generate recommendations
create notification
```

frontend ทำ:

```http
GET /api/notifications
GET /api/purchase-recommendations?restaurantId=...
```

### กด generate เอง

```http
POST /api/purchase-recommendations/generate
```

```json
{
  "restaurantId": "restaurant-id"
}
```

## 8. ข้อควรระวัง

- ต้องตั้ง `KKU_AI_API_KEY` และ `KKU_AI_MODEL` ให้ถูก ไม่งั้น generate จะ error
- AI เป็นคนเสนอ `recommendedBuyQuantity` แล้ว backend แค่ validate/parse รูปแบบ
- ถ้าอยากให้ผลแม่น ควรมี usage history จากการ `consume` หรือ `used` อย่างสม่ำเสมอ
- ถ้าชื่อวัตถุดิบไม่ตรงกัน เช่น `Chicken Breast` กับ `อกไก่` ระบบจะมองเป็นคนละกลุ่ม
- notification ตอนนี้เป็น record ใน database ยังไม่ใช่ push notification จริง

## 9. OCR / Scan Support

OCR ตอนนี้พร้อมสำหรับเชื่อมกับ frontend แล้ว แต่ backend ไม่ได้อ่านรูปเอง และไม่ได้ใช้ AI อ่านรูป

flow ที่ใช้จริง:

```text
frontend เปิดกล้องหรือเลือกรูป
frontend ใช้ OCR อ่านข้อความจากรูป
frontend ส่งข้อความ OCR มา backend
backend จับวันหมดอายุจากข้อความ
backend ส่งผลลัพธ์กลับไปให้ frontend แสดง preview
ผู้ใช้ตรวจสอบหรือแก้ไข
frontend ค่อยบันทึกเข้า ingredients
```

ตัวอย่างง่ายๆ:

```text
รูปฉลากสินค้า -> frontend OCR อ่านได้ว่า "Chicken Breast EXP 09/08/2026"
frontend ส่ง rawText ให้ backend
backend ตอบ expiryDate = 2026-08-09
ผู้ใช้ตรวจสอบแล้วกด Save
frontend เรียก API เพิ่มวัตถุดิบ
```

### Endpoint ทั้งหมดในกลุ่ม OCR / Scan Support

Swagger tag: `OCR / Scan Support`

| Method | Path | Summary | Roles |
| --- | --- | --- | --- |
| POST | `/api/ocr/scan` | Parse OCR scan text | Manager, Employee |
| POST | `/api/ocr/scan-image` | Upload image for OCR scanning | Manager, Employee |
| POST | `/api/ocr/extract-expiry-date` | Extract expiry date from OCR text | Manager, Employee |

ทุก endpoint ต้องส่ง:

```http
Authorization: Bearer <token>
```

และ `restaurantId` ที่ส่งมาต้องเป็นร้านเดียวกับ `restaurantId` ของ user ที่ login อยู่ ไม่งั้นจะโดน reject

### `POST /api/ocr/scan`

ใช้ parse ข้อความ OCR ที่ frontend อ่านมาจากรูป

หมายเหตุ: endpoint นี้ทำงานเหมือน `POST /api/ocr/extract-expiry-date` ทุกอย่าง (request body และ response เหมือนกัน) เป็น alias ไว้ให้ frontend เรียกใช้ชื่อที่สื่อกับ flow scan

request body:

```json
{
  "restaurantId": "d2b8f24d-19e1-452c-840b-9b1c9ed7449a",
  "rawText": "Milk 1L\nBEST BEFORE 12 SEP 2026",
  "source": "CAMERA"
}
```

field:
- `restaurantId`: required ห้ามว่าง
- `rawText`: required ห้ามว่าง เป็นข้อความดิบที่ได้จาก OCR ฝั่ง frontend
- `source`: optional ค่า default คือ `CAMERA` เช่น `CAMERA`, `GALLERY`, `MANUAL`

response ตัวอย่าง:

```json
{
  "rawText": "Milk 1L\nBEST BEFORE 12 SEP 2026",
  "expiryDate": "2026-09-12",
  "matchedText": "12 SEP 2026",
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

ความหมายของ response:
- `rawText`: ข้อความที่ส่งเข้ามา (trim แล้ว)
- `expiryDate`: วันหมดอายุที่ระบบเลือกมาให้ ถ้าไม่เจอจะเป็น `null`
- `matchedText`: ข้อความวันที่ต้นฉบับที่ match ได้ เช่น `12 SEP 2026`
- `confidence`: `HIGH`, `MEDIUM`, `LOW`
- `warnings`: ข้อความเตือนให้ผู้ใช้ตรวจสอบก่อนบันทึก
- `suggestedIngredient`: ตอนนี้ยังเป็น `null` ทุก field backend ยังไม่เดาชื่อวัตถุดิบให้
- `scannedAt`: เวลาที่ backend ประมวลผล
- `scannedBy`: id ของ user ที่เรียก

เกณฑ์ `confidence`:
- `HIGH`: เจอวันที่แบบเต็ม และมี keyword วันหมดอายุ (เช่น `EXP`, `BEST BEFORE`, `หมดอายุ`) อยู่ใกล้ๆ และไม่มี warning
- `MEDIUM`: เจอวันที่ แต่ไม่มี keyword ชัดเจน หรือมี warning
- `LOW`: ไม่เจอวันที่เลย

warning ที่เป็นไปได้:

```text
ไม่พบวันที่หมดอายุจากข้อความ OCR
วันที่หมดอายุผ่านไปแล้ว
วันที่ที่พบอยู่ใกล้ keyword วันที่ผลิต ควรตรวจสอบก่อนบันทึก
```

### API ที่ใช้กับ frontend OCR

ใช้ endpoint นี้:

```http
POST /api/ocr/extract-expiry-date
```

request body:

```json
{
  "restaurantId": "d2b8f24d-19e1-452c-840b-9b1c9ed7449a",
  "rawText": "Chicken Breast\nEXP 09/08/2026\nNET WT 1 KG",
  "source": "CAMERA"
}
```

response ตัวอย่าง:

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
  "scannedAt": "2026-08-09T04:00:00Z",
  "scannedBy": "user-id"
}
```

### Swagger Test แบบเดิม

ใช้ `POST /api/ocr/extract-expiry-date`

กรณีเจอวันหมดอายุ:

```json
{
  "restaurantId": "d2b8f24d-19e1-452c-840b-9b1c9ed7449a",
  "rawText": "Chicken Breast\nEXP 09/08/2026\nNET WT 1 KG",
  "source": "CAMERA"
}
```

ควรได้:

```json
{
  "expiryDate": "2026-08-09",
  "matchedText": "09/08/2026",
  "confidence": "HIGH",
  "warnings": []
}
```

กรณีไม่เจอวันหมดอายุ:

```json
{
  "restaurantId": "d2b8f24d-19e1-452c-840b-9b1c9ed7449a",
  "rawText": "Chicken Breast NET WT 1 KG",
  "source": "CAMERA"
}
```

ควรได้:

```json
{
  "expiryDate": null,
  "matchedText": null,
  "confidence": "LOW",
  "warnings": ["ไม่พบวันที่หมดอายุจากข้อความ OCR"]
}
```

### รูปแบบวันที่ที่รองรับ

backend จับวันที่จากข้อความ OCR ได้หลายแบบ:

```text
09/08/2026
09-08-2026
09/08/26
2026-08-09
08/2026
09 AUG 2026
```

ถ้าเจอ `MFG` หรือ `วันที่ผลิต` ใกล้วันที่ ระบบจะเตือนให้ตรวจสอบก่อนบันทึก เพราะวันที่นั้นอาจไม่ใช่วันหมดอายุ

### การบันทึกเข้า ingredients

OCR endpoint ไม่บันทึกข้อมูลเข้า ingredients อัตโนมัติ

เหตุผล:
- OCR อาจอ่านผิด
- วันที่บนฉลากอาจเป็นวันผลิต ไม่ใช่วันหมดอายุ
- ชื่อวัตถุดิบ จำนวน และ unit อาจต้องให้ผู้ใช้ตรวจเอง

หลังจาก frontend ได้ `expiryDate` แล้ว ควรแสดง form ให้ผู้ใช้ตรวจสอบ เช่น:

```text
name: Chicken Breast
category: meat
quantity: 10
unit: kg
expiryDate: 2026-08-09
```

เมื่อผู้ใช้กด Save แล้ว frontend ค่อยเรียก API เพิ่มวัตถุดิบ:

```http
POST /api/ingredients
```

### `POST /api/ocr/scan-image` (ยังไม่เปิดใช้)

endpoint นี้มีไว้รองรับอนาคต แต่ตอนนี้ backend ยังไม่ OCR จากรูปโดยตรง

รับเป็น `multipart/form-data` ไม่ใช่ JSON:

```http
POST /api/ocr/scan-image
Content-Type: multipart/form-data
Authorization: Bearer <token>
```

form field:
- `restaurantId`: required id ร้าน
- `image`: required ไฟล์รูป

ตัวอย่าง curl:

```bash
curl -X POST http://localhost:8080/api/ocr/scan-image \
  -H "Authorization: Bearer <token>" \
  -F "restaurantId=d2b8f24d-19e1-452c-840b-9b1c9ed7449a" \
  -F "image=@label.jpg"
```

ลำดับการทำงานตอนนี้:
1. ตรวจสิทธิ์ร้านก่อน ถ้า `restaurantId` ไม่ใช่ร้านของ user จะ error
2. ถ้าไม่ได้แนบไฟล์ หรือไฟล์ว่าง จะได้ `image is required`
3. ถ้าผ่านทั้งสองข้อ ก็ยังโยน error เพราะ backend ยังไม่รองรับการ OCR รูป

ถ้าทดสอบ endpoint นี้ด้วยรูป จะได้ error ประมาณนี้:

```json
{
  "message": "Backend image OCR is not enabled yet. Send OCR text to /api/ocr/extract-expiry-date."
}
```

ดังนั้น frontend เวอร์ชันนี้ควร OCR รูปเอง แล้วส่งเฉพาะ `rawText` มา backend


### Error ที่พบบ่อยของกลุ่ม OCR

| ข้อความ | สาเหตุ |
| --- | --- |
| `restaurantId is required` | ไม่ได้ส่ง `restaurantId` หรือส่งเป็นค่าว่าง |
| `User is not assigned to any restaurant` | user ที่ login ยังไม่ได้ผูกกับร้าน |
| `Unauthorized to access this restaurant` | `restaurantId` ไม่ตรงกับร้านของ user |
| `Restaurant not found` | ไม่มีร้านนี้ในระบบ |
| `image is required` | เรียก `/api/ocr/scan-image` โดยไม่แนบไฟล์ |
| `Backend image OCR is not enabled yet...` | `/api/ocr/scan-image` ยังไม่เปิดใช้งาน |

ถ้า `rawText` ว่าง จะติด validation ของ request body ตั้งแต่แรก (`@NotBlank`)
