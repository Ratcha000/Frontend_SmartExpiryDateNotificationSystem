# Backend API Reference - Inventory, Usage History, Suggestions

เอกสารนี้สรุป API ที่มีอยู่จริงใน backend ตอนนี้สำหรับระบบ inventory หลังจากมี auth, user และ restaurant แล้ว

ขอบเขตของเอกสารนี้:
- อธิบาย API กลุ่ม `Ingredients`, `Usage History`, และ `Suggestions`
- สรุป request/response ที่ frontend ต้องใช้
- อธิบาย behavior สำคัญจาก service logic จริง
- สรุป flow ที่เหมาะกับหน้า inventory, stock movement และ AI menu suggestion

อ้างอิงโค้ดหลัก:
- [IngredientController.java]
- [UsageHistoryController.java]
- [SuggestionController.java]
- [IngredientService.java]
- [UsageHistoryService.java]
- [SuggestionService.java]

## 1. ภาพรวมระบบ

ระบบส่วนนี้มี 3 กลุ่ม API หลัก:
- `ingredients` สำหรับเพิ่ม แก้ ดู ใช้ Restock ลบ และเช็กสถานะวัตถุดิบ
- `usage-history` สำหรับบันทึกและดูประวัติการเปลี่ยนแปลงปริมาณวัตถุดิบ
- `suggestions` สำหรับให้ AI แนะนำเมนูจาก stock หรือวัตถุดิบใกล้หมดอายุ

role ที่เกี่ยวข้อง:
- `MANAGER`
- `EMPLOYEE`

logic หลัก:
- ทุกข้อมูลถูกผูกกับ `restaurantId`
- user ต้องมี `restaurantId` ตรงกับร้านที่เรียกใช้งาน
- Manager และ Employee ใช้ inventory หลักได้
- Manager เท่านั้นที่ปรับ quantity โดยตรงและดู usage history report ได้
- การเปลี่ยนแปลงวัตถุดิบส่วนใหญ่จะสร้าง usage history อัตโนมัติ

## 2. Authentication และ Common Behavior

### 2.1 Protected endpoints

API ทั้งหมดในเอกสารนี้ต้องส่ง Bearer token:

```http
Authorization: Bearer <token>
```

ถ้า token ไม่ถูกต้อง หมดอายุ หรือไม่ส่ง token จะไม่สามารถใช้งาน API ได้

### 2.2 Restaurant access

service จะตรวจเงื่อนไขสำคัญ:
- `restaurantId` ห้ามว่าง
- user ต้องถูก assign อยู่ในร้าน
- `restaurantId` ที่ส่งมาต้องตรงกับ `currentUser.restaurantId`
- restaurant ต้องมีอยู่จริง

error ที่พบบ่อย:

```json
{
  "timestamp": "2026-08-08T08:00:00Z",
  "status": 400,
  "error": "Bad Request",
  "message": "Unauthorized to access this restaurant"
}
```

### 2.3 Status และ quantity behavior

สถานะวัตถุดิบที่ใช้ในระบบ:
- `ACTIVE`
- `USED`
- `DELETED`
- `EXPIRED`

service จะคำนวณ status จาก state หลายกรณี:
- ถ้า `quantity <= 0` จะเป็น `USED`
- ถ้า `expiryDate` ก่อนวันปัจจุบัน จะเป็น `EXPIRED`
- ถ้ายังมี quantity และยังไม่หมดอายุ จะเป็น `ACTIVE`

หมายเหตุ:
- `DELETED` เป็น soft delete ไม่ได้ลบ record ออกจาก database
- `low-stock` คำนวณจาก `quantity <= 20%` ของ `initialQuantity`
- `expiring` คำนวณจาก `daysLeft >= 0` และ `daysLeft <= notifyDaysBefore`

## 3. Data Shapes หลัก

### 3.1 IngredientResponse

