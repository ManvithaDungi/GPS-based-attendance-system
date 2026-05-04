# InDaZone API Test Suite

PowerShell-native examples for testing the InDaZone API. Replace placeholder values with real IDs and tokens from previous responses.

## Base Setup

Run these commands first in your PowerShell session to initialize variables:

```powershell
$BaseUrl = 'http://localhost:3000/api/v1'
$AdminEmail = 'admin@example.com'
$AdminPassword = 'password123'
$DeviceId = 'device-123-abc'
```

**Note:** All examples below assume you've run the setup above. When you login and get tokens, capture them in a variable:
```powershell
$loginResponse = Invoke-RestMethod -Method Post -Uri "$BaseUrl/auth/login" -ContentType 'application/json' -Body ($body | ConvertTo-Json -Compress)
$loginResponse.accessToken  # Use this for Bearer token
$loginResponse.refreshToken # Use this for refresh operations
```

## 1. Authentication APIs

### Register Admin
```powershell
$body = @{
    name = 'Test Admin'
    email = 'admin1@example.com'
    password = 'password123'
    role = 'ADMIN'
} | ConvertTo-Json -Compress

Invoke-RestMethod -Method Post -Uri "$BaseUrl/auth/register" -ContentType 'application/json' -Body $body
```

### Login
```powershell
$loginBody = @{
    email = $AdminEmail
    password = $AdminPassword
    deviceId = $DeviceId
} | ConvertTo-Json -Compress

$loginResponse = Invoke-RestMethod -Method Post -Uri "$BaseUrl/auth/login" -ContentType 'application/json' -Body $loginBody
$loginResponse
```

Copy the `accessToken` and `refreshToken` from `$loginResponse` and reuse them exactly.

### Refresh Token
```powershell
$refreshBody = @{
    refreshToken = $loginResponse.refreshToken
} | ConvertTo-Json -Compress

Invoke-RestMethod -Method Post -Uri "$BaseUrl/auth/refresh" -ContentType 'application/json' -Body $refreshBody
```

Use the exact refresh token returned by login. Refresh tokens are rotated after refresh, so an already-used token returns `INVALID_REFRESH_TOKEN`.

### Logout
```powershell
$logoutBody = @{
    refreshToken = $loginResponse.refreshToken
} | ConvertTo-Json -Compress

Invoke-RestMethod `
    -Method Post `
    -Uri "$BaseUrl/auth/logout" `
    -Headers @{ Authorization = "Bearer $($loginResponse.accessToken)" } `
    -ContentType 'application/json' `
    -Body $logoutBody
```

### Get Current User Profile
```powershell
Invoke-RestMethod `
    -Method Get `
    -Uri "$BaseUrl/auth/me" `
    -Headers @{ Authorization = "Bearer $($loginResponse.accessToken)" }
```

### Update FCM Token
```powershell
$fcmBody = @{
    fcmToken = 'fcm-token-abc123xyz'
} | ConvertTo-Json -Compress

Invoke-RestMethod `
    -Method Patch `
    -Uri "$BaseUrl/auth/me/fcm-token" `
    -Headers @{ Authorization = "Bearer $($loginResponse.accessToken)" } `
    -ContentType 'application/json' `
    -Body $fcmBody
```

### Change Password
```powershell
$passwordBody = @{
    currentPassword = $AdminPassword
    newPassword = 'newsecurepassword123'
} | ConvertTo-Json -Compress

Invoke-RestMethod `
    -Method Patch `
    -Uri "$BaseUrl/auth/me/password" `
    -Headers @{ Authorization = "Bearer $($loginResponse.accessToken)" } `
    -ContentType 'application/json' `
    -Body $passwordBody
```

## 2. Attendance APIs

