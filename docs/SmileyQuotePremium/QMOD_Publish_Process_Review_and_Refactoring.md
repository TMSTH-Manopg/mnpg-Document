# QMOD Publish Process Review and Refactoring

## 1. วัตถุประสงค์

เอกสารนี้สรุปการรีวิวและปรับปรุงกระบวนการส่งข้อมูล QMOD จำนวน 2 ขั้นตอน ได้แก่

1. ส่ง Campaign ไปยัง `PUT /campaign/{campaignID}`
2. ส่ง Company Codes ไปยัง `PUT /campaign/{campaignID}/company-codes`

ผลลัพธ์ของทั้งสองขั้นตอนจะถูกรวมและส่งกลับจาก `PublishQmodProcess` ภายใน `QmodPublishResult` object เดียว โดยไม่เก็บ `Task<T>` ไว้ใน DTO และไม่ block async operation ด้วย `.Result`

---

## 2. ปัญหาในโค้ดปัจจุบัน

### 2.1 `QmodPublishResult` เก็บ `Task<T>` แทนผลลัพธ์จริง

โค้ดเดิมกำหนดดังนี้

```csharp
public Task<QmodCampaignResponseData> CampaignResult { get; set; }
public Task<QmodCompanyCodesResponseData> CompanyCodesResult { get; set; }
```

DTO ที่ส่งออกจาก method หรือ API ไม่ควรเก็บ `Task<T>` เพราะ `Task` เป็นตัวแทนงานที่ยังทำไม่เสร็จ ไม่ใช่ response data ที่พร้อม serialize เป็น JSON

ให้เปลี่ยนเป็น result object ที่ await เสร็จแล้ว

```csharp
public QmodStepResult<QmodCampaignResponseData>? CampaignResult { get; set; }
public QmodStepResult<QmodCompanyCodesResponseData>? CompanyCodesResult { get; set; }
```

### 2.2 Signature ของ `SendQmodCampaignAsync` ไม่ถูกต้อง

โค้ดเดิม

```csharp
private async List<QmodApiResponse> SendQmodCampaignAsync(...)
```

Method ที่มี `async` ต้องคืน `Task`, `Task<T>`, `ValueTask` หรือ type ที่รองรับ async method builder จึงควรเป็น

```csharp
private async Task<QmodStepResult<QmodCampaignResponseData>> SendQmodCampaignAsync(...)
```

### 2.3 ใช้ `.Result` ภายใน async method

โค้ดเดิมเรียก

```csharp
var httpResult = api.Put(url, requestJson);
var apiResponse = JsonConvert.DeserializeObject<QmodApiResponse>(httpResult.Result);
```

การใช้ `.Result` ทำให้ thread ถูก block และมีความเสี่ยงต่อ deadlock ควรใช้ `await`

```csharp
var rawResponse = await api.Put(url, requestJson);
```

> ตัวอย่างในเอกสารนี้สมมติว่า `ApiGeneral.Put(...)` คืน `Task<string>` หากชื่อ method จริงเป็น `PutAsync` ให้เปลี่ยนเฉพาะบรรทัดเรียกใช้งานเป็น `await api.PutAsync(...)`

### 2.4 Return type ของ Company API ไม่สอดคล้อง

Method ประกาศว่าจะคืน `Task<QmodCompanyCodesResponseData>` แต่ภายในคืน `QmodStepResult<QmodCompanyCodesResponseData>` จึง compile ไม่ผ่าน

### 2.5 Campaign API สูญเสียข้อมูลสถานะ HTTP

Campaign API สามารถคืนทั้ง

- `200 OK` เมื่อ Campaign มีอยู่แล้วและถูก update
- `201 Created` เมื่อสร้าง Campaign ใหม่

แต่โค้ดเดิม deserialize เฉพาะ body และไม่ได้เก็บ HTTP status ทำให้แยก create/update ไม่ได้

### 2.6 Error ถูกกลืนและคืน `null`

โค้ดเดิม

```csharp
catch (Exception ex)
{
    return null;
}
```

