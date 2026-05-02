#requires -Version 5.1
<#
.SYNOPSIS
    InDaZone API Test Suite - PowerShell automation for all API endpoints

.DESCRIPTION
    Complete test runner for the InDaZone GPS-based attendance system API.
    Includes authentication, attendance, geofence, dashboards, and admin endpoints.

.EXAMPLE
    .\run-api-tests.ps1

.EXAMPLE
    .\run-api-tests.ps1 -TestType Auth

.EXAMPLE
    .\run-api-tests.ps1 -TestType Workflow -Verbose
#>

param(
    [ValidateSet('Auth', 'Attendance', 'Geofence', 'Dashboard', 'Students', 'Locations', 'Reports', 'Notifications', 'Fraud', 'Workflow', 'All')]
    [string]$TestType = 'Auth',

    [string]$BaseUrl        = 'http://localhost:3000/api/v1',
    [string]$AdminEmail     = 'admin1@example.com',
    [string]$AdminPassword  = 'securepassword',
    [string]$DeviceId       = 'device-123-abc'
)

# ─── Result Tracking ─────────────────────────────────────

$script:Passed = 0
$script:Failed = 0

# ─── Helper Functions ────────────────────────────────────

function Convert-ToJsonBody {
    param([hashtable]$Body)
    return $Body | ConvertTo-Json -Depth 10 -Compress
}

function Get-AuthHeader {
    param([string]$Token)
    return @{ Authorization = "Bearer $Token" }
}

# Extracts the most useful error message from a failed Invoke-RestMethod call.
# $_.ErrorDetails.Message carries the HTTP response body (e.g. JSON error payload).
# Fall back to the exception message only when that is empty.
function Get-ErrorDetail {
    param($ErrorRecord)
    $body = $ErrorRecord.ErrorDetails.Message
    if ($body) { return $body }
    return $ErrorRecord.Exception.Message
}

function Write-Pass {
    param([string]$Message)
    $script:Passed++
    Write-Host "  [PASS] $Message" -ForegroundColor Green
}

function Write-Fail {
    param([string]$Message)
    $script:Failed++
    Write-Host "  [FAIL] $Message" -ForegroundColor Red
}

function Write-Info {
    param([string]$Message)
    Write-Host "  [INFO] $Message" -ForegroundColor Cyan
}

function Write-Header {
    param([string]$Header)
    Write-Host "`n  ── $Header ──" -ForegroundColor Yellow
}

function Write-SuiteHeader {
    param([string]$Title)
    Write-Host "`n╔════════════════════════════════════════╗" -ForegroundColor Cyan
    Write-Host "║  $($Title.PadRight(38))║" -ForegroundColor Cyan
    Write-Host "╚════════════════════════════════════════╝" -ForegroundColor Cyan
}

function Write-Summary {
    $total = $script:Passed + $script:Failed
    Write-Host "`n──────────────────────────────────────────" -ForegroundColor DarkGray
    Write-Host "  Results: $script:Passed/$total passed" -ForegroundColor $(if ($script:Failed -eq 0) { 'Green' } else { 'Yellow' })
    if ($script:Failed -gt 0) {
        Write-Host "  $script:Failed test(s) failed" -ForegroundColor Red
    }
    Write-Host "──────────────────────────────────────────`n" -ForegroundColor DarkGray
}

# ─── Authentication Tests ────────────────────────────────

function Test-RegisterAdmin {
    Write-Header 'Test: Register Admin'

    try {
        $body = Convert-ToJsonBody @{
            name     = 'Admin User'
            email    = $AdminEmail
            password = $AdminPassword
            role     = 'ADMIN'
        }

        $response = Invoke-RestMethod -Method Post -Uri "$BaseUrl/auth/register" `
            -ContentType 'application/json' -Body $body -ErrorAction Stop

        Write-Pass "Admin registered: $($response.user.email)"
        return $response
    }
    catch {
        Write-Fail "Register admin: $(Get-ErrorDetail $_)"
        return $null
    }
}

function Test-Login {
    Write-Header 'Test: Login Admin'

    try {
        $body = Convert-ToJsonBody @{
            email    = $AdminEmail
            password = $AdminPassword
            deviceId = $DeviceId
        }

        $response = Invoke-RestMethod -Method Post -Uri "$BaseUrl/auth/login" `
            -ContentType 'application/json' -Body $body -ErrorAction Stop

        Write-Pass "Login successful: $($response.user.email)"
        Write-Info "Access Token : $($response.accessToken.Substring(0, 20))..."
        Write-Info "Refresh Token: $($response.refreshToken.Substring(0, 20))..."
        return $response
    }
    catch {
        Write-Fail "Login: $(Get-ErrorDetail $_)"
        return $null
    }
}

