# QMOD Campaign Publish Process และ DTO Design

## 1. วัตถุประสงค์

เอกสารนี้สรุปการออกแบบกระบวนการ Publish Campaign ไปยังระบบ QMOD โดยใช้ข้อมูลที่ผ่านการ Mapping แล้วจาก `ReadPublishData` และเรียก QMOD API จำนวน 2 ขั้นตอนตามลำดับ

1. `PUT /campaigns/{campaignId}` สำหรับสร้างหรือแทนที่ข้อมูล Campaign
2. `PUT /campaigns/{campaignId}/company-codes` สำหรับแทนที่ Company Codes ที่ผูกกับ Campaign

หลักการสำคัญของการออกแบบ:

- Mapping ข้อมูลจาก `ReadPublishData` เพียงครั้งเดียวก่อนเริ่ม Process
- `PublishQmodProcess` รับ QMOD DTO ที่ Mapping แล้ว ไม่ Mapping ข้อมูลซ้ำ
- Campaign API ต้องสำเร็จก่อนจึงเรียก Company Codes API
- แยก Request DTO และ Response DTO ของแต่ละ API อย่างชัดเจน
- ใช้ Generic Response DTO สำหรับโครงสร้าง Response ที่ใช้ร่วมกัน
- ตรวจสอบทั้ง HTTP Status Code และ Business Code จาก Response Body
- บันทึก Request และ Response แยกตามแต่ละ Step
- ไม่เก็บ `Task<T>` ไว้ใน Response DTO
- ไม่ส่ง `companyCodes: []` โดยไม่ตั้งใจ เพราะ Endpoint เป็นการ Replace ข้อมูลเดิม

---

## 2. ภาพรวมกระบวนการ

```text
ReadPublishData
      |
      v
PublishMapping()
      |
      +-- PremiumItems
      +-- QmodItems
      +-- CompanyCodes
              |
              v
PublishQmodProcess()
      |
      +-- Validate configuration and input
      +-- Build QmodCampaignRequest
      +-- Build QmodCompanyCodesRequest
      |
      +-- STEP 1: PUT /campaigns/{campaignId}
      |       |
      |       +-- Success: HTTP 200 or 201 and code S200
      |       +-- Failed: stop QMOD process
      |
      +-- STEP 2: PUT /campaigns/{campaignId}/company-codes
              |
              +-- Success: HTTP 200 and code S200
              +-- Failed: return PARTIAL_SUCCESS
```

---

## 3. API Contract Summary

### 3.1 Campaign API

```http
PUT /campaigns/{campaignId}
```

| HTTP Status | ความหมาย |
|---:|---|
| 200 | Campaign มีอยู่แล้วและถูก Update |
| 201 | Campaign ใหม่ถูกสร้างสำเร็จ |
| 400 | Request ไม่ถูกต้อง |
| 401 | Authentication ไม่ถูกต้องหรือไม่มี Credential |
| 500 | Internal Server Error |

Success Business Code:

```text
S200
```

### 3.2 Company Codes API

```http
PUT /campaigns/{campaignId}/company-codes
```

| HTTP Status | ความหมาย |
|---:|---|
| 200 | Company Codes ถูกแทนที่สำเร็จ |
| 400 | Request ไม่ถูกต้อง |
| 401 | Authentication ไม่ถูกต้องหรือไม่มี Credential |
| 404 | ไม่พบ Campaign |
| 409 | ข้อมูล Conflict หรือ Version ไม่ตรงกัน |
| 500 | Internal Server Error |

> คำเตือน: Endpoint นี้เป็น Replace การส่ง Array ว่างอาจลบ Company Codes เดิมทั้งหมด ควรหยุด Process เมื่อไม่พบ Company Code เว้นแต่ Business Requirement ต้องการล้างข้อมูลจริง

---

# 4. DTO สำหรับ Mapping Result

DTO นี้เก็บผลจากการวน `ReadPublishData` เพียงครั้งเดียว แล้วแยกข้อมูลที่พร้อมส่งให้ Premium และ QMOD

```csharp
public sealed class PublishMappingResult
{
    public List<SmileyQuotePremiumRequest> PremiumItems { get; init; }
        = new();

    public List<QmodCampaignItemRequest> QmodItems { get; init; }
        = new();

    public HashSet<string> CompanyCodes { get; init; }
        = new(StringComparer.OrdinalIgnoreCase);
}
```

ตัวอย่าง Mapping Method:

```csharp
private static PublishMappingResult PublishMapping(
    IReadOnlyCollection<ReadPublishData>? sourceData)
{
    var result = new PublishMappingResult();

    if (sourceData == null || sourceData.Count == 0)
    {
        return result;
    }

    foreach (var item in sourceData)
    {
        if (item == null)
        {
            continue;
        }

        result.PremiumItems.Add(MapPremiumDetail(item));
        result.QmodItems.Add(MapQmodDetail(item));

        var companyCode = item.CompanyCode?.Trim();

        if (!string.IsNullOrWhiteSpace(companyCode))
        {
            result.CompanyCodes.Add(companyCode);
        }
    }

    return result;
}
```

---

# 5. Request DTO สำหรับ Campaign API

## 5.1 QmodCampaignRequest

```csharp
using Newtonsoft.Json;

public sealed class QmodCampaignRequest
{
    [JsonProperty("campaignName")]
    public string CampaignName { get; set; } = string.Empty;

    [JsonProperty("description")]
    public string? Description { get; set; }

    [JsonProperty("effectiveSchedule")]
    public QmodEffectiveScheduleRequest EffectiveSchedule { get; set; }
        = new();

    [JsonProperty("items")]
    public List<QmodCampaignItemRequest> Items { get; set; }
        = new();
}
```

## 5.2 QmodEffectiveScheduleRequest

```csharp
public sealed class QmodEffectiveScheduleRequest
{
    [JsonProperty("effectiveDate")]
    public string? EffectiveDate { get; set; }

    [JsonProperty("expiryDate")]
    public string? ExpiryDate { get; set; }
}
```

ใช้ `string` เพื่อรักษารูปแบบวันที่ตาม API Contract:

```text
yyyy-MM-dd
```

