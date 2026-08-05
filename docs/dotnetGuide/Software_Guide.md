# คู่มือการสอนการใช้งาน Software สำหรับผู้เริ่มต้น
## Workshop: สร้าง Web API ด้วย Visual Studio และทดสอบด้วย Postman

### วัตถุประสงค์
หลังจากเรียนจบ ผู้เข้าอบรมจะสามารถ

- สร้างฐานข้อมูล SQL Server ได้
- สร้าง Visual Studio Project ได้
- เข้าใจโครงสร้าง Solution
- Build และ Run โปรแกรมได้
- Debug โปรแกรมเพื่อตรวจสอบการทำงานได้
- ทดสอบ API ด้วย Postman ได้

---

# Agenda การอบรม

| ลำดับ | หัวข้อ | เวลา |
|---------|---------|---------|
| 1 | สร้าง Database | 30 นาที |
| 2 | สร้าง Visual Studio Project | 30 นาที |
| 3 | Project Setup | 30 นาที |
| 4 | Run และ Debug Program | 45 นาที |
| 5 | ทดสอบ API ด้วย Postman | 45 นาที |
| 6 | Workshop และถามตอบ | 30 นาที |

---

# Step 1 : สร้าง Database

## 1.1 เปิด SQL Server Management Studio (SSMS)

เลือก

```text
Connect > Database Engine
```

กรอกข้อมูล

```text
Server Name : localhost
Authentication : Windows Authentication
```

กด

```text
Connect
```

---

## 1.2 สร้าง Database

คลิกขวา Databases

```text
New Database...
```

ระบุชื่อ

```text
TrainingDB
```

กด

```text
OK
```

---

## 1.3 สร้าง Table

เปิด Query Editor

```sql
CREATE TABLE Customer
(
    CustomerId INT IDENTITY(1,1) PRIMARY KEY,
    CustomerName NVARCHAR(100),
    Email NVARCHAR(100),
    CreateDate DATETIME DEFAULT GETDATE()
)
```

กด

```text
Execute
```

---

## 1.4 เพิ่มข้อมูลตัวอย่าง

```sql
INSERT INTO Customer
(
    CustomerName,
    Email
)
VALUES
(
    'John Doe',
    'john@test.com'
)

INSERT INTO Customer
(
    CustomerName,
    Email
)
VALUES
(
    'Mary Jane',
    'mary@test.com'
)
```

---

## 1.5 ตรวจสอบข้อมูล

```sql
SELECT *
FROM Customer
```

ผลลัพธ์

```text
CustomerId   CustomerName   Email
----------------------------------------
1            John Doe       john@test.com
2            Mary Jane      mary@test.com
```

---

# Step 2 : สร้าง Visual Studio Project

## 2.1 เปิด Visual Studio

เลือก

```text
Create a New Project
```

---

## 2.2 เลือก Template

ค้นหา

```text
ASP.NET Core Web API
```

กด

```text
Next
```

---

## 2.3 กำหนดข้อมูล Project

```text
Project Name : TrainingApi
Location     : D:\Training
Framework    : .NET 8
```

กด

```text
Create
```

---

## 2.4 ทดสอบ Build

เมนู

```text
Build
```

เลือก

```text
Build Solution
```

หรือกด

```text
Ctrl + Shift + B
```

---

# Step 3 : Project Solution Setup

## 3.1 ศึกษาโครงสร้าง Project

```text
TrainingApi
│
├── Controllers
├── Models
├── Data
├── Services
├── appsettings.json
└── Program.cs
```

### หน้าที่ของแต่ละ Folder

#### Controllers

รับ Request จาก Client

ตัวอย่าง

```text
GET
POST
PUT
DELETE
```

---

#### Models

ใช้เก็บ Entity ต่างๆ

เช่น

```csharp
public class Customer
{
    public int CustomerId { get; set; }
    public string CustomerName { get; set; }
    public string Email { get; set; }
}
```

---

#### Data

จัดการ Database Connection

เช่น

```text
DbContext
Connection String
```

---

#### Services

จัดการ Business Logic

เช่น

```text
คำนวณ
ตรวจสอบเงื่อนไข
เรียก External API
```

---

## 3.2 กำหนด Connection String

ไฟล์

```json
appsettings.json
```