ทำให้ไม่ทราบ endpoint, error code, raw response และ exception ที่แท้จริง ควรคืน failed step result ที่มีข้อมูลครบแทน `null`

### 2.7 รหัสของตัวอย่าง HTTP 500 ไม่ตรงกับสถานะ

ตัวอย่าง response ของ HTTP 500 ใช้ code เป็น `E400` และ message เป็น `Invalid input data` ซึ่งควรตรวจสอบกับ QMOD API อีกครั้ง โดยตามหลักควรเป็นประมาณนี้

```json
{
  "code": "E500",
  "message": "Internal server error"
}
```

Client ควรใช้ HTTP status จริงเป็นหลัก ไม่ควรตัดสินผลสำเร็จจาก `code` ใน body เพียงอย่างเดียว

---

## 3. โครงสร้าง DTO ที่แนะนำ

### 3.1 Generic API envelope

```csharp
public class QmodApiResponse<T>
{
    [JsonProperty("code")]
    public string Code { get; set; } = string.Empty;

    [JsonProperty("message")]
    public string Message { get; set; } = string.Empty;

    [JsonProperty("data")]
    public T? Data { get; set; }

    [JsonProperty("details")]
    public List<QmodApiErrorDetail> Details { get; set; } = new();

    [JsonProperty("timestamp")]
    public DateTimeOffset? Timestamp { get; set; }

    [JsonProperty("traceId")]
    public string? TraceId { get; set; }
}

public class QmodApiErrorDetail
{
    [JsonProperty("field")]
    public string? Field { get; set; }

    [JsonProperty("message")]
    public string Message { get; set; } = string.Empty;
}
```

### 3.2 Campaign response data

```csharp
public class QmodCampaignResponseData
{
    [JsonProperty("campaignId")]
    public Guid CampaignId { get; set; }

    [JsonProperty("companies")]
    public List<QmodCompanyItem> Companies { get; set; } = new();

    [JsonProperty("campaignName")]
    public string CampaignName { get; set; } = string.Empty;

    [JsonProperty("description")]
    public string Description { get; set; } = string.Empty;

    [JsonProperty("effectiveSchedule")]
    public QmodEffectiveScheduleResponse? EffectiveSchedule { get; set; }

    [JsonProperty("total")]
    public int Total { get; set; }
}

public class QmodEffectiveScheduleResponse
{
    [JsonProperty("effectiveDate")]
    public string? EffectiveDate { get; set; }

    [JsonProperty("expiryDate")]
    public string? ExpiryDate { get; set; }
}
```

### 3.3 Company Codes response data

```csharp
public class QmodCompanyCodesResponseData
{
    [JsonProperty("campaignId")]
    public Guid CampaignId { get; set; }

    [JsonProperty("companies")]
    public List<QmodCompanyItem> Companies { get; set; } = new();
}

public class QmodCompanyItem
{
    [JsonProperty("id")]
    public Guid Id { get; set; }

    [JsonProperty("partnerCompanyCode")]
    public string PartnerCompanyCode { get; set; } = string.Empty;

    [JsonProperty("companyName")]
    public string CompanyName { get; set; } = string.Empty;
}
```

### 3.4 Result ของแต่ละ step

```csharp
public class QmodStepResult<T>
{
    public string StepName { get; set; } = string.Empty;
    public string Endpoint { get; set; } = string.Empty;
    public int HttpStatusCode { get; set; }
    public bool IsSuccess { get; set; }
    public string Code { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public T? Data { get; set; }
    public List<QmodApiErrorDetail> Details { get; set; } = new();
    public DateTimeOffset Timestamp { get; set; }
    public string? TraceId { get; set; }
    public string RawResponse { get; set; } = string.Empty;
}
```

### 3.5 Result รวมของ PublishQmodProcess

```csharp
public class QmodPublishResult
{
    public string Campaign { get; set; } = string.Empty;
    public long TransactionId { get; set; }
    public string Code { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public bool IsSuccess { get; set; }

    public QmodStepResult<QmodCampaignResponseData>? CampaignResult { get; set; }

    public QmodStepResult<QmodCompanyCodesResponseData>? CompanyCodesResult { get; set; }
}
```