ตัวอย่าง:

```json
{
  "effectiveDate": "2024-01-01",
  "expiryDate": "2024-12-31"
}
```

## 5.3 QmodCampaignItemRequest

> หมายเหตุ: Type ของ Property ต้องตรวจสอบให้ตรงกับ Swagger Schema และ `ReadPublishData` จริง โดยเฉพาะ `Day`, `ShortRate`, `BatteryYear`, Driver Number และวงเงินความคุ้มครอง

```csharp
public sealed class QmodCampaignItemRequest
{
    [JsonProperty("campaignCode")]
    public string? CampaignCode { get; set; }

    [JsonProperty("polMst")]
    public string? PolMst { get; set; }

    [JsonProperty("pack")]
    public string? Pack { get; set; }

    [JsonProperty("sClass")]
    public string? SClass { get; set; }

    [JsonProperty("covCod")]
    public string? CovCod { get; set; }

    [JsonProperty("vehGrp")]
    public string? VehGrp { get; set; }

    [JsonProperty("vehUse")]
    public string? VehUse { get; set; }

    [JsonProperty("garageCd")]
    public string? GarageCd { get; set; }

    [JsonProperty("makDes")]
    public string? MakDes { get; set; }

    [JsonProperty("modDes")]
    public string? ModDes { get; set; }

    [JsonProperty("cstFlag")]
    public string? CstFlag { get; set; }

    [JsonProperty("minCst")]
    public decimal? MinCst { get; set; }

    [JsonProperty("maxCst")]
    public decimal? MaxCst { get; set; }

    [JsonProperty("minYear")]
    public int? MinYear { get; set; }

    [JsonProperty("maxYear")]
    public int? MaxYear { get; set; }

    [JsonProperty("minSi")]
    public decimal? MinSi { get; set; }

    [JsonProperty("maxSi")]
    public decimal? MaxSi { get; set; }

    [JsonProperty("driverName")]
    public string? DriverName { get; set; }

    [JsonProperty("drivNo")]
    public int? DrivNo { get; set; }

    [JsonProperty("drivAge1")]
    public int? DrivAge1 { get; set; }

    [JsonProperty("drivAge2")]
    public int? DrivAge2 { get; set; }

    [JsonProperty("uom6U")]
    public string? Uom6U { get; set; }

    [JsonProperty("cctv")]
    public string? Cctv { get; set; }

    [JsonProperty("uom1V")]
    public string? Uom1V { get; set; }

    [JsonProperty("uom2V")]
    public string? Uom2V { get; set; }

    [JsonProperty("uom5V")]
    public string? Uom5V { get; set; }

    [JsonProperty("seats41")]
    public decimal? Seats41 { get; set; }

    [JsonProperty("mv411")]
    public decimal? Mv411 { get; set; }

    [JsonProperty("mv412")]
    public decimal? Mv412 { get; set; }

    [JsonProperty("mv413")]
    public decimal? Mv413 { get; set; }

    [JsonProperty("mv414")]
    public decimal? Mv414 { get; set; }

    [JsonProperty("mv42")]
    public decimal? Mv42 { get; set; }

    [JsonProperty("mv43")]
    public decimal? Mv43 { get; set; }

    [JsonProperty("dedOd")]
    public decimal? DedOd { get; set; }

    [JsonProperty("adDod")]
    public decimal? AdDod { get; set; }

    [JsonProperty("dedPd")]
    public decimal? DedPd { get; set; }

    [JsonProperty("fleetPer")]
    public decimal? FleetPer { get; set; }

    [JsonProperty("ncbYrs")]
    public decimal? NcbYrs { get; set; }

    [JsonProperty("ncbPer")]
    public decimal? NcbPer { get; set; }

    [JsonProperty("dspcPer")]
    public decimal? DspcPer { get; set; }

    [JsonProperty("loadclmPer")]
    public decimal? LoadclmPer { get; set; }

    [JsonProperty("dstfPer")]
    public decimal? DstfPer { get; set; }

    [JsonProperty("basePrm1")]
    public decimal? BasePrm1 { get; set; }

    [JsonProperty("mainPrem")]
    public decimal? MainPrem { get; set; }

    [JsonProperty("vehicleUsePrem")]
    public decimal? VehicleUsePrem { get; set; }

    [JsonProperty("enginePrem")]
    public decimal? EnginePrem { get; set; }

    [JsonProperty("driverPrem")]
    public decimal? DriverPrem { get; set; }

    [JsonProperty("vehicleAgePrem")]
    public decimal? VehicleAgePrem { get; set; }

    [JsonProperty("accessoryPrem")]
    public decimal? AccessoryPrem { get; set; }

    [JsonProperty("siPrem")]
    public decimal? SiPrem { get; set; }

    [JsonProperty("vehicleGroupPrem")]
    public decimal? VehicleGroupPrem { get; set; }

    [JsonProperty("tpbiPersonPrem")]
    public decimal? TpbiPersonPrem { get; set; }

    [JsonProperty("tpbiAccPrem")]
    public decimal? TpbiAccPrem { get; set; }

    [JsonProperty("tppdPersonPrem")]
    public decimal? TppdPersonPrem { get; set; }

    [JsonProperty("driver411Prem")]
    public decimal? Driver411Prem { get; set; }

    [JsonProperty("passenger412Prem")]
    public decimal? Passenger412Prem { get; set; }

    [JsonProperty("driver413Prem")]
    public decimal? Driver413Prem { get; set; }

    [JsonProperty("passenger414Prem")]
    public decimal? Passenger414Prem { get; set; }

    [JsonProperty("medicalExp42Prem")]
    public decimal? MedicalExp42Prem { get; set; }

    [JsonProperty("bailBond43Prem")]
    public decimal? BailBond43Prem { get; set; }

    [JsonProperty("deductOdPrem")]
    public decimal? DeductOdPrem { get; set; }

    [JsonProperty("deductAdPrem")]
    public decimal? DeductAdPrem { get; set; }

    [JsonProperty("deductPdPrem")]
    public decimal? DeductPdPrem { get; set; }

    [JsonProperty("fleetAmt")]
    public decimal? FleetAmt { get; set; }

    [JsonProperty("ncbAmt")]
    public decimal? NcbAmt { get; set; }

    [JsonProperty("dspcAmt")]
    public decimal? DspcAmt { get; set; }

    [JsonProperty("loadclmAmt")]
    public decimal? LoadclmAmt { get; set; }

    [JsonProperty("dstfPrm")]
    public decimal? DstfPrm { get; set; }

    [JsonProperty("si22")]
    public decimal? Si22 { get; set; }

    [JsonProperty("basePrm3")]
    public decimal? BasePrm3 { get; set; }

    [JsonProperty("prem3New")]
    public decimal? Prem3New { get; set; }

    [JsonProperty("vehicleUse3Prem")]
    public decimal? VehicleUse3Prem { get; set; }

    [JsonProperty("engine3Prem")]
    public decimal? Engine3Prem { get; set; }

    [JsonProperty("si3Prem")]
    public decimal? Si3Prem { get; set; }

    [JsonProperty("prmTNew")]
    public decimal? PrmTNew { get; set; }

    [JsonProperty("premNetPd")]
    public decimal? PremNetPd { get; set; }

    [JsonProperty("adjustAll")]
    public decimal? AdjustAll { get; set; }

    [JsonProperty("prmGapNew")]
    public decimal? PrmGapNew { get; set; }

    [JsonProperty("prmStpNew")]
    public decimal? PrmStpNew { get; set; }

    [JsonProperty("prmVatNew")]
    public decimal? PrmVatNew { get; set; }

    [JsonProperty("shortRate")]
    public decimal? ShortRate { get; set; }

    [JsonProperty("day")]
    public int? Day { get; set; }

    [JsonProperty("netInputGap")]
    public decimal? NetInputGap { get; set; }

    [JsonProperty("grossInputGap")]
    public decimal? GrossInputGap { get; set; }

    [JsonProperty("behaviorLv")]
    public string? BehaviorLv { get; set; }

    [JsonProperty("behaviorPercent")]
    public decimal? BehaviorPercent { get; set; }

    [JsonProperty("wallChargeSi")]
    public decimal? WallChargeSi { get; set; }

    [JsonProperty("rateWallCharge")]
    public decimal? RateWallCharge { get; set; }

    [JsonProperty("netPremiumWallCharge")]
    public decimal? NetPremiumWallCharge { get; set; }

    [JsonProperty("grossPremiumWallCharge")]
    public decimal? GrossPremiumWallCharge { get; set; }

    [JsonProperty("batteryYear")]
    public int? BatteryYear { get; set; }

    [JsonProperty("batteryPrice")]
    public decimal? BatteryPrice { get; set; }

    [JsonProperty("batterySi")]
    public decimal? BatterySi { get; set; }

    [JsonProperty("rateBattery")]
    public decimal? RateBattery { get; set; }

    [JsonProperty("netPremiumBattery")]
    public decimal? NetPremiumBattery { get; set; }

    [JsonProperty("grossPremiumBattery")]
    public decimal? GrossPremiumBattery { get; set; }

    [JsonProperty("minEvDrivNo")]
    public int? MinEvDrivNo { get; set; }

    [JsonProperty("maxEvDrivNo")]
    public int? MaxEvDrivNo { get; set; }

    [JsonProperty("dealerGarageRate")]
    public decimal? DealerGarageRate { get; set; }

    [JsonProperty("dealerGarageAmount")]
    public decimal? DealerGarageAmount { get; set; }
}
```