# Returns a fresh login response with the new accessToken populated,
# so callers can simply reassign: $loginResponse = Test-RefreshToken $loginResponse
function Test-RefreshToken {
    param($LoginResponse)

    Write-Header 'Test: Refresh Token'

    if (-not $LoginResponse) {
        Write-Fail 'Refresh token: no login response provided'
        return $null
    }

    try {
        $body = Convert-ToJsonBody @{ refreshToken = $LoginResponse.refreshToken }

        $refreshed = Invoke-RestMethod -Method Post -Uri "$BaseUrl/auth/refresh" `
            -ContentType 'application/json' -Body $body -ErrorAction Stop

        Write-Pass "Token refreshed"
        Write-Info "New Access Token: $($refreshed.accessToken.Substring(0, 20))..."

        # Merge the new accessToken back so the caller object stays coherent
        $LoginResponse.accessToken = $refreshed.accessToken
        return $LoginResponse
    }
    catch {
        Write-Fail "Refresh token: $(Get-ErrorDetail $_)"
        return $null
    }
}

function Test-GetProfile {
    param($LoginResponse)

    Write-Header 'Test: Get Current User Profile'

    if (-not $LoginResponse) {
        Write-Fail 'Get profile: no login response provided'
        return $null
    }

    try {
        $response = Invoke-RestMethod -Method Get -Uri "$BaseUrl/auth/me" `
            -Headers (Get-AuthHeader $LoginResponse.accessToken) -ErrorAction Stop

        Write-Pass "Profile retrieved: $($response.name)"
        Write-Info "Email: $($response.email) | Role: $($response.role) | Status: $($response.status)"
        return $response
    }
    catch {
        Write-Fail "Get profile: $(Get-ErrorDetail $_)"
        return $null
    }
}

function Test-ChangePassword {
    param($LoginResponse, [string]$NewPassword = 'newsecurepassword123')

    Write-Header 'Test: Change Password'

    if (-not $LoginResponse) {
        Write-Fail 'Change password: no login response provided'
        return $null
    }

    try {
        $body = Convert-ToJsonBody @{
            currentPassword = $AdminPassword
            newPassword     = $NewPassword
        }

        $response = Invoke-RestMethod -Method Patch -Uri "$BaseUrl/auth/me/password" `
            -Headers (Get-AuthHeader $LoginResponse.accessToken) `
            -ContentType 'application/json' -Body $body -ErrorAction Stop

        Write-Pass "Password changed successfully"
        return $response
    }
    catch {
        Write-Fail "Change password: $(Get-ErrorDetail $_)"
        return $null
    }
}

function Test-UpdateFcmToken {
    param($LoginResponse)

    Write-Header 'Test: Update FCM Token'

    if (-not $LoginResponse) {
        Write-Fail 'Update FCM token: no login response provided'
        return $null
    }

    try {
        $body = Convert-ToJsonBody @{ fcmToken = 'fcm-token-abc123xyz' }

        $response = Invoke-RestMethod -Method Patch -Uri "$BaseUrl/auth/me/fcm-token" `
            -Headers (Get-AuthHeader $LoginResponse.accessToken) `
            -ContentType 'application/json' -Body $body -ErrorAction Stop

        Write-Pass "FCM token updated"
        return $response
    }
    catch {
        Write-Fail "Update FCM token: $(Get-ErrorDetail $_)"
        return $null
    }
}

