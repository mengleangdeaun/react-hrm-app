# Backend Architecture & Mobile Integration Reference
**Target System:** `s_cool_crm` (Laravel 11 Backend)  
**Consumer:** `react-hrm-app` (React Native Mobile Application)  
**Status:** Codebase-Verified Reference Guide (No backend files modified)

---

## 1. Verified Architecture State

Following line-by-line inspection of `s_cool_crm` database migrations and controllers:

1. **Database Indexing:**  
   The database schema is **already fully indexed** for high-frequency queries:
   - `attendance_records`: Composite index `['employee_id', 'date']` exists (`2026_05_27_123900_add_bootstrap_performance_indexes.php`), plus dedicated indexes on `date` and `in_status` (`2026_06_12_133000_optimize_and_clean_database_tables.php`).
   - `employee_activities`: Indexed on `activity_date`, `submitted_at`, `status`, and foreign key `employee_id`.
   - `leave_requests`: Indexed on `start_date`, `end_date`, `status`, and foreign key `employee_id`.
   - `notifications`: Composite indexes `['employee_id', 'app_category', 'read_at']` and `['notifiable_type', 'notifiable_id', 'app_category', 'read_at']` exist.
   - `employees`: `auth_token` column has a unique constraint, creating an automatic unique B-tree index.
   *No database migration changes are needed.*

2. **Reverse Geocoding:**  
   - Attendance clock-in/out (`ScanAttendanceScreen.tsx` / `QrAttendanceController@scanClock`) does **not** perform reverse geocoding; it validates GPS latitude/longitude against branch coordinates using radius calculations.
   - Reverse geocoding is only used when filing field reports in `CreateActivityScreen.tsx`.
   - The mobile app now uses native OS geocoding (`Location.reverseGeocodeAsync` via Apple CoreLocation & Android Google Play Services Geocoder), which runs entirely on the device for free.
   *No backend reverse geocoding proxy is required.*

3. **Pagination:**  
   - All mobile endpoints (`EmployeeAppController@history`, `ActivityController@index`, `LeaveRequestController@index`) **already support** the `per_page` query parameter (defaulting to 15 if omitted).
   - The previous truncation issue was resolved on the mobile app side by passing `per_page: 50` (or `per_page: 35` for monthly attendance history).
   *No backend pagination modifications are required.*

---

## 2. Recommended Backend Enhancements (Optional / Future Hardening)

These items are documented for future backend maintenance and are **not** blocking current mobile app operations:

### 2.1. Register Explicit Logout Route (Optional)
**Current State:**  
When the user taps Log Out in the mobile app, the client clears credentials and biometric keys from SecureStore, and attempts to notify the backend at `POST /api/employee-app/logout`. Since this route does not exist in `routes/api.php`, the request returns `404 Not Found`.

**Suggested Improvement:**  
Add a simple logout handler under `employee-app` in `routes/api.php` so the request succeeds:
```php
Route::prefix('employee-app')->middleware([\App\Http\Middleware\AuthenticateEmployeeByToken::class])->group(function () {
    Route::post('logout', function () {
        return response()->json(['success' => true, 'message' => 'Logged out successfully']);
    });
});
```

### 2.2. Multi-Device Token Management via Sanctum (Future Enterprise Hardening)
**Current State:**  
`AuthenticateEmployeeByToken.php` already supports Laravel Sanctum personal access tokens (`PersonalAccessToken::findToken($cleanToken)`). However, `QrAttendanceController` currently generates and stores a single static `employees.auth_token` string.

**Suggested Improvement:**  
If the enterprise requires individual per-device token revocation (e.g., revoking one lost phone without logging out other devices), migrate `QrAttendanceController` login methods to issue tokens via `$employee->createToken(...)` instead of writing to `employees.auth_token`.
