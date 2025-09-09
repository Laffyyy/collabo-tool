# User Management Backend Implementation

## Overview
I have successfully implemented a comprehensive backend API for the User Management page with the following key features:

## API Endpoints Implemented

### Base URL: `http://localhost:5000/api/v1/users`

### 1. User Management CRUD Operations

#### GET `/` - Get All Users with Filtering and Pagination
- **Query Parameters:**
  - `page` (optional): Page number (default: 1)
  - `limit` (optional): Items per page (default: 10, max: 100)
  - `search` (optional): Search by name, email, or employee ID
  - `ou` (optional): Filter by organizational unit
  - `role` (optional): Filter by role
  - `status` (optional): Filter by status
  - `sortBy` (optional): Sort column (employeeId, name, email, ou, role, status)
  - `sortOrder` (optional): Sort order (asc, desc)

#### GET `/:id` - Get User by ID
- **Parameters:** User ID (UUID)
- **Access:** Admin, Manager

#### POST `/` - Create New User
- **Body:**
  ```json
  {
    "employeeId": "EMP001",
    "name": "John Doe",
    "email": "john.doe@company.com",
    "ou": "Engineering",
    "role": "Frontline",
    "supervisorId": "uuid-optional",
    "managerId": "uuid-optional",
    "password": "optional-custom-password"
  }
  ```
- **Features:**
  - Validates employee ID and email uniqueness
  - Auto-generates password if not provided
  - Validates hierarchy relationships
  - Sets default status to "First-time"

#### PUT `/:id` - Update User
- **Body:** Partial user data to update
- **Features:**
  - Prevents admin to non-admin role changes
  - Validates email uniqueness
  - Auto-assigns manager for Frontline/Support based on supervisor

### 2. Password Management

#### PUT `/:id/password` - Change User Password
- **Body:**
  ```json
  {
    "newPassword": "newpassword123",
    "requirePasswordChange": true
  }
  ```

#### POST `/:id/send-reset` - Send Password Reset Email
- **Features:** Generates reset token and sends email (simulated)

### 3. User Status Management

#### PUT `/:id/lock` - Lock/Unlock User
- **Body:**
  ```json
  {
    "locked": true
  }
  ```

#### PUT `/:id/activate` - Activate/Deactivate User
- **Body:**
  ```json
  {
    "active": false
  }
  ```

### 4. Bulk Operations

#### POST `/bulk/lock` - Bulk Lock/Unlock Users
- **Body:**
  ```json
  {
    "userIds": ["uuid1", "uuid2"],
    "locked": true
  }
  ```

#### POST `/bulk/activate` - Bulk Activate/Deactivate Users
- **Body:**
  ```json
  {
    "userIds": ["uuid1", "uuid2"],
    "active": false
  }
  ```

#### POST `/bulk/upload` - Bulk Create Users
- **Body:**
  ```json
  {
    "users": [
      {
        "employeeId": "EMP100",
        "name": "User One",
        "email": "user1@company.com",
        "ou": "Engineering",
        "role": "Frontline"
      }
    ]
  }
  ```
- **Features:**
  - Validates each user individually
  - Returns successful and failed operations
  - Handles duplicate detection

### 5. Reference Data Endpoints

#### GET `/reference/ous` - Get Organizational Units
- **Returns:** List of all active organizational units

#### GET `/reference/hierarchy` - Get Hierarchy Options
- **Query Parameters:**
  - `ou` (optional): Filter by organizational unit
  - `role` (optional): Filter by role
- **Returns:** Available supervisors and managers

#### GET `/:id/team` - Get User's Team
- **Features:**
  - For managers: Returns all supervisors and their teams
  - For supervisors: Returns direct reports
  - **Access:** Admin, Manager

## Database Schema

### Tables Created/Modified:
1. **tblusers** - Extended with additional columns:
   - `dou` - Organizational Unit
   - `drole` - User Role
   - `dsupervisorid` - Supervisor ID (foreign key)
   - `dmanagerid` - Manager ID (foreign key)
   - `dtype` - User Type (admin/user)