```json
{
  "id": "ingredient-id",
  "restaurantId": "restaurant-id",
  "name": "Chicken Breast",
  "lotId": null,
  "lotName": null,
  "category": "meat",
  "initialQuantity": 10,
  "quantity": 8,
  "unit": "kg",
  "categoryUnitHint": "kg",
  "expiryDate": "2026-08-09",
  "notifyDaysBefore": 3,
  "status": "ACTIVE",
  "daysLeft": 1,
  "expiring": true,
  "expired": false,
  "scannedBy": "user-id",
  "scannedAt": "2026-08-08T08:00:00Z",
  "lastUsedAt": null,
  "updatedBy": "user-id",
  "createdAt": "2026-08-08T08:00:00Z",
  "updatedAt": "2026-08-08T08:00:00Z"
}
```

### 3.2 UsageHistoryResponse

```json
{
  "id": "usage-history-id",
  "ingredientId": "ingredient-id",
  "ingredientName": "Chicken Breast",
  "actionType": "CONSUMED",
  "quantityChanged": 2,
  "unit": "kg",
  "quantityBefore": 10,
  "quantityAfter": 8,
  "performedBy": "user-id",
  "performedAt": "2026-08-08T08:00:00Z",
  "restaurantId": "restaurant-id",
  "note": "Used for lunch prep"
}
```

`actionType` ที่รองรับ:
- `ADDED`
- `EDITED`
- `CONSUMED`
- `RESTOCKED`
- `ADJUSTED`
- `USED`
- `DELETED`

### 3.3 SuggestedMenuResponse

```json
{
  "menuName": "ข้าวโพดผัดเนย",
  "description": "เมนูง่ายสำหรับใช้ corn ก่อนหมดอายุ",
  "ingredientsRequired": ["corn", "butter", "salt"],
  "ingredientsInStock": ["corn"],
  "missingIngredients": ["butter", "salt"],
  "steps": ["เตรียมข้าวโพด", "ผัดกับเนย", "ปรุงรสและเสิร์ฟ"],
  "priority": "HIGH",
  "reason": "ควรใช้วัตถุดิบที่ใกล้หมดอายุก่อน"
}
```

## 4. Ingredient APIs

Base path:

```http
/api/ingredients
```

### `POST /api/ingredients`

- Auth: ต้อง login
- Roles: Manager, Employee
- หน้าที่: เพิ่มวัตถุดิบใหม่ 1 รายการ
- ใช้สำหรับ: manual add, OCR confirm แล้วบันทึกเข้าคลัง

request body:

```json
{
  "restaurantId": "restaurant-id",
  "name": "Chicken Breast",
  "category": "meat",
  "initialQuantity": 10,
  "quantity": 10,
  "unit": "kg",
  "categoryUnitHint": "kg",
  "expiryDate": "2026-08-09",
  "notifyDaysBefore": 3,
  "scannedBy": "user-id",
  "scannedAt": "2026-08-08T08:00:00Z"
}
```

validation/behavior:
- `initialQuantity` ต้องมากกว่าหรือเท่ากับ `quantity`
- `quantity` ตอนสร้างต้องมากกว่า `0`
- `category` จะถูกเก็บเป็น lowercase
- สร้าง usage history action `ADDED` อัตโนมัติ

success response:
- HTTP `201 Created`
- คืน `IngredientResponse`

### `POST /api/ingredients/batch`

- Auth: ต้อง login
- Roles: Manager, Employee
- หน้าที่: เพิ่มวัตถุดิบหลายรายการใน lot เดียวกัน
- ใช้สำหรับ: receipt หรือ OCR ที่มีของหลายส่วนในชุดเดียว

request body:

```json
{
  "restaurantId": "restaurant-id",
  "lotName": "Pork",
  "category": "meat",
  "unit": "kg",
  "categoryUnitHint": "kg",
  "expiryDate": "2026-08-15",
  "notifyDaysBefore": 3,
  "scannedBy": "user-id",
  "scannedAt": "2026-08-08T08:00:00Z",
  "items": [
    {
      "partName": "Pork Belly",
      "initialQuantity": 4,
      "quantity": 4
    },
    {
      "partName": "Pork Shoulder",
      "initialQuantity": 6,
      "quantity": 6
    }
  ]
}
```

behavior:
- backend สร้าง `lotId` เดียวกันให้ทุก item
- ชื่อวัตถุดิบจะเป็นรูปแบบ `lotName - partName`
- แต่ละ item สร้าง usage history action `ADDED`

success response:
- HTTP `201 Created`
- คืน `List<IngredientResponse>`

