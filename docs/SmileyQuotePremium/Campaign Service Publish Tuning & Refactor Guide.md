# คู่มือปรับปรุง Campaign Publish Service

> แนวทาง Tuning และ Refactor สำหรับ `PublishPremiumApi`, `PublishSafesmart` และ `PublishQmod`

## สารบัญ

1. [วัตถุประสงค์](#1-วัตถุประสงค์)
2. [ภาพรวม Flow ปัจจุบัน](#2-ภาพรวม-flow-ปัจจุบัน)
3. [สรุปปัญหาที่พบ](#3-สรุปปัญหาที่พบ)
4. [จุดที่ต้องแก้ไขเร่งด่วน](#4-จุดที่ต้องแก้ไขเร่งด่วน)
5. [Process ที่สามารถรวมเป็น Method กลาง](#5-process-ที่สามารถรวมเป็น-method-กลาง)
6. [Process ที่ไม่ควรรวม](#6-process-ที่ไม่ควรรวม)
7. [โครงสร้าง Class กลาง](#7-โครงสร้าง-class-กลาง)
8. [Refactor ขั้นตอนเตรียมข้อมูล Publish](#8-refactor-ขั้นตอนเตรียมข้อมูล-publish)
9. [Refactor การควบคุม Publish และ Resend](#9-refactor-การควบคุม-publish-และ-resend)
10. [Refactor Shared Helper](#10-refactor-shared-helper)
11. [ปรับปรุง PublishPremiumApi](#11-ปรับปรุง-publishpremiumapi)
12. [ปรับปรุง PublishSafesmart](#12-ปรับปรุง-publishsafesmart)
13. [ปรับปรุง PublishQmod](#13-ปรับปรุง-publishqmod)
14. [ปรับปรุง ReadExcelPublished](#14-ปรับปรุง-readexcelpublished)
15. [แนวทาง Parallel Processing ที่ปลอดภัย](#15-แนวทาง-parallel-processing-ที่ปลอดภัย)
16. [โครงสร้าง Method หลัง Refactor](#16-โครงสร้าง-method-หลัง-refactor)
17. [ลำดับการแก้ไขที่แนะนำ](#17-ลำดับการแก้ไขที่แนะนำ)
18. [Checklist ทดสอบ](#18-checklist-ทดสอบ)
19. [ผลลัพธ์ที่คาดหวัง](#19-ผลลัพธ์ที่คาดหวัง)

---

## 1. วัตถุประสงค์

เอกสารนี้สรุปแนวทางแก้ไข `CampaignService` เพื่อให้กระบวนการ Publish Campaign:

- ทำงานเร็วขึ้น
- ลด SQL Query ที่ซ้ำกัน
- ลดการสร้าง Object และ Mapping ที่ไม่จำเป็น
- ลดความเสี่ยงอัปเดต Transaction ผิดรายการ
- จัดการ SOAP และ HTTP Connection อย่างเหมาะสม
- แยกความรับผิดชอบของแต่ละ Method ให้ชัดเจน
- รองรับการ Publish และ Resend ด้วย Flow กลาง
- เตรียมโครงสร้างสำหรับ Parallel Processing อย่างปลอดภัย
- ทำให้ Code อ่านง่าย ทดสอบง่าย และแก้ไขง่ายขึ้น

ระบบปลายทางที่เกี่ยวข้องมี 3 ระบบ:

1. Premium API ผ่าน SOAP
2. SafeSmart API ผ่าน REST
3. QMOD API ผ่าน REST จำนวน 2 ขั้นตอน

---

## 2. ภาพรวม Flow ปัจจุบัน

```text
PublishCampaign
    |
    +-- Query Campaign และ Premium
    +-- Setup Valid Sum Insured
    +-- Publish Campaign ในฐานข้อมูล
    +-- Generate Tariff Excel
    +-- Generate Extra Tariff Excel
    +-- Save Excel Publish
    +-- Update Published Status
    +-- Read Excel เป็น List<ReadPremiumData>
    +-- Create Publish Transaction
    +-- Publish Premium API
    +-- Publish SafeSmart API
    +-- Publish QMOD API
    +-- Update Final Transaction
    +-- Send Email
```

ภายใน Publisher แต่ละระบบยังทำงานคล้ายกัน:

```text
ตรวจ Configuration
    -> สร้าง Payload
    -> Serialize JSON
    -> บันทึก Request
    -> Call External API
    -> Parse Response
    -> บันทึก Response
    -> จัดการ Exception
```

ส่วนนี้เป็นจุดที่สามารถนำมาออกแบบเป็น Shared Process ได้ แต่ Payload และ Protocol ของแต่ละระบบต้องแยกกัน

---

## 3. สรุปปัญหาที่พบ

### 3.1 Query Campaign ซ้ำ

Campaign ถูก Query ในหลายจุด:

```csharp
PublishCampaign()
PublishPremiumApi()
PublishSafesmart()
PublishQmod()
ReadExcelPublished()
```

ทั้งที่ `PublishCampaign()` มีข้อมูล Campaign อยู่แล้ว จึงควรส่ง `Campaign` เข้า Publisher แต่ละตัวโดยตรง

### 3.2 Query ใน `ReadExcelPublished()` แต่ไม่ได้ใช้

โค้ดเดิมมี:

```csharp
var campaign = await _campaignRepository.GetCampaignById(campaignId);
var premiums = await _campaignRepository.GetPremiumsByCampaignId(campaignId);
```

แต่ไม่ได้ใช้ `campaign` และ `premiums` ภายใน Method ทำให้เกิด SQL Query เพิ่ม 2 ครั้งโดยไม่จำเป็น

### 3.3 รับ `transactionID` แต่ไม่ใช้ตอน Update

ตัวอย่างเดิม:

```csharp
await _campaignPublishedTransactionRepository.UpdatePremiumRequest(requestJson);
await _campaignPublishedTransactionRepository.UpdatePremiumResponse(responseJson);
```

แม้ Method จะรับ `transactionID` เข้ามา แต่ไม่ได้ส่งไป Repository

ผลกระทบสำคัญคือ เมื่อมี Publish หรือ Resend พร้อมกัน ระบบอาจอัปเดต Request และ Response ลง Transaction ผิดรายการ หาก Repository ใช้วิธีหา Latest Transaction

### 3.4 Mapping ข้อมูลซ้ำหลายรอบ

`List<ReadPremiumData>` เดียวกันถูก Loop เพื่อสร้าง Payload ของแต่ละระบบ:

```text
Premium     N รอบ
SafeSmart   N รอบ
QMOD        N รอบ
รวม         3N รอบ
```

การ Loop แยกตาม Payload ยังจำเป็น เพราะ Contract ของแต่ละระบบต่างกัน แต่ควรแยกออกเป็น Mapper เฉพาะระบบ และลดงานประกอบอื่นที่ซ้ำกัน

### 3.5 สร้าง `HttpClient` ใหม่ทุกครั้ง

SafeSmart มีโค้ด:

```csharp
using var http = new HttpClient();
```

การสร้าง `HttpClient` ใหม่ทุก Request อาจทำให้ Connection Pool ไม่มีประสิทธิภาพ และเพิ่มความเสี่ยง Socket Exhaustion เมื่อมีการเรียกใช้งานจำนวนมาก

ควรใช้ `IHttpClientFactory`

### 3.6 QMOD สร้าง `HttpClient` แต่ไม่ได้ใช้

มีโค้ด:

```csharp
var http = new HttpClient();
```

แต่การ Call API จริงใช้ `ApiGeneral` จึงควรลบบรรทัดดังกล่าว

### 3.7 SOAP Client อาจไม่ถูกปิดเมื่อ Call API Error

ใน Premium เดิม `finally` ครอบเฉพาะช่วง Deserialize Response ไม่ได้ครอบ `smileyquoteAsync()` ทั้งหมด

หาก SOAP Call Throw Exception ก่อนเข้าช่วง Deserialize ตัว Client อาจไม่ได้รับการ `CloseAsync()` หรือ `Abort()`

### 3.8 QMOD Mapping ค่า Stamp, VAT และ Gross สลับกัน

โค้ดเดิม:

```csharp
prmStpNew = item.PrmGapnew,
prmVatNew = item.PrmStpnew,
prmGapNew = item.PrmVatnew,
```

ควรแก้เป็น:

```csharp
prmStpNew = item.PrmStpnew,
prmVatNew = item.PrmVatnew,
prmGapNew = item.PrmGapnew,
```

จุดนี้เป็น Data Mapping Bug และควรแก้ก่อนการ Tune ด้านความเร็ว

### 3.9 QMOD Step 2 ทำต่อเมื่อ Step 1 ล้มเหลว

`HandleQmodStep()` จับ Exception ภายในแล้วไม่ Throw ออกมา ทำให้ขั้นตอน Company Code ยังทำต่อแม้ Campaign Detail ไม่สำเร็จ

ควรให้ `HandleQmodStep()` คืนค่า `bool` หรือ Step Result เพื่อหยุด Step ถัดไปได้

### 3.10 ใช้ `Formatting.Indented` โดยไม่จำเป็น

QMOD Serialize แบบ:

```csharp
JsonConvert.SerializeObject(payload, Formatting.Indented)
```

ทำให้ JSON มีช่องว่างและขึ้นบรรทัดใหม่เพิ่ม ส่งผลให้:

- Payload ใหญ่ขึ้น
- Request Log ใหญ่ขึ้น
- ใช้ Memory เพิ่มขึ้น
- ใช้พื้นที่ฐานข้อมูลเพิ่มขึ้น

ควรใช้ Compact JSON:

```csharp
JsonConvert.SerializeObject(payload)
```

### 3.11 HTTP 200 ไม่ได้หมายถึง Business Success

SafeSmart เดิมใช้:

```csharp
var status = response.IsSuccessStatusCode ? "SUCCESS" : "FAILED";
```

แต่ API อาจตอบ HTTP 200 พร้อม Business Status เป็น `ERROR` ได้ จึงต้องตรวจทั้ง HTTP Status และค่า Status ใน Response Body

### 3.12 Response Log มีรูปแบบไม่สม่ำเสมอ

บางกรณีบันทึก JSON:

```csharp
JsonConvert.SerializeObject(result)
```

บางกรณีบันทึกเฉพาะข้อความ:

```csharp
result.ErrorRs
```

ควรบันทึก Response ในรูป JSON ที่สม่ำเสมอ เพื่อให้ตรวจสอบและ Parse ย้อนหลังได้ง่าย

### 3.13 ไม่มี `CancellationToken`

Publisher ควรรองรับ `CancellationToken` เพื่อ:

- ยกเลิก Request เมื่อ Client ยกเลิก
- ควบคุม Timeout ต่อ External API
- ปล่อย Resource ได้เร็วขึ้น

### 3.14 การใช้ `Task.WhenAll()` กับ Repository อาจไม่ปลอดภัย

หาก Publisher ทั้งสามใช้ EF Core `DbContext` Instance เดียวกัน การทำงานพร้อมกันอาจเกิด Error:

```text
A second operation was started on this context instance
before a previous operation completed.
```

ต้องแยกช่วง External API Call ออกจากช่วง Database Update ก่อนจึงจะทำ Parallel ได้อย่างปลอดภัย

---

## 4. จุดที่ต้องแก้ไขเร่งด่วน

เรียงตามความสำคัญ:

1. เพิ่ม `transactionId` ให้ Repository Update ทุก Method
2. แก้ QMOD Mapping ของ Stamp, VAT และ Gross
3. ส่ง `Campaign` เข้า Publisher แทนการ Query ซ้ำ
4. ลบ Query ที่ไม่ได้ใช้ออกจาก `ReadExcelPublished()`
5. แก้ SOAP Client ให้ปิดหรือ Abort ทุกกรณี
6. ใช้ `IHttpClientFactory` สำหรับ SafeSmart
7. หยุด QMOD Step 2 เมื่อ Step 1 ไม่สำเร็จ
8. บันทึก Error Response เป็น JSON รูปแบบเดียวกัน
9. เพิ่ม Null Validation และ Configuration Validation
10. เพิ่ม `CancellationToken`

---

## 5. Process ที่สามารถรวมเป็น Method กลาง

ส่วนที่ควรรวมใช้ร่วมกัน:

### 5.1 เตรียมข้อมูล Publish

รวมเป็น:

```csharp
PreparePublishContext()
```

รับผิดชอบ:

- โหลด Campaign
- ตรวจ Campaign ว่ามีอยู่จริง
- ตรวจ PremiumReference
- Generate หรือรับ Tariff Excel
- Read Excel
- Create Transaction

### 5.2 ควบคุม Publisher ที่ต้องทำงาน

รวมเป็น:

```csharp
ExecutePublishProcess()
```

รองรับ:

```text
All
Premium
SafeSmart
QMOD
```

ใช้ร่วมกันได้ทั้ง Publish ปกติและ Resend

### 5.3 Finalize Transaction

รวมเป็น:

```csharp
FinalizePublishTransaction()
```

รับผิดชอบรวมผลลัพธ์จากทุก Publisher และปิด Transaction

### 5.4 Parse Resend Target

รวมเป็น:

```csharp
ParsePublishTarget()
```

ช่วยยกเลิกการเปรียบเทียบ String หลายจุด และรองรับ Case Insensitive

### 5.5 ตรวจ Configuration

รวมเป็น:

```csharp
ValidateEndpoint()
```

ตรวจ:

- Enabled
- URL หรือ Endpoint
- ชื่อระบบ

### 5.6 Serialize JSON

รวมเป็น:

```csharp
SerializePublishData<T>()
```

กำหนด Serializer Setting ไว้จุดเดียว

### 5.7 Serialize และ Save Request

รวมเป็น:

```csharp
SerializeAndSaveRequest<T>()
```

ใช้ Generic Type และ Delegate สำหรับเลือก Repository Method ของแต่ละระบบ

### 5.8 Save Response

รวมเป็น:

```csharp
SavePublishResponse<T>()
```

รับ Result, Status และ Delegate ของ Repository

### 5.9 Normalize String

รวมเป็น:

```csharp
NormalizeText()
```

ใช้ Trim ข้อมูล Response ให้เหมือนกัน

### 5.10 Status Constants

รวมค่า Status ไว้ใน:

```csharp
PublishStatuses
```

ลดปัญหาสะกด Status ผิดและทำให้ทุกระบบใช้รูปแบบเดียวกัน

### 5.11 Error Information

รวมเป็น:

```csharp
CreatePublishError()
```

สร้างข้อมูล Error มาตรฐานก่อน Map กลับไป Result ของแต่ละระบบ

### 5.12 แปลง Nullable Number เป็น String

รวมเป็น:

```csharp
ToPublishString<T>()
```

ควบคุม Culture และ Null Format ให้เหมือนกัน

---

## 6. Process ที่ไม่ควรรวม

ไม่ควรรวม Business Payload ทั้งสามระบบเป็น Class หรือ Method เดียว เพราะ Contract แตกต่างกัน

ควรแยก:

```csharp
BuildPremiumPayload()
MapPremiumDetail()
SendPremiumSoap()
```

```csharp
BuildSafeSmartPayload()
MapSafeSmartDetail()
SendSafeSmartApi()
```

```csharp
BuildQmodPayload()
BuildQmodCompanyPayload()
MapQmodDetail()
HandleQmodStep()
```

เหตุผล:

- ชื่อ Field ต่างกัน
- Data Type ต่างกัน
- Date Format ต่างกัน
- Premium ใช้ SOAP
- SafeSmart และ QMOD ใช้ REST
- QMOD มี 2 ขั้นตอน
- Business Validation ต่างกัน

ไม่ควรสร้าง Method ใหญ่ที่ใช้ `if/else` ตามชื่อระบบ เพราะจะทำให้ระบบผูกกันแน่น อ่านยาก และทดสอบยาก

---

## 7. โครงสร้าง Class กลาง

### 7.1 Publish Target

```csharp
public enum PublishTarget
{
    All = 0,
    Premium = 1,
    SafeSmart = 2,
    Qmod = 3
}
```

### 7.2 Publish Context

```csharp
public sealed class CampaignPublishContext
{
    public long CampaignId { get; init; }

    public long TransactionId { get; init; }

    public Campaign Campaign { get; init; }

    public TariffExcelFile Excel { get; init; }

    public IReadOnlyList<ReadPremiumData> PremiumData { get; init; }
}
```

### 7.3 Publish Results

```csharp
public sealed class CampaignPublishResults
{
    public SmileyPremiumJsonResult Premium { get; set; }

    public SmileySafesmartJsonResult SafeSmart { get; set; }

    public SmileyQmodJsonResult Qmod { get; set; }
}
```

### 7.4 Publish Status Constants

```csharp
public static class PublishStatuses
{
    public const string Pending = "PENDING";
    public const string Sending = "SENDING";
    public const string Success = "SUCCESS";
    public const string Failed = "FAILED";
    public const string Error = "ERROR";
    public const string Timeout = "TIMEOUT";
    public const string ConnectionFailed = "CONNECTION_FAILED";
    public const string CommunicationError = "COMMUNICATION_ERROR";
    public const string SoapFault = "SOAP_FAULT";
    public const string Skipped = "SKIPPED";
    public const string InvalidResponse = "INVALID_RESPONSE";
}
```

### 7.5 Validation Result

```csharp
public sealed class PublishValidationResult
{
    public bool CanPublish { get; init; }

    public string Status { get; init; }

    public string Message { get; init; }

    public static PublishValidationResult Success()
    {
        return new PublishValidationResult
        {
            CanPublish = true,
            Status = "READY"
        };
    }

    public static PublishValidationResult Skipped(string message)
    {
        return new PublishValidationResult
        {
            CanPublish = false,
            Status = PublishStatuses.Skipped,
            Message = message
        };
    }

    public static PublishValidationResult Error(string message)
    {
        return new PublishValidationResult
        {
            CanPublish = false,
            Status = PublishStatuses.Error,
            Message = message
        };
    }
}
```

---

## 8. Refactor ขั้นตอนเตรียมข้อมูล Publish

### 8.1 Method กลาง

```csharp
private async Task<CampaignPublishContext> PreparePublishContext(
    long campaignId,
    TariffExcelFile excel = null)
{
    var campaign = await _campaignRepository
        .GetCampaignById(campaignId);

    if (campaign == null)
    {
        throw new InvalidOperationException(
            $"Campaign ID {campaignId} was not found.");
    }

    if (!campaign.PremiumReference.HasValue)
    {
        throw new InvalidOperationException(
            $"Campaign ID {campaignId} does not have PremiumReference.");
    }

    excel ??= await _tariffService
        .GetTariffExcel(campaignId);

    if (excel == null || string.IsNullOrWhiteSpace(excel.TariffFile))
    {
        throw new InvalidOperationException(
            $"Tariff Excel was not generated for Campaign ID {campaignId}.");
    }

    var premiumData = ReadExcelPublished(
        campaignId,
        excel);

    var transactionId =
        await _campaignPublishedTransactionRepository
            .NewTransactionPublished(
                campaignId,
                campaign.PremiumReference.Value);

    return new CampaignPublishContext
    {
        CampaignId = campaignId,
        TransactionId = transactionId,
        Campaign = campaign,
        Excel = excel,
        PremiumData = premiumData
    };
}
```

### 8.2 ประโยชน์

- ลด Query Campaign ซ้ำ
- รวม Validation ไว้จุดเดียว
- ใช้ได้ทั้ง Publish และ Resend
- ส่งข้อมูลที่พร้อมใช้งานเข้า Publisher
- ลด Parameter ที่กระจายในหลาย Method

---

## 9. Refactor การควบคุม Publish และ Resend

### 9.1 Execute Publisher กลาง

```csharp
private async Task<CampaignPublishResults> ExecutePublishProcess(
    CampaignPublishContext context,
    PublishTarget target,
    CancellationToken cancellationToken = default)
{
    var results = new CampaignPublishResults();

    if (target == PublishTarget.All ||
        target == PublishTarget.Premium)
    {
        results.Premium = await PublishPremiumApi(
            context.Campaign,
            context.PremiumData,
            context.TransactionId,
            cancellationToken);
    }

    if (target == PublishTarget.All ||
        target == PublishTarget.SafeSmart)
    {
        results.SafeSmart = await PublishSafesmart(
            context.Campaign,
            context.PremiumData,
            context.TransactionId,
            cancellationToken);
    }

    if (target == PublishTarget.All ||
        target == PublishTarget.Qmod)
    {
        results.Qmod = await PublishQmod(
            context.Campaign,
            context.PremiumData,
            context.TransactionId,
            cancellationToken);
    }

    return results;
}
```

### 9.2 Parse Resend Target

```csharp
private static PublishTarget ParsePublishTarget(string resend)
{
    if (string.IsNullOrWhiteSpace(resend))
    {
        throw new ArgumentException(
            "Publish target is required.",
            nameof(resend));
    }

    return resend.Trim().ToUpperInvariant() switch
    {
        "PREMIUM" => PublishTarget.Premium,
        "SAFESMART" => PublishTarget.SafeSmart,
        "QMOD" => PublishTarget.Qmod,
        _ => throw new ArgumentException(
            $"Unsupported publish target: {resend}",
            nameof(resend))
    };
}
```

### 9.3 Finalize Transaction

Repository ควร Update ด้วย `transactionId` ไม่ใช่หา Latest Transaction จาก `campaignId`

```csharp
private async Task FinalizePublishTransaction(
    CampaignPublishContext context,
    CampaignPublishResults results)
{
    await _campaignPublishedTransactionRepository
        .UpdateTransactionPublished(
            context.TransactionId,
            context.CampaignId,
            results.Premium,
            results.SafeSmart,
            results.Qmod);
}
```

### 9.4 ResendCampaign หลัง Refactor

```csharp
public async Task<BaseResponse> ResendCampaign(
    long campaignKeyId,
    string resend,
    CancellationToken cancellationToken = default)
{
    var target = ParsePublishTarget(resend);

    var context = await PreparePublishContext(
        campaignKeyId);

    var results = new CampaignPublishResults();

    try
    {
        results = await ExecutePublishProcess(
            context,
            target,
            cancellationToken);

        return new BaseResponse
        {
            Code = ResponseCode.Success
        };
    }
    finally
    {
        await FinalizePublishTransaction(
            context,
            results);
    }
}
```

---

## 10. Refactor Shared Helper

### 10.1 Validate Endpoint

```csharp
private static PublishValidationResult ValidateEndpoint(
    bool enabled,
    string endpoint,
    string systemName)
{
    if (!enabled)
    {
        return PublishValidationResult.Skipped(
            $"{systemName} API Disabled");
    }

    if (string.IsNullOrWhiteSpace(endpoint))
    {
        return PublishValidationResult.Error(
            $"{systemName} endpoint is not configured");
    }

    return PublishValidationResult.Success();
}
```

### 10.2 Serialize JSON

```csharp
private static string SerializePublishData<T>(T value)
{
    return JsonConvert.SerializeObject(
        value,
        new JsonSerializerSettings
        {
            NullValueHandling = NullValueHandling.Include,
            ReferenceLoopHandling = ReferenceLoopHandling.Ignore
        });
}
```

### 10.3 Serialize และ Save Request

```csharp
private async Task<string> SerializeAndSaveRequest<T>(
    long transactionId,
    T payload,
    Func<long, string, Task> saveAction)
{
    var requestJson = SerializePublishData(payload);

    await saveAction(
        transactionId,
        requestJson);

    return requestJson;
}
```

### 10.4 Save Response แบบ Generic

```csharp
private async Task SavePublishResponse<T>(
    long transactionId,
    T result,
    string status,
    Func<long, string, string, Task> saveAction)
{
    var responseJson = SerializePublishData(result);

    await saveAction(
        transactionId,
        responseJson,
        status);
}
```

### 10.5 Normalize Text

```csharp
private static string NormalizeText(string value)
{
    return string.IsNullOrWhiteSpace(value)
        ? null
        : value.Trim();
}
```

### 10.6 แปลง Nullable Number เป็น String

```csharp
private static string ToPublishString<T>(T? value)
    where T : struct
{
    return value.HasValue
        ? Convert.ToString(
            value.Value,
            CultureInfo.InvariantCulture)
        : string.Empty;
}
```

---

## 11. ปรับปรุง PublishPremiumApi

### 11.1 เปลี่ยน Signature

เดิม:

```csharp
private async Task<SmileyPremiumJsonResult> PublishPremiumApi(
    long campaignKeyID,
    List<ReadPremiumData> dataPremium,
    long transactionID)
```

แก้เป็น:

```csharp
private async Task<SmileyPremiumJsonResult> PublishPremiumApi(
    Campaign campaign,
    IReadOnlyCollection<ReadPremiumData> dataPremium,
    long transactionId,
    CancellationToken cancellationToken = default)
```

### 11.2 สร้าง Payload List ด้วย Capacity

```csharp
var payload = new SmileyQuoteRequestPayload
{
    publishCampaignID = transactionId.ToString(),
    publishCampaignRefer = campaign.PremiumReference,
    publishCampaignDate = DateTime.UtcNow
        .ToString("yyyy-MM-dd HH:mm:ss"),
    EffectivePeriod = campaign.EffectivePeriod,
    ExpiredPeriod = campaign.ExpiredPeriod,
    CampaignName = campaign.CampaignName,
    CampaignDetail = new List<SmileyQuotePremiumRequest>(
        dataPremium.Count)
};
```

### 11.3 แยก Mapper

```csharp
private static SmileyQuotePremiumRequest MapPremiumDetail(
    ReadPremiumData item)
{
    return new SmileyQuotePremiumRequest
    {
        CampaignKeyId = item.CampaignKeyId,
        CompanyCode = item.CompanyCode,
        CampaignCode = item.CampaignCode,
        Polmst = item.Polmst,
        Pack = item.Pack,
        Sclass = item.Sclass,
        Covcod = item.Covcod,
        Vehgrp = item.Vehgrp,
        Vehuse = item.Vehuse,
        GarageCd = item.GarageCd,
        Makdes = item.Makdes,
        Moddes = item.Moddes,
        DrivNo = ToPublishString(item.DrivNo),
        DrivAge1 = ToPublishString(item.DrivAge1),
        DrivAge2 = ToPublishString(item.DrivAge2),
        FleetPer = ToPublishString(item.FleetPer),
        NcbPer = ToPublishString(item.NcbPer),
        DspcPer = ToPublishString(item.DspcPer),
        PrmTnew = ToPublishString(item.PrmTnew),
        PrmGapnew = ToPublishString(item.PrmGapnew),
        PrmStpnew = ToPublishString(item.PrmStpnew),
        PrmVatnew = ToPublishString(item.PrmVatnew),
        WallChargeSI = ToPublishString(item.WallChargeSI),
        RateWallCharge = ToPublishString(item.RateWallCharge),
        NetPremiumWallCharge = ToPublishString(item.NetPremiumWallCharge),
        GrossPremiumWallCharge = ToPublishString(item.GrossPremiumWallCharge),
        BatteryPrice = ToPublishString(item.BatteryPrice),
        BatterySI = ToPublishString(item.BatterySI),
        RateBattery = ToPublishString(item.RateBattery),
        NetPremiumBattery = ToPublishString(item.NetPremiumBattery),
        GrossPremiumBattery = ToPublishString(item.GrossPremiumBattery),
        DealerGarageRate = ToPublishString(item.DealerGarageRate),
        DealerGarageAmount = ToPublishString(item.DealerGarageAmount)

        // เพิ่ม Field ที่เหลือตาม Contract เดิม
    };
}
```

### 11.4 ปิด SOAP Client ทุกกรณี

```csharp
smileyQuoteCampaignObjClient client = null;

try
{
    cancellationToken.ThrowIfCancellationRequested();

    var endpoint = new EndpointAddress(
        config.Premium.SoapUrl);

    client = new smileyQuoteCampaignObjClient(
        smileyQuoteCampaignObjClient.EndpointConfiguration
            .smileyQuoteCampaignObj,
        endpoint);

    client.InnerChannel.OperationTimeout =
        TimeSpan.FromSeconds(
            config.Premium.TimeoutSeconds);

    var response = await client.smileyquoteAsync(
        new smileyquoteRequest
        {
            json = requestJson
        });

    // Process response
}
finally
{
    if (client != null)
    {
        try
        {
            if (client.State == CommunicationState.Faulted)
            {
                client.Abort();
            }
            else
            {
                await client.CloseAsync();
            }
        }
        catch
        {
            client.Abort();
        }
    }
}
```

### 11.5 Response ว่างต้องบันทึก Error JSON

```csharp
if (string.IsNullOrWhiteSpace(response?.jsonRS))
{
    result.Status = PublishStatuses.Error;
    result.ErrorRs = "SOAP jsonRS is null or empty";

    await SavePublishResponse(
        transactionId,
        result,
        PublishStatuses.Error,
        _campaignPublishedTransactionRepository
            .UpdatePremiumResponse);

    return result;
}
```

---

## 12. ปรับปรุง PublishSafesmart

### 12.1 ลงทะเบียน HttpClient

ใน `Program.cs` หรือ `Startup.cs`:

```csharp
services.AddHttpClient("SafeSmart", client =>
{
    client.DefaultRequestHeaders.Accept.Add(
        new MediaTypeWithQualityHeaderValue(
            "application/json"));
});
```

### 12.2 Inject IHttpClientFactory

เพิ่ม Field:

```csharp
private readonly IHttpClientFactory _httpClientFactory;
```

เพิ่ม Constructor Parameter:

```csharp
IHttpClientFactory httpClientFactory
```

Assign:

```csharp
_httpClientFactory = httpClientFactory;
```

### 12.3 เปลี่ยน Signature

```csharp
private async Task<SmileySafesmartJsonResult> PublishSafesmart(
    Campaign campaign,
    IReadOnlyCollection<ReadPremiumData> dataPremium,
    long transactionId,
    CancellationToken cancellationToken = default)
```

### 12.4 ใช้ HttpClientFactory และ Timeout Token

```csharp
var http = _httpClientFactory
    .CreateClient("SafeSmart");

using var request = new HttpRequestMessage(
    HttpMethod.Post,
    config.Url);

request.Content = new StringContent(
    requestJson,
    Encoding.UTF8,
    "application/json");

using var timeoutCts =
    CancellationTokenSource.CreateLinkedTokenSource(
        cancellationToken);

timeoutCts.CancelAfter(
    TimeSpan.FromSeconds(
        config.TimeoutSeconds));

using var response = await http.SendAsync(
    request,
    HttpCompletionOption.ResponseHeadersRead,
    timeoutCts.Token);
```

### 12.5 Safe Deserialize

```csharp
SmileySafesmartJsonResult parsedResult = null;

try
{
    parsedResult =
        JsonConvert.DeserializeObject<SmileySafesmartJsonResult>(
            responseJson);
}
catch (JsonException)
{
    // เก็บ Raw Response ลง Transaction ต่อไป
}

result = parsedResult ?? new SmileySafesmartJsonResult
{
    ErrorList = new List<string>()
};
```

### 12.6 ตรวจทั้ง HTTP และ Business Status

```csharp
if (!response.IsSuccessStatusCode)
{
    result.Status = PublishStatuses.Failed;
    result.Message =
        $"HTTP Error {(int)response.StatusCode} " +
        response.ReasonPhrase;

    result.ErrorList ??= new List<string>();
    result.ErrorList.Add(responseJson);
}

var transactionStatus =
    !response.IsSuccessStatusCode
        ? PublishStatuses.Failed
        : string.Equals(
            result.Status,
            PublishStatuses.Success,
            StringComparison.OrdinalIgnoreCase)
                ? PublishStatuses.Success
                : result.Status ?? PublishStatuses.InvalidResponse;
```

### 12.7 แยก Timeout ออกจาก User Cancellation

```csharp
catch (OperationCanceledException ex)
    when (!cancellationToken.IsCancellationRequested)
{
    result.Status = PublishStatuses.Timeout;
    result.Message = "SafeSmart API Timeout";
    result.ErrorList ??= new List<string>();
    result.ErrorList.Add(ex.Message);
}
```

---

## 13. ปรับปรุง PublishQmod

### 13.1 เปลี่ยน Signature

```csharp
private async Task<SmileyQmodJsonResult> PublishQmod(
    Campaign campaign,
    IReadOnlyCollection<ReadPremiumData> dataPremium,
    long transactionId,
    CancellationToken cancellationToken = default)
```

### 13.2 แก้ Mapping Bug

```csharp
prmStpNew = item.PrmStpnew,
prmVatNew = item.PrmVatnew,
prmGapNew = item.PrmGapnew,
```

### 13.3 ลบ HttpClient ที่ไม่ได้ใช้

ลบ:

```csharp
var http = new HttpClient();
```

### 13.4 ไม่ใช้ Formatting.Indented

```csharp
var jsonPayload = JsonConvert.SerializeObject(payload);
var jsonCompanyPayload = JsonConvert.SerializeObject(jsonCompany);
```

### 13.5 ตรวจ Company Code

```csharp
var campaignCompany = dataPremium
    .Select(x => x.CompanyCode?.Trim())
    .FirstOrDefault(x =>
        !string.IsNullOrWhiteSpace(x));

if (string.IsNullOrWhiteSpace(campaignCompany))
{
    jsonResult.code = PublishStatuses.Error;
    jsonResult.message =
        "CompanyCode was not found in premium data";

    await SavePublishResponse(
        transactionId,
        jsonResult,
        PublishStatuses.Error,
        _campaignPublishedTransactionRepository
            .UpdateQmodResponse);

    return jsonResult;
}
```

### 13.6 ประกอบ URL อย่างปลอดภัย

Configuration ควรตั้งชื่อชัดเจน:

```json
{
  "Qmod": {
    "Enabled": true,
    "BaseUrl": "https://example.com",
    "CampaignEndpoint": "/campaigns",
    "OCPKey": "..."
  }
}
```

ประกอบ URL:

```csharp
var baseUrl = config.BaseUrl.TrimEnd('/');
var endpoint = config.CampaignEndpoint.Trim('/');

var url = $"{baseUrl}/{endpoint}/{campaignUuid}";
var urlCompany = $"{url}/company-codes";
```

### 13.7 ให้ HandleQmodStep คืนค่า bool

```csharp
private async Task<bool> HandleQmodStep(
    string name,
    Func<Task> requestLog,
    Func<Task<string>> callApi,
    Func<string, string, Task> responseLog,
    SmileyQmodJsonResult jsonResult)
{
    try
    {
        await requestLog();

        var response = await callApi();

        var apiResult =
            JsonConvert.DeserializeObject<QmodApiResult>(
                response);

        if (apiResult == null)
        {
            await responseLog(
                response,
                PublishStatuses.InvalidResponse);

            jsonResult.details.Add(new SmileyQmodResult
            {
                campaign = name,
                code = PublishStatuses.InvalidResponse,
                message = "QMOD response cannot be deserialized"
            });

            return false;
        }

        var success = string.Equals(
            apiResult.code,
            PublishStatuses.Success,
            StringComparison.OrdinalIgnoreCase);

        var status = success
            ? PublishStatuses.Success
            : PublishStatuses.Failed;

        await responseLog(response, status);

        jsonResult.details.Add(new SmileyQmodResult
        {
            campaign = name,
            code = apiResult.code,
            message = apiResult.message,
            status = apiResult.status,
            timestamp = apiResult.timestamp,
            traceId = apiResult.traceId
        });

        return success;
    }
    catch (Exception ex)
    {
        jsonResult.details.Add(new SmileyQmodResult
        {
            campaign = name,
            code = PublishStatuses.Failed,
            message = ex.Message
        });

        var errorJson = SerializePublishData(
            jsonResult.details);

        await responseLog(
            errorJson,
            PublishStatuses.Failed);

        return false;
    }
}
```

### 13.8 หยุด Step 2 เมื่อ Step 1 ล้มเหลว

```csharp
var detailSuccess = await HandleQmodStep(
    "CampaignDetail",
    requestLog: () =>
        _campaignPublishedTransactionRepository
            .UpdateQmodRequest(
                transactionId,
                jsonPayload),
    callApi: () => api.Put(url, payload),
    responseLog: (response, status) =>
        _campaignPublishedTransactionRepository
            .UpdateQmodResponse(
                transactionId,
                response,
                status),
    jsonResult);

if (!detailSuccess)
{
    jsonResult.code = PublishStatuses.Failed;
    jsonResult.message = "QMOD CampaignDetail failed";
    return jsonResult;
}

var companySuccess = await HandleQmodStep(
    "CampaignCompany",
    requestLog: () =>
        _campaignPublishedTransactionRepository
            .UpdateQmodCompRequest(
                transactionId,
                jsonCompanyPayload),
    callApi: () => api.Put(urlCompany, jsonCompany),
    responseLog: (response, status) =>
        _campaignPublishedTransactionRepository
            .UpdateQmodCompResponse(
                transactionId,
                response,
                status),
    jsonResult);
```

---

## 14. ปรับปรุง ReadExcelPublished

### 14.1 ลบ Query ที่ไม่ได้ใช้

ลบ:

```csharp
var campaign = await _campaignRepository.GetCampaignById(campaignId);
var premiums = await _campaignRepository.GetPremiumsByCampaignId(campaignId);
```

### 14.2 เปลี่ยนจาก Async เป็น Sync

เนื่องจากไม่มี I/O แบบ Async ภายใน EPPlus Method นี้จึงไม่จำเป็นต้องคืน `Task`

```csharp
private List<ReadPremiumData> ReadExcelPublished(
    long campaignId,
    TariffExcelFile excel)
```

### 14.3 ตรวจ File และ Worksheet

```csharp
private List<ReadPremiumData> ReadExcelPublished(
    long campaignId,
    TariffExcelFile excel)
{
    var excelPath = Path.Combine(
        _configApp.FilePathMapper,
        "Tariff");

    var readFile = Path.Combine(
        excelPath,
        excel.TariffFile);

    if (!File.Exists(readFile))
    {
        throw new FileNotFoundException(
            "Tariff Excel file was not found.",
            readFile);
    }

    using var package =
        new ExcelPackage(new FileInfo(readFile));

    var worksheet = package.Workbook.Worksheets[0];

    if (worksheet?.Dimension == null)
    {
        return new List<ReadPremiumData>();
    }

    var rowCount = worksheet.Dimension.Rows;
    var cells = worksheet.Cells;

    var result = new List<ReadPremiumData>(
        Math.Max(0, rowCount - 1));

    for (var row = 2; row <= rowCount; row++)
    {
        result.Add(new ReadPremiumData
        {
            CampaignKeyId = campaignId,
            CompanyCode = cells[row, 1].GetValue<string>(),
            CampaignCode = cells[row, 2].GetValue<string>(),
            Polmst = cells[row, 3].GetValue<string>(),
            Pack = cells[row, 4].GetValue<string>(),
            Sclass = cells[row, 5].GetValue<string>()

            // Mapping Column 6 ถึง 101 ตามโครงสร้างเดิม
        });
    }

    return result;
}
```

### 14.4 ข้อควรระวัง

- ตรวจว่า Header ตรงกับ Column Mapping
- ตรวจ Row ว่างก่อน Add
- ตรวจชนิดข้อมูลที่อาจเป็น Text แต่กำหนดเป็น Decimal
- ไม่ควรทำ `Parallel.For` อ่าน EPPlus Worksheet โดยไม่ตรวจ Thread Safety
- หากไฟล์ใหญ่มาก ควรพิจารณาอ่านจาก Source Data โดยตรงแทน Generate Excel แล้วอ่านกลับ

### 14.5 แนวทางที่เร็วกว่าในระยะยาว

Flow ปัจจุบันเป็น:

```text
Database/Data Source
    -> Generate Excel
    -> Save Excel
    -> Open Excel
    -> Convert กลับเป็น Object
    -> Build API Payload
```

แนวทางที่ดีกว่า:

```text
Database/Data Source
    -> Generate List<ReadPremiumData> เพียงครั้งเดียว
    -> ใช้ List สร้าง Excel
    -> ใช้ List เดิมสร้าง API Payload
```

วิธีนี้ลดการเขียนและอ่าน Excel กลับ ซึ่งมีโอกาสเป็น Performance Bottleneck หลัก

---

## 15. แนวทาง Parallel Processing ที่ปลอดภัย

### 15.1 วิธีที่ไม่ควรใช้ทันที

```csharp
await Task.WhenAll(
    PublishPremiumApi(...),
    PublishSafesmart(...),
    PublishQmod(...));
```

หาก Method เหล่านี้ Update Repository ภายในและใช้ `DbContext` เดียวกัน อาจเกิด Concurrent Operation Error

### 15.2 Flow ที่ปลอดภัย

แยกเป็น 3 ช่วง:

```text
ช่วง 1: Build Payload และ Save Request Log แบบ Sequential
ช่วง 2: Call External APIs แบบ Parallel โดยไม่แตะ DbContext
ช่วง 3: Save Response แบบ Sequential
```

ตัวอย่าง:

```csharp
var premiumRequest = BuildPremiumPayload(
    context.Campaign,
    context.PremiumData,
    context.TransactionId);

var safeSmartRequest = BuildSafeSmartPayload(
    context.Campaign,
    context.PremiumData);

var qmodRequest = BuildQmodPayload(
    context.Campaign,
    context.PremiumData);
```

Save Request ทีละรายการ:

```csharp
await SavePremiumRequest(...);
await SaveSafeSmartRequest(...);
await SaveQmodRequest(...);
```

Call External API พร้อมกัน:

```csharp
var premiumTask = SendPremiumSoap(
    premiumRequest,
    cancellationToken);

var safeSmartTask = SendSafeSmartApi(
    safeSmartRequest,
    cancellationToken);

var qmodTask = SendQmodApi(
    qmodRequest,
    cancellationToken);

await Task.WhenAll(
    premiumTask,
    safeSmartTask,
    qmodTask);
```

Save Response ทีละรายการ:

```csharp
var premiumResult = await premiumTask;
var safeSmartResult = await safeSmartTask;
var qmodResult = await qmodTask;

await SavePremiumResponse(...);
await SaveSafeSmartResponse(...);
await SaveQmodResponse(...);
```

### 15.3 ทางเลือกอื่น

หากต้องการให้แต่ละ Task Update Database ได้เอง ต้องสร้าง DI Scope และ `DbContext` แยกต่อ Task แต่จะเพิ่มความซับซ้อน จึงควรใช้แนวทางแยก External I/O และ Database I/O ก่อน

---

## 16. โครงสร้าง Method หลัง Refactor

```csharp
// Orchestration
PublishCampaign()
ResendCampaign()
PreparePublishContext()
ExecutePublishProcess()
FinalizePublishTransaction()
ParsePublishTarget()

// Publish preparation
SetupValidSumInsured()
GenerateAndSaveTariff()
SendPublishCompletedEmail()

// Premium
PublishPremiumApi()
BuildPremiumPayload()
MapPremiumDetail()
SendPremiumSoap()
NormalizePremiumResult()

// SafeSmart
PublishSafesmart()
BuildSafeSmartPayload()
MapSafeSmartDetail()
SendSafeSmartApi()

// QMOD
PublishQmod()
BuildQmodPayload()
BuildQmodCompanyPayload()
MapQmodDetail()
HandleQmodStep()

// Shared
ValidateEndpoint()
SerializePublishData()
SerializeAndSaveRequest()
SavePublishResponse()
NormalizeText()
ToPublishString()
CreatePublishError()

// File
ReadExcelPublished()
```

หลักการสำคัญ:

```text
CampaignService Orchestration
    -> ควบคุม Flow

Publisher Method
    -> รับผิดชอบระบบปลายทางของตัวเอง

Mapper
    -> แปลง Source เป็น API Contract

Repository
    -> จัดการฐานข้อมูลโดยใช้ Transaction ID ที่ชัดเจน

HTTP/SOAP Client
    -> จัดการ External Communication
```

---

## 17. ลำดับการแก้ไขที่แนะนำ

### Phase 1: แก้ความถูกต้องของข้อมูล

1. เปลี่ยน Repository Update ทุกตัวให้รับ `transactionId`
2. แก้ QMOD Mapping ของ `PrmStpnew`, `PrmVatnew`, `PrmGapnew`
3. ตรวจ Campaign, PremiumReference และ EffectivePeriod
4. หยุด QMOD Company Step เมื่อ Detail Step ไม่สำเร็จ
5. ทำ Response Log ให้เป็น JSON รูปแบบเดียวกัน

### Phase 2: ลดงานซ้ำ

1. เพิ่ม `CampaignPublishContext`
2. ส่ง `Campaign` เข้า Publisher
3. ลบ Query ที่ไม่ได้ใช้ใน `ReadExcelPublished()`
4. เพิ่ม `CampaignPublishResults`
5. เพิ่ม `ExecutePublishProcess()`
6. ใช้ `PublishTarget` กับ Resend
7. แยก Mapper ของแต่ละระบบ

### Phase 3: จัดการ Resource

1. ใช้ `IHttpClientFactory`
2. ปิดหรือ Abort SOAP Client ทุกกรณี
3. เพิ่ม `CancellationToken`
4. ยกเลิก `Formatting.Indented`
5. กำหนด Capacity ของ List
6. ลบ Object ที่สร้างแล้วไม่ได้ใช้

### Phase 4: เพิ่ม Performance ขั้นสูง

1. แยก Build Payload, Send API และ Save Response
2. Call External API แบบ Parallel
3. Save Database แบบ Sequential
4. พิจารณาไม่อ่าน Excel กลับ โดยใช้ Source List เดิม
5. พิจารณา Background Job หาก Publish ใช้เวลานาน
6. เพิ่ม Metrics ระยะเวลาในแต่ละ Step

---

## 18. Checklist ทดสอบ

### 18.1 Transaction

- [ ] Request และ Response ถูกบันทึกด้วย Transaction ID ที่ถูกต้อง
- [ ] Publish Campaign เดียวกันพร้อมกันแล้ว Log ไม่เขียนทับกัน
- [ ] Resend สร้าง Transaction ใหม่และไม่ทับ Transaction เดิม
- [ ] Final Status ตรงกับ Result ของแต่ละระบบ

### 18.2 Premium API

- [ ] Disabled ได้ Status `SKIPPED`
- [ ] URL ว่างได้ Status `ERROR`
- [ ] SOAP Timeout ได้ Status `TIMEOUT`
- [ ] SOAP Fault ได้ Status `SOAP_FAULT`
- [ ] Response ว่างถูกบันทึกเป็น Error JSON
- [ ] Deserialize ไม่สำเร็จถูกบันทึกครบ
- [ ] SOAP Client ปิดหรือ Abort ทุกกรณี

### 18.3 SafeSmart

- [ ] ใช้ `IHttpClientFactory`
- [ ] HTTP 200 และ Business Error ไม่ถูกมองเป็น Success
- [ ] HTTP 400, 500, 502 และ 504 เก็บ Raw Response
- [ ] Response ที่เป็น HTML ไม่ทำให้ข้อมูล Error หาย
- [ ] Timeout แยกจาก Client Cancellation
- [ ] Request และ Response ผูกกับ Transaction ID ถูกต้อง

### 18.4 QMOD

- [ ] Stamp Mapping จาก `PrmStpnew`
- [ ] VAT Mapping จาก `PrmVatnew`
- [ ] Gross Mapping จาก `PrmGapnew`
- [ ] Company Code ไม่ส่งค่า null
- [ ] Step 2 ไม่ทำเมื่อ Step 1 ล้มเหลว
- [ ] URL ไม่มี Slash ซ้ำหรือ Slash หาย
- [ ] Request JSON ไม่ใช้ Indented
- [ ] Detail และ Company Response บันทึก Transaction ถูกต้อง

### 18.5 Excel

- [ ] File ไม่มีอยู่แล้วแจ้ง Error ชัดเจน
- [ ] Worksheet ว่างไม่เกิด NullReferenceException
- [ ] Column 1 ถึง 101 Mapping ถูกต้อง
- [ ] Row ว่างไม่ถูกส่ง API โดยไม่ตั้งใจ
- [ ] จำนวน Record ใน Excel ตรงกับ Payload
- [ ] ไม่มี Query Database ที่ไม่ได้ใช้

### 18.6 Performance

- [ ] วัดเวลา Generate Excel
- [ ] วัดเวลา Read Excel
- [ ] วัดเวลา Build Payload แต่ละระบบ
- [ ] วัดเวลา Serialize JSON
- [ ] วัดเวลา External API แต่ละระบบ
- [ ] วัดเวลา Database Log
- [ ] ทดสอบ Campaign ขนาดเล็ก กลาง และใหญ่
- [ ] ตรวจ Memory หลัง Publish หลายครั้งต่อเนื่อง

---

## 19. ผลลัพธ์ที่คาดหวัง

หลัง Refactor ควรได้ผลดังนี้:

### ด้านความถูกต้อง

- Transaction Log ไม่เขียนผิดรายการ
- QMOD ได้ค่า Stamp, VAT และ Gross ถูกต้อง
- QMOD ไม่ส่ง Company Code ต่อเมื่อ Detail ล้มเหลว
- Response ทุกระบบมีรูปแบบที่ตรวจสอบย้อนหลังได้

### ด้าน Performance

- ลด SQL Query ที่ไม่จำเป็น
- ลดการเปิดและอ่านข้อมูลซ้ำ
- ลด JSON ขนาดเกินจำเป็น
- ใช้ HTTP Connection Pool ได้เหมาะสม
- รองรับการทำ External API Parallel ในระยะถัดไป

### ด้าน Maintainability

- `PublishCampaign()` เหลือหน้าที่ควบคุม Flow
- Publish และ Resend ใช้ Process กลางเดียวกัน
- Mapping ของแต่ละระบบแยกชัดเจน
- Shared Validation, Serialization และ Logging ไม่เขียนซ้ำ
- เพิ่ม Publisher ใหม่ได้ง่ายขึ้น
- Unit Test Mapper และ Validation ได้โดยไม่ Call API จริง

---

# บทสรุป

แนวทางที่เหมาะสมคือ **รวมขั้นตอนที่เหมือนกัน แต่แยก Business Mapping และ Protocol ที่ต่างกัน**

ส่วนที่ควรรวมมากที่สุดคือ:

```text
Prepare Context
Validate Configuration
Serialize Request
Save Request
Control Publish Target
Save Response
Finalize Transaction
Normalize Status และ Error
```

ส่วนที่ต้องแยกคือ:

```text
Premium SOAP Payload และ Client Lifecycle
SafeSmart Payload และ REST Response
QMOD Payload, Detail Step และ Company Step
```

ก่อนเพิ่ม Parallel Processing ควรแก้ Transaction ID, QMOD Mapping, Query ซ้ำ และ Resource Management ให้เรียบร้อยก่อน จากนั้นจึงแยก External API Call ออกจาก Database Update เพื่อใช้ `Task.WhenAll()` อย่างปลอดภัย