### Check In
```powershell
$checkInBody = @{
    lat = 19.0760
    lng = 72.8777
    timestamp = '2026-05-01T09:05:00.000Z'
    locationId = 'PASTE_LOCATION_ID_HERE'
    accuracyMeters = 10
} | ConvertTo-Json -Compress

Invoke-RestMethod `
    -Method Post `
    -Uri "$BaseUrl/attendance/checkin" `
    -Headers @{
        Authorization = "Bearer $($loginResponse.accessToken)"
        'Idempotency-Key' = "checkin-$([guid]::NewGuid().ToString())"
    } `
    -ContentType 'application/json' `
    -Body $checkInBody
```

### Check Out
```powershell
$checkOutBody = @{
    lat = 19.0762
    lng = 72.8779
    timestamp = '2026-05-01T15:30:00.000Z'
    locationId = 'PASTE_LOCATION_ID_HERE'
    accuracyMeters = 12
} | ConvertTo-Json -Compress

Invoke-RestMethod `
    -Method Post `
    -Uri "$BaseUrl/attendance/checkout" `
    -Headers @{
        Authorization = "Bearer $($loginResponse.accessToken)"
        'Idempotency-Key' = "checkout-$([guid]::NewGuid().ToString())"
    } `
    -ContentType 'application/json' `
    -Body $checkOutBody
```

### Get Today's Attendance
```powershell
Invoke-RestMethod `
    -Method Get `
    -Uri "$BaseUrl/attendance/today" `
    -Headers @{ Authorization = "Bearer $($loginResponse.accessToken)" }
```

### Get Attendance History
```powershell
Invoke-RestMethod `
    -Method Get `
    -Uri "$BaseUrl/attendance/history?page=1&limit=30&from=2026-04-01&to=2026-05-01" `
    -Headers @{ Authorization = "Bearer $($loginResponse.accessToken)" }
```

### Get Attendance Summary
```powershell
Invoke-RestMethod `
    -Method Get `
    -Uri "$BaseUrl/attendance/summary" `
    -Headers @{ Authorization = "Bearer $($loginResponse.accessToken)" }
```

## 3. Geofence APIs

### Validate Location
```powershell
Invoke-RestMethod `
    -Method Get `
    -Uri "$BaseUrl/geofence/validate?lat=19.0760&lng=72.8777&locationId=PASTE_LOCATION_ID_HERE&accuracyMeters=10" `
    -Headers @{ Authorization = "Bearer $($loginResponse.accessToken)" }
```

### Get All Locations
```powershell
Invoke-RestMethod `
    -Method Get `
    -Uri "$BaseUrl/geofence/locations" `
    -Headers @{ Authorization = "Bearer $($loginResponse.accessToken)" }
```

### Get Single Location Details
```powershell
Invoke-RestMethod `
    -Method Get `
    -Uri "$BaseUrl/geofence/locations/PASTE_LOCATION_ID_HERE" `
    -Headers @{ Authorization = "Bearer $($loginResponse.accessToken)" }
```

## 4. Student Dashboard APIs

### Get Student Dashboard
```powershell
Invoke-RestMethod `
    -Method Get `
    -Uri "$BaseUrl/student/dashboard" `
    -Headers @{ Authorization = "Bearer $studentAccessToken" }
```

## 5. Admin Dashboard APIs

### Get Admin Dashboard
```powershell
Invoke-RestMethod `
    -Method Get `
    -Uri "$BaseUrl/admin/dashboard?date=2026-05-01&locationId=PASTE_LOCATION_ID_HERE" `
    -Headers @{ Authorization = "Bearer $($loginResponse.accessToken)" }
```

### Get All Attendance Records
```powershell
Invoke-RestMethod `
    -Method Get `
    -Uri "$BaseUrl/admin/attendance?date=2026-05-01&status=PRESENT&page=1&limit=50" `
    -Headers @{ Authorization = "Bearer $($loginResponse.accessToken)" }
```

### Get Attendance Trends
```powershell
Invoke-RestMethod `
    -Method Get `
    -Uri "$BaseUrl/admin/attendance/trends?period=monthly&from=2026-01-01&to=2026-05-01" `
    -Headers @{ Authorization = "Bearer $($loginResponse.accessToken)" }
```

