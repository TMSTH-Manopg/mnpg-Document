# Premium Publish Process API Specification

## 1. Document Information

> เอกสารฉบับนี้อ้างอิงจากการทำงาน Premium Process API 
---

## 2. Integration Overview

Premium Process ทำหน้าที่ส่งข้อมูล Campaign และรายละเอียด Premium ไปยัง SmileyQuote SOAP Web Service โดยมีลำดับการทำงานดังนี้

1. รับ `campaignId`, `processSend` และข้อมูลที่ Mapping จาก Excel
2. ดึง Campaign Header จากฐานข้อมูล
3. สร้าง Publish Transaction ใหม่สำหรับ New หรือ Resend
4. ตรวจสอบว่า Premium API เปิดใช้งานหรือไม่
5. สร้าง `PremiumRequestPayload`
6. Serialize Payload เป็น JSON
7. นำ JSON ใส่ใน SOAP Request Property ชื่อ `json`
8. เรียก SOAP Operation `smileyquoteAsync`
9. อ่าน JSON Response จาก `response.jsonRS`
10. Deserialize เป็น `PremiumJsonResult`
11. บันทึก Premium Response, File Reference, Status และ Send Date ลง Publish Transaction

---

## 3. SOAP Service Configuration

ค่าการเชื่อมต่ออ่านจาก:

```csharp
_publishsetting.Premium
```

| Configuration | Type | Required | Description |
|---|---|---:|---|
| `Enabled` | Boolean | Yes | เปิดหรือปิดการเรียก Premium API |
| `SoapUrl` | String | Yes | URL ของ SmileyQuote SOAP Web Service |
| `TimeoutSeconds` | Integer | Yes | ระยะเวลารอ SOAP Response หน่วยเป็นวินาที |

ตัวอย่าง Configuration เชิงโครงสร้าง:

```json
{
  "Premium": {
    "Enabled": true,
    "SoapUrl": "https://{host}/{service-path}",
    "TimeoutSeconds": 120
  }
}
```

> URL จริงและข้อมูล Credential ไม่ปรากฏใน Source Code ที่ให้มา จึงใช้ Placeholder ในเอกสารนี้

---

## 4. SOAP Endpoint

###  Endpoint Address

```text
http://tmwsapid01.tmith.net:8080/soap/wsdl?targetURI=urn:WSA-Safety:Smileyquote
```

---

## 5. Premium JSON Request

### 5.1 Request Model

```text
PremiumRequestPayload
```

### 5.2 Request Body Example

JSON ด้านล่างเป็นข้อมูลที่ถูก Serialize แล้วนำไปใส่ใน SOAP Property `json`

