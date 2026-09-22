# Policy Parameter Setup Service - Campaigns API

**OpenAPI version:** 3.0.3  
**API version:** 2.0.0  
**Environment:** Development  
**Base URL:** `https://apis-dev.tokiomarinesafety.co.th/policy/parameter-setup/v1/api`

REST API สำหรับจัดการ Campaign Rate Configuration ของระบบประกันภัยรถยนต์ TMSTH

## สารบัญ

- [Authentication](#authentication)
- [Endpoints](#endpoints)
- [1. Create or replace a campaign](#1-create-or-replace-a-campaign)
- [2. Replace campaign company codes](#2-replace-campaign-company-codes)
- [Data Models](#data-models)
- [Campaign Rate Fields](#campaign-rate-fields)
- [Error Responses](#error-responses)
- [ตัวอย่างการเรียก API](#ตัวอย่างการเรียก-api)

## Authentication

ทุก Endpoint ต้องส่งทั้ง Bearer Token และ Azure API Management Subscription Key

```http
Authorization: Bearer <JWT_ACCESS_TOKEN>
Ocp-Apim-Subscription-Key: <APIM_SUBSCRIPTION_KEY>
Content-Type: application/json
```

| Security scheme | Type | ตำแหน่ง |
|---|---|---|
| `BearerAuth` | HTTP Bearer JWT | Header `Authorization` |
| `ApimSubscriptionKey` | API Key | Header `Ocp-Apim-Subscription-Key` |

## Endpoints

| Method | Endpoint | รายละเอียด |
|---|---|---|
| `PUT` | `/campaigns/{campaignId}` | สร้าง Campaign ใหม่ หรือแทนที่ Campaign และ Rate Rows ทั้งหมด |
| `PUT` | `/campaigns/{campaignId}/company-codes` | แทนที่ Company Codes ทั้งหมดที่ผูกกับ Campaign |

### Path parameter

| Parameter | Type | Required | รายละเอียด |
|---|---|---:|---|
| `campaignId` | UUID | Yes | Campaign ID ที่ Client กำหนด แนะนำ UUID v4 |

ตัวอย่าง:

```text
a1b2c3d4-e5f6-7890-abcd-ef1234567890
```

## 1. Create or replace a campaign

```http
PUT /campaigns/{campaignId}
```

สร้าง Campaign ใหม่ตาม `campaignId` หรือแทนที่ Campaign เดิมแบบ idempotent

### หลักการทำงาน

- Request ต้องส่ง Campaign Metadata และ Rate Rows ทั้งชุด
- Rate Rows เดิมที่ไม่อยู่ใน Request จะถูกลบ
- `campaignId` ถูกกำหนดโดย Client
- รองรับ Rate Rows สูงสุด 10,000 รายการต่อ Request
- ต้องส่ง `campaignName`, `effectiveSchedule` และ `items`
- `items` ต้องมีอย่างน้อย 1 รายการ

### Request body

```json
{
  "campaignName": "Full Main Agent Motor Type 2",
  "description": "แคมเปญสำหรับตัวแทนหลัก ประเภท 2",
  "effectiveSchedule": {
    "effectiveDate": "2024-01-01",
    "expiryDate": "2024-12-31"
  },
  "items": [
    {
      "campaignCode": "C68/00050-2+",
      "polMst": "530-00000001",
      "pack": "T",
      "sClass": "320",
      "covCod": "2.2",
      "vehGrp": "01",
      "vehUse": "1",
      "garageCd": "TMSTH",
      "makDes": "FORD",
      "modDes": "RANGER",
      "cstFlag": "C",
      "minCst": 0,
      "maxCst": 3000,
      "minYear": 20,
      "maxYear": 20,
      "minSi": 50000,
      "maxSi": 50000,
      "driverName": "No",
      "drivNo": 0,
      "cctv": "No",
      "basePrm1": 7721,
      "prmTNew": 5770.39,
      "prmStpNew": 24,
      "prmVatNew": 405.61,
      "prmGapNew": 6200,
      "shortRate": "No",
      "day": 365
    }
  ]
}
```

### Responses

| HTTP status | ความหมาย | Response schema |
|---:|---|---|
| `200 OK` | อัปเดต Campaign เดิมสำเร็จ | `CampaignResponse` |
| `201 Created` | สร้าง Campaign ใหม่สำเร็จ | `CampaignResponse` |
| `400 Bad Request` | Request หรือข้อมูลไม่ถูกต้อง | `ErrorResponse` |
| `401 Unauthorized` | Authentication ไม่ถูกต้องหรือไม่ครบ | `UnauthorizedResponse` |
| `500 Internal Server Error` | เกิดข้อผิดพลาดภายในระบบ | `ErrorResponse` |

### Success response

```json
{
  "code": "S200",
  "message": "Campaign retrieved successfully.",
  "data": {
    "campaignId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "companies": [],
    "campaignName": "Full Main Agent Motor Type 2",
    "description": "แคมเปญสำหรับตัวแทนหลัก ประเภท 2",
    "effectiveSchedule": {
      "effectiveDate": "2024-01-01",
      "expiryDate": "2024-12-31"
    },
    "total": 1213
  }
}
```

## 2. Replace campaign company codes

```http
PUT /campaigns/{campaignId}/company-codes
```

แทนที่ Company Codes ทั้งหมดที่ผูกกับ Campaign แบบ idempotent

### หลักการทำงานและ Validation

- Codes ใน Request จะถูกผูกกับ Campaign
- Codes เดิมที่ไม่อยู่ใน Request จะถูกยกเลิกการผูก
- `companyCode` ต้องมีอยู่ใน Partner Companies มิฉะนั้นตอบ `400 Bad Request`
- `companyCode` หนึ่งค่าผูกได้สูงสุดหนึ่ง Campaign
- หาก Code ถูกผูกกับ Campaign อื่นแล้ว ระบบตอบ `409 Conflict` พร้อม Code และ `campaignId` ปัจจุบัน
- ต้องยกเลิกการผูกจาก Campaign เดิมก่อนจึงจะผูกใหม่ได้
- ส่ง Array ว่างเพื่อล้าง Company Bindings ทั้งหมด

### Request body

```json
{
  "companyCodes": [
    "570",
    "TMSTH"
  ]
}
```

ล้าง Company Bindings ทั้งหมด:

```json
{
  "companyCodes": []
}
```

### Responses

| HTTP status | ความหมาย | Response schema |
|---:|---|---|
| `200 OK` | แทนที่ Company Codes สำเร็จ | `CampaignCompanyCodesResponse` |
| `400 Bad Request` | Company Code ไม่ถูกต้องหรือไม่มีใน Partner Companies | `ErrorResponse` |
| `401 Unauthorized` | Authentication ไม่ถูกต้องหรือไม่ครบ | `UnauthorizedResponse` |
| `404 Not Found` | ไม่พบ Campaign | `NotFoundResponse` |
| `409 Conflict` | Company Code ถูกผูกกับ Campaign อื่น | `ConflictResponse` |
| `500 Internal Server Error` | เกิดข้อผิดพลาดภายในระบบ | `ErrorResponse` |

### Success response

```json
{
  "code": "S200",
  "message": "Company codes retrieved successfully.",
  "data": {
    "campaignId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "companies": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440001",
        "partnerCompanyCode": "570",
        "companyName": "Tokio Marine Insurance"
      }
    ]
  }
}
```

# Data Models

## EffectiveSchedule

| Field | Type | Required | รายละเอียด |
|---|---|---:|---|
| `effectiveDate` | string, date | Yes | วันที่ Configuration เริ่มมีผล |
| `expiryDate` | string, date, nullable | No | วันที่สิ้นสุด กำหนด `null` หากไม่มีวันหมดอายุ |

## PartnerCompanyRef

| Field | Type | Required | Validation |
|---|---|---:|---|
| `id` | UUID | Yes | Partner Company ID |
| `partnerCompanyCode` | string | Yes | สูงสุด 20 ตัวอักษร |
| `companyName` | string | Yes | สูงสุด 75 ตัวอักษร |

## Campaign

| Field | Type | Required | Read only | รายละเอียด |
|---|---|---:|---:|---|
| `campaignId` | UUID | Yes | No | Client-supplied Campaign ID |
| `companies` | `PartnerCompanyRef[]` | No | Yes | Partner Companies ที่ผูกกับ Campaign |
| `campaignName` | string | Yes | No | สูงสุด 200 ตัวอักษร |
| `description` | string, nullable | No | No | สูงสุด 2,000 ตัวอักษร |
| `effectiveSchedule` | `EffectiveSchedule` | Yes | No | ช่วงวันที่มีผล |
| `total` | integer | No | Yes | จำนวน Rate Rows ปัจจุบัน |

## CampaignUpsertRequest

| Field | Type | Required | Validation |
|---|---|---:|---|
| `campaignName` | string | Yes | สูงสุด 200 ตัวอักษร |
| `description` | string, nullable | No | สูงสุด 2,000 ตัวอักษร |
| `effectiveSchedule` | `EffectiveSchedule` | Yes | ต้องมี `effectiveDate` |
| `items` | `CampaignRateInput[]` | Yes | 1 ถึง 10,000 รายการ |

## CampaignCompanyCodesInput

| Field | Type | Required | รายละเอียด |
|---|---|---:|---|
| `companyCodes` | string[] | Yes | แต่ละค่าไม่เกิน 5 ตัวอักษร และ Array ว่างใช้ล้าง Bindings |

# Campaign Rate Fields

`CampaignRateInput` ใช้โครงสร้างเดียวกับ `CampaignRate` แต่ไม่ต้องส่ง Server-managed fields คือ `id` และ `campaignId` โดยแต่ละ Rate Row ต้องมี `campaignCode` และ `polMst`

## Server-managed fields

| Field | Type | Read only | รายละเอียด |
|---|---|---:|---|
| `id` | UUID | Yes | Rate Row ID ที่ Server สร้าง |
| `campaignId` | UUID | Yes | Campaign เจ้าของ Rate Row |

## Section 1: Policy and Campaign

| Field | Type | Required | Validation / รายละเอียด |
|---|---|---:|---|
| `campaignCode` | string | Yes | สูงสุด 15 ตัวอักษร, CSV `CampaignCode` |
| `polMst` | string | Yes | สูงสุด 20 ตัวอักษร, Policy Master Code |

## Section 2: Vehicle Classification

| Field | Type | Validation / รายละเอียด |
|---|---|---|
| `pack` | string, nullable | สูงสุด 5, Package code |
| `sClass` | string, nullable | สูงสุด 5, CSV `SClass` |
| `covCod` | string, nullable | สูงสุด 5, Coverage code |
| `vehGrp` | string, nullable | สูงสุด 5, ค่าว่างถือเป็น null |
| `vehUse` | string, nullable | สูงสุด 5, Vehicle use code |
| `garageCd` | string, nullable | สูงสุด 5, uppercase, ค่าว่างถือเป็น null |
| `makDes` | string, nullable | สูงสุด 15, Vehicle make |
| `modDes` | string, nullable | สูงสุด 15, Vehicle model |
| `cstFlag` | string, nullable | `C`, `S`, `T` |

## Section 3: Range Conditions

| Field | Type | รายละเอียด |
|---|---|---|
| `minCst` | number, nullable | Minimum CC/seats/ton |
| `maxCst` | number, nullable | Maximum CC/seats/ton |
| `minYear` | integer, nullable | Minimum vehicle age |
| `maxYear` | integer, nullable | Maximum vehicle age |
| `minSi` | number, nullable | Minimum sum insured |
| `maxSi` | number, nullable | Maximum sum insured |

## Section 4: Driver Info

| Field | Type | Validation / รายละเอียด |
|---|---|---|
| `driverName` | string, nullable | `Yes` หรือ `No` |
| `drivNo` | integer, nullable | ขั้นต่ำ 0, จำนวน Named Drivers สูงสุดตามธุรกิจ 2 คน |
| `drivAge1` | integer, nullable | ขั้นต่ำ 0 |
| `drivAge2` | integer, nullable | ขั้นต่ำ 0 |

## Section 5: Special Features and Coverage Amounts

| Field | Type | รายละเอียด |
|---|---|---|
| `uom6U` | string, nullable | สูงสุด 1, Accessory code |
| `cctv` | string, nullable | `Yes` หรือ `No` |
| `uom1V` | number, nullable | TPBI per person, ขั้นต่ำ 0 |
| `uom2V` | number, nullable | TPBI per accident, ขั้นต่ำ 0 |
| `uom5V` | number, nullable | TPPD, ขั้นต่ำ 0 |
| `seats41` | integer, nullable | PA seat count, ขั้นต่ำ 0 |
| `mv411` | number, nullable | PA driver SI, ขั้นต่ำ 0 |
| `mv412` | number, nullable | PA passenger SI, ขั้นต่ำ 0 |
| `mv413` | number, nullable | Temporary driver SI, ขั้นต่ำ 0 |
| `mv414` | number, nullable | Temporary passenger SI, ขั้นต่ำ 0 |
| `mv42` | number, nullable | Medical expense SI, ขั้นต่ำ 0 |
| `mv43` | number, nullable | Bail bond SI, ขั้นต่ำ 0 |

## Section 6: Deductibles

| Field | Type | รายละเอียด |
|---|---|---|
| `dedOd` | number, nullable | Own damage deductible, ขั้นต่ำ 0 |
| `adDod` | number, nullable | Additional deductible, ขั้นต่ำ 0 |
| `dedPd` | number, nullable | Property damage deductible, ขั้นต่ำ 0 |

## Section 7: Discount and Loading Percentages

| Field | Type | Validation |
|---|---|---|
| `fleetPer` | number, nullable | 0 ถึง 100 |
| `ncbYrs` | integer, nullable | 0 ถึง 5 |
| `ncbPer` | number, nullable | 0 ถึง 100 |
| `dspcPer` | number, nullable | 0 ถึง 100 |
| `loadclmPer` | number, nullable | 0 ถึง 100 |
| `dstfPer` | number, nullable | 0 ถึง 100 |

## Section 8: Base Premium

| Field | Type | รายละเอียด |
|---|---|---|
| `basePrm1` | number, nullable | Base premium type 1, ขั้นต่ำ 0 |

## Section 9: Premium Step Breakdown

ค่าปรับ Premium ในส่วนนี้เป็นค่าบวก ศูนย์ หรือค่าลบได้ตามสูตรคำนวณ

| Field | Type | รายละเอียด |
|---|---|---|
| `mainPrem` | number, nullable | Main OD premium |
| `vehicleUsePrem` | number, nullable | Vehicle use adjustment |
| `enginePrem` | number, nullable | Engine CST adjustment |
| `driverPrem` | number, nullable | Named driver adjustment |
| `vehicleAgePrem` | number, nullable | Vehicle age adjustment |
| `accessoryPrem` | number, nullable | Accessory premium |
| `siPrem` | number, nullable | Sum insured adjustment |
| `vehicleGroupPrem` | number, nullable | Vehicle group adjustment |
| `tpbiPersonPrem` | number, nullable | TPBI per person premium |
| `tpbiAccPrem` | number, nullable | TPBI per accident premium |
| `tppdPersonPrem` | number, nullable | TPPD premium |
| `driver411Prem` | number, nullable | PA driver premium 411 |
| `passenger412Prem` | number, nullable | PA passenger premium 412 |
| `driver413Prem` | number, nullable | Temporary driver premium 413 |
| `passenger414Prem` | number, nullable | Temporary passenger premium 414 |
| `medicalExp42Prem` | number, nullable | Medical expense premium 42 |
| `bailBond43Prem` | number, nullable | Bail bond premium 43 |
| `deductOdPrem` | number, nullable | OD deductible adjustment |
| `deductAdPrem` | number, nullable | Additional deductible adjustment |
| `deductPdPrem` | number, nullable | PD deductible adjustment |

## Section 10: Discount and Loading Amounts

| Field | Type | รายละเอียด |
|---|---|---|
| `fleetAmt` | number, nullable | Fleet discount amount, ขั้นต่ำ 0 |
| `ncbAmt` | number, nullable | NCB discount amount, ขั้นต่ำ 0 |
| `dspcAmt` | number, nullable | Special discount amount, ขั้นต่ำ 0 |
| `loadclmAmt` | number, nullable | Claim loading amount, ขั้นต่ำ 0 |
| `dstfPrm` | number, nullable | Staff discount amount, ขั้นต่ำ 0 |

## Section 11: Type 3 CMI and Final Totals

| Field | Type | รายละเอียด |
|---|---|---|
| `si22` | number, nullable | Section 2.2 OD SI, ขั้นต่ำ 0 |
| `basePrm3` | number, nullable | Base premium type 3, ขั้นต่ำ 0 |
| `prem3New` | number, nullable | Adjusted CMI premium |
| `vehicleUse3Prem` | number, nullable | Type 3 vehicle use adjustment |
| `engine3Prem` | number, nullable | Type 3 engine adjustment |
| `si3Prem` | number, nullable | Type 3 SI adjustment |
| `prmTNew` | number, nullable | Net premium |
| `premNetPd` | number, nullable | Net premium PD portion |
| `adjustAll` | number, nullable | Rounding adjustment |
| `prmStpNew` | number, nullable | Stamp duty |
| `prmVatNew` | number, nullable | VAT |
| `prmGapNew` | number, nullable | Gross premium |

## Section 12: Short Rate and GAP

| Field | Type | Validation / รายละเอียด |
|---|---|---|
| `shortRate` | string, nullable | `Yes` หรือ `No` |
| `day` | integer, nullable | 1 ถึง 365 |
| `netInputGap` | number, nullable | GAP net premium, ขั้นต่ำ 0 |
| `grossInputGap` | number, nullable | GAP gross premium, ขั้นต่ำ 0 |

## Section 13: Driver Behavior

| Field | Type | Validation / รายละเอียด |
|---|---|---|
| `behaviorLv` | string, nullable | Telematics/IoT behavior level, ค่าว่างถือเป็น null |
| `behaviorPercent` | number, nullable | 0 ถึง 100 |

## Section 14: EV Wall Charger

| Field | Type | รายละเอียด |
|---|---|---|
| `wallChargeSi` | number, nullable | Wall charger SI, ขั้นต่ำ 0 |
| `rateWallCharge` | number, nullable | Wall charger rate, ขั้นต่ำ 0 |
| `netPremiumWallCharge` | number, nullable | Wall charger net premium, ขั้นต่ำ 0 |
| `grossPremiumWallCharge` | number, nullable | Wall charger gross premium, ขั้นต่ำ 0 |

## Section 15: EV Battery

| Field | Type | รายละเอียด |
|---|---|---|
| `batteryYear` | integer, nullable | Battery age/year, ขั้นต่ำ 0 |
| `batteryPrice` | number, nullable | Replacement price, ขั้นต่ำ 0 |
| `batterySi` | number, nullable | Battery SI, ขั้นต่ำ 0 |
| `rateBattery` | number, nullable | Battery rate, ขั้นต่ำ 0 |
| `netPremiumBattery` | number, nullable | Battery net premium, ขั้นต่ำ 0 |
| `grossPremiumBattery` | number, nullable | Battery gross premium, ขั้นต่ำ 0 |

## Section 16: EV Driver and Dealer Garage

| Field | Type | รายละเอียด |
|---|---|---|
| `minEvDrivNo` | integer, nullable | Minimum EV driver count, ขั้นต่ำ 0 |
| `maxEvDrivNo` | integer, nullable | Maximum EV driver count, ขั้นต่ำ 0 |
| `dealerGarageRate` | number, nullable | Dealer garage rate, ขั้นต่ำ 0 |
| `dealerGarageAmount` | number, nullable | Dealer garage amount, ขั้นต่ำ 0 |

# Error Responses

## Standard error format

```json
{
  "code": "E400",
  "message": "Invalid input data",
  "details": [
    {
      "field": "ErrorField",
      "message": "ErrorMessage"
    }
  ],
  "timestamp": "2025-11-26T05:04:21.220Z",
  "traceId": "550e8400-e29b-41d4-a716-446655440000"
}
```

| Field | Type | Required | รายละเอียด |
|---|---|---:|---|
| `code` | string | Yes | `E400`, `E401`, `E404`, `E409`, `E500` |
| `message` | string | Yes | Error message |
| `details` | array | No | รายการ Field Errors |
| `timestamp` | date-time | Yes | เวลาที่เกิด Error |
| `traceId` | UUID | Yes | ID สำหรับติดตามและตรวจสอบ Log |

## Error codes

| HTTP status | Code | ความหมาย |
|---:|---|---|
| `400` | `E400` | Invalid input data |
| `401` | `E401` | Invalid or missing authentication credentials |
| `404` | `E404` | Resource not found |
| `409` | `E409` | Conflict with existing records or bindings |
| `500` | `E500` | Internal server error |

# ตัวอย่างการเรียก API

## cURL: Upsert Campaign

```bash
curl --request PUT \
  'https://apis-dev.tokiomarinesafety.co.th/policy/parameter-setup/v1/api/campaigns/a1b2c3d4-e5f6-7890-abcd-ef1234567890' \
  --header 'Authorization: Bearer <JWT_ACCESS_TOKEN>' \
  --header 'Ocp-Apim-Subscription-Key: <APIM_SUBSCRIPTION_KEY>' \
  --header 'Content-Type: application/json' \
  --data '{
    "campaignName": "Full Main Agent Motor Type 2",
    "description": "แคมเปญสำหรับตัวแทนหลัก ประเภท 2",
    "effectiveSchedule": {
      "effectiveDate": "2024-01-01",
      "expiryDate": "2024-12-31"
    },
    "items": [
      {
        "campaignCode": "C68/00050-2+",
        "polMst": "530-00000001"
      }
    ]
  }'
```

## cURL: Replace Company Codes

```bash
curl --request PUT \
  'https://apis-dev.tokiomarinesafety.co.th/policy/parameter-setup/v1/api/campaigns/a1b2c3d4-e5f6-7890-abcd-ef1234567890/company-codes' \
  --header 'Authorization: Bearer <JWT_ACCESS_TOKEN>' \
  --header 'Ocp-Apim-Subscription-Key: <APIM_SUBSCRIPTION_KEY>' \
  --header 'Content-Type: application/json' \
  --data '{
    "companyCodes": ["570", "TMSTH"]
  }'
```

# Implementation Notes

1. `PUT /campaigns/{campaignId}` เป็น Full Replace ไม่ใช่ Partial Update ดังนั้น Client ต้องส่ง Rate Rows ที่ต้องการเก็บไว้ทั้งหมด
2. Client ควรสร้างและเก็บ `campaignId` แบบ UUID v4 เพื่อให้สามารถ Retry Request เดิมได้อย่างปลอดภัย
3. อย่าส่ง `id` และ `campaignId` ภายใน `items` เพราะเป็น Server-managed fields
4. ตรวจสอบจำนวน `items` ไม่เกิน 10,000 ก่อนส่ง
5. Company Bindings ต้องจัดการผ่าน Endpoint `/company-codes` แยกจาก Campaign Rate Rows
6. เก็บ `traceId` จาก Error Response ทุกครั้งเพื่อใช้ตรวจสอบ Log
7. Empty string ของบางฟิลด์ เช่น `vehGrp`, `garageCd` และ `behaviorLv` ถูกตีความเป็น `null`