## 6. Admin - Student Management APIs

### Create Single Student
```powershell
$studentBody = @{
    name = 'Jane Smith'
    email = 'jane@example.com'
    password = 'tempPassword123'
    studentCode = 'CS2024002'
} | ConvertTo-Json -Compress

$studentResponse = Invoke-RestMethod `
    -Method Post `
    -Uri "$BaseUrl/admin/students" `
    -Headers @{ Authorization = "Bearer $($loginResponse.accessToken)" } `
    -ContentType 'application/json' `
    -Body $studentBody

$studentResponse
```

### Bulk Create Students (JSON)
```powershell
$bulkBody = @{
    students = @(
        @{ name = 'Jane Smith'; email = 'jane@example.com'; password = 'tempPass123'; studentCode = 'CS2024002' },
        @{ name = 'Bob Johnson'; email = 'bob@example.com'; password = 'tempPass456'; studentCode = 'CS2024003' }
    )
} | ConvertTo-Json -Compress

Invoke-RestMethod `
    -Method Post `
    -Uri "$BaseUrl/admin/students/bulk" `
    -Headers @{ Authorization = "Bearer $($loginResponse.accessToken)" } `
    -ContentType 'application/json' `
    -Body $bulkBody
```

### Bulk Create Students (CSV File)
```powershell
Add-Type -AssemblyName System.Net.Http

$client = [System.Net.Http.HttpClient]::new()
$client.DefaultRequestHeaders.Authorization = [System.Net.Http.Headers.AuthenticationHeaderValue]::new('Bearer', $loginResponse.accessToken)

$form = [System.Net.Http.MultipartFormDataContent]::new()
$fileBytes = [System.IO.File]::ReadAllBytes('C:\Path\To\students.csv')
$fileContent = [System.Net.Http.ByteArrayContent]::new($fileBytes)
$fileContent.Headers.ContentType = [System.Net.Http.Headers.MediaTypeHeaderValue]::Parse('text/csv')
$form.Add($fileContent, 'file', 'students.csv')

$response = $client.PostAsync("$BaseUrl/admin/students/bulk", $form).Result
$response.Content.ReadAsStringAsync().Result
```

### Get All Students
```powershell
Invoke-RestMethod `
    -Method Get `
    -Uri "$BaseUrl/admin/students?search=John&status=ACTIVE&page=1&limit=50" `
    -Headers @{ Authorization = "Bearer $($loginResponse.accessToken)" }
```

### Get Single Student
```powershell
Invoke-RestMethod `
    -Method Get `
    -Uri "$BaseUrl/admin/students/PASTE_STUDENT_ID_HERE" `
    -Headers @{ Authorization = "Bearer $($loginResponse.accessToken)" }
```

### Get Student Attendance History
```powershell
Invoke-RestMethod `
    -Method Get `
    -Uri "$BaseUrl/admin/students/PASTE_STUDENT_ID_HERE/attendance?page=1&limit=30" `
    -Headers @{ Authorization = "Bearer $($loginResponse.accessToken)" }
```

### Update Student Status
```powershell
$statusBody = @{
    status = 'SUSPENDED'
} | ConvertTo-Json -Compress

Invoke-RestMethod `
    -Method Patch `
    -Uri "$BaseUrl/admin/students/PASTE_STUDENT_ID_HERE/status" `
    -Headers @{ Authorization = "Bearer $($loginResponse.accessToken)" } `
    -ContentType 'application/json' `
    -Body $statusBody
```

### Reset Student Password
```powershell
$resetBody = @{
    temporaryPassword = 'newTempPass123'
} | ConvertTo-Json -Compress

Invoke-RestMethod `
    -Method Post `
    -Uri "$BaseUrl/admin/students/PASTE_STUDENT_ID_HERE/reset-password" `
    -Headers @{ Authorization = "Bearer $($loginResponse.accessToken)" } `
    -ContentType 'application/json' `
    -Body $resetBody