---

## 4. HTTP Result Model สำหรับ ApiGeneral

เพื่อรองรับ HTTP status 200, 201, 400, 401, 404, 409 และ 500 ตัวเรียก API ต้องส่งกลับทั้ง status code และ response body

```csharp
public class ApiHttpResult
{
    public int StatusCode { get; set; }
    public string Content { get; set; } = string.Empty;
}
```

แนะนำให้ `ApiGeneral` มี method รูปแบบนี้

```csharp
public async Task<ApiHttpResult> PutWithStatusAsync(
    string url,
    string requestJson,
    CancellationToken cancellationToken = default)
{
    using var content = new StringContent(
        requestJson,
        Encoding.UTF8,
        "application/json");

    using var response = await _httpClient.PutAsync(
        url,
        content,
        cancellationToken);

    var responseContent = await response.Content.ReadAsStringAsync();

    return new ApiHttpResult
    {
        StatusCode = (int)response.StatusCode,
        Content = responseContent
    };
}
```

> หาก `ApiGeneral` ปัจจุบัน throw exception เมื่อเจอ 4xx/5xx ต้องปรับไม่ให้ throw ก่อนอ่าน response body มิฉะนั้นจะสูญเสีย `code`, `details`, `timestamp` และ `traceId` จาก QMOD API

---

## 5. Helper สำหรับแปลง response

```csharp
private static QmodStepResult<T> BuildQmodStepResult<T>(
    string stepName,
    string endpoint,
    ApiHttpResult httpResult)
{
    var isHttpSuccess = httpResult.StatusCode >= 200 &&
                        httpResult.StatusCode <= 299;

    try
    {
        var response = JsonConvert.DeserializeObject<QmodApiResponse<T>>(
            httpResult.Content);

        if (response == null)
        {
            return new QmodStepResult<T>
            {
                StepName = stepName,
                Endpoint = endpoint,
                HttpStatusCode = httpResult.StatusCode,
                IsSuccess = false,
                Code = "INVALID_RESPONSE",
                Message = "QMOD API returned an empty or invalid response.",
                Timestamp = DateTimeOffset.Now,
                RawResponse = httpResult.Content
            };
        }

        return new QmodStepResult<T>
        {
            StepName = stepName,
            Endpoint = endpoint,
            HttpStatusCode = httpResult.StatusCode,
            IsSuccess = isHttpSuccess && response.Data != null,
            Code = response.Code,
            Message = response.Message,
            Data = response.Data,
            Details = response.Details ?? new List<QmodApiErrorDetail>(),
            Timestamp = response.Timestamp ?? DateTimeOffset.Now,
            TraceId = response.TraceId,
            RawResponse = httpResult.Content
        };
    }
    catch (JsonException ex)
    {
        return new QmodStepResult<T>
        {
            StepName = stepName,
            Endpoint = endpoint,
            HttpStatusCode = httpResult.StatusCode,
            IsSuccess = false,
            Code = "DESERIALIZE_ERROR",
            Message = ex.Message,
            Timestamp = DateTimeOffset.Now,
            RawResponse = httpResult.Content,
            Details = new List<QmodApiErrorDetail>
            {
                new()
                {
                    Message = ex.Message
                }
            }
        };
    }
}
```

### หมายเหตุเกี่ยวกับ `Data == null`

สำหรับ success response ตาม specification ที่ให้มา ทั้ง Campaign และ Company Codes มี `data` ดังนั้นกำหนดให้ success ต่อเมื่อ

1. HTTP status อยู่ในช่วง 200-299
2. Deserialize สำเร็จ
3. `Data` ไม่เป็น null

ถ้าในอนาคต QMOD มี success response แบบไม่มี `data` ให้ปรับเงื่อนไขเฉพาะ endpoint นั้น

---

## 6. SendQmodCampaignAsync ฉบับแก้ไข

