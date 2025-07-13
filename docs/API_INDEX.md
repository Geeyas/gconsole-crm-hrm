# API Documentation Index

## Quick Reference Guide

This document provides a quick reference to all available APIs in the GConsole CRM-HRM system.

---

## 🔐 Authentication APIs

| Endpoint | Method | Description | User Types | Auth Required |
|----------|--------|-------------|------------|---------------|
| `/api/login` | POST | User login and JWT token generation | All | No |
| `/api/refresh-token` | POST | Refresh access token | All | Yes |
| `/api/logout` | POST | User logout and token cleanup | All | Yes |
| `/api/register` | POST | Register new user | Staff/Admin | Yes |

---

## 👤 Employee Qualification Management APIs

| Endpoint | Method | Description | User Types | Auth Required |
|----------|--------|-------------|------------|---------------|
| `/api/my-qualifications` | GET | **NEW** - Get employee's own qualifications | Employee | Yes |
| `/api/people/:id/qualifications` | GET | Get qualifications for specific person | Staff/Admin/Self | Yes |
| `/api/people/:id/qualifications` | POST | Add qualification to employee | Staff/Admin/Self | Yes |
| `/api/people/:id/qualifications/:qualificationId` | DELETE | Remove qualification from employee | Staff/Admin/Self | Yes |
| `/api/people/:id/qualifications/:qualificationId/registration-details` | GET | Get registration details | Staff/Admin/Self | Yes |
| `/api/people/:id/qualifications/:qualificationId/registration-details` | PUT | Set registration details | Staff/Admin/Self | Yes |

---

## 📋 Shift Management APIs

| Endpoint | Method | Description | User Types | Auth Required |
|----------|--------|-------------|------------|---------------|
| `/api/clientshiftrequests` | POST | Create new shift request | Client/Staff/Admin | Yes |
| `/api/clientshiftrequests/:id` | PUT | Update shift request | Creator/Staff/Admin | Yes |
| `/api/clientshiftrequests/:id` | DELETE | Delete shift request | Creator/Staff/Admin | Yes |
| `/api/available-client-shifts` | GET | Get available shifts | All | Yes |
| `/api/clientstaffshifts/:id/accept` | POST | Accept a shift | Employee/Staff/Admin | Yes |
| `/api/clientstaffshifts/:id/approve` | POST | Approve a shift | Staff/Admin | Yes |
| `/api/clientstaffshifts/:id/reject` | POST | Reject a shift | Staff/Admin | Yes |
| `/api/clientstaffshifts/:id/assign-employee` | POST | Assign employee to shift | Staff/Client/Admin | Yes |
| `/api/clientstaffshifts/:id/remove-employee` | POST | Remove employee from shift | Staff/Client/Admin | Yes |
| `/api/my-shifts` | GET | Get employee's assigned shifts | Employee/Staff/Admin | Yes |

---

## 🏢 Client Management APIs

| Endpoint | Method | Description | User Types | Auth Required |
|----------|--------|-------------|------------|---------------|
| `/api/link-client-user-location` | POST | Link client user to client | Staff/Admin | Yes |
| `/api/link-client-user-specific-location` | POST | Link client to specific location | Staff/Admin | Yes |
| `/api/unlink-client-user-specific-location` | POST | Unlink client from specific location | Staff/Admin | Yes |
| `/api/unlink-client-user` | POST | Unlink client user from client | Staff/Admin | Yes |
| `/api/my-client-locations` | GET | Get client locations for user | Client/Staff/Admin | Yes |
| `/api/all-client-locations` | GET | Get all client locations | Staff/Admin | Yes |
| `/api/client-user-locations` | GET | Get client user locations by email | Staff/Admin | Yes |
| `/api/client-locations` | GET | Get all clients and locations | All | No |

---

## 👥 User Management APIs

| Endpoint | Method | Description | User Types | Auth Required |
|----------|--------|-------------|------------|---------------|
| `/api/people/:id` | PUT | Update user profile | Staff/Admin/Self | Yes |
| `/api/people/me` | GET | Get own People info | All | Yes |
| `/api/update-password` | PUT | Update user password | Staff/Admin | Yes |
| `/api/People/:id` | DELETE | Soft delete person | Staff/Admin | Yes |
| `/api/user/:id/usertype` | GET | Get user type info | All | No |
| `/api/tables` | GET | Get all database tables | All | No |

---

## 🔧 Generic CRUD APIs