---

# 6. Request DTO สำหรับ Company Codes API

```csharp
public sealed class QmodCompanyCodesRequest
{
    [JsonProperty("companyCodes")]
    public List<string> CompanyCodes { get; set; }
        = new();
}
```

ตัวอย่าง JSON:

```json
{
  "companyCodes": [
    "570"
  ]
}
```

---

# 7. Response DTO กลาง

Success และ Error Response ของทั้งสอง API มี Property หลักร่วมกัน จึงใช้ Generic Response DTO ได้

```csharp
public sealed class QmodApiResponse<TData>
{
    [JsonProperty("code")]
    public string? Code { get; set; }

    [JsonProperty("message")]
    public string? Message { get; set; }

    [JsonProperty("data")]
    public TData? Data { get; set; }

    [JsonProperty("details")]
    public List<QmodApiErrorDetail> Details { get; set; }
        = new();

    [JsonProperty("timestamp")]
    public DateTimeOffset? Timestamp { get; set; }

    [JsonProperty("traceId")]
    public string? TraceId { get; set; }
}
```

## 7.1 Error Detail DTO

```csharp
public sealed class QmodApiErrorDetail
{
    [JsonProperty("field")]
    public string? Field { get; set; }

    [JsonProperty("message")]
    public string? Message { get; set; }
}
```

Generic Response รองรับทั้ง Success และ Error:

- Success มี `data`
- Error มี `details`, `timestamp`, `traceId`
- Property ที่ไม่มีใน JSON จะเป็น `null` หรือ List ว่าง

---

# 8. Campaign Response DTO

## 8.1 QmodCampaignResponseData

```csharp
public sealed class QmodCampaignResponseData
{
    [JsonProperty("campaignId")]
    public Guid CampaignId { get; set; }

    [JsonProperty("companies")]
    public List<QmodCompanyResponse> Companies { get; set; }
        = new();

    [JsonProperty("campaignName")]
    public string? CampaignName { get; set; }

    [JsonProperty("description")]
    public string? Description { get; set; }

    [JsonProperty("effectiveSchedule")]
    public QmodEffectiveScheduleResponse? EffectiveSchedule { get; set; }

    [JsonProperty("total")]
    public int Total { get; set; }
}
```

## 8.2 QmodCompanyResponse

```csharp
public sealed class QmodCompanyResponse
{
    [JsonProperty("id")]
    public Guid Id { get; set; }

    [JsonProperty("partnerCompanyCode")]
    public string? PartnerCompanyCode { get; set; }

    [JsonProperty("companyName")]
    public string? CompanyName { get; set; }
}
```

## 8.3 QmodEffectiveScheduleResponse