```

## 7. Admin - Locations Management APIs

### Create Location
```powershell
$locationBody = @{
    name = 'College Campus'
    latitude = 19.0760
    longitude = 72.8777
    radiusMeters = 100
    workingHours = @{
        startTime = '09:00'
        endTime = '17:00'
        lateThresholdMins = 15
        minDurationHours = 6
    }
} | ConvertTo-Json -Depth 10 -Compress

$locationResponse = Invoke-RestMethod `
    -Method Post `
    -Uri "$BaseUrl/admin/locations" `
    -Headers @{ Authorization = "Bearer $($loginResponse.accessToken)" } `
    -ContentType 'application/json' `
    -Body $locationBody

$locationResponse
```

### Get All Locations
```powershell
Invoke-RestMethod `
    -Method Get `
    -Uri "$BaseUrl/admin/locations" `
    -Headers @{ Authorization = "Bearer $($loginResponse.accessToken)" }
```

### Update Location
```powershell
$updateLocationBody = @{
    name = 'Main Campus'
    latitude = 19.0761
    longitude = 72.8778
    radiusMeters = 150
    workingHours = @{
        startTime = '08:30'
        lateThresholdMins = 10
    }
} | ConvertTo-Json -Depth 10 -Compress

Invoke-RestMethod `
    -Method Patch `
    -Uri "$BaseUrl/admin/locations/PASTE_LOCATION_ID_HERE" `
    -Headers @{ Authorization = "Bearer $($loginResponse.accessToken)" } `
    -ContentType 'application/json' `
    -Body $updateLocationBody
```

### Delete Location
```powershell
Invoke-RestMethod `
    -Method Delete `
    -Uri "$BaseUrl/admin/locations/PASTE_LOCATION_ID_HERE" `
    -Headers @{ Authorization = "Bearer $($loginResponse.accessToken)" }
```

## 8. Admin - Reports and Export APIs

### Get Daily Report
```powershell
Invoke-RestMethod `
    -Method Get `
    -Uri "$BaseUrl/admin/reports/daily?date=2026-05-01&format=json" `
    -Headers @{ Authorization = "Bearer $($loginResponse.accessToken)" }
```

### Get Daily Report CSV
```powershell
Invoke-RestMethod `
    -Method Get `
    -Uri "$BaseUrl/admin/reports/daily?date=2026-05-01&format=csv" `
    -Headers @{ Authorization = "Bearer $($loginResponse.accessToken)" }
```

### Get Monthly Report
```powershell
Invoke-RestMethod `
    -Method Get `
    -Uri "$BaseUrl/admin/reports/monthly?month=5&year=2026&format=json" `
    -Headers @{ Authorization = "Bearer $($loginResponse.accessToken)" }
```

### Get Yearly Report
```powershell
Invoke-RestMethod `
    -Method Get `
    -Uri "$BaseUrl/admin/reports/yearly?year=2026&format=json" `
    -Headers @{ Authorization = "Bearer $($loginResponse.accessToken)" }
```

### Check Report Job Status
```powershell
Invoke-RestMethod `
    -Method Get `
    -Uri "$BaseUrl/admin/reports/jobs/PASTE_JOB_ID_HERE" `
    -Headers @{ Authorization = "Bearer $($loginResponse.accessToken)" }
```

## 9. Notifications APIs

### Get Notifications
```powershell
Invoke-RestMethod `
    -Method Get `
    -Uri "$BaseUrl/notifications?unreadOnly=false&page=1&limit=20" `
    -Headers @{ Authorization = "Bearer $($loginResponse.accessToken)" }
```

### Mark Notification as Read
```powershell
Invoke-RestMethod `
    -Method Patch `
    -Uri "$BaseUrl/notifications/PASTE_NOTIFICATION_ID_HERE/read" `
    -Headers @{ Authorization = "Bearer $($loginResponse.accessToken)" }
```