```json
{
  "publishCampaignID": "60427",
  "publishCampaignRefer": "571ccf9b-2f4b-4f7f-a521-a41d40180659",
  "publishCampaignDate": "2026-09-22 03:08:00",
  "EffectivePeriod": "2026-10-01T00:00:00",
  "ExpiredPeriod": "2027-09-30T00:00:00",
  "CampaignName": "Full Main Agent Motor Type 2",
  "CampaignDetail": [
    {
      "CampaignKeyId": 12345,
      "CompanyCode": "570",
      "CampaignCode": "C68/00050-2+",
      "Polmst": "530-00000001",
      "Pack": "T",
      "Sclass": "320",
      "Covcod": "2.2",
      "Vehgrp": "01",
      "Vehuse": "1",
      "GarageCd": "TMSTH",
      "Makdes": "FORD",
      "Moddes": "RANGER",
      "CSTFlag": "C",
      "MinYear": 20,
      "MaxYear": 20,
      "MinCst": 0,
      "MaxCst": 3000,
      "MinSi": 50000,
      "MaxSi": 50000,
      "DriverName": "No",
      "DrivNo": "0",
      "DrivAge1": "0",
      "DrivAge2": "0",
      "Uom6U": "A",
      "Cctv": "No",
      "Uom1V": 500000,
      "Uom2V": 10000000,
      "Uom5V": 1000000,
      "Seats41": 3,
      "Mv411": 100000,
      "Mv412": 100000,
      "Mv413": 0,
      "Mv414": 0,
      "Mv42": 100000,
      "Mv43": 200000,
      "Dedod": 0,
      "AdDod": 0,
      "DedPd": 0,
      "FleetPer": "0",
      "Ncbyrs": "0",
      "NcbPer": "50",
      "DspcPer": "36",
      "LoadclmPer": "0",
      "Dstfper": "0",
      "Baseprm1": "7721",
      "MainPrem": "7235",
      "VehicleUsePrem": "0",
      "EnginePrem": "-849",
      "DriverPrem": "0",
      "VehicleAgePrem": "0",
      "AccessoryPrem": "0",
      "SiPrem": "0",
      "VehicleGroupPrem": "0",
      "TpbiPersonPrem": "363.39",
      "TpbiAccPrem": "50",
      "TppdPersonPrem": "100",
      "Driver411Prem": "0",
      "Passenger412Prem": "0",
      "Driver413Prem": "1",
      "Passenger414Prem": "20",
      "MedicalExp42Prem": "0",
      "Bailbond43Prem": "0",
      "DeductODPrem": "0",
      "DeductADPrem": "0",
      "DeductPDPrem": "0",
      "FleetAmt": "3703",
      "NcbAmt": "1333",
      "DspcAmt": "0",
      "LoadclmAmt": "0",
      "Dstfprm": "0",
      "Si22": 50000,
      "Baseprm3": "3400",
      "Prem3new": "3400",
      "VehicleUse3Prem": "0",
      "Engine3Prem": "0",
      "Si3Prem": "0",
      "PrmTnew": "5770.39",
      "PremNetPd": "5770.39",
      "AdjustAll": "-0.61",
      "PrmGapnew": "6200",
      "PrmStpnew": "24",
      "PrmVatnew": "405.61",
      "ShortRate": "No",
      "Day": 365,
      "NetInputGap": "0",
      "GrossInputGap": "0",
      "BehaviorLV": "A",
      "BehaviorPercent": "100",
      "WallChargeSI": "0",
      "RateWallCharge": "0",
      "NetPremiumWallCharge": "0",
      "GrossPremiumWallCharge": "0",
      "BatteryYear": "0",
      "BatteryPrice": "0",
      "BatterySI": "0",
      "RateBattery": "0",
      "NetPremiumBattery": "0",
      "GrossPremiumBattery": "0",
      "MinEVDrivNo": "0",
      "MaxEVDrivNo": "0",
      "DealerGarageRate": "0",
      "DealerGarageAmount": "0"
    }
  ]
}
```

---

## 6. Premium Request Header Fields

| Field |  Type | Required | Description |
|---|---|---:|---|
| `publishCampaignID`  | String | Yes | Transaction ID ของการ Publish ครั้งปัจจุบัน ไม่ใช่ Campaign ID |
| `publishCampaignRefer`  | UUID/String | Yes | Reference หลักของ Campaign ใช้ร่วมกันระหว่าง New และ Resend |
| `publishCampaignDate`  | String | Yes | วันเวลาที่ส่งข้อมูล รูปแบบ `yyyy-MM-dd HH:mm:ss` และเป็น UTC |
| `EffectivePeriod`  | Date/DateTime | Conditional | วันเริ่มมีผลของ Campaign |
| `ExpiredPeriod` |  Date/DateTime | Conditional | วันสิ้นสุดของ Campaign |
| `CampaignName` |  String | Yes | ชื่อ Campaign |
| `CampaignDetail` |  Array | Yes | รายการ Premium ที่ Mapping จาก Excel |

### 6.1 Identifier Semantics

| Identifier | ความหมาย |
|---|---|
| `campaignId` | Campaign Key ที่ใช้ค้นข้อมูลจากฐานข้อมูลภายใน |
| `transactionId` | Transaction ใหม่ที่สร้างทุกครั้งสำหรับ New หรือ Resend |
| `publishCampaignID` | ค่า `transactionId` ที่ส่งไป Premium API |
| `publishCampaignRefer` | ค่า `PremiumReference` ของ Campaign ใช้เป็น Business Reference |

---

## 7. Campaign Detail Field Specification

### 7.1 Product and Vehicle Fields