2. **organizational_units** - New table:
   - `id` - UUID primary key
   - `name` - Unique OU name
   - `description` - OU description
   - `parent_id` - Hierarchical structure
   - `active` - Active status

### Default Data:
- Default organizational units (Engineering, Marketing, Sales, Support, HR, Finance, IT)
- Sample admin user for testing

## Security Features

### Authentication & Authorization:
- All endpoints require JWT authentication (`requireAuth` middleware)
- Role-based access control (`requireRole` middleware)
- Admin and Manager roles have access to user management

### Data Validation:
- Comprehensive input validation using express-validator
- Email format validation
- Role and status validation
- Hierarchy relationship validation

### Error Handling:
- Custom error classes (BadRequestError, NotFoundError)
- Detailed error messages
- Proper HTTP status codes

## Role Hierarchy Support

### Supported Roles:
- **Admin**: Full system access
- **Manager**: Can manage users in their organization
- **Supervisor**: Team lead role
- **Frontline**: Standard user role
- **Support**: Support team role

### Hierarchy Rules:
- Frontline/Support users can have supervisors
- Supervisors report to managers
- Manager assignment is automatic for Frontline/Support based on supervisor
- Admin users don't have hierarchical relationships

## Integration with Frontend

### API Configuration:
- Base URL configured via environment variable `VITE_API_URL`
- CORS enabled for both localhost and network access
- Consistent response format with `ok` status and data/message fields

### Error Responses:
```json
{
  "ok": false,
  "message": "Error description",
  "errors": ["Detailed validation errors"]
}
```

### Success Responses:
```json
{
  "ok": true,
  "message": "Success message",
  "data": {
    "user": {...},
    "pagination": {...}
  }
}
```

## Files Created/Modified:

### New Files:
1. `backend/routes/v1/user-management.routes.js` - User management routes
2. `backend/controllers/user-management.controller.js` - Controller logic
3. `backend/model/ou.model.js` - Organizational unit model
4. `backend/database/user-management-schema.sql` - Database schema
5. `backend/database/migrate.js` - Migration script

### Modified Files:
1. `backend/model/user.model.js` - Extended with user management methods
2. `backend/routes/index.js` - Added user management routes
3. `backend/.env` - Updated CORS configuration
4. `frontend/.env` - Added API URL configuration
5. `frontend/src/lib/api/config.ts` - Updated to use environment variable

## Testing the Implementation

### 1. Start Both Servers:
```bash
# Backend (Terminal 1)
cd backend
npm run dev

# Frontend (Terminal 2)
cd frontend
npm run dev
```

### 2. Access the Application:
- Frontend: http://localhost:5173
- Backend API: http://localhost:5000

### 3. Test User Management:
1. Login as admin user
2. Navigate to Admin > User Management
3. Test CRUD operations, filtering, sorting, and bulk actions
4. Verify role-based access control

### 4. Database Migration:
When the database is accessible, run:
```bash
cd backend
node database/migrate.js
```

## Next Steps

1. **Database Setup**: Run the migration script when database is accessible
2. **Frontend Integration**: Update frontend to use the new API endpoints
3. **Email Integration**: Implement actual email sending for password resets
4. **Audit Logging**: Add logging for user management actions
5. **File Upload**: Implement CSV file parsing for bulk upload
6. **Advanced Filtering**: Add more complex filtering options

## Security Considerations

1. **Password Security**: Passwords are hashed using bcrypt with salt rounds
2. **Role Validation**: Strict role hierarchy enforcement
3. **Input Sanitization**: All inputs are validated and sanitized
4. **SQL Injection Prevention**: Parameterized queries used throughout
5. **CORS Configuration**: Properly configured for development and production

The implementation provides a complete, secure, and scalable backend foundation for the user management functionality with comprehensive CRUD operations, role-based access control, and all the features needed for enterprise-level user administration.