```csharp
private async Task<QmodStepResult<QmodCampaignResponseData>>
    SendQmodCampaignAsync(
        ApiGeneral api,
        string url,
        QmodRequestPayload request,
        long transactionID,
        CancellationToken cancellationToken = default)
{
    var requestJson = JsonConvert.SerializeObject(request);

    try
    {
        var httpResult = await api.PutWithStatusAsync(
            url,
            requestJson,
            cancellationToken);

        return BuildQmodStepResult<QmodCampaignResponseData>(
            "QmodCampaign",
            url,
            httpResult);
    }
    catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
    {
        return new QmodStepResult<QmodCampaignResponseData>
        {
            StepName = "QmodCampaign",
            Endpoint = url,
            HttpStatusCode = 499,
            IsSuccess = false,
            Code = "CANCELLED",
            Message = "QMOD Campaign request was cancelled.",
            Timestamp = DateTimeOffset.Now
        };
    }
    catch (Exception ex)
    {
        _logEventService.LogError(
            ex,
            "QMOD Campaign failed. TransactionId: {TransactionId}, Endpoint: {Endpoint}",
            transactionID,
            url);

        return CreateExceptionStepResult<QmodCampaignResponseData>(
            "QmodCampaign",
            url,
            ex);
    }
}
```

---

## 7. SendQmodCompanyAsync ฉบับแก้ไข

```csharp
private async Task<QmodStepResult<QmodCompanyCodesResponseData>>
    SendQmodCompanyAsync(
        ApiGeneral api,
        string url,
        QmodCompanyPayload request,
        long transactionID,
        CancellationToken cancellationToken = default)
{
    var requestJson = JsonConvert.SerializeObject(request);

    try
    {
        var httpResult = await api.PutWithStatusAsync(
            url,
            requestJson,
            cancellationToken);

        return BuildQmodStepResult<QmodCompanyCodesResponseData>(
            "QmodCompany",
            url,
            httpResult);
    }
    catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
    {
        return new QmodStepResult<QmodCompanyCodesResponseData>
        {
            StepName = "QmodCompany",
            Endpoint = url,
            HttpStatusCode = 499,
            IsSuccess = false,
            Code = "CANCELLED",
            Message = "QMOD Company Codes request was cancelled.",
            Timestamp = DateTimeOffset.Now
        };
    }
    catch (Exception ex)
    {
        _logEventService.LogError(
            ex,
            "QMOD Company failed. TransactionId: {TransactionId}, Endpoint: {Endpoint}",
            transactionID,
            url);

        return CreateExceptionStepResult<QmodCompanyCodesResponseData>(
            "QmodCompany",
            url,
            ex);
    }
}
```

### Exception helper

```csharp
private static QmodStepResult<T> CreateExceptionStepResult<T>(
    string stepName,
    string endpoint,
    Exception ex)
{
    return new QmodStepResult<T>
    {
        StepName = stepName,
        Endpoint = endpoint,
        HttpStatusCode = 500,
        IsSuccess = false,
        Code = "EXCEPTION",
        Message = ex.Message,
        Timestamp = DateTimeOffset.Now,
        RawResponse = ex.ToString(),
        Details = new List<QmodApiErrorDetail>
        {
            new()
            {
                Message = ex.Message
            }
        }
    };
}
```

---

## 8. PublishQmodProcess ฉบับสมบูรณ์