| JSON Field | Source Excel Field | JSON Type | Nullable | Description |
|---|---|---|---:|---|
| `CampaignKeyId` | Campaign ID จาก Process | Number | No | Campaign Key ภายในระบบ |
| `CompanyCode` | Column 1 | String | Yes | รหัสบริษัท |
| `CampaignCode` | Column 2 | String | Yes | รหัส Campaign |
| `Polmst` | Column 3 | String | Yes | Policy Master Code |
| `Pack` | Column 4 | String | Yes | Package Code |
| `Sclass` | Column 5 | String | Yes | Subclass |
| `Covcod` | Column 6 | String | Yes | Coverage Code |
| `Vehgrp` | Column 7 | String | Yes | Vehicle Group |
| `Vehuse` | Column 8 | String | Yes | Vehicle Use |
| `GarageCd` | Column 9 | String | Yes | Garage Code |
| `Makdes` | Column 10 | String | Yes | Vehicle Make |
| `Moddes` | Column 11 | String | Yes | Vehicle Model |
| `CSTFlag` | Column 12 | String | Yes | CST Flag |
| `MinCst` | Column 13 | Decimal | No | Minimum CST |
| `MaxCst` | Column 14 | Decimal | No | Maximum CST |
| `MinYear` | Column 15 | Integer | Yes | Minimum Vehicle Year/Age Rule |
| `MaxYear` | Column 16 | Integer | Yes | Maximum Vehicle Year/Age Rule |
| `MinSi` | Column 17 | Decimal | No | Minimum Sum Insured |
| `MaxSi` | Column 18 | Decimal | No | Maximum Sum Insured |

### 7.2 Driver and Coverage Fields

| JSON Field | Source Excel Column | JSON Type | Nullable | Description |
|---|---:|---|---:|---|
| `DriverName` | 19 | String | Yes | Named Driver Indicator |
| `DrivNo` | 20 | String | No | จำนวนผู้ขับขี่ แปลงเป็น String |
| `DrivAge1` | 21 | String | No | อายุผู้ขับขี่คนที่ 1 แปลงเป็น String |
| `DrivAge2` | 22 | String | No | อายุผู้ขับขี่คนที่ 2 แปลงเป็น String |
| `Uom6U` | 23 | String | Yes | Coverage Unit/Code |
| `Cctv` | 24 | String | Yes | CCTV Indicator |
| `Uom1V` | 25 | Decimal | Yes | Coverage Value 1 |
| `Uom2V` | 26 | Decimal | Yes | Coverage Value 2 |
| `Uom5V` | 27 | Decimal | Yes | Coverage Value 5 |
| `Seats41` | 28 | Integer | Yes | จำนวนที่นั่งความคุ้มครอง 4.1 |
| `Mv411` | 29 | Decimal | Yes | Coverage 4.1.1 |
| `Mv412` | 30 | Decimal | Yes | Coverage 4.1.2 |
| `Mv413` | 31 | Decimal | Yes | Coverage 4.1.3 |
| `Mv414` | 32 | Decimal | Yes | Coverage 4.1.4 |
| `Mv42` | 33 | Decimal | Yes | Coverage 4.2 |
| `Mv43` | 34 | Decimal | Yes | Coverage 4.3 |

### 7.3 Deductible, Discount and Loading Fields

| JSON Field | Source Excel Column | JSON Type | Nullable | Description |
|---|---:|---|---:|---|
| `Dedod` | 35 | Decimal | Yes | Own Damage Deductible |
| `AdDod` | 36 | Decimal | Yes | Additional Own Damage Deductible |
| `DedPd` | 37 | Decimal | Yes | Property Damage Deductible |
| `FleetPer` | 38 | String | Yes | Fleet Percentage |
| `Ncbyrs` | 39 | String | Yes | NCB Years |
| `NcbPer` | 40 | String | Yes | NCB Percentage |
| `DspcPer` | 41 | String | Yes | Special Discount Percentage |
| `LoadclmPer` | 42 | String | Yes | Claim Loading Percentage |
| `Dstfper` | 43 | String | Yes | Staff Discount Percentage |

### 7.4 Base Premium Fields

| JSON Field | Source Excel Column | JSON Type | Nullable |
|---|---:|---|---:|
| `Baseprm1` | 44 | String | Yes |
| `MainPrem` | 45 | String | Yes |
| `VehicleUsePrem` | 46 | String | Yes |
| `EnginePrem` | 47 | String | Yes |
| `DriverPrem` | 48 | String | Yes |
| `VehicleAgePrem` | 49 | String | Yes |
| `AccessoryPrem` | 50 | String | Yes |
| `SiPrem` | 51 | String | Yes |
| `VehicleGroupPrem` | 52 | String | Yes |