```csharp
public sealed class QmodEffectiveScheduleResponse
{
    [JsonProperty("effectiveDate")]
    public string? EffectiveDate { get; set; }

    [JsonProperty("expiryDate")]
    public string? ExpiryDate { get; set; }
}
```

---

# 9. Company Codes Response DTO

```csharp
public sealed class QmodCompanyCodesResponseData
{
    [JsonProperty("campaignId")]
    public Guid CampaignId { get; set; }

    [JsonProperty("companies")]
    public List<QmodCompanyResponse> Companies { get; set; }
        = new();
}
```

---

# 10. HTTP Client Result DTO

ถ้า HTTP Client คืนเพียง `string` จะไม่สามารถแยก HTTP 200, 201, 400 หรือ 500 ได้ จึงควรคืนทั้ง Status Code และ Response Body

```csharp
public sealed class ApiHttpResult
{
    public int StatusCode { get; set; }

    public bool IsSuccessStatusCode { get; set; }

    public string Content { get; set; } = string.Empty;
}
```

ตัวอย่าง PUT Method:

```csharp
public async Task<ApiHttpResult> PutAsync<TRequest>(
    string url,
    TRequest request,
    CancellationToken cancellationToken = default)
{
    var json = JsonConvert.SerializeObject(request);

    using var content = new StringContent(
        json,
        Encoding.UTF8,
        "application/json");

    using var response = await _httpClient.PutAsync(
        url,
        content,
        cancellationToken);

    var responseContent =
        await response.Content.ReadAsStringAsync();

    return new ApiHttpResult
    {
        StatusCode = (int)response.StatusCode,
        IsSuccessStatusCode = response.IsSuccessStatusCode,
        Content = responseContent
    };
}
```

---

# 11. Result DTO ของแต่ละ QMOD Step

```csharp
public sealed class QmodStepResult<TData>
{
    public string StepName { get; set; } = string.Empty;

    public string Endpoint { get; set; } = string.Empty;

    public int? HttpStatusCode { get; set; }

    public bool IsSuccess { get; set; }

    public string Code { get; set; } = string.Empty;

    public string Message { get; set; } = string.Empty;

    public TData? Data { get; set; }

    public List<QmodApiErrorDetail> Details { get; set; }
        = new();

    public DateTimeOffset? Timestamp { get; set; }

    public string? TraceId { get; set; }

    public string? RawResponse { get; set; }
}
```

DTO นี้ช่วยแยกผลของ:

- `Campaign`
- `CompanyCodes`

ทำให้ตรวจสอบได้ว่า Step ใดสำเร็จหรือไม่สำเร็จ

---

# 12. Result DTO รวมของ QMOD Process

```csharp
public sealed class SmileyQmodJsonResult
{
    public string Campaign { get; set; } = string.Empty;

    public long TransactionId { get; set; }

    public string Code { get; set; } = string.Empty;

    public string Message { get; set; } = string.Empty;

    public bool IsSuccess { get; set; }

    public QmodStepResult<QmodCampaignResponseData>?
        CampaignResult { get; set; }

    public QmodStepResult<QmodCompanyCodesResponseData>?
        CompanyCodesResult { get; set; }
}
```

สถานะระดับ Process ที่แนะนำ:

| Code | ความหมาย |
|---|---|
| `SUCCESS` | Campaign และ Company Codes สำเร็จ |
| `PARTIAL_SUCCESS` | Campaign สำเร็จ แต่ Company Codes ล้มเหลวหรือถูกข้าม |
| `CAMPAIGN_FAILED` | Campaign API ล้มเหลว จึงไม่เรียก Company Codes |
| `VALIDATION_ERROR` | Input ไม่ครบหรือไม่ถูกต้อง |
| `CONNECTION_FAILED` | ติดต่อ QMOD ไม่สำเร็จ |
| `CANCELLED` | Process ถูกยกเลิก |
| `SKIPPED` | QMOD ถูก Disable หรือไม่มีข้อมูล |
| `ERROR` | Error อื่นที่ไม่อยู่ในประเภทด้านบน |

---

# 13. Response DTO ของ Process หลัก

Response Model ไม่ควรเก็บ `Task<T>` ต้องเก็บผลหลังจาก `await` แล้วเท่านั้น

```csharp
public sealed class PublishProcessResponse
{
    public List<PremiumStatus> PremiumPublish { get; set; }
        = new();

    public List<QmodStatus> QmodPublish { get; set; }
        = new();
}

public sealed class PremiumStatus
{
    public string Status { get; set; } = string.Empty;

    public string Message { get; set; } = string.Empty;

    public PremiumPublishResult? PremiumResult { get; set; }
}

public sealed class QmodStatus
{
    public string Status { get; set; } = string.Empty;

    public string Message { get; set; } = string.Empty;

    public SmileyQmodJsonResult? QmodResult { get; set; }
}
```

ไม่ควรประกาศแบบนี้:

```csharp
public Task<SmileyQmodJsonResult> QmodResult { get; set; }
```

เพราะ DTO สำหรับ Response ควรเก็บ `SmileyQmodJsonResult` ที่ทำงานเสร็จแล้ว ไม่ใช่ Task ที่กำลังทำงาน

---

# 14. Mapping จาก ReadPublishData ไป QMOD Item