ตัวอย่าง

```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Server=localhost;Database=TrainingDB;Trusted_Connection=True;TrustServerCertificate=True;"
  }
}
```

---

## 3.3 Install NuGet Package

เปิด

```text
Tools
→ NuGet Package Manager
→ Manage Packages
```

ติดตั้ง

```text
Microsoft.EntityFrameworkCore
Microsoft.EntityFrameworkCore.SqlServer
Microsoft.EntityFrameworkCore.Tools
```

---

# Step 4 : Run Project

## 4.1 Start Program

กดปุ่ม

```text
F5
```

หรือ

```text
Start Debugging
```

---

## 4.2 สังเกต Console

ตัวอย่าง

```text
Now listening on:
https://localhost:7001

Application started.
```

---

## 4.3 เปิด Swagger

Browser จะเปิด

```text
https://localhost:7001/swagger
```

หน้าจอ Swagger แสดง API ทั้งหมด

---

# Step 5 : Debug Program

## 5.1 สร้าง Breakpoint

คลิกด้านหน้าบรรทัดโค้ด

ตัวอย่าง

```csharp
public IActionResult GetCustomer()
{
    var result = _customerService.GetAll();

    return Ok(result);
}
```

Breakpoint

```csharp
var result = _customerService.GetAll();
```

---

## 5.2 Run แบบ Debug

กด

```text
F5
```

---

## 5.3 เรียก API

เมื่อ API ถูกเรียก

```text
Execution จะหยุดที่ Breakpoint
```

---

## 5.4 ตรวจสอบค่า Variable

นำ Mouse ไปวางบนตัวแปร

```text
result
```

Visual Studio จะแสดงค่า

```text
Count = 2
```

---

## 5.5 คำสั่ง Debug ที่สำคัญ

| ปุ่ม | ความหมาย |
|--------|--------|
| F5 | Continue |
| F9 | Breakpoint |
| F10 | Step Over |
| F11 | Step Into |
| Shift+F11 | Step Out |

---

# Step 6 : ทดสอบ API ด้วย Postman

## 6.1 เปิด Postman

เลือก

```text
New Request
```

---

## 6.2 เรียก API แบบ GET

ตัวอย่าง

```http
GET https://localhost:7001/api/customer
```

กด

```text
Send
```

ผลลัพธ์

```json
[
  {
    "customerId": 1,
    "customerName": "John Doe",
    "email": "john@test.com"
  }
]
```

---

## 6.3 เรียก API แบบ POST

URL

```http
POST https://localhost:7001/api/customer
```

Headers

```text
Content-Type: application/json
```

Body

```json
{
  "customerName": "Peter Parker",
  "email": "peter@test.com"
}
```

กด

```text
Send
```

---

## 6.4 ตรวจสอบผลลัพธ์ใน Database

```sql
SELECT *
FROM Customer
```

ควรพบข้อมูลใหม่

```text
Peter Parker
```

---

# Workshop ปฏิบัติการ

## WorkShop 1

สร้าง Database

```text
WorkshopDB
```

พร้อม Table

```text
Product
```

---

## WorkShop 2

สร้าง Web API

```text
GET /api/product
POST /api/product
```

---

## WorkShop 3

Debug API

ตรวจสอบ

```text
Request
Response
Variable
Exception
```

---

## WorkShop 4

ทดสอบด้วย Postman

ดำเนินการ

```text
Create Product
Get Product
Update Product
Delete Product
```

---

# สรุป

หลังจบการอบรม ผู้เรียนควรสามารถ

✅ สร้าง Database ได้  
✅ สร้าง ASP.NET Core Web API Project ได้  
✅ เข้าใจ Solution Structure ได้  
✅ Run Project ได้  
✅ Debug Program ได้  
✅ ใช้งาน Swagger ได้  
✅ ทดสอบ API ด้วย Postman ได้  
✅ พัฒนา CRUD API เบื้องต้นได้

หลักสูตรนี้เหมาะสำหรับการอบรมผู้เริ่มต้นระยะเวลา 3-4 ชั่วโมง หรือใช้เป็น Workshop สำหรับ Developer Junior และ QA/UAT ที่ต้องการเข้าใจการทำงานของ API ตั้งแต่ต้นจนจบ