### `GET /api/ingredients?restaurantId=&status=&category=`

- Auth: ต้อง login
- Roles: Manager, Employee
- หน้าที่: ดึงรายการวัตถุดิบของร้าน พร้อม optional filters
- ใช้สำหรับ: inventory list, filter by status/category

query params:
- `restaurantId`: required
- `status`: optional, เช่น `ACTIVE`, `USED`, `DELETED`, `EXPIRED`
- `category`: optional

ตัวอย่าง:

```http
GET /api/ingredients?restaurantId=restaurant-id&status=ACTIVE&category=meat
```

behavior:
- sort ตาม `expiryDate` แล้วตาม `name`
- filter category แบบ case-insensitive

success response:
- HTTP `200 OK`
- คืน `List<IngredientResponse>`

### `GET /api/ingredients/{id}`

- Auth: ต้อง login
- Roles: Manager, Employee
- หน้าที่: ดูรายละเอียดวัตถุดิบ 1 รายการ

success response:
- HTTP `200 OK`
- คืน `IngredientResponse`

### `PUT /api/ingredients/{id}`

- Auth: ต้อง login
- Roles: Manager, Employee
- หน้าที่: แก้ข้อมูลวัตถุดิบ

request body:
- ใช้ shape เดียวกับ `POST /api/ingredients`

important behavior:
- ห้ามเปลี่ยน `restaurantId`
- สร้าง usage history action `EDITED`
- status จะถูกคำนวณใหม่จาก expiry date และ quantity

success response:
- HTTP `200 OK`
- คืน `IngredientResponse`

### `PATCH /api/ingredients/{id}/consume`

- Auth: ต้อง login
- Roles: Manager, Employee
- หน้าที่: ใช้วัตถุดิบบางส่วน

request body:

```json
{
  "quantity": 2,
  "note": "Used for lunch prep"
}
```

validation/behavior:
- `quantity` ต้องมากกว่า `0`
- consume เกิน quantity คงเหลือไม่ได้
- ใช้กับ `DELETED` หรือ `USED` ไม่ได้
- update `lastUsedAt`
- สร้าง usage history action `CONSUMED`

success response:
- HTTP `200 OK`
- คืน `IngredientResponse`

### `PATCH /api/ingredients/{id}/restock`

- Auth: ต้อง login
- Roles: Manager, Employee
- หน้าที่: เพิ่ม quantity ให้ stock เดิม

request body:

```json
{
  "quantity": 5,
  "note": "New stock added"
}
```

behavior:
- `quantity` ต้องมากกว่า `0`
- restock วัตถุดิบที่ `DELETED` ไม่ได้
- สร้าง usage history action `RESTOCKED`

success response:
- HTTP `200 OK`
- คืน `IngredientResponse`

### `PATCH /api/ingredients/{id}/adjust-quantity`

- Auth: ต้อง login
- Roles: Manager only
- หน้าที่: ปรับ quantity เป็นค่าที่กำหนดโดยตรง
- ใช้สำหรับ: stock audit หรือแก้ยอดคลัง

request body:

```json
{
  "quantity": 7,
  "reason": "Stock count correction"
}
```

validation/behavior:
- `quantity` ต้องมากกว่าหรือเท่ากับ `0`
- `reason` ห้ามว่าง
- Employee จะได้ error `Only Managers can adjust ingredient quantity directly`
- สร้าง usage history action `ADJUSTED`

success response:
- HTTP `200 OK`
- คืน `IngredientResponse`

### `PATCH /api/ingredients/{id}/used`

- Auth: ต้อง login
- Roles: Manager, Employee
- หน้าที่: mark วัตถุดิบว่าใช้หมดแล้ว

request body:

```json
{
  "note": "Finished today"
}
```

หมายเหตุ:
- request body ไม่ส่งก็ได้
- backend จะ set `quantity` เป็น `0`
- status จะกลายเป็น `USED`
- update `lastUsedAt`
- สร้าง usage history action `USED`

success response:
- HTTP `200 OK`
- คืน `IngredientResponse`

### `PATCH /api/ingredients/{id}/delete`

- Auth: ต้อง login
- Roles: Manager, Employee
- หน้าที่: soft delete วัตถุดิบ

request body:

```json
{
  "note": "Duplicate record"
}
```

หมายเหตุ:
- request body ไม่ส่งก็ได้
- backend จะ set status เป็น `DELETED`
- quantity ยังอยู่เท่าเดิม
- สร้าง usage history action `DELETED`

success response:
- HTTP `200 OK`
- คืน `IngredientResponse`

### `PATCH /api/ingredients/{id}/status`

- Auth: ต้อง login
- Roles: Manager, Employee
- หน้าที่: เปลี่ยน status โดยตรง

request body:

```json
{
  "status": "USED",
  "note": "Manually marked as used"
}
```

behavior:
- ถ้า set เป็น `USED` backend จะ set `quantity` เป็น `0`
- ถ้า set เป็น `ACTIVE` แต่ quantity เป็น `0` จะ error
- สร้าง usage history action `EDITED`

success response:
- HTTP `200 OK`
- คืน `IngredientResponse`

### `GET /api/ingredients/expiring?restaurantId=`

- Auth: ต้อง login
- Roles: Manager, Employee
- หน้าที่: ดึงวัตถุดิบที่ใกล้หมดอายุ

behavior:
- เอาเฉพาะ status `ACTIVE`
- `daysLeft >= 0`
- `daysLeft <= notifyDaysBefore`
- sort ตาม `expiryDate`

success response:
- HTTP `200 OK`
- คืน `List<IngredientResponse>`

### `GET /api/ingredients/expired?restaurantId=`

- Auth: ต้อง login
- Roles: Manager, Employee
- หน้าที่: ดึงวัตถุดิบหมดอายุ

behavior:
- ถือว่าหมดอายุถ้า status เป็น `EXPIRED` หรือ `daysLeft < 0`

success response:
- HTTP `200 OK`
- คืน `List<IngredientResponse>`

### `GET /api/ingredients/low-stock?restaurantId=&category=`

- Auth: ต้อง login
- Roles: Manager, Employee
- หน้าที่: ดึงวัตถุดิบที่เหลือน้อย

query params:
- `restaurantId`: required
- `category`: optional

behavior:
- ไม่รวม status `DELETED`
- low stock คือ `quantity <= initialQuantity * 0.20`
- sort ตาม `quantity` แล้วตาม `name`

success response:
- HTTP `200 OK`
- คืน `List<IngredientResponse>`

## 5. Usage History APIs

Base path:

```http
/api/usage-history
```

### `POST /api/usage-history`

- Auth: ต้อง login
- Roles: Manager, Employee
- หน้าที่: สร้าง usage history entry เอง
- ใช้สำหรับ: manual log หรือ import log เพิ่มเติม

request body:

```json
{
  "ingredientId": "ingredient-id",
  "actionType": "CONSUMED",
  "quantityChanged": 2,
  "quantityBefore": 10,
  "quantityAfter": 8,
  "note": "Manual usage log"
}
```

behavior:
- backend จะหา ingredient จาก `ingredientId`
- `restaurantId`, `ingredientName`, `unit`, `performedBy` จะอิงจาก ingredient และ current user
- user ต้องอยู่ร้านเดียวกับ ingredient

success response:
- HTTP `201 Created`
- คืน `UsageHistoryResponse`

frontend recommendation:
- โดยทั่วไปไม่จำเป็นต้องเรียกเองถ้าใช้ ingredient APIs เพราะ service สร้าง log ให้อัตโนมัติแล้ว

### `GET /api/usage-history?restaurantId=&ingredientId=&actionType=`

- Auth: ต้อง login
- Roles: Manager only
- หน้าที่: ดู usage history ของร้าน พร้อม optional filters
- ใช้สำหรับ: report, audit trail, stock movement page

query params:
- `restaurantId`: required
- `ingredientId`: optional
- `actionType`: optional, เช่น `CONSUMED`, `RESTOCKED`, `ADJUSTED`

ตัวอย่าง:

```http
GET /api/usage-history?restaurantId=restaurant-id&actionType=CONSUMED
```

behavior:
- Employee จะได้ error `Only Managers can access usage history reports`
- sort ตาม `performedAt` ใหม่ไปเก่า
- filter `actionType` แบบ case-insensitive

success response:
- HTTP `200 OK`
- คืน `List<UsageHistoryResponse>`