| Endpoint | Method | Description | User Types | Auth Required |
|----------|--------|-------------|------------|---------------|
| `/api/:table` | GET | Get all records from table | All | No |
| `/api/:table/:id` | GET | Get specific record by ID | All | No |
| `/api/:table` | POST | Create new record | All | No |
| `/api/:table/:id` | PUT | Update record | All | No |
| `/api/:table/:id` | DELETE | Delete record | All | No |
| `/api/:table/paginated` | GET | Get paginated records | All | No |

---

## 📊 API Response Codes

| Code | Description | Usage |
|------|-------------|-------|
| 200 | Success | Successful GET, PUT, DELETE operations |
| 201 | Created | Successful POST operations |
| 400 | Bad Request | Invalid parameters or missing fields |
| 401 | Unauthorized | Missing or invalid JWT token |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Resource not found |
| 409 | Conflict | Duplicate or conflicting data |
| 500 | Internal Server Error | Server-side error |

---

## 🔑 User Types & Permissions

### System Admin
- **Full Access**: Can perform all operations
- **User Management**: Register, update, delete users
- **System Configuration**: Access all tables and data

### Staff - Standard User
- **Administrative Functions**: Manage employees, clients, shifts
- **Qualification Management**: Assign/remove qualifications
- **Shift Management**: Approve/reject shifts, assign employees
- **Client Management**: Link/unlink clients to locations

### Client - Standard User
- **Client-Specific Operations**: View assigned locations
- **Shift Creation**: Create shift requests for their locations
- **Employee Assignment**: Assign employees to shifts
- **Limited Access**: Can only access their own client data

### Employee - Standard User
- **Self-Service**: View own qualifications and shifts
- **Shift Acceptance**: Accept available shifts
- **Profile Management**: Update own profile
- **Limited Access**: Can only access own data

---

## 📝 Common Request Headers

```javascript
{
  'Authorization': 'Bearer <JWT token>',
  'Content-Type': 'application/json'
}
```

---

## 🔍 Search & Filter Options

### Available Client Shifts
- `?date=YYYY-MM-DD` - Filter by specific date
- `?all=true` - Get all shifts (Admin/Staff only)
- `?limit=10&page=1` - Pagination
- `?format=simple` - Simple response format

### User Management
- `?limit=10&page=1` - Pagination for user lists

---

## 📋 Database Tables Reference

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `Users` | User authentication | id, username, email, passwordhash |
| `People` | Employee/client details | ID, Linkeduserid, Firstname, Lastname |
| `Staffqualifications` | Employee qualifications | Userid, QualificationID, Registrationnumber |
| `Qualifications` | Available qualifications | ID, Name |
| `Clientshiftrequests` | Shift requests | ID, Clientid, Shiftdate, Starttime, Endtime |
| `Clientstaffshifts` | Individual shift slots | ID, Clientshiftrequestid, Assignedtouserid |
| `Userclients` | User-client relationships | userid, clientid, clientlocationid |
| `Clients` | Client information | ID, Name |
| `Clientlocations` | Client locations | ID, Clientid, LocationName |

---

## 🚀 Quick Start Examples

### Employee Login & View Qualifications
```bash
# 1. Login
curl -X POST /api/login \
  -H "Content-Type: application/json" \
  -d '{"username": "employee@example.com", "password": "password123"}'

# 2. View own qualifications
curl -X GET /api/my-qualifications \
  -H "Authorization: Bearer <JWT_TOKEN>"
```

### Staff Assign Qualification
```bash
# Add qualification to employee
curl -X POST /api/people/123/qualifications \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"qualificationId": 1}'
```

### Client Create Shift
```bash
# Create shift request
curl -X POST /api/clientshiftrequests \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "clientlocationid": 1,
    "shiftdate": "2024-02-01",
    "starttime": "2024-02-01 08:00:00",
    "endtime": "2024-02-01 16:00:00",
    "qualificationgroupid": 1,
    "totalrequiredstaffnumber": 2
  }'
```

---

## 📞 Support & Troubleshooting

### Common Issues
1. **401 Unauthorized**: Check JWT token validity and expiration
2. **403 Forbidden**: Verify user type has required permissions
3. **404 Not Found**: Confirm resource ID exists and is accessible
4. **500 Server Error**: Check server logs for detailed error information

### Getting Help
- **API Documentation**: Check `docs/apiDocs.js` for detailed endpoint information
- **Database Schema**: Refer to ERD diagram for table relationships
- **Error Logs**: Check server console for detailed error messages

---

**Last Updated**: January 2024  
**Version**: 1.0.0  
**Maintainer**: Development Team 