function Test-Logout {
    param($LoginResponse)

    Write-Header 'Test: Logout'

    if (-not $LoginResponse) {
        Write-Fail 'Logout: no login response provided'
        return $null
    }

    try {
        $body = Convert-ToJsonBody @{ refreshToken = $LoginResponse.refreshToken }

        $response = Invoke-RestMethod -Method Post -Uri "$BaseUrl/auth/logout" `
            -Headers (Get-AuthHeader $LoginResponse.accessToken) `
            -ContentType 'application/json' -Body $body -ErrorAction Stop

        Write-Pass "Logged out"
        return $response
    }
    catch {
        Write-Fail "Logout: $(Get-ErrorDetail $_)"
        return $null
    }
}

# ─── Location Tests ──────────────────────────────────────

function Test-CreateLocation {
    param($LoginResponse)

    Write-Header 'Test: Create Location'

    if (-not $LoginResponse) {
        Write-Fail 'Create location: no login response provided'
        return $null
    }

    try {
        $body = Convert-ToJsonBody @{
            name          = 'College Campus'
            latitude      = 19.0760
            longitude     = 72.8777
            radiusMeters  = 100
            workingHours  = @{
                startTime          = '09:00'
                endTime            = '17:00'
                lateThresholdMins  = 15
                minDurationHours   = 6
            }
        }

        $response = Invoke-RestMethod -Method Post -Uri "$BaseUrl/admin/locations" `
            -Headers (Get-AuthHeader $LoginResponse.accessToken) `
            -ContentType 'application/json' -Body $body -ErrorAction Stop

        Write-Pass "Location created: $($response.name) (ID: $($response.id))"
        return $response
    }
    catch {
        Write-Fail "Create location: $(Get-ErrorDetail $_)"
        return $null
    }
}

function Test-GetLocations {
    param($LoginResponse)

    Write-Header 'Test: Get All Locations'

    if (-not $LoginResponse) {
        Write-Fail 'Get locations: no login response provided'
        return $null
    }

    try {
        $response = Invoke-RestMethod -Method Get -Uri "$BaseUrl/admin/locations" `
            -Headers (Get-AuthHeader $LoginResponse.accessToken) -ErrorAction Stop

        Write-Pass "Retrieved $($response.Count) location(s)"
        return $response
    }
    catch {
        Write-Fail "Get locations: $(Get-ErrorDetail $_)"
        return $null
    }
}

# ─── Student Tests ───────────────────────────────────────

function Test-CreateStudent {
    param($LoginResponse)

    Write-Header 'Test: Create Student'

    if (-not $LoginResponse) {
        Write-Fail 'Create student: no login response provided'
        return $null
    }

    try {
        $body = Convert-ToJsonBody @{
            name        = 'Jane Smith'
            email       = 'jane@example.com'
            password    = 'tempPassword123'
            studentCode = 'CS2024002'
        }

        $response = Invoke-RestMethod -Method Post -Uri "$BaseUrl/admin/students" `
            -Headers (Get-AuthHeader $LoginResponse.accessToken) `
            -ContentType 'application/json' -Body $body -ErrorAction Stop

        Write-Pass "Student created: $($response.name) (ID: $($response.id))"
        return $response
    }
    catch {
        Write-Fail "Create student: $(Get-ErrorDetail $_)"
        return $null
    }
}

function Test-GetStudents {
    param($LoginResponse)

    Write-Header 'Test: Get All Students'

    if (-not $LoginResponse) {
        Write-Fail 'Get students: no login response provided'
        return $null
    }

    try {
        $response = Invoke-RestMethod -Method Get -Uri "$BaseUrl/admin/students?page=1&limit=50" `
            -Headers (Get-AuthHeader $LoginResponse.accessToken) -ErrorAction Stop

        Write-Pass "Students retrieved"
        return $response
    }
    catch {
        Write-Fail "Get students: $(Get-ErrorDetail $_)"
        return $null
    }
}

# ─── Geofence Tests ──────────────────────────────────────