```csharp
private async Task<QmodPublishResult> PublishQmodProcess(
    long campaignKeyID,
    List<QmodMappingItems> qmoditems,
    Campaign campaign,
    long transactionID,
    CancellationToken cancellationToken = default)
{
    var configQmod = _configApp.PublishCampaign;
    var campaignUuid = campaign.PremiumReference;

    var result = new QmodPublishResult
    {
        Campaign = campaignKeyID.ToString(),
        TransactionId = transactionID,
        Code = "PROCESSING",
        Message = "QMOD process is running.",
        IsSuccess = false
    };

    var campaignPayload = new QmodRequestPayload
    {
        campaignName = campaign.CampaignName,
        description = campaign.Description,
        effectiveSchedule = new EffectiveScheduleItem
        {
            EffectiveDate = campaign.EffectivePeriod?.ToString("yyyy-MM-dd"),
            ExpiryDate = campaign.ExpiredPeriod?.ToString("yyyy-MM-dd")
        },
        items = qmoditems?.ToList() ?? new List<QmodMappingItems>()
    };

    var companyPayload = new QmodCompanyPayload
    {
        companyCodes = new List<string>
        {
            campaign.Company
        }
    };

    var baseUrl = configQmod.Qmod.Method?.TrimEnd('/')
        ?? throw new InvalidOperationException("QMOD base URL is not configured.");

    var path = configQmod.Qmod.Endpoint?.Trim('/')
        ?? throw new InvalidOperationException("QMOD endpoint is not configured.");

    var url = $"{baseUrl}/{path}/{campaignUuid}";
    var urlCompany = $"{url}/company-codes";

    var headers = new List<ApiHeader>
    {
        new()
        {
            Key = "Ocp-Apim-Subscription-Key",
            Value = configQmod.Qmod.OCPKey
        }
    };

    try
    {
        using var api = new ApiGeneral(baseUrl, headers);

        _logEventService.LogInformation(
            "Starting QMOD process. CampaignKeyID: {CampaignKeyID}, " +
            "TransactionId: {TransactionId}, CampaignUuid: {CampaignUuid}",
            campaignKeyID,
            transactionID,
            campaignUuid);

        // STEP 1: Create or update Campaign
        result.CampaignResult = await SendQmodCampaignAsync(
            api,
            url,
            campaignPayload,
            transactionID,
            cancellationToken);

        if (!result.CampaignResult.IsSuccess)
        {
            result.Code = result.CampaignResult.Code;
            result.Message =
                $"QMOD Campaign failed: {result.CampaignResult.Message}";
            result.IsSuccess = false;

            _logEventService.LogWarning(
                "QMOD Campaign failed. TransactionId: {TransactionId}, " +
                "HttpStatusCode: {HttpStatusCode}, Code: {Code}, TraceId: {TraceId}",
                transactionID,
                result.CampaignResult.HttpStatusCode,
                result.CampaignResult.Code,
                result.CampaignResult.TraceId);

            return result;
        }

        // STEP 2: Replace Company Codes
        result.CompanyCodesResult = await SendQmodCompanyAsync(
            api,
            urlCompany,
            companyPayload,
            transactionID,
            cancellationToken);

        if (!result.CompanyCodesResult.IsSuccess)
        {
            result.Code = result.CompanyCodesResult.Code;
            result.Message =
                $"QMOD Company Codes failed: {result.CompanyCodesResult.Message}";
            result.IsSuccess = false;

            _logEventService.LogWarning(
                "QMOD Company failed. TransactionId: {TransactionId}, " +
                "HttpStatusCode: {HttpStatusCode}, Code: {Code}, TraceId: {TraceId}",
                transactionID,
                result.CompanyCodesResult.HttpStatusCode,
                result.CompanyCodesResult.Code,
                result.CompanyCodesResult.TraceId);

            return result;
        }

        result.Code = "SUCCESS";
        result.Message = "QMOD process completed successfully.";
        result.IsSuccess = true;

        _logEventService.LogInformation(
            "QMOD process completed. CampaignKeyID: {CampaignKeyID}, " +
            "TransactionId: {TransactionId}",
            campaignKeyID,
            transactionID);

        return result;
    }
    catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
    {
        result.Code = "CANCELLED";
        result.Message = "QMOD process was cancelled.";
        result.IsSuccess = false;
        return result;
    }
    catch (Exception ex)
    {
        _logEventService.LogError(
            ex,
            "Unexpected QMOD process error. CampaignKeyID: {CampaignKeyID}, " +
            "TransactionId: {TransactionId}",
            campaignKeyID,
            transactionID);

        result.Code = "ERROR";
        result.Message = ex.Message;
        result.IsSuccess = false;
        return result;
    }
}
```

---

## 9. ตัวอย่างผลลัพธ์รวมเมื่อสำเร็จ

เมื่อ Campaign API และ Company Codes API สำเร็จ `PublishQmodProcess` จะคืน object เดียวในรูปแบบประมาณนี้