### `GET /api/usage-history/{id}`

- Auth: ต้อง login
- Roles: Manager only
- หน้าที่: ดู usage history entry รายการเดียว

success response:
- HTTP `200 OK`
- คืน `UsageHistoryResponse`

## 6. Suggestion APIs

Base path:

```http
/api/suggestions
```

### `POST /api/suggestions/menu`

- Auth: ต้อง login
- Roles: Manager, Employee
- หน้าที่: ขอเมนูแนะนำจากวัตถุดิบที่ user เลือก
- ใช้สำหรับ: user เลือก ingredient หลายตัวแล้วให้ AI เสนอเมนู

request body:

```json
{
  "restaurantId": "restaurant-id",
  "ingredientNames": ["Chicken Breast", "corn"],
  "maxMenus": 3,
  "language": "th"
}
```

validation/behavior:
- `ingredientNames` ห้ามว่าง
- `maxMenus` อยู่ระหว่าง `1` ถึง `10`
- ถ้าไม่ส่ง `language` จะใช้ `th`
- backend จะส่ง stock ทั้งหมดของร้านที่ยังไม่ `DELETED` และ quantity มากกว่า `0` ไปประกอบ prompt

success response:

```json
{
  "restaurantId": "restaurant-id",
  "sourceIngredients": ["Chicken Breast", "corn"],
  "menus": [
    {
      "menuName": "ข้าวโพดผัดไก่",
      "description": "เมนูง่ายที่ใช้วัตถุดิบในร้าน",
      "ingredientsRequired": ["Chicken Breast", "corn", "salt"],
      "ingredientsInStock": ["Chicken Breast", "corn"],
      "missingIngredients": ["salt"],
      "steps": ["เตรียมวัตถุดิบ", "ผัดไก่กับข้าวโพด", "ปรุงรส"],
      "priority": "HIGH",
      "reason": "ใช้วัตถุดิบที่ควรถูกใช้ก่อน"
    }
  ]
}
```

### `GET /api/suggestions/ingredients/near-expiry?restaurantId=`

- Auth: ต้อง login
- Roles: Manager, Employee
- หน้าที่: ดูวัตถุดิบใกล้หมดอายุพร้อมเมนูแนะนำ
- ใช้สำหรับ: dashboard หรือหน้า urgent ingredients

behavior:
- ดึง stock ที่ยังไม่ `DELETED` และ quantity มากกว่า `0`
- กรองเฉพาะ status `ACTIVE`
- กรองวัตถุดิบที่ `daysLeft >= 0` และ `daysLeft <= notifyDaysBefore`
- เรียก AI แนะนำเมนูให้แต่ละ ingredient สูงสุด 3 เมนู

success response:

```json
[
  {
    "ingredientId": "ingredient-id",
    "ingredientName": "Chicken Breast",
    "category": "meat",
    "quantity": 10,
    "unit": "kg",
    "expiryDate": "2026-08-09",
    "daysLeft": 1,
    "menus": [
      {
        "menuName": "ไก่ย่างสมุนไพร",
        "description": "เมนูใช้ Chicken Breast ก่อนหมดอายุ",
        "ingredientsRequired": ["Chicken Breast", "herbs", "salt"],
        "ingredientsInStock": ["Chicken Breast"],
        "missingIngredients": ["herbs", "salt"],
        "steps": ["หมักไก่", "ย่างจนสุก", "จัดเสิร์ฟ"],
        "priority": "HIGH",
        "reason": "วัตถุดิบเหลือ 1 วันก่อนหมดอายุ"
      }
    ]
  }
]
```

important note:
- endpoint นี้เรียก AI ทีละวัตถุดิบใกล้หมดอายุ ถ้ามีหลายรายการจะใช้เวลานาน
- ถ้า KKU AI config, model หรือ API key มีปัญหา จะได้ error จาก backend

### `GET /api/suggestions/menu/{ingredientName}?restaurantId=`

- Auth: ต้อง login
- Roles: Manager, Employee
- หน้าที่: ขอเมนูแนะนำจากวัตถุดิบ 1 อย่าง
- ใช้สำหรับ: user กด ingredient card แล้วดูเมนูที่ทำได้

ตัวอย่าง:

```http
GET /api/suggestions/menu/corn?restaurantId=restaurant-id
```

behavior:
- `ingredientName` ห้ามว่าง
- default menu limit คือ 5
- default language คือ `th`
- backend ใช้ stock ปัจจุบันของร้านประกอบ prompt เพื่อให้ AI แยก `ingredientsInStock` และ `missingIngredients`

success response:

```json
{
  "restaurantId": "restaurant-id",
  "ingredientName": "corn",
  "menus": [
    {
      "menuName": "ข้าวโพดผัดเนย",
      "description": "เมนูง่ายสำหรับใช้ corn",
      "ingredientsRequired": ["corn", "butter", "salt"],
      "ingredientsInStock": ["corn"],
      "missingIngredients": ["butter", "salt"],
      "steps": ["เตรียมข้าวโพด", "ผัดกับเนย", "ปรุงรส"],
      "priority": "MEDIUM",
      "reason": "เป็นเมนูง่ายและใช้วัตถุดิบหลักที่เลือก"
    }
  ]
}
```

## 7. Frontend Flow ที่แนะนำ

## 7.1 Inventory List Flow

หลัง login และมี `restaurantId`:
- เรียก `GET /api/ingredients?restaurantId=...`
- แสดง status, quantity, unit, expiry date, days left
- ใช้ `expiring` และ `expired` จาก response เพื่อแสดง badge
- filter ใน UI ด้วย `status` และ `category`

frontend recommendation:
- ใช้ `GET /api/ingredients/expiring` สำหรับ widget ของใกล้หมดอายุ
- ใช้ `GET /api/ingredients/low-stock` สำหรับ widget ของใกล้หมด
- ไม่ควรซ่อน `DELETED` ด้วย client อย่างเดียว ถ้าต้องการ active stock ให้เรียก filter status ให้ชัด

## 7.2 Add Ingredient Flow

เพิ่มวัตถุดิบเดี่ยว:
- ใช้ `POST /api/ingredients`
- เหมาะกับ manual form หรือ confirm จาก OCR 1 รายการ

เพิ่มหลายรายการใน lot เดียว:
- ใช้ `POST /api/ingredients/batch`
- เหมาะกับ receipt หรือรายการที่แบ่งเป็น part ย่อย

frontend recommendation:
- validate `initialQuantity >= quantity` ก่อน submit
- บังคับ `notifyDaysBefore >= 0`
- แสดง preview ชื่อที่จะได้จาก batch เป็น `lotName - partName`

## 7.3 Stock Movement Flow

ใช้วัตถุดิบบางส่วน:
- ใช้ `PATCH /api/ingredients/{id}/consume`

เติม stock:
- ใช้ `PATCH /api/ingredients/{id}/restock`

ใช้หมด:
- ใช้ `PATCH /api/ingredients/{id}/used`

ปรับยอดจากการนับ stock:
- ใช้ `PATCH /api/ingredients/{id}/adjust-quantity`
- เปิดให้ Manager เท่านั้น

frontend recommendation:
- หลัง action สำเร็จให้ refresh ingredient detail/list
- ถ้าต้องแสดง audit trail ให้ Manager เรียก `GET /api/usage-history`

## 7.4 Usage History Flow

Manager:
- เรียก `GET /api/usage-history?restaurantId=...`
- filter ด้วย `ingredientId` หรือ `actionType`
- ใช้แสดง stock movement report

Employee:
- ไม่ควรเปิดหน้า report นี้ เพราะ service จำกัด Manager only
- ใช้ ingredient actions ได้ แต่ดู report รวมไม่ได้

## 7.5 AI Menu Suggestion Flow

ขอเมนูจาก ingredient ที่ user เลือกเอง:
- ใช้ `POST /api/suggestions/menu`

ขอเมนูจาก ingredient เดี่ยว:
- ใช้ `GET /api/suggestions/menu/{ingredientName}`

ดูของใกล้หมดอายุพร้อมเมนู:
- ใช้ `GET /api/suggestions/ingredients/near-expiry`

frontend recommendation:
- แสดง loading state ชัดเจน เพราะ AI request อาจใช้เวลานาน
- แสดง error message จาก backend ถ้า KKU AI model/config ใช้ไม่ได้
- อย่า assume ว่า `ingredientsInStock` แม่น 100% เพราะ AI เป็นคนสร้างคำตอบ