```csharp
private static QmodCampaignItemRequest MapQmodDetail(
    ReadPublishData item)
{
    return new QmodCampaignItemRequest
    {
        CampaignCode = item.CampaignCode,
        PolMst = item.Polmst,
        Pack = item.Pack,
        SClass = item.Sclass,
        CovCod = item.Covcod,
        VehGrp = item.Vehgrp,
        VehUse = item.Vehuse,
        GarageCd = item.GarageCd,
        MakDes = item.Makdes,
        ModDes = item.Moddes,
        CstFlag = item.CSTFlag,
        MinCst = item.MinCst,
        MaxCst = item.MaxCst,
        MinYear = item.MinYear,
        MaxYear = item.MaxYear,
        MinSi = item.MinSi,
        MaxSi = item.MaxSi,
        DriverName = item.DriverName,
        DrivNo = item.DrivNo,
        DrivAge1 = item.DrivAge1,
        DrivAge2 = item.DrivAge2,
        Uom6U = item.Uom6U,
        Cctv = item.Cctv,
        Uom1V = item.Uom1V,
        Uom2V = item.Uom2V,
        Uom5V = item.Uom5V,
        Seats41 = item.Seats41,
        Mv411 = item.Mv411,
        Mv412 = item.Mv412,
        Mv413 = item.Mv413,
        Mv414 = item.Mv414,
        Mv42 = item.Mv42,
        Mv43 = item.Mv43,
        DedOd = item.Dedod,
        AdDod = item.AdDod,
        DedPd = item.DedPd,
        FleetPer = item.FleetPer,
        NcbYrs = item.Ncbyrs,
        NcbPer = item.NcbPer,
        DspcPer = item.DspcPer,
        LoadclmPer = item.LoadclmPer,
        DstfPer = item.Dstfper,
        BasePrm1 = item.Baseprm1,
        MainPrem = item.MainPrem,
        VehicleUsePrem = item.VehicleUsePrem,
        EnginePrem = item.EnginePrem,
        DriverPrem = item.DriverPrem,
        VehicleAgePrem = item.VehicleAgePrem,
        AccessoryPrem = item.AccessoryPrem,
        SiPrem = item.SiPrem,
        VehicleGroupPrem = item.VehicleGroupPrem,
        TpbiPersonPrem = item.TpbiPersonPrem,
        TpbiAccPrem = item.TpbiAccPrem,
        TppdPersonPrem = item.TppdPersonPrem,
        Driver411Prem = item.Driver411Prem,
        Passenger412Prem = item.Passenger412Prem,
        Driver413Prem = item.Driver413Prem,
        Passenger414Prem = item.Passenger414Prem,
        MedicalExp42Prem = item.MedicalExp42Prem,
        BailBond43Prem = item.Bailbond43Prem,
        DeductOdPrem = item.DeductODPrem,
        DeductAdPrem = item.DeductADPrem,
        DeductPdPrem = item.DeductPDPrem,
        FleetAmt = item.FleetAmt,
        NcbAmt = item.NcbAmt,
        DspcAmt = item.DspcAmt,
        LoadclmAmt = item.LoadclmAmt,
        DstfPrm = item.Dstfprm,
        Si22 = item.Si22,
        BasePrm3 = item.Baseprm3,
        Prem3New = item.Prem3new,
        VehicleUse3Prem = item.VehicleUse3Prem,
        Engine3Prem = item.Engine3Prem,
        Si3Prem = item.Si3Prem,
        PrmTNew = item.PrmTnew,
        PremNetPd = item.PremNetPd,
        AdjustAll = item.AdjustAll,

        // ต้องไม่สลับ Mapping สาม Property นี้
        PrmGapNew = item.PrmGapnew,
        PrmStpNew = item.PrmStpnew,
        PrmVatNew = item.PrmVatnew,

        ShortRate = item.ShortRate,
        Day = item.Day,
        NetInputGap = item.NetInputGap,
        GrossInputGap = item.GrossInputGap,
        BehaviorLv = item.BehaviorLV,
        BehaviorPercent = item.BehaviorPercent,
        WallChargeSi = item.WallChargeSI,
        RateWallCharge = item.RateWallCharge,
        NetPremiumWallCharge = item.NetPremiumWallCharge,
        GrossPremiumWallCharge = item.GrossPremiumWallCharge,
        BatteryYear = item.BatteryYear,
        BatteryPrice = item.BatteryPrice,
        BatterySi = item.BatterySI,
        RateBattery = item.RateBattery,
        NetPremiumBattery = item.NetPremiumBattery,
        GrossPremiumBattery = item.GrossPremiumBattery,
        MinEvDrivNo = item.MinEVDrivNo,
        MaxEvDrivNo = item.MaxEVDrivNo,
        DealerGarageRate = item.DealerGarageRate,
        DealerGarageAmount = item.DealerGarageAmount
    };
}
```

---

# 15. สร้าง Payload สำหรับแต่ละ API

## 15.1 Campaign Payload

```csharp
private static QmodCampaignRequest BuildQmodCampaignRequest(
    Campaign campaign,
    IReadOnlyCollection<QmodCampaignItemRequest> qmodItems)
{
    return new QmodCampaignRequest
    {
        CampaignName = campaign.CampaignName ?? string.Empty,
        Description = campaign.Description,
        EffectiveSchedule = new QmodEffectiveScheduleRequest
        {
            EffectiveDate = campaign.EffectivePeriod?
                .ToString("yyyy-MM-dd"),
            ExpiryDate = campaign.ExpiredPeriod?
                .ToString("yyyy-MM-dd")
        },
        Items = qmodItems.ToList()
    };
}
```

## 15.2 Company Codes Payload

```csharp
private static QmodCompanyCodesRequest BuildQmodCompanyCodesRequest(
    IEnumerable<string> companyCodes)
{
    return new QmodCompanyCodesRequest
    {
        CompanyCodes = companyCodes
            .Where(x => !string.IsNullOrWhiteSpace(x))
            .Select(x => x.Trim())
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToList()
    };
}
```

---

# 16. Deserialize และ Result Helpers

## 16.1 Deserialize Generic Response

```csharp
private static QmodApiResponse<TData>?
    DeserializeQmodResponse<TData>(string? responseContent)
{
    if (string.IsNullOrWhiteSpace(responseContent))
    {
        return null;
    }

    try
    {
        return JsonConvert.DeserializeObject<QmodApiResponse<TData>>(
            responseContent);
    }
    catch (JsonException)
    {
        return null;
    }
}
```

## 16.2 ตรวจ Business Success Code

```csharp
private static bool IsQmodSuccessCode(string? code)
{
    return string.Equals(
        code,
        "S200",
        StringComparison.OrdinalIgnoreCase);
}
```

## 16.3 สร้าง Step Result