```json
{
  "campaign": "12345",
  "transactionId": 98765,
  "code": "SUCCESS",
  "message": "QMOD process completed successfully.",
  "isSuccess": true,
  "campaignResult": {
    "stepName": "QmodCampaign",
    "endpoint": "https://example/campaign/a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "httpStatusCode": 201,
    "isSuccess": true,
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
    },
    "details": [],
    "timestamp": "2026-08-28T13:00:00+07:00",
    "traceId": null,
    "rawResponse": "..."
  },
  "companyCodesResult": {
    "stepName": "QmodCompany",
    "endpoint": "https://example/campaign/a1b2c3d4-e5f6-7890-abcd-ef1234567890/company-codes",
    "httpStatusCode": 200,
    "isSuccess": true,
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
    },
    "details": [],
    "timestamp": "2026-08-28T13:00:01+07:00",
    "traceId": null,
    "rawResponse": "..."
  }
}
```

---

## 10. พฤติกรรมเมื่อแต่ละ Step ล้มเหลว

### Campaign ล้มเหลว

- `CampaignResult` มีรายละเอียด error
- `CompanyCodesResult` เป็น `null` เพราะไม่ควรส่ง Company Codes หาก Campaign ยังไม่สำเร็จ
- `QmodPublishResult.IsSuccess` เป็น `false`
- `Code` และ `Message` ระดับบนมาจาก Campaign result

### Campaign สำเร็จ แต่ Company Codes ล้มเหลว

- `CampaignResult` มีผล success
- `CompanyCodesResult` มีรายละเอียด error
- `QmodPublishResult.IsSuccess` เป็น `false`
- `Code` และ `Message` ระดับบนมาจาก Company Codes result

### ทั้งสอง Step สำเร็จ

- `CampaignResult` และ `CompanyCodesResult` มีข้อมูลครบ
- `QmodPublishResult.Code` เป็น `SUCCESS`
- `QmodPublishResult.IsSuccess` เป็น `true`

---

## 11. จุดสำคัญในการนำไปใช้

1. เปลี่ยน property ใน `QmodPublishResult` จาก `Task<T>` เป็น `QmodStepResult<T>`
2. เปลี่ยน Send methods ให้คืน `Task<QmodStepResult<T>>`
3. ใช้ `await` ทุกครั้งแทน `.Result`
4. ให้ `ApiGeneral` ส่งกลับทั้ง HTTP status และ response body
5. รองรับ Campaign success ทั้ง HTTP 200 และ 201
6. อย่าคืน `null` จาก catch ให้คืน failed result ที่มี error detail
7. Company API จะทำงานต่อเมื่อ Campaign API สำเร็จเท่านั้น
8. `PublishQmodProcess` จะคืน object เดียวที่รวมผลทั้งสอง step
9. ควรหลีกเลี่ยงการส่ง `RawResponse` และ endpoint ที่มีข้อมูลสำคัญออกสู่ public API โดยตรง หาก object นี้ใช้ภายในระบบหรือเก็บ log สามารถเก็บไว้ได้
10. ไม่ควรบันทึก `Ocp-Apim-Subscription-Key` ลง log

---

## 12. ข้อเสนอแนะเพิ่มเติมสำหรับ Production

- ใช้ `IHttpClientFactory` แทนการสร้าง HTTP client ใหม่ในแต่ละ process หาก `ApiGeneral` ครอบ `HttpClient`
- กำหนด timeout ที่ชัดเจน
- Retry เฉพาะ transient error เช่น HTTP 408, 429, 502, 503 และ 504
- ไม่ควร retry HTTP 400, 401, 404 หรือ 409 โดยอัตโนมัติ
- ส่ง `CancellationToken` ลงไปทุก async method
- ใช้ structured logging ด้วย `TransactionId`, `CampaignKeyID`, HTTP status และ QMOD `traceId`
- หากต้องเก็บ request/response JSON ลงฐานข้อมูล ให้รวบรวมหลังจบ process แล้ว update log เพียงครั้งเดียวตามแนวทางลด database round trip
