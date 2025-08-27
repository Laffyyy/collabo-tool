# Backend API Testing Guide

## Prerequisites
1. **Install Postman**: Download from [postman.com](https://www.postman.com/downloads/)
2. **Import the Collection**: Import the `Collabo-Tool-Backend-API-Tests.postman_collection.json` file into Postman
3. **Start the Backend Server**: Ensure your backend is running on `http://localhost:5000`

## Quick Server Test
```powershell
# Navigate to backend directory
cd C:\Users\verno\Documents\Github\collabo-tool\backend

# Start the server
npm start

# In another terminal, test the health endpoint
Invoke-RestMethod -Uri "http://localhost:5000/health" -Method GET
```

## Authentication Flow
**IMPORTANT**: This backend uses a two-step authentication with cookies:

1. **Step 1**: Login with username/password to get an OTP sent to email
2. **Step 2**: Verify the OTP to get authentication cookies
3. **Postman Setup**: You MUST enable "Automatically follow redirects" and "Send cookies with requests" in Postman settings

### Your Database Credentials
Based on the server logs, use these credentials:
```json
{
  "username": "jkezpascual@gmail.com", 
  "password": "your_password_here"
}
```

### OTP Testing
- Watch the backend console for the OTP code (shows as `🔑 DEVELOPMENT MODE: OTP CODE: XXXXXX`)
- Use this code in the OTP verification step

## Testing Steps with Postman

### 1. Health Check
- **Endpoint**: `GET /health`
- **Auth**: None required
- **Expected**: `200 OK` with server info

### 2. Authentication Test (Step 1 - Login)
- **Endpoint**: `POST /api/v1/auth/login`
- **Body**: 
  ```json
  {
    "username": "jkezpascual@gmail.com",
    "password": "your_actual_password"
  }
  ```
- **Expected**: `200 OK` with message "OTP sent to your email"
- **Note**: Check backend console for OTP code

### 2.1 Authentication Test (Step 2 - Verify OTP)
- **Endpoint**: `POST /api/v1/auth/otp`
- **Body**: 
  ```json
  {
    "userId": "327404ce-d1dd-4a93-a108-dfa5a415a734",
    "username": "JohnDoe", 
    "otp": "XXXXXX"
  }
  ```
- **Expected**: `200 OK` with user data and tokens
- **Important**: This sets authentication cookies automatically

### 3. User Management Tests
After authentication, test these endpoints:

#### Get Users (the failing endpoint)
- **Endpoint**: `GET /api/v1/users?page=1&limit=10&status=first-time&sortOrder=asc`
- **Auth**: Bearer token (auto-set)
- **Expected**: `200 OK` with users array

#### Get Organizational Units (the other failing endpoint)
- **Endpoint**: `GET /api/v1/users/reference/ous`
- **Auth**: Bearer token (auto-set)
- **Expected**: `200 OK` with organizational units array

## Troubleshooting Common Issues

### 500 Internal Server Error
This usually indicates:
1. **Database connection issues**
2. **Missing data in database tables**
3. **Authentication/authorization problems**
4. **Server-side code errors**

### 401 Unauthorized
- Ensure you've completed the login step first
- Check that the token is being sent in the Authorization header
- Verify your admin user exists in the database

### 404 Not Found
- Verify the backend server is running on port 5000
- Check the endpoint URL is correct
- Ensure routes are properly configured

## Database Prerequisites
Your database should have these tables with data:
- `tblusers` - User accounts
- `tblorganizationalunits` - Organizational units
- `tblroles` - User roles
- `tbluserroles` - User-role relationships

## Manual Testing with PowerShell (Alternative to Postman)

### Test Health Endpoint
```powershell
Invoke-RestMethod -Uri "http://localhost:5000/health" -Method GET
```

### Test Login (Replace with your admin credentials)
```powershell
$loginData = @{
    employeeId = "ADMIN001"
    password = "admin123"
} | ConvertTo-Json

$headers = @{
    "Content-Type" = "application/json"
}

$response = Invoke-RestMethod -Uri "http://localhost:5000/api/v1/auth/login" -Method POST -Body $loginData -Headers $headers
$token = $response.data.accessToken
Write-Host "Token: $token"
```

### Test Authenticated Endpoint
```powershell
$authHeaders = @{
    "Authorization" = "Bearer $token"
    "Content-Type" = "application/json"
}

Invoke-RestMethod -Uri "http://localhost:5000/api/v1/users?page=1&limit=10" -Method GET -Headers $authHeaders
```

## Expected Database Schema
Ensure your database has these columns in the users table:
- `did` (user ID)
- `demployeeid` (employee ID)
- `dname` (full name)
- `demail` (email)
- `dpassword` (password hash)
- `dorganizationalunit` (OU)
- `drole` (role)
- `dstatus` (account status)
- `tcreatedat` (created timestamp)

## Next Steps if Issues Persist
1. Check backend console for detailed error messages
2. Verify database connection and data
3. Test individual database queries
4. Check if required admin user exists
5. Verify table schemas match the model expectations

## Backend Logs
Monitor the backend console for error messages when making requests. Common issues:
- Database connection failures
- Missing table columns
- Authentication middleware errors
- Model instantiation problems