```csharp
private static QmodStepResult<TData> CreateQmodStepResult<TData>(
    string stepName,
    string endpoint,
    ApiHttpResult httpResult,
    QmodApiResponse<TData>? apiResponse)
{
    bool isSuccess =
        httpResult.IsSuccessStatusCode &&
        IsQmodSuccessCode(apiResponse?.Code);

    return new QmodStepResult<TData>
    {
        StepName = stepName,
        Endpoint = endpoint,
        HttpStatusCode = httpResult.StatusCode,
        IsSuccess = isSuccess,
        Code = apiResponse?.Code
            ?? $"HTTP_{httpResult.StatusCode}",
        Message = apiResponse?.Message
            ?? "ไม่สามารถอ่าน QMOD Response ได้",
        Data = apiResponse?.Data,
        Details = apiResponse?.Details
            ?? new List<QmodApiErrorDetail>(),
        Timestamp = apiResponse?.Timestamp,
        TraceId = apiResponse?.TraceId,
        RawResponse = httpResult.Content
    };
}
```

## 16.4 สร้าง Exception Result

```csharp
private static QmodStepResult<TData> CreateQmodExceptionResult<TData>(
    string stepName,
    string endpoint,
    Exception exception)
{
    return new QmodStepResult<TData>
    {
        StepName = stepName,
        Endpoint = endpoint,
        IsSuccess = false,
        Code = "EXCEPTION",
        Message = exception.Message
    };
}
```

---

# 17. เรียก Campaign API

```csharp
private async Task<QmodStepResult<QmodCampaignResponseData>>
    SendQmodCampaignAsync(
        ApiGeneral api,
        string url,
        QmodCampaignRequest request,
        CancellationToken cancellationToken)
{
    var requestJson = JsonConvert.SerializeObject(request);

    await _campaignPublishedTransactionRepository
        .UpdateQmodRequest(requestJson);

    try
    {
        var httpResult = await api.PutAsync(
            url,
            request,
            cancellationToken);

        var apiResponse =
            DeserializeQmodResponse<QmodCampaignResponseData>(
                httpResult.Content);

        var stepResult = CreateQmodStepResult(
            "Campaign",
            url,
            httpResult,
            apiResponse);

        await _campaignPublishedTransactionRepository
            .UpdateQmodResponse(
                httpResult.Content,
                stepResult.IsSuccess ? "SUCCESS" : "FAILED");

        return stepResult;
    }
    catch (Exception ex)
    {
        var errorResult =
            CreateQmodExceptionResult<QmodCampaignResponseData>(
                "Campaign",
                url,
                ex);

        await _campaignPublishedTransactionRepository
            .UpdateQmodResponse(
                JsonConvert.SerializeObject(errorResult),
                "EXCEPTION");

        return errorResult;
    }
}
```

---

# 18. เรียก Company Codes API

```csharp
private async Task<QmodStepResult<QmodCompanyCodesResponseData>>
    SendQmodCompanyCodesAsync(
        ApiGeneral api,
        string url,
        QmodCompanyCodesRequest request,
        CancellationToken cancellationToken)
{
    var requestJson = JsonConvert.SerializeObject(request);

    await _campaignPublishedTransactionRepository
        .UpdateQmodCompRequest(requestJson);

    try
    {
        var httpResult = await api.PutAsync(
            url,
            request,
            cancellationToken);

        var apiResponse =
            DeserializeQmodResponse<QmodCompanyCodesResponseData>(
                httpResult.Content);

        var stepResult = CreateQmodStepResult(
            "CompanyCodes",
            url,
            httpResult,
            apiResponse);

        await _campaignPublishedTransactionRepository
            .UpdateQmodCompResponse(
                httpResult.Content,
                stepResult.IsSuccess ? "SUCCESS" : "FAILED");

        return stepResult;
    }
    catch (Exception ex)
    {
        var errorResult =
            CreateQmodExceptionResult<QmodCompanyCodesResponseData>(
                "CompanyCodes",
                url,
                ex);

        await _campaignPublishedTransactionRepository
            .UpdateQmodCompResponse(
                JsonConvert.SerializeObject(errorResult),
                "EXCEPTION");

        return errorResult;
    }
}
```

---

# 19. PublishQmodProcess ฉบับรวม

Signature ใหม่ไม่รับ `List<ReadPublishData>` เพราะข้อมูลถูก Mapping แล้ว

```csharp
private async Task<SmileyQmodJsonResult> PublishQmodProcess(
    long campaignKeyId,
    Campaign campaign,
    IReadOnlyCollection<QmodCampaignItemRequest> qmodItems,
    IReadOnlyCollection<string> companyCodes,
    long transactionId,
    CancellationToken cancellationToken = default)
{
    var config = _configApp.PublishCampaign.Qmod;

    var processResult = new SmileyQmodJsonResult
    {
        Campaign = campaignKeyId.ToString(),
        TransactionId = transactionId,
        Code = "IN_PROGRESS",
        Message = "QMOD Publish is in progress",
        IsSuccess = false
    };

    if (!config.Enabled)
    {
        processResult.Code = "SKIPPED";
        processResult.Message = "QMOD API Disabled";
        return processResult;
    }

    if (qmodItems == null || qmodItems.Count == 0)
    {
        processResult.Code = "SKIPPED";
        processResult.Message = "ไม่พบ QMOD Item สำหรับ Publish";
        return processResult;
    }

    if (string.IsNullOrWhiteSpace(campaign.PremiumReference))
    {
        processResult.Code = "VALIDATION_ERROR";
        processResult.Message =
            "ไม่พบ Campaign UUID ใน PremiumReference";
        return processResult;
    }

    var campaignRequest = BuildQmodCampaignRequest(
        campaign,
        qmodItems);

    var companyRequest = BuildQmodCompanyCodesRequest(
        companyCodes);

    var baseUrl = config.Method.TrimEnd('/');
    var endpoint = config.Endpoint.Trim('/');
    var campaignId = campaign.PremiumReference.Trim();

    var campaignUrl =
        $"{baseUrl}/{endpoint}/{campaignId}";

    var companyCodesUrl =
        $"{campaignUrl}/company-codes";

    var headers = new List<ApiHeader>
    {
        new()
        {
            Key = "Ocp-Apim-Subscription-Key",
            Value = config.OCPKey
        }
    };

    try
    {
        cancellationToken.ThrowIfCancellationRequested();

        using var api = new ApiGeneral(baseUrl, headers);

        // STEP 1: Create or replace Campaign
        processResult.CampaignResult =
            await SendQmodCampaignAsync(
                api,
                campaignUrl,
                campaignRequest,
                cancellationToken);

        // Campaign ต้องสำเร็จก่อน
        if (!processResult.CampaignResult.IsSuccess)
        {
            processResult.Code = "CAMPAIGN_FAILED";
            processResult.Message =
                "Campaign API ไม่สำเร็จ จึงไม่ส่ง Company Codes";

            return processResult;
        }

        // ป้องกัน Replace ด้วย Array ว่าง
        if (companyRequest.CompanyCodes.Count == 0)
        {
            processResult.Code = "PARTIAL_SUCCESS";
            processResult.Message =
                "Campaign สำเร็จ แต่ไม่ส่ง Company Codes " +
                "เนื่องจากไม่พบ Company Code";

            return processResult;
        }

        // STEP 2: Replace Company Codes
        processResult.CompanyCodesResult =
            await SendQmodCompanyCodesAsync(
                api,
                companyCodesUrl,
                companyRequest,
                cancellationToken);

        processResult.IsSuccess =
            processResult.CampaignResult.IsSuccess &&
            processResult.CompanyCodesResult.IsSuccess;

        if (processResult.IsSuccess)
        {
            processResult.Code = "SUCCESS";
            processResult.Message =
                "QMOD Campaign และ Company Codes สำเร็จ";
        }
        else
        {
            processResult.Code = "PARTIAL_SUCCESS";
            processResult.Message =
                "Campaign สำเร็จ แต่ Company Codes ไม่สำเร็จ";
        }

        return processResult;
    }
    catch (OperationCanceledException)
        when (cancellationToken.IsCancellationRequested)
    {
        processResult.Code = "CANCELLED";
        processResult.Message = "QMOD Process ถูกยกเลิก";
        return processResult;
    }
    catch (HttpRequestException ex)
    {
        processResult.Code = "CONNECTION_FAILED";
        processResult.Message = ex.Message;
        return processResult;
    }
    catch (Exception ex)
    {
        processResult.Code = "ERROR";
        processResult.Message = ex.Message;
        return processResult;
    }
}
```

