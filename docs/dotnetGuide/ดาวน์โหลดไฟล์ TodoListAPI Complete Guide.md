# คู่มือการสร้าง TodoListAPI

## ASP.NET Core Web API, .NET 8, Entity Framework Core และ SQL Server

**ประเภทเอกสาร:** คู่มือการพัฒนาและเอกสารประกอบการอบรม  
**กลุ่มเป้าหมาย:** Developer ระดับเริ่มต้น, QA, UAT และผู้ที่ต้องการเรียนรู้ Web API  
**เวอร์ชัน:** 1.0  
**วันที่จัดทำ:** 5 สิงหาคม 2026

---

## สารบัญ

1. [วัตถุประสงค์](#1-วัตถุประสงค์)
2. [ขอบเขตของระบบ](#2-ขอบเขตของระบบ)
3. [เทคโนโลยีที่ใช้](#3-เทคโนโลยีที่ใช้)
4. [API Endpoint](#4-api-endpoint)
5. [การเตรียม Software](#5-การเตรียม-software)
6. [การสร้าง Database](#6-การสร้าง-database)
7. [การสร้าง Visual Studio Project](#7-การสร้าง-visual-studio-project)
8. [การติดตั้ง NuGet Packages](#8-การติดตั้ง-nuget-packages)
9. [โครงสร้าง Project](#9-โครงสร้าง-project)
10. [การสร้าง Model](#10-การสร้าง-model)
11. [การสร้าง DTO](#11-การสร้าง-dto)
12. [การสร้าง DbContext](#12-การสร้าง-dbcontext)
13. [การกำหนด Connection String](#13-การกำหนด-connection-string)
14. [การตั้งค่า Program.cs](#14-การตั้งค่า-programcs)
15. [การสร้าง Migration](#15-การสร้าง-migration)
16. [การสร้าง TodosController](#16-การสร้าง-todoscontroller)
17. [การ Run Project](#17-การ-run-project)
18. [การทดสอบด้วย Swagger](#18-การทดสอบด้วย-swagger)
19. [การทดสอบด้วย Postman](#19-การทดสอบด้วย-postman)
20. [การตรวจสอบข้อมูลใน SQL Server](#20-การตรวจสอบข้อมูลใน-sql-server)
21. [การ Debug Program](#21-การ-debug-program)
22. [HTTP Status Code](#22-http-status-code)
23. [ข้อผิดพลาดที่พบบ่อย](#23-ข้อผิดพลาดที่พบบ่อย)
24. [Workshop](#24-workshop)
25. [Test Checklist](#25-test-checklist)
26. [สรุป Flow การทำงาน](#26-สรุป-flow-การทำงาน)
27. [แนวทางต่อยอด](#27-แนวทางต่อยอด)
28. [สรุปผลการเรียนรู้](#28-สรุปผลการเรียนรู้)

---

# 1. วัตถุประสงค์

คู่มือนี้จัดทำขึ้นเพื่ออธิบายขั้นตอนการสร้าง TodoListAPI ตั้งแต่เริ่มต้นจนสามารถทดสอบการทำงานได้ โดยผู้เรียนจะสามารถ:

- สร้างฐานข้อมูล SQL Server
- สร้าง ASP.NET Core Web API Project
- เชื่อมต่อ Web API กับ SQL Server
- ใช้งาน Entity Framework Core
- สร้าง Database Migration
- พัฒนา REST API แบบ CRUD
- แยก Entity และ DTO
- Run และ Debug โปรแกรมด้วย Visual Studio
- ทดสอบ API ด้วย Swagger และ Postman
- ตรวจสอบข้อมูลผ่าน SQL Server Management Studio
- วิเคราะห์และแก้ไขข้อผิดพลาดเบื้องต้น

---

# 2. ขอบเขตของระบบ

TodoListAPI เป็นระบบตัวอย่างสำหรับจัดการรายการงาน โดยรองรับความสามารถดังนี้:

- เพิ่มรายการ Todo
- อ่านรายการ Todo ทั้งหมด
- อ่านรายการ Todo ตาม ID
- แก้ไขรายละเอียด Todo
- เปลี่ยนสถานะ Todo
- ลบ Todo
- บันทึกข้อมูลลง SQL Server

ข้อมูลของ Todo ประกอบด้วย:

| Field | Data Type | รายละเอียด |
|---|---|---|
| Id | int | Primary Key ของรายการ |
| Title | string | ชื่องาน |
| Description | string | รายละเอียดงาน |
| IsCompleted | bool | สถานะว่างานเสร็จแล้วหรือไม่ |
| DueDate | DateTime | วันครบกำหนด |
| CreatedDate | DateTime | วันที่สร้างข้อมูล |
| UpdatedDate | DateTime | วันที่แก้ไขล่าสุด |

---

# 3. เทคโนโลยีที่ใช้

- Visual Studio 2022
- ASP.NET Core Web API
- .NET 8
- C#
- Entity Framework Core 8
- SQL Server
- SQL Server Management Studio หรือ SSMS
- Swagger / OpenAPI
- Postman

---

# 4. API Endpoint

| Method | Endpoint | รายละเอียด | Success Status |
|---|---|---|---|
| GET | `/api/todos` | อ่าน Todo ทั้งหมด | 200 OK |
| GET | `/api/todos/{id}` | อ่าน Todo ตาม ID | 200 OK |
| POST | `/api/todos` | เพิ่ม Todo ใหม่ | 201 Created |
| PUT | `/api/todos/{id}` | แก้ไข Todo | 200 OK |
| PATCH | `/api/todos/{id}/status` | เปลี่ยนสถานะ Todo | 200 OK |
| DELETE | `/api/todos/{id}` | ลบ Todo | 204 No Content |

---

# 5. การเตรียม Software

## 5.1 Visual Studio 2022

เปิด Visual Studio Installer และติดตั้ง Workload:

```text
ASP.NET and web development
```

## 5.2 .NET 8 SDK

ตรวจสอบเวอร์ชันด้วย Command Prompt หรือ Terminal:

```bash
dotnet --version
```

ตัวอย่างผลลัพธ์:

```text
8.0.xxx
```

## 5.3 SQL Server

สามารถเลือกใช้:

- SQL Server Developer
- SQL Server Express
- SQL Server LocalDB

## 5.4 SQL Server Management Studio

ใช้สำหรับสร้าง Database, Query ข้อมูล และตรวจสอบผลการบันทึกจาก API

## 5.5 Postman

ใช้สำหรับส่ง HTTP Request และตรวจสอบ HTTP Response ของ API

---

# 6. การสร้าง Database

## 6.1 เชื่อมต่อ SQL Server

เปิด SQL Server Management Studio และกำหนดค่า:

```text
Server Type    : Database Engine
Server Name    : localhost
Authentication : Windows Authentication
```

หากใช้ LocalDB:

```text
(localdb)\MSSQLLocalDB
```

## 6.2 สร้าง Database

เปิด New Query แล้วรัน:

```sql
CREATE DATABASE TodoListDB;
GO

USE TodoListDB;
GO
```

ในคู่มือนี้จะสร้าง Database เปล่าไว้ก่อน จากนั้นใช้ Entity Framework Core Migration สร้างตาราง `TodoItems`

---

# 7. การสร้าง Visual Studio Project

## 7.1 สร้าง Project

เปิด Visual Studio แล้วเลือก:

```text
Create a new project
```

ค้นหาและเลือก Template:

```text
ASP.NET Core Web API
```

## 7.2 กำหนดชื่อ Project

```text
Project Name  : TodoListAPI
Solution Name : TodoListAPI
Location      : D:\Training\TodoListAPI
```

## 7.3 กำหนด Project Options

```text
Framework              : .NET 8.0
Authentication Type    : None
Configure for HTTPS    : Checked
Enable OpenAPI Support : Checked
Use Controllers        : Checked
```

## 7.4 ทดสอบ Build

เลือกเมนู:

```text
Build > Build Solution
```

หรือกด:

```text
Ctrl + Shift + B
```

ผลลัพธ์ที่คาดหวัง:

```text
Build succeeded.
```

## 7.5 ลบไฟล์ตัวอย่าง

หาก Project มีไฟล์ต่อไปนี้ ให้ลบออก:

```text
WeatherForecast.cs
Controllers/WeatherForecastController.cs
```

---

# 8. การติดตั้ง NuGet Packages

เปิดเมนู:

```text
Tools
> NuGet Package Manager
> Package Manager Console
```

ติดตั้ง Package:

```powershell
Install-Package Microsoft.EntityFrameworkCore.SqlServer -Version 8.0.0
Install-Package Microsoft.EntityFrameworkCore.Tools -Version 8.0.0
Install-Package Microsoft.EntityFrameworkCore.Design -Version 8.0.0
```

> ควรใช้ Microsoft.EntityFrameworkCore ทุก Package เป็นเวอร์ชันเดียวกัน

---

# 9. โครงสร้าง Project

สร้าง Folder และ File ดังนี้:

```text
TodoListAPI
│
├── Controllers
│   └── TodosController.cs
│
├── Data
│   └── TodoDbContext.cs
│
├── DTOs
│   ├── CreateTodoRequest.cs
│   ├── UpdateTodoRequest.cs
│   └── UpdateTodoStatusRequest.cs
│
├── Models
│   └── TodoItem.cs
│
├── Migrations
│
├── Properties
│   └── launchSettings.json
│
├── appsettings.json
├── Program.cs
└── TodoListAPI.csproj
```

## หน้าที่ของแต่ละส่วน

### Controllers

รับ HTTP Request, เรียกการทำงานที่เกี่ยวข้อง และส่ง HTTP Response กลับไปยัง Client

### Data

เก็บ `DbContext` สำหรับเชื่อมต่อและดำเนินการกับฐานข้อมูล

### DTOs

เก็บรูปแบบข้อมูล Request ที่รับจาก Client เพื่อไม่ให้ Client ติดต่อกับ Database Entity โดยตรง

### Models

เก็บ Entity ซึ่งใช้ Mapping กับ Table ใน SQL Server

### Migrations

เก็บประวัติการเปลี่ยนแปลง Database Schema ที่สร้างโดย Entity Framework Core

---

# 10. การสร้าง Model

สร้างไฟล์:

```text
Models/TodoItem.cs
```

```csharp
using System.ComponentModel.DataAnnotations;

namespace TodoListAPI.Models;

public class TodoItem
{
    public int Id { get; set; }

    [Required]
    [MaxLength(200)]
    public string Title { get; set; } = string.Empty;

    [MaxLength(1000)]
    public string? Description { get; set; }

    public bool IsCompleted { get; set; }

    public DateTime? DueDate { get; set; }

    public DateTime CreatedDate { get; set; } = DateTime.UtcNow;

    public DateTime? UpdatedDate { get; set; }
}
```

---

# 11. การสร้าง DTO

## 11.1 CreateTodoRequest

สร้างไฟล์:

```text
DTOs/CreateTodoRequest.cs
```

```csharp
using System.ComponentModel.DataAnnotations;

namespace TodoListAPI.DTOs;

public class CreateTodoRequest
{
    [Required(ErrorMessage = "กรุณาระบุชื่อ Todo")]
    [MaxLength(200)]
    public string Title { get; set; } = string.Empty;

    [MaxLength(1000)]
    public string? Description { get; set; }

    public DateTime? DueDate { get; set; }
}
```

## 11.2 UpdateTodoRequest

สร้างไฟล์:

```text
DTOs/UpdateTodoRequest.cs
```

```csharp
using System.ComponentModel.DataAnnotations;

namespace TodoListAPI.DTOs;

public class UpdateTodoRequest
{
    [Required(ErrorMessage = "กรุณาระบุชื่อ Todo")]
    [MaxLength(200)]
    public string Title { get; set; } = string.Empty;

    [MaxLength(1000)]
    public string? Description { get; set; }

    public bool IsCompleted { get; set; }

    public DateTime? DueDate { get; set; }
}
```

## 11.3 UpdateTodoStatusRequest

สร้างไฟล์:

```text
DTOs/UpdateTodoStatusRequest.cs
```

```csharp
namespace TodoListAPI.DTOs;

public class UpdateTodoStatusRequest
{
    public bool IsCompleted { get; set; }
}
```

---

# 12. การสร้าง DbContext

สร้างไฟล์:

```text
Data/TodoDbContext.cs
```

```csharp
using Microsoft.EntityFrameworkCore;
using TodoListAPI.Models;

namespace TodoListAPI.Data;

public class TodoDbContext : DbContext
{
    public TodoDbContext(DbContextOptions<TodoDbContext> options)
        : base(options)
    {
    }

    public DbSet<TodoItem> TodoItems => Set<TodoItem>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<TodoItem>(entity =>
        {
            entity.ToTable("TodoItems");
            entity.HasKey(todo => todo.Id);

            entity.Property(todo => todo.Title)
                .IsRequired()
                .HasMaxLength(200);

            entity.Property(todo => todo.Description)
                .HasMaxLength(1000);

            entity.Property(todo => todo.IsCompleted)
                .HasDefaultValue(false);

            entity.Property(todo => todo.CreatedDate)
                .HasDefaultValueSql("GETUTCDATE()");
        });
    }
}
```

---

# 13. การกำหนด Connection String

เปิดไฟล์:

```text
appsettings.json
```

## 13.1 Windows Authentication

```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Server=localhost;Database=TodoListDB;Trusted_Connection=True;TrustServerCertificate=True;"
  },
  "Logging": {
    "LogLevel": {
      "Default": "Information",
      "Microsoft.AspNetCore": "Warning"
    }
  },
  "AllowedHosts": "*"
}
```

## 13.2 LocalDB

```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Server=(localdb)\\MSSQLLocalDB;Database=TodoListDB;Trusted_Connection=True;TrustServerCertificate=True;"
  }
}
```

## 13.3 SQL Server Authentication

```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Server=localhost;Database=TodoListDB;User Id=todo_user;Password=YourPassword;TrustServerCertificate=True;"
  }
}
```

> ห้ามเก็บ Password จริงไว้ใน Source Control สำหรับ Production ควรใช้ Secret Manager, Environment Variable หรือ Secret Management Service

---

# 14. การตั้งค่า Program.cs

เปิดไฟล์:

```text
Program.cs
```

```csharp
using Microsoft.EntityFrameworkCore;
using TodoListAPI.Data;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var connectionString = builder.Configuration
    .GetConnectionString("DefaultConnection")
    ?? throw new InvalidOperationException(
        "ไม่พบ Connection String: DefaultConnection");

builder.Services.AddDbContext<TodoDbContext>(options =>
    options.UseSqlServer(connectionString));

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();
app.UseAuthorization();
app.MapControllers();

app.Run();
```

---

# 15. การสร้าง Migration

เปิด Package Manager Console และตรวจสอบว่า Default Project เป็น `TodoListAPI`

## 15.1 สร้าง Migration

```powershell
Add-Migration InitialCreate
```

## 15.2 อัปเดต Database

```powershell
Update-Database
```

คำสั่งจะสร้าง Folder `Migrations` และสร้าง Table `TodoItems` ใน `TodoListDB`

## 15.3 ตรวจสอบ Table

```sql
USE TodoListDB;
GO

SELECT *
FROM TodoItems;
```

---

# 16. การสร้าง TodosController

สร้างไฟล์:

```text
Controllers/TodosController.cs
```

```csharp
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TodoListAPI.Data;
using TodoListAPI.DTOs;
using TodoListAPI.Models;

namespace TodoListAPI.Controllers;

[ApiController]
[Route("api/todos")]
public class TodosController : ControllerBase
{
    private readonly TodoDbContext _dbContext;
    private readonly ILogger<TodosController> _logger;

    public TodosController(
        TodoDbContext dbContext,
        ILogger<TodosController> logger)
    {
        _dbContext = dbContext;
        _logger = logger;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<TodoItem>>> GetTodos(
        CancellationToken cancellationToken)
    {
        var todos = await _dbContext.TodoItems
            .AsNoTracking()
            .OrderBy(todo => todo.IsCompleted)
            .ThenBy(todo => todo.DueDate)
            .ThenByDescending(todo => todo.CreatedDate)
            .ToListAsync(cancellationToken);

        return Ok(todos);
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<TodoItem>> GetTodoById(
        int id,
        CancellationToken cancellationToken)
    {
        var todo = await _dbContext.TodoItems
            .AsNoTracking()
            .FirstOrDefaultAsync(
                item => item.Id == id,
                cancellationToken);

        if (todo is null)
        {
            return NotFound(new
            {
                message = $"ไม่พบ Todo ID {id}"
            });
        }

        return Ok(todo);
    }

    [HttpPost]
    public async Task<ActionResult<TodoItem>> CreateTodo(
        [FromBody] CreateTodoRequest request,
        CancellationToken cancellationToken)
    {
        var todo = new TodoItem
        {
            Title = request.Title.Trim(),
            Description = request.Description?.Trim(),
            DueDate = request.DueDate,
            IsCompleted = false,
            CreatedDate = DateTime.UtcNow
        };

        _dbContext.TodoItems.Add(todo);
        await _dbContext.SaveChangesAsync(cancellationToken);

        _logger.LogInformation(
            "Created Todo ID {TodoId}",
            todo.Id);

        return CreatedAtAction(
            nameof(GetTodoById),
            new { id = todo.Id },
            todo);
    }

    [HttpPut("{id:int}")]
    public async Task<ActionResult<TodoItem>> UpdateTodo(
        int id,
        [FromBody] UpdateTodoRequest request,
        CancellationToken cancellationToken)
    {
        var todo = await _dbContext.TodoItems
            .FirstOrDefaultAsync(
                item => item.Id == id,
                cancellationToken);

        if (todo is null)
        {
            return NotFound(new
            {
                message = $"ไม่พบ Todo ID {id}"
            });
        }

        todo.Title = request.Title.Trim();
        todo.Description = request.Description?.Trim();
        todo.IsCompleted = request.IsCompleted;
        todo.DueDate = request.DueDate;
        todo.UpdatedDate = DateTime.UtcNow;

        await _dbContext.SaveChangesAsync(cancellationToken);

        _logger.LogInformation(
            "Updated Todo ID {TodoId}",
            todo.Id);

        return Ok(todo);
    }

    [HttpPatch("{id:int}/status")]
    public async Task<ActionResult<TodoItem>> UpdateTodoStatus(
        int id,
        [FromBody] UpdateTodoStatusRequest request,
        CancellationToken cancellationToken)
    {
        var todo = await _dbContext.TodoItems
            .FirstOrDefaultAsync(
                item => item.Id == id,
                cancellationToken);

        if (todo is null)
        {
            return NotFound(new
            {
                message = $"ไม่พบ Todo ID {id}"
            });
        }

        todo.IsCompleted = request.IsCompleted;
        todo.UpdatedDate = DateTime.UtcNow;

        await _dbContext.SaveChangesAsync(cancellationToken);

        return Ok(todo);
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> DeleteTodo(
        int id,
        CancellationToken cancellationToken)
    {
        var todo = await _dbContext.TodoItems
            .FirstOrDefaultAsync(
                item => item.Id == id,
                cancellationToken);

        if (todo is null)
        {
            return NotFound(new
            {
                message = $"ไม่พบ Todo ID {id}"
            });
        }

        _dbContext.TodoItems.Remove(todo);
        await _dbContext.SaveChangesAsync(cancellationToken);

        _logger.LogInformation(
            "Deleted Todo ID {TodoId}",
            todo.Id);

        return NoContent();
    }
}
```

---

# 17. การ Run Project

## 17.1 Build Project

```text
Ctrl + Shift + B
```

## 17.2 Run แบบ Debug

```text
F5
```

## 17.3 Run โดยไม่ Debug

```text
Ctrl + F5
```

ตัวอย่าง URL:

```text
https://localhost:7001
```

> หมายเลข Port จริงตรวจสอบได้จาก `Properties/launchSettings.json` หรือ Console ขณะ Run

---

# 18. การทดสอบด้วย Swagger

เปิด URL:

```text
https://localhost:7001/swagger
```

Swagger ควรแสดง Endpoint:

```text
GET     /api/todos
POST    /api/todos
GET     /api/todos/{id}
PUT     /api/todos/{id}
PATCH   /api/todos/{id}/status
DELETE  /api/todos/{id}
```

ขั้นตอนทดสอบ:

1. เลือก Endpoint
2. กด `Try it out`
3. กรอก Parameter หรือ Request Body
4. กด `Execute`
5. ตรวจสอบ Request URL, Response Body และ Response Code

---

# 19. การทดสอบด้วย Postman

กำหนด Base URL ตาม Port ที่ Application ใช้งาน ตัวอย่าง:

```text
https://localhost:7001
```

## 19.1 เพิ่ม Todo

```http
POST https://localhost:7001/api/todos
```

Header:

```text
Content-Type: application/json
```

Body:

```json
{
  "title": "เรียน ASP.NET Core Web API",
  "description": "สร้าง TodoListAPI และทดสอบด้วย Postman",
  "dueDate": "2026-08-10T17:00:00"
}
```

ผลลัพธ์ที่คาดหวัง:

```text
201 Created
```

## 19.2 อ่าน Todo ทั้งหมด

```http
GET https://localhost:7001/api/todos
```

ผลลัพธ์ที่คาดหวัง:

```text
200 OK
```

## 19.3 อ่าน Todo ตาม ID

```http
GET https://localhost:7001/api/todos/1
```

กรณีพบข้อมูล:

```text
200 OK
```

กรณีไม่พบข้อมูล:

```text
404 Not Found
```

## 19.4 แก้ไข Todo

```http
PUT https://localhost:7001/api/todos/1
```

Body:

```json
{
  "title": "เรียน ASP.NET Core Web API",
  "description": "สร้าง CRUD TodoListAPI สำเร็จ",
  "isCompleted": true,
  "dueDate": "2026-08-10T17:00:00"
}
```

ผลลัพธ์ที่คาดหวัง:

```text
200 OK
```

## 19.5 เปลี่ยนสถานะ Todo

```http
PATCH https://localhost:7001/api/todos/1/status
```

Body:

```json
{
  "isCompleted": true
}
```

ผลลัพธ์ที่คาดหวัง:

```text
200 OK
```

## 19.6 ลบ Todo

```http
DELETE https://localhost:7001/api/todos/1
```

ผลลัพธ์ที่คาดหวัง:

```text
204 No Content
```

---

# 20. การตรวจสอบข้อมูลใน SQL Server

## 20.1 อ่านข้อมูลทั้งหมด

```sql
USE TodoListDB;
GO

SELECT
    Id,
    Title,
    Description,
    IsCompleted,
    DueDate,
    CreatedDate,
    UpdatedDate
FROM TodoItems
ORDER BY Id DESC;
```

## 20.2 ตรวจสอบจำนวน Todo

```sql
SELECT COUNT(*) AS TotalTodo
FROM TodoItems;
```

## 20.3 ตรวจสอบงานที่ยังไม่เสร็จ

```sql
SELECT *
FROM TodoItems
WHERE IsCompleted = 0;
```

## 20.4 ตรวจสอบงานที่เสร็จแล้ว

```sql
SELECT *
FROM TodoItems
WHERE IsCompleted = 1;
```

---

# 21. การ Debug Program

## 21.1 สร้าง Breakpoint

เปิด `Controllers/TodosController.cs` แล้วคลิกด้านซ้ายของบรรทัดที่ต้องการตรวจสอบ หรือกด:

```text
F9
```

ตัวอย่างบรรทัด:

```csharp
var todo = new TodoItem
{
```

หรือ:

```csharp
await _dbContext.SaveChangesAsync(cancellationToken);
```

## 21.2 Run แบบ Debug

```text
F5
```

## 21.3 เรียก API

เรียก API ผ่าน Swagger หรือ Postman โปรแกรมจะหยุดที่ Breakpoint

## 21.4 ตรวจสอบ Variable

ตรวจสอบค่าตัวแปร:

```text
request.Title
request.Description
request.DueDate
todo
id
```

สามารถตรวจสอบผ่าน:

- DataTip
- Locals
- Autos
- Watch
- Immediate Window

## 21.5 ปุ่ม Debug ที่สำคัญ

| ปุ่ม | การทำงาน |
|---|---|
| F5 | Continue |
| F9 | เพิ่มหรือลบ Breakpoint |
| F10 | Step Over |
| F11 | Step Into |
| Shift + F11 | Step Out |
| Shift + F5 | หยุด Debug |

---

# 22. HTTP Status Code

| Status Code | ความหมาย | กรณีใช้งาน |
|---|---|---|
| 200 OK | ทำรายการสำเร็จ | อ่านหรือแก้ไขข้อมูลสำเร็จ |
| 201 Created | สร้างข้อมูลสำเร็จ | เพิ่ม Todo ใหม่ |
| 204 No Content | สำเร็จโดยไม่มี Response Body | ลบ Todo สำเร็จ |
| 400 Bad Request | Request ไม่ถูกต้อง | Validation ไม่ผ่าน |
| 404 Not Found | ไม่พบข้อมูล | ไม่พบ Todo ตาม ID |
| 500 Internal Server Error | Server เกิดข้อผิดพลาด | Program หรือ Database Error |

---

# 23. ข้อผิดพลาดที่พบบ่อย

## 23.1 Cannot open database

ตัวอย่าง:

```text
Cannot open database "TodoListDB" requested by the login
```

วิธีตรวจสอบ:

1. ตรวจสอบว่ามี Database `TodoListDB`
2. ตรวจสอบ Server Name ใน Connection String
3. ตรวจสอบสิทธิ์ของ User
4. ตรวจสอบ SQL Server Service
5. ทดลอง Connect ผ่าน SSMS

## 23.2 Login failed for user

กรณี Windows Authentication:

```text
Trusted_Connection=True
```

กรณี SQL Server Authentication:

```text
User Id=ชื่อผู้ใช้;Password=รหัสผ่าน;
```

ตรวจสอบว่า SQL Server เปิด Mixed Mode Authentication หากต้องการใช้ SQL Server Login

## 23.3 Certificate chain was not trusted

สำหรับ Development สามารถเพิ่ม:

```text
TrustServerCertificate=True
```

## 23.4 No database provider has been configured

ตรวจสอบ `Program.cs` ว่ามี:

```csharp
builder.Services.AddDbContext<TodoDbContext>(options =>
    options.UseSqlServer(connectionString));
```

และมี:

```csharp
using Microsoft.EntityFrameworkCore;
```

## 23.5 Invalid object name 'TodoItems'

สาเหตุหลักคือยังไม่ได้สร้าง Table ให้รัน:

```powershell
Add-Migration InitialCreate
Update-Database
```

หากมี Migration แล้วให้รัน:

```powershell
Update-Database
```

## 23.6 Failed to fetch ใน Swagger

ตรวจสอบ:

1. Application ยังทำงานอยู่หรือไม่
2. URL และ Port ถูกต้องหรือไม่
3. HTTPS Development Certificate มีปัญหาหรือไม่
4. ตรวจสอบ Console และ Output Window
5. ทดลองเรียก API ผ่าน Postman

## 23.7 Build Error หลังติดตั้ง EF Core

ตรวจสอบว่า Package ต่อไปนี้ใช้ Major Version เดียวกับ .NET และเป็นเวอร์ชันเดียวกัน:

```text
Microsoft.EntityFrameworkCore.SqlServer
Microsoft.EntityFrameworkCore.Tools
Microsoft.EntityFrameworkCore.Design
```

---

# 24. Workshop

## Workshop 1: สร้าง Project และ Database

1. สร้าง `TodoListDB`
2. สร้าง `TodoListAPI`
3. ติดตั้ง EF Core Packages
4. กำหนด Connection String
5. สร้าง Migration
6. ตรวจสอบ Table ผ่าน SSMS

## Workshop 2: เพิ่ม Todo

สร้าง Todo อย่างน้อยสามรายการ:

1. เรียน Web API
2. ทดสอบ API ด้วย Postman
3. ตรวจสอบข้อมูลใน SQL Server

## Workshop 3: อ่านข้อมูล

ทดสอบ:

```http
GET /api/todos
GET /api/todos/1
GET /api/todos/999
```

ตรวจสอบความแตกต่างระหว่าง:

```text
200 OK
404 Not Found
```

## Workshop 4: แก้ไขและเปลี่ยนสถานะ

เรียก `PUT` เพื่อแก้ไขรายละเอียด และเรียก `PATCH` เพื่อเปลี่ยนสถานะเป็น:

```json
{
  "isCompleted": true
}
```

จากนั้นตรวจสอบข้อมูลใน SQL Server

## Workshop 5: Debug

วาง Breakpoint ที่:

```csharp
await _dbContext.SaveChangesAsync(cancellationToken);
```

ตรวจสอบค่าก่อนบันทึกและหลังบันทึกข้อมูล

## Workshop 6: ลบข้อมูล

เรียก:

```http
DELETE /api/todos/1
```

จากนั้นเรียก:

```http
GET /api/todos/1
```

ผลลัพธ์ควรเป็น:

```text
404 Not Found
```

---

# 25. Test Checklist

## Project และ Database

- [ ] สร้าง ASP.NET Core Web API Project สำเร็จ
- [ ] Build Project ผ่าน
- [ ] เชื่อมต่อ SQL Server ได้
- [ ] สร้าง Database Migration ได้
- [ ] สร้าง Table `TodoItems` ได้

## API Function

- [ ] เพิ่ม Todo สำเร็จ
- [ ] ตรวจสอบ Required Field ได้
- [ ] อ่าน Todo ทั้งหมดได้
- [ ] อ่าน Todo ตาม ID ได้
- [ ] ไม่พบ ID แล้วคืนค่า 404
- [ ] แก้ไข Todo ได้
- [ ] เปลี่ยนสถานะ Todo ได้
- [ ] ลบ Todo ได้

## Testing และ Debug

- [ ] ทดสอบผ่าน Swagger ได้
- [ ] ทดสอบผ่าน Postman ได้
- [ ] ตรวจสอบข้อมูลผ่าน SQL Server ได้
- [ ] วาง Breakpoint ได้
- [ ] ตรวจสอบค่าตัวแปรระหว่าง Debug ได้
- [ ] ตรวจสอบ HTTP Status Code ได้

---

# 26. สรุป Flow การทำงาน

```text
Postman / Swagger
        |
        v
HTTP Request
        |
        v
TodosController
        |
        v
TodoDbContext
        |
        v
Entity Framework Core
        |
        v
SQL Server
        |
        v
TodoListDB.TodoItems
        |
        v
HTTP Response
```

## Flow การเพิ่ม Todo

```text
1. Client ส่ง POST /api/todos
2. ASP.NET Core รับ JSON Request
3. Model Validation ตรวจสอบ Request
4. Controller แปลง DTO เป็น TodoItem
5. DbContext เพิ่ม Entity
6. SaveChangesAsync บันทึกลง SQL Server
7. API ส่ง 201 Created พร้อมข้อมูลที่สร้าง
```

## Flow การอ่าน Todo

```text
1. Client ส่ง GET /api/todos หรือ GET /api/todos/{id}
2. Controller Query ผ่าน DbContext
3. Entity Framework Core สร้าง SQL Command
4. SQL Server ส่งข้อมูลกลับ
5. API แปลงข้อมูลเป็น JSON Response
6. Client ได้รับ 200 OK หรือ 404 Not Found
```

---

# 27. แนวทางต่อยอด

หลังจากสร้าง TodoListAPI ขั้นพื้นฐานสำเร็จ สามารถต่อยอดได้ดังนี้:

- แยก Service Layer ออกจาก Controller
- ใช้ Repository Pattern เมื่อมีความจำเป็น
- เพิ่ม Response DTO เพื่อไม่ส่ง Entity โดยตรง
- เพิ่ม Global Exception Handling
- เพิ่ม Problem Details ตามมาตรฐาน HTTP API
- เพิ่ม Pagination, Sorting และ Filtering
- เพิ่ม Search ตาม Title หรือ Description
- เพิ่ม Authentication ด้วย Microsoft Entra ID หรือ JWT
- เพิ่ม Authorization ตาม Role
- เพิ่ม Serilog หรือ Structured Logging
- เพิ่ม Unit Test และ Integration Test
- เพิ่ม Health Check
- เพิ่ม API Versioning
- เพิ่ม Docker
- เพิ่ม CI/CD Pipeline
- ย้าย Secret ไปยัง Environment Variable หรือ Secret Store
- สร้าง Angular หรือ React Frontend สำหรับเรียก TodoListAPI

---

# 28. สรุปผลการเรียนรู้

หลังจบคู่มือและ Workshop ผู้เรียนควรสามารถ:

- เข้าใจโครงสร้าง ASP.NET Core Web API
- สร้าง Project ด้วย Visual Studio
- สร้าง SQL Server Database
- เชื่อมต่อ API กับ SQL Server
- ใช้ Entity Framework Core และ Migration
- ออกแบบ Model และ DTO
- สร้าง CRUD API
- ใช้ HTTP Method และ Status Code อย่างเหมาะสม
- Run และ Debug โปรแกรม
- ทดสอบ API ด้วย Swagger และ Postman
- ตรวจสอบผลลัพธ์ผ่าน SQL Server
- วิเคราะห์และแก้ไข Error เบื้องต้น

เอกสารนี้สามารถใช้เป็นคู่มือประกอบการสอน เอกสาร Workshop หรือเอกสารพื้นฐานสำหรับพัฒนา TodoListAPI ในโครงการจริงได้