### Mark All Notifications as Read
```powershell
Invoke-RestMethod `
    -Method Patch `
    -Uri "$BaseUrl/notifications/read-all" `
    -Headers @{ Authorization = "Bearer $($loginResponse.accessToken)" }
```

### Send Notification to Students
```powershell
$notificationBody = @{
    title = 'Campus Closed Tomorrow'
    body = 'No attendance required tomorrow due to holiday.'
    targetRole = 'STUDENT'
    targetStudentIds = $null
} | ConvertTo-Json -Compress

Invoke-RestMethod `
    -Method Post `
    -Uri "$BaseUrl/admin/notifications/send" `
    -Headers @{ Authorization = "Bearer $($loginResponse.accessToken)" } `
    -ContentType 'application/json' `
    -Body $notificationBody
```

## 10. Fraud Logs APIs

### Get All Fraud Logs
```powershell
Invoke-RestMethod `
    -Method Get `
    -Uri "$BaseUrl/admin/fraud-logs?riskLevel=HIGH&page=1&limit=50" `
    -Headers @{ Authorization = "Bearer $($loginResponse.accessToken)" }
```

### Get Fraud Logs for Specific Student
```powershell
Invoke-RestMethod `
    -Method Get `
    -Uri "$BaseUrl/admin/fraud-logs/PASTE_STUDENT_ID_HERE" `
    -Headers @{ Authorization = "Bearer $($loginResponse.accessToken)" }
```

## 11. System Configuration APIs

### Get Config
```powershell
Invoke-RestMethod `
    -Method Get `
    -Uri "$BaseUrl/admin/config" `
    -Headers @{ Authorization = "Bearer $($loginResponse.accessToken)" }
```

### Update Working Hours
```powershell
$workingHoursBody = @{
    startTime = '09:00'
    endTime = '17:00'
    lateThresholdMins = 15
    minDurationHours = 6
} | ConvertTo-Json -Compress

Invoke-RestMethod `
    -Method Patch `
    -Uri "$BaseUrl/admin/config/working-hours/PASTE_LOCATION_ID_HERE" `
    -Headers @{ Authorization = "Bearer $($loginResponse.accessToken)" } `
    -ContentType 'application/json' `
    -Body $workingHoursBody
```

## Quick Reference: Common Placeholders

| Placeholder | Description | Example |
|------------|-------------|---------|
| `PASTE_LOCATION_ID_HERE` | Location ID from create location response | `550e8400-e29b-41d4-a716-446655440001` |
| `PASTE_STUDENT_ID_HERE` | Student ID from create student response | `550e8400-e29b-41d4-a716-446655440002` |
| `PASTE_JOB_ID_HERE` | Report job ID | `550e8400-e29b-41d4-a716-446655440003` |
| `PASTE_NOTIFICATION_ID_HERE` | Notification ID | `550e8400-e29b-41d4-a716-446655440004` |
| `loginResponse.accessToken` | Access token returned by login | `eyJhbGciOi...` |
| `loginResponse.refreshToken` | Refresh token returned by login | `eyJhbGciOi...` |

## Testing Workflow Example

1. Register an admin account with the register example.
2. Log in and store the result in `$loginResponse`.
3. Use `$loginResponse.accessToken` for authenticated requests.
4. Create a location and copy the returned location ID.
5. Create a student and copy the returned student ID.
6. Log in as the student and test attendance and dashboard endpoints.
7. Use the refresh example only with the latest refresh token from login or the latest refresh response.

## Tips

- Use `ConvertTo-Json -Depth 10` when bodies contain nested objects.
- Use `Invoke-RestMethod` for JSON APIs and `Invoke-WebRequest` or .NET `HttpClient` for file uploads.
- Refresh tokens are single-use in this backend, so always use the newest token value.
- If you want a reusable PowerShell runner script, I can convert these examples into a single `.ps1` test script next.