function Test-ValidateGeofence {
    param($LoginResponse, [string]$LocationId)

    Write-Header 'Test: Validate Geofence'

    if (-not $LoginResponse) { Write-Fail 'Validate geofence: no login response provided'; return $null }
    if (-not $LocationId)    { Write-Fail 'Validate geofence: LocationId required';         return $null }

    try {
        $uri = "$BaseUrl/geofence/validate?lat=19.0760&lng=72.8777&locationId=$LocationId&accuracyMeters=10"

        $response = Invoke-RestMethod -Method Get -Uri $uri `
            -Headers (Get-AuthHeader $LoginResponse.accessToken) -ErrorAction Stop

        Write-Pass "Geofence validated — within radius: $($response.isWithinRadius)"
        return $response
    }
    catch {
        Write-Fail "Validate geofence: $(Get-ErrorDetail $_)"
        return $null
    }
}

function Test-GetGeofenceLocations {
    param($LoginResponse)

    Write-Header 'Test: Get Geofence Locations'

    if (-not $LoginResponse) {
        Write-Fail 'Get geofence locations: no login response provided'
        return $null
    }

    try {
        $response = Invoke-RestMethod -Method Get -Uri "$BaseUrl/geofence/locations" `
            -Headers (Get-AuthHeader $LoginResponse.accessToken) -ErrorAction Stop

        Write-Pass "Retrieved $($response.Count) geofence location(s)"
        return $response
    }
    catch {
        Write-Fail "Get geofence locations: $(Get-ErrorDetail $_)"
        return $null
    }
}

# ─── Attendance Tests ────────────────────────────────────

function Test-CheckIn {
    param($LoginResponse, [string]$LocationId)

    Write-Header 'Test: Check In'

    if (-not $LoginResponse) { Write-Fail 'Check-in: no login response provided'; return $null }
    if (-not $LocationId)    { Write-Fail 'Check-in: LocationId required';         return $null }

    try {
        $body = Convert-ToJsonBody @{
            lat           = 19.0760
            lng           = 72.8777
            timestamp     = [datetime]::UtcNow.ToString('o')
            locationId    = $LocationId
            accuracyMeters = 10
        }

        $headers = Get-AuthHeader $LoginResponse.accessToken
        $headers['Idempotency-Key'] = "checkin-$([guid]::NewGuid())"

        $response = Invoke-RestMethod -Method Post -Uri "$BaseUrl/attendance/checkin" `
            -Headers $headers -ContentType 'application/json' -Body $body -ErrorAction Stop

        Write-Pass "Check-in successful"
        return $response
    }
    catch {
        Write-Fail "Check-in: $(Get-ErrorDetail $_)"
        return $null
    }
}

function Test-GetTodayAttendance {
    param($LoginResponse)

    Write-Header "Test: Get Today's Attendance"

    if (-not $LoginResponse) {
        Write-Fail "Get today's attendance: no login response provided"
        return $null
    }

    try {
        $response = Invoke-RestMethod -Method Get -Uri "$BaseUrl/attendance/today" `
            -Headers (Get-AuthHeader $LoginResponse.accessToken) -ErrorAction Stop

        Write-Pass "Today's attendance retrieved"
        return $response
    }
    catch {
        Write-Fail "Get today's attendance: $(Get-ErrorDetail $_)"
        return $null
    }
}

# ─── Dashboard Tests ─────────────────────────────────────