### 7.5 Additional Coverage Premium Fields

| JSON Field | Source Excel Column | JSON Type | Nullable |
|---|---:|---|---:|
| `TpbiPersonPrem` | 53 | String | Yes |
| `TpbiAccPrem` | 54 | String | Yes |
| `TppdPersonPrem` | 55 | String | Yes |
| `Driver411Prem` | 56 | String | Yes |
| `Passenger412Prem` | 57 | String | Yes |
| `Driver413Prem` | 58 | String | Yes |
| `Passenger414Prem` | 59 | String | Yes |
| `MedicalExp42Prem` | 60 | String | Yes |
| `Bailbond43Prem` | 61 | String | Yes |

### 7.6 Premium Adjustment and Summary Fields

| JSON Field | Source Excel Column | JSON Type | Nullable |
|---|---:|---|---:|
| `DeductODPrem` | 62 | String | Yes |
| `DeductADPrem` | 63 | String | Yes |
| `DeductPDPrem` | 64 | String | Yes |
| `FleetAmt` | 65 | String | Yes |
| `NcbAmt` | 66 | String | Yes |
| `DspcAmt` | 67 | String | Yes |
| `LoadclmAmt` | 68 | String | Yes |
| `Dstfprm` | 69 | String | Yes |
| `Si22` | 70 | Decimal | Yes |
| `Baseprm3` | 71 | String | Yes |
| `Prem3new` | 72 | String | Yes |
| `VehicleUse3Prem` | 73 | String | Yes |
| `Engine3Prem` | 74 | String | Yes |
| `Si3Prem` | 75 | String | Yes |
| `PrmTnew` | 76 | String | Yes |
| `PremNetPd` | 77 | String | Yes |
| `AdjustAll` | 78 | String | Yes |
| `PrmGapnew` | 79 | String | Yes |
| `PrmStpnew` | 80 | String | Yes |
| `PrmVatnew` | 81 | String | Yes |

### 7.7 Short Rate, Behavior and EV Fields

| JSON Field | Source Excel Column | JSON Type | Nullable |
|---|---:|---|---:|
| `ShortRate` | 82 | String | Yes |
| `Day` | 83 | Integer | Yes |
| `NetInputGap` | 84 | String | Yes |
| `GrossInputGap` | 85 | String | Yes |
| `BehaviorLV` | 86 | String | Yes |
| `BehaviorPercent` | 87 | String | Yes |
| `WallChargeSI` | 88 | String | Yes |
| `RateWallCharge` | 89 | String | Yes |
| `NetPremiumWallCharge` | 90 | String | Yes |
| `GrossPremiumWallCharge` | 91 | String | Yes |
| `BatteryYear` | 92 | String | Yes |
| `BatteryPrice` | 93 | String | Yes |
| `BatterySI` | 94 | String | Yes |
| `RateBattery` | 95 | String | Yes |
| `NetPremiumBattery` | 96 | String | Yes |
| `GrossPremiumBattery` | 97 | String | Yes |
| `MinEVDrivNo` | 98 | String | Yes |
| `MaxEVDrivNo` | 99 | String | Yes |
| `DealerGarageRate` | 100 | String | Yes |
| `DealerGarageAmount` | 101 | String | Yes |

---

## 8. Premium SOAP Response

### 8.1 SOAP Response Property

ระบบอ่านผลลัพธ์จาก:

```csharp
response.jsonRS
```

| Property | Type | Required | Description |
|---|---|---:|---|
| `jsonRS` | String | Yes | JSON String ที่จะ Deserialize เป็น `PremiumJsonResult` |

### 8.2 Success Response Example

```json
{
  "publishCampaignID": "60427",
  "DateRs": "2026-09-22",
  "TimeRs": "10:08:30",
  "ErrorRs": "",
  "Status": "SUCCESS",
  "fileref": "PREMIUM_60427_20260922.json"
}
```

### 8.3 Business Failure Response Example

```json
{
  "publishCampaignID": "60427",
  "DateRs": "2026-09-22",
  "TimeRs": "10:08:30",
  "ErrorRs": "Invalid campaign detail",
  "Status": "FAILED",
  "fileref": ""
}
```

### 8.4 Response Fields