## 8. Route ที่ frontend ควรใช้เป็นหลัก

Inventory screen:
- `GET /api/ingredients?restaurantId=...`
- `GET /api/ingredients/expiring?restaurantId=...`
- `GET /api/ingredients/low-stock?restaurantId=...`

Ingredient detail:
- `GET /api/ingredients/{id}`
- `PATCH /api/ingredients/{id}/consume`
- `PATCH /api/ingredients/{id}/restock`
- `PATCH /api/ingredients/{id}/used`

Manager audit/report:
- `GET /api/usage-history?restaurantId=...`
- `PATCH /api/ingredients/{id}/adjust-quantity`

AI suggestion:
- `POST /api/suggestions/menu`
- `GET /api/suggestions/menu/{ingredientName}?restaurantId=...`
- `GET /api/suggestions/ingredients/near-expiry?restaurantId=...`

## 9. ข้อสังเกตสำคัญสำหรับ frontend/backend

### 9.1 AI suggestions ยังควรถือเป็นคำแนะนำ

AI response ยังไม่มี post-validation เข้มงวดว่า:
- `ingredientsInStock` ตรงกับ stock จริงทุกตัวหรือไม่
- `missingIngredients` ขาดจริงหรือไม่
- เมนูใช้ source ingredient จริงหรือไม่

frontend ควรแสดงเป็น recommendation ไม่ใช่คำสั่งผลิตอาหารแบบยืนยันอัตโนมัติ

### 9.2 Near-expiry suggestions อาจช้า

`GET /api/suggestions/ingredients/near-expiry` เรียก AI แยกต่อ ingredient ใกล้หมดอายุแต่ละตัว ถ้ามีหลายรายการ response จะช้าตามจำนวน AI calls

frontend ควร:
- มี loading state
- มี retry
- แสดง partial/empty state อย่างชัดเจนถ้า backend error

### 9.3 Usage history report เป็น Manager only

ถึง controller summary จะบอก role แล้ว แต่ enforcement จริงอยู่ใน `UsageHistoryService`

Employee:
- สร้าง usage history ผ่าน ingredient action ได้
- แต่ดู report ผ่าน `GET /api/usage-history` ไม่ได้

### 9.4 Quantity action กับ status

หลาย action เปลี่ยน status อัตโนมัติ:
- consume จนเหลือ `0` จะกลายเป็น `USED`
- mark used จะ set quantity เป็น `0`
- restock ของที่ `USED` อาจกลับเป็น `ACTIVE` ถ้ายังไม่หมดอายุ
- item ที่ expiry date ผ่านแล้วจะถูก resolve เป็น `EXPIRED`

frontend ควร refresh response หลัง action ไม่ควรคำนวณ status เอง

## 10. ตัวอย่าง Swagger Test Sequence

### Manager/Employee: เพิ่มวัตถุดิบและใช้บางส่วน

1. Login แล้ว copy token
2. สร้าง ingredient:

```http
POST /api/ingredients
```

3. ดูรายการ:

```http
GET /api/ingredients?restaurantId=restaurant-id
```

4. consume:

```http
PATCH /api/ingredients/{id}/consume
```

5. ดู detail ใหม่:

```http
GET /api/ingredients/{id}
```

### Manager: ดู usage history

```http
GET /api/usage-history?restaurantId=restaurant-id
```

### Manager/Employee: ขอเมนู AI จากวัตถุดิบ

```http
POST /api/suggestions/menu
```

request body:

```json
{
  "restaurantId": "restaurant-id",
  "ingredientNames": ["corn"],
  "maxMenus": 1,
  "language": "th"
}
```

## 11. API ที่ยังควรพิจารณาเพิ่มในอนาคต

ยังไม่มีในระบบตอนนี้:
- paginated ingredient list
- search ingredient by name
- category master data
- usage history export
- AI suggestion caching
- background job สำหรับ AI suggestion
- validation หลัง AI ตอบว่าเมนูใช้ stock จริงหรือไม่
- endpoint สำหรับรวม near-expiry ingredients แล้วเรียก AI ครั้งเดียว