---

# 20. การเรียกจาก Process หลัก

## 20.1 สร้าง Task โดยยังไม่ await

```csharp
Task<PremiumPublishResult>? premiumTask = null;
Task<SmileyQmodJsonResult>? qmodTask = null;

if (configPublish.Premium.Enabled)
{
    premiumTask = PublishPremiumProcess(
        campaignKeyId,
        mapping.PremiumItems,
        transactionId);
}
else
{
    result.PremiumPublish.Add(
        new PremiumStatus
        {
            Status = "SKIPPED",
            Message = "Premium API Disabled"
        });
}

if (configPublish.Qmod.Enabled)
{
    qmodTask = PublishQmodProcess(
        campaignKeyId,
        campaign,
        mapping.QmodItems,
        mapping.CompanyCodes,
        transactionId,
        cancellationToken);
}
else
{
    result.QmodPublish.Add(
        new QmodStatus
        {
            Status = "SKIPPED",
            Message = "QMOD API Disabled"
        });
}
```

## 20.2 รอ Premium และ QMOD พร้อมกัน

```csharp
var runningTasks = new List<Task>();

if (premiumTask != null)
{
    runningTasks.Add(premiumTask);
}

if (qmodTask != null)
{
    runningTasks.Add(qmodTask);
}

await Task.WhenAll(runningTasks);
```

## 20.3 นำ Result เข้า Response

```csharp
if (premiumTask != null)
{
    var premiumResult = await premiumTask;

    result.PremiumPublish.Add(
        new PremiumStatus
        {
            Status = premiumResult.Status ?? "UNKNOWN",
            Message = premiumResult.Message ?? string.Empty,
            PremiumResult = premiumResult
        });
}

if (qmodTask != null)
{
    var qmodResult = await qmodTask;

    result.QmodPublish.Add(
        new QmodStatus
        {
            Status = qmodResult.Code,
            Message = qmodResult.Message,
            QmodResult = qmodResult
        });
}
```

> หาก `PremiumPublishResult` ใช้ Property `ErrorRs` แทน `Message` ให้เปลี่ยนเป็น `premiumResult.ErrorRs` ตาม Model จริง

---

# 21. ตัวอย่าง Campaign Success Response

```json
{
  "code": "S200",
  "message": "Campaign retrieved successfully.",
  "data": {
    "campaignId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "companies": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440001",
        "partnerCompanyCode": "570",
        "companyName": "Tokio Marine Insurance"
      }
    ],
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

# 22. ตัวอย่าง Error Response

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

---

# 23. Validation ที่ควรทำก่อนส่ง API

```csharp
private static List<string> ValidateQmodRequest(
    Campaign campaign,
    QmodCampaignRequest campaignRequest,
    QmodCompanyCodesRequest companyRequest)
{
    var errors = new List<string>();

    if (string.IsNullOrWhiteSpace(campaign.PremiumReference))
    {
        errors.Add("PremiumReference หรือ Campaign UUID ห้ามเป็นค่าว่าง");
    }

    if (string.IsNullOrWhiteSpace(campaignRequest.CampaignName))
    {
        errors.Add("CampaignName ห้ามเป็นค่าว่าง");
    }

    if (campaignRequest.Items.Count == 0)
    {
        errors.Add("Campaign Items ต้องมีอย่างน้อย 1 รายการ");
    }

    if (string.IsNullOrWhiteSpace(
        campaignRequest.EffectiveSchedule.EffectiveDate))
    {
        errors.Add("EffectiveDate ห้ามเป็นค่าว่าง");
    }

    if (string.IsNullOrWhiteSpace(
        campaignRequest.EffectiveSchedule.ExpiryDate))
    {
        errors.Add("ExpiryDate ห้ามเป็นค่าว่าง");
    }

    if (companyRequest.CompanyCodes.Count == 0)
    {
        errors.Add("CompanyCodes ต้องมีอย่างน้อย 1 รายการ");
    }

    return errors;
}
```

---

# 24. ข้อควรระวังในการพัฒนา

## 24.1 ตรวจทั้ง HTTP Status และ Business Code

ไม่ควรตรวจเฉพาะ:

```csharp
apiResponse.Code == "S200"
```

ควรตรวจทั้งคู่:

```csharp
bool isSuccess =
    httpResult.IsSuccessStatusCode &&
    apiResponse?.Code == "S200";