| Field | Type | Description |
|---|---|---|
| `publishCampaignID` | String | Transaction/Publish ID ที่ Premium System ตอบกลับ |
| `DateRs` | String | วันที่ประมวลผลจาก Premium System |
| `TimeRs` | String | เวลาที่ประมวลผลจาก Premium System |
| `ErrorRs` | String | ข้อความ Error หรือรายละเอียดผลลัพธ์ |
| `Status` | String | สถานะที่ตอบกลับ เช่น `SUCCESS`, `FAILED`, `ERROR` |
| `fileref` | String | File Reference ที่สร้างโดย Premium System |

---

## 9. Error Handling

### 9.1 Empty SOAP Response

หาก `response.jsonRS` เป็น `null`, ว่าง หรือมีเฉพาะช่องว่าง ระบบคืนค่า:

```json
{
  "Status": "ERROR",
  "ErrorRs": "SOAP jsonRS is null",
  "fileref": ""
}
```

### 9.2 Response Deserialization Error

หาก `jsonRS` ไม่สามารถ Deserialize เป็น `PremiumJsonResult` ได้:

```json
{
  "Status": "ERROR",
  "ErrorRs": "Deserialize Error: {exceptionMessage}",
  "fileref": ""
}
```

### 9.3 SOAP or Runtime Exception

หากเกิด Connection Error, Timeout, SOAP Fault หรือ Runtime Exception:

```json
{
  "Status": "ERROR",
  "ErrorRs": "{exceptionMessage}",
  "fileref": "",
  "DateRs": "yyyy-MM-dd"
}
```

### 9.4 Premium Status  by  Process

| Status | Source | Meaning |
|---|---|---|
| `SUCCESS` | Premium API | Premium Process สำเร็จ |
| `FAILED` | Premium API | Premium API ประมวลผลไม่สำเร็จตาม Business Rule |
| `ERROR` | Job Process | เกิด Exception, Empty Response หรือ Deserialize Error |
| `SKIPPED` | Job Configuration | Premium API ถูกปิดใช้งาน |

---

## 10. Premium WebHook Result

Webhook นี้ใช้ส่งผลการประมวลผล Premium จากระบบ SmileyQuote กลับไปยัง GodZilla API เพื่อให้ระบบปลายทางอัปเดตสถานะของ Publish Transaction

ผลลัพธ์แบ่งเป็น 2 กรณี:

1. Campaign สำเร็จ ส่งสถานะ `COMPLETED` และ `items` เป็น Array ว่าง
2. Campaign ล้มเหลว ส่งสถานะ `FAILED` และส่งรายการ Error ใน `items`

### 10.1. Endpoint

```http
POST     api/campaign/premium-publish-response
```

### 10.2 Configuration Keys

| Config Key | Required | Description |
|---|---:|---|
| `API_URL` | Yes | Base URL ของ GodZilla API หรือ Azure API Management |
| `API_ENDPOINT` | Yes | Path ของ Premium Result Webhook |
| `API_KEY` | Yes | Azure API Management Subscription Key |

ตัวอย่างเชิงโครงสร้าง:

```text
API_URL      = https://{apim-host}
API_ENDPOINT = /api/campaign/premium-publish-response
API_KEY      = {subscription-key}
```
### 10.3 Request Body

####   JSON Schema Overview

```json
{
  "publishKeyID": 60427,
  "CampaignRefer": "571ccf9b-2f4b-4f7f-a521-a41d40180659",
  "Status": "COMPLETED",
  "items": []
}
```
#### Item Object
```json
"items" : [
      {
        "Status": "ERROR",
        "Message": "Premium calculation failed",
        "PolicyMaster": "530-00000001"
      }
] 
```

####  Failed Callback with Item Errors

กรณีเกิด Campaign-Level Error ก่อนสร้างหรือ Extract tFile ระบบยังสามารถส่ง Webhook ได้ โดย items จะเป็น Array ว่าง
หรือเมื่อ Premium Campaign ล้มเหลวและมี Error ระดับรายการ:

```json
{
  "publishKeyID": 60427,
  "CampaignRefer": "571ccf9b-2f4b-4f7f-a521-a41d40180659",
  "Status": "FAILED",
  "items": [
    {
      "Status": "ERROR",
      "Message": "Premium calculation failed",
      "PolicyMaster": "530-00000001"
    },
    {
      "Status": "ERROR",
      "Message": "Invalid coverage code",
      "PolicyMaster": "530-00000002"
    }
  ]
}
```
