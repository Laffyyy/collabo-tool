# Quick Postman Authentication Test

## IMPORTANT: Postman Cookie Settings
1. Open Postman Settings (gear icon)
2. Turn ON "Automatically follow redirects"
3. Turn ON "Send cookies with requests"
4. Turn ON "Capture cookies and headers"

## Step-by-Step Authentication Test

### Step 1: Health Check
```
GET http://localhost:5000/health
```
**Expected**: `200 OK` - Confirms server is running

### Step 2: Login (Request OTP)
```
POST http://localhost:5000/api/v1/auth/login
Content-Type: application/json

{
  "username": "jkezpascual@gmail.com",
  "password": "your_actual_password"
}
```
**Expected**: `200 OK` with message "OTP sent to your email"
**Action**: Check your backend console for the OTP code (🔑 DEVELOPMENT MODE: OTP CODE: XXXXXX)

### Step 3: Verify OTP (Get Authentication Cookies)
```
POST http://localhost:5000/api/v1/auth/otp
Content-Type: application/json

{
  "userId": "327404ce-d1dd-4a93-a108-dfa5a415a734",
  "username": "JohnDoe",
  "otp": "REPLACE_WITH_ACTUAL_OTP"
}
```
**Expected**: `200 OK` with user data
**Important**: This automatically sets authentication cookies in Postman

### Step 4: Test Protected Endpoint
```
GET http://localhost:5000/api/v1/users/reference/ous
```
**Expected**: `200 OK` with organizational units (this works based on your logs)

### Step 5: Test User Endpoint (The Failing One)
```
GET http://localhost:5000/api/v1/users?page=1&limit=10&status=first-time&sortOrder=asc
```
**Expected**: This should work now, but if it gives 500 error, there's a server-side issue

## Troubleshooting

### If you get 401 "Authentication required":
1. Make sure cookies are enabled in Postman
2. Verify you completed steps 2 and 3 successfully
3. Check that the cookies are being sent (check Postman cookies tab)

### If you get 500 Internal Server Error:
1. This means authentication worked but there's a server-side error
2. Check the backend console for detailed error messages
3. Likely a database query issue or missing data

## Backend Console Monitoring
Watch your backend console for:
- OTP codes during login
- Authentication success/failure messages
- Any database errors during user queries