function Test-AdminDashboard {
    param($LoginResponse)

    Write-Header 'Test: Admin Dashboard'

    if (-not $LoginResponse) {
        Write-Fail 'Admin dashboard: no login response provided'
        return $null
    }

    try {
        $date = [datetime]::Now.ToString('yyyy-MM-dd')

        $response = Invoke-RestMethod -Method Get -Uri "$BaseUrl/admin/dashboard?date=$date" `
            -Headers (Get-AuthHeader $LoginResponse.accessToken) -ErrorAction Stop

        Write-Pass "Admin dashboard retrieved"
        return $response
    }
    catch {
        Write-Fail "Admin dashboard: $(Get-ErrorDetail $_)"
        return $null
    }
}

# ─── Test Runners ─────────────────────────────────────────

function Run-AuthTests {
    Write-SuiteHeader 'Authentication Test Suite'

    # Register first so the account exists on a fresh database.
    # 409 Conflict on a re-run is expected and harmless.
    Test-RegisterAdmin | Out-Null

    $session = Test-Login
    if (-not $session) { return }

    Test-GetProfile      -LoginResponse $session | Out-Null
    Test-UpdateFcmToken  -LoginResponse $session | Out-Null
    Test-ChangePassword  -LoginResponse $session | Out-Null

    # Reassign so subsequent calls use the refreshed access token
    $session = Test-RefreshToken -LoginResponse $session
    if (-not $session) { return }

    Test-GetProfile -LoginResponse $session | Out-Null
    Test-Logout     -LoginResponse $session | Out-Null
}

function Run-LocationTests {
    Write-SuiteHeader 'Location Management Tests'

    $session = Test-Login
    if (-not $session) { return }

    Test-CreateLocation -LoginResponse $session | Out-Null
    Test-GetLocations   -LoginResponse $session | Out-Null
}

function Run-StudentTests {
    Write-SuiteHeader 'Student Management Tests'

    $session = Test-Login
    if (-not $session) { return }

    Test-CreateStudent -LoginResponse $session | Out-Null
    Test-GetStudents   -LoginResponse $session | Out-Null
}

function Run-GeofenceTests {
    Write-SuiteHeader 'Geofence Tests'

    $session = Test-Login
    if (-not $session) { return }

    $location = Test-CreateLocation -LoginResponse $session
    if (-not $location) { return }

    Test-GetGeofenceLocations               -LoginResponse $session             | Out-Null
    Test-ValidateGeofence -LoginResponse $session -LocationId $location.id      | Out-Null
}

function Run-WorkflowTest {
    Write-SuiteHeader 'Complete Workflow Test'

    # 1. Ensure admin account exists
    Test-RegisterAdmin | Out-Null

    # 2. Admin login
    $adminSession = Test-Login
    if (-not $adminSession) { return }

    # 3. Create location
    $location = Test-CreateLocation -LoginResponse $adminSession
    if (-not $location) { return }

    # 4. Create student
    $student = Test-CreateStudent -LoginResponse $adminSession
    if (-not $student) { return }

    # 5. Validate geofence as admin
    Test-ValidateGeofence -LoginResponse $adminSession -LocationId $location.id | Out-Null

    # 6. Student login — check-in should use the student's own session, not admin's
    Write-Header 'Test: Student Login'
    try {
        $studentBody = Convert-ToJsonBody @{
            email    = 'jane@example.com'
            password = 'tempPassword123'
            deviceId = "$DeviceId-student"
        }
        $studentSession = Invoke-RestMethod -Method Post -Uri "$BaseUrl/auth/login" `
            -ContentType 'application/json' -Body $studentBody -ErrorAction Stop
        Write-Pass "Student login: $($studentSession.user.email)"
    }
    catch {
        Write-Fail "Student login: $(Get-ErrorDetail $_)"
        $studentSession = $null
    }

    # 7. Check in as student
    if ($studentSession) {
        Test-CheckIn -LoginResponse $studentSession -LocationId $location.id | Out-Null
        Test-GetTodayAttendance -LoginResponse $studentSession | Out-Null
    }

    # 8. Admin dashboard
    Test-AdminDashboard -LoginResponse $adminSession | Out-Null
}

# ─── Main Execution ───────────────────────────────────────

Write-Host "`n╔═══════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║  InDaZone API Test Suite                      ║" -ForegroundColor Cyan
Write-Host "║  Base URL : $($BaseUrl.PadRight(35))║" -ForegroundColor Cyan
Write-Host "║  Test type: $($TestType.PadRight(35))║" -ForegroundColor Cyan
Write-Host "╚═══════════════════════════════════════════════╝" -ForegroundColor Cyan

switch ($TestType) {
    'Auth'      { Run-AuthTests      }
    'Locations' { Run-LocationTests  }
    'Students'  { Run-StudentTests   }
    'Geofence'  { Run-GeofenceTests  }
    'Workflow'  { Run-WorkflowTest   }
    'All'       {
        Run-AuthTests
        Run-LocationTests
        Run-StudentTests
        Run-GeofenceTests
    }
    default {
        Write-Warning "No runner defined for test type '$TestType' yet — skipping."
    }
}

Write-Summary