```

เหตุผลคือเอกสารตัวอย่างมีกรณี HTTP 500 แต่ Response Body ระบุ `E400` จึงอาจไม่สอดคล้องกัน

## 24.2 เก็บ HTTP Status เพื่อแยก Created และ Updated

```csharp
string operation = httpResult.StatusCode switch
{
    200 => "UPDATED",
    201 => "CREATED",
    _ => "UNKNOWN"
};
```

Business Code `S200` อย่างเดียวไม่สามารถบอกได้ว่า Campaign ถูกสร้างใหม่หรือ Update

## 24.3 ห้าม Mapping สาม Property นี้สลับกัน

```csharp
PrmGapNew = item.PrmGapnew;
PrmStpNew = item.PrmStpnew;
PrmVatNew = item.PrmVatnew;
```

## 24.4 ตรวจ Battery SI

ถ้า Swagger รองรับ `batterySi` ควร Mapping:

```csharp
BatterySi = item.BatterySI;
```

## 24.5 ไม่ Query Campaign ซ้ำ

Query Campaign ใน Process หลัก แล้วส่ง `campaign` เข้า Premium และ QMOD Process

## 24.6 ไม่เก็บ Task ใน Response DTO

ผิด:

```csharp
public Task<SmileyQmodJsonResult> QmodResult { get; set; }
```

ถูก:

```csharp
public SmileyQmodJsonResult? QmodResult { get; set; }
```

## 24.7 ระวัง DbContext เมื่อใช้ Task.WhenAll

หาก Premium และ QMOD Repository ใช้ EF Core `DbContext` Instance เดียวกันพร้อมกัน อาจเกิดข้อความ:

```text
A second operation was started on this context instance
before a previous operation completed.
```

แนวทางแก้:

- ใช้ `IDbContextFactory<TContext>` สร้าง Context แยกต่อ Operation
- แยก Service Scope สำหรับ Premium และ QMOD
- หรือให้ API Call ทำพร้อมกัน แต่ Queue งาน Database Logging ให้ทำตามลำดับ

---

# 25. โครงสร้างไฟล์ที่แนะนำ

```text
Models/
├── Mapping/
│   └── PublishMappingResult.cs
│
├── Qmod/
│   ├── Requests/
│   │   ├── QmodCampaignRequest.cs
│   │   ├── QmodCampaignItemRequest.cs
│   │   ├── QmodEffectiveScheduleRequest.cs
│   │   └── QmodCompanyCodesRequest.cs
│   │
│   ├── Responses/
│   │   ├── QmodApiResponse.cs
│   │   ├── QmodApiErrorDetail.cs
│   │   ├── QmodCampaignResponseData.cs
│   │   ├── QmodCompanyCodesResponseData.cs
│   │   ├── QmodCompanyResponse.cs
│   │   └── QmodEffectiveScheduleResponse.cs
│   │
│   └── Results/
│       ├── QmodStepResult.cs
│       └── SmileyQmodJsonResult.cs
│
├── Common/
│   └── ApiHttpResult.cs
│
└── Publish/
    ├── PublishProcessResponse.cs
    ├── PremiumStatus.cs
    └── QmodStatus.cs
```

---

# 26. ลำดับ Implementation ที่แนะนำ

1. สร้าง Request DTO ของ Campaign และ Company Codes
2. สร้าง Generic Response DTO และ Error Detail DTO
3. สร้าง Response Data DTO แยกสำหรับแต่ละ API
4. สร้าง `ApiHttpResult` เพื่อเก็บ HTTP Status และ Body
5. ปรับ API Client `PutAsync` ให้คืน `ApiHttpResult`
6. ปรับ Mapping ให้คืน `QmodCampaignItemRequest`
7. สร้าง `BuildQmodCampaignRequest`
8. สร้าง `BuildQmodCompanyCodesRequest`
9. สร้าง `SendQmodCampaignAsync`
10. สร้าง `SendQmodCompanyCodesAsync`
11. สร้าง `PublishQmodProcess` เพื่อควบคุมลำดับทั้งสอง Step
12. ปรับ Process หลักให้ส่ง `mapping.QmodItems` และ `mapping.CompanyCodes`
13. เพิ่ม Unit Test สำหรับ HTTP 200, 201, 400, 401, 404, 409 และ 500
14. เพิ่ม Test สำหรับ Company Codes ว่าง
15. เพิ่ม Test สำหรับ Campaign สำเร็จแต่ Company Codes ล้มเหลว

---

# 27. สรุป

การออกแบบนี้แบ่งความรับผิดชอบอย่างชัดเจน:

- `PublishMappingResult` เก็บข้อมูลที่ Mapping แล้ว
- `QmodCampaignRequest` เป็น Request ของ Campaign API
- `QmodCompanyCodesRequest` เป็น Request ของ Company Codes API
- `QmodApiResponse<TData>` รองรับทั้ง Success และ Error Response
- `QmodCampaignResponseData` เก็บ Data ของ Campaign API
- `QmodCompanyCodesResponseData` เก็บ Data ของ Company Codes API
- `QmodStepResult<TData>` เก็บสถานะราย Step
- `SmileyQmodJsonResult` สรุปผล QMOD Process ทั้งหมด
- `PublishProcessResponse` สรุปผล Premium และ QMOD โดยไม่เก็บ `Task<T>`

Flow ที่ควรใช้คือ:

```text
Mapping ครั้งเดียว
    -> Campaign API
        -> สำเร็จจึงเรียก Company Codes API
            -> รวมผลทั้งสอง Step
                -> ส่งกลับ Process หลัก
```

ก่อนนำ DTO ไปใช้จริง ควรตรวจ Data Type และชื่อ JSON Property กับ Swagger Schema ล่าสุด โดยเฉพาะ Field เชิงตัวเลข, `batterySi`, `day`, `shortRate` และชื่อ Campaign UUID ที่ใช้ใน URL
