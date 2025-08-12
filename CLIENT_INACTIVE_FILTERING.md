# Client Inactive Status Filtering - Implementation Summary

## Problem Statement
When a Client is marked as inactive (`IsInactive = 1`), ClientLocations associated with that client should not be displayed to users who are linked to those locations.

## Root Cause
The existing API endpoints were not checking the client's `IsInactive` status when returning client locations and related data.

## Changes Made

### 1. Updated `getMyClientLocations` Function
**File**: `controllers/authController.js` (lines ~1220 & ~1250)

**For Staff/Admin users:**
```sql
-- BEFORE
WHERE cl.Deletedat IS NULL

-- AFTER  
WHERE cl.Deletedat IS NULL AND c.Deletedat IS NULL AND (c.IsInactive = 0 OR c.IsInactive IS NULL)
```

**For Client users:**
```sql
-- BEFORE
WHERE cl.ID IN (...) AND cl.Deletedat IS NULL

-- AFTER
WHERE cl.ID IN (...) AND cl.Deletedat IS NULL AND c.Deletedat IS NULL AND (c.IsInactive = 0 OR c.IsInactive IS NULL)
```

### 2. Updated `getAllClientLocations` Function
**File**: `controllers/authController.js` (line ~1290)

```sql
-- BEFORE
WHERE ut.Name = 'Client - Standard User' AND cl.id IS NOT NULL AND p.Emailaddress IS NOT NULL

-- AFTER
WHERE ut.Name = 'Client - Standard User' AND cl.id IS NOT NULL AND p.Emailaddress IS NOT NULL 
  AND cl.Deletedat IS NULL AND c.Deletedat IS NULL AND (c.IsInactive = 0 OR c.IsInactive IS NULL)
```

### 3. Updated `getClientLocations` Function
**File**: `controllers/authController.js` (line ~1960)

```sql
-- BEFORE
SELECT * FROM Clients
SELECT * FROM Clientlocations

-- AFTER
SELECT * FROM Clients WHERE Deletedat IS NULL AND (IsInactive = 0 OR IsInactive IS NULL)
SELECT cl.* FROM Clientlocations cl LEFT JOIN Clients c ON cl.clientid = c.id 
WHERE cl.Deletedat IS NULL AND c.Deletedat IS NULL AND (c.IsInactive = 0 OR c.IsInactive IS NULL)
```

### 4. Updated `linkClientUserToLocation` Function
**File**: `controllers/authController.js` (lines ~1189 & ~1197)

```sql
-- BEFORE
SELECT * FROM Clientlocations WHERE clientid = ?

-- AFTER
SELECT * FROM Clientlocations WHERE clientid = ? AND Deletedat IS NULL
```

### 6. Updated `getClientUserLocationsByEmail` Function  
**File**: `controllers/authController.js` (line ~2025)

This function is used by the "Manage Client Links" dialog in the frontend:
```sql
-- BEFORE
WHERE cl.ID IN (...)

-- AFTER
WHERE cl.ID IN (...) AND cl.Deletedat IS NULL AND c.Deletedat IS NULL AND (c.IsInactive = 0 OR c.IsInactive IS NULL)
```

### 7. Updated Generic CRUD `getAll` Function
**File**: `controllers/crudController.js` (line ~107)

Added special handling for Clientlocations table to filter by client active status:
```sql
-- Special case for Clientlocations table
SELECT cl.* FROM Clientlocations cl
LEFT JOIN Clients c ON cl.clientid = c.id
WHERE cl.Deletedat IS NULL AND c.Deletedat IS NULL AND (c.IsInactive = 0 OR c.IsInactive IS NULL)
```
**File**: `controllers/authController.js` (lines ~1390 & ~1470)

Added client active status filtering to shift queries:
```sql
-- BEFORE
WHERE csr.deletedat IS NULL

-- AFTER
WHERE csr.deletedat IS NULL AND c.Deletedat IS NULL AND (c.IsInactive = 0 OR c.IsInactive IS NULL)
```

## API Endpoints Affected

1. **GET `/api/my-client-locations`** - Returns client locations for logged-in user
2. **GET `/api/all-client-locations`** - Returns all client locations (staff/admin only)  
3. **GET `/api/client-locations`** - Returns all clients with locations (public)
4. **GET `/api/clientLocation`** - Returns all clients with locations (CRUD route)
5. **GET `/api/Clientlocations`** - Generic CRUD route for client locations
6. **GET `/api/client-user-locations`** - Used by "Manage Client Links" dialog
7. **POST `/api/link-client-user-location`** - Links user to client and returns locations
8. **GET `/api/available-client-shifts`** - Returns available shifts (also filtered by client status)

## Business Logic

The filtering logic considers a client as "active" when:
- `IsInactive = 0` OR `IsInactive IS NULL`
- `Deletedat IS NULL` (not soft-deleted)

This means:
- ✅ New clients (IsInactive = NULL) are considered active
- ✅ Explicitly active clients (IsInactive = 0) are included
- ❌ Inactive clients (IsInactive = 1) are excluded
- ❌ Soft-deleted clients (Deletedat IS NOT NULL) are excluded

## Testing

To test the implementation:

1. **Mark a client as inactive:**
   ```sql
   UPDATE Clients SET IsInactive = 1 WHERE ID = [client_id];
   ```

2. **Test API endpoints:**
   - GET `/api/my-client-locations` - Should not show locations from inactive client
   - GET `/api/all-client-locations` - Should not show locations from inactive client
   - GET `/api/client-locations` - Should not show inactive client or their locations

3. **Reactivate client:**
   ```sql
   UPDATE Clients SET IsInactive = 0 WHERE ID = [client_id];
   ```

4. **Verify locations reappear** in API responses

## Notes

- The changes are backward compatible
- No database schema changes required
- Existing `IsInactive` field in Clients table is used
- All related shift operations also respect client active status
- Client locations are only hidden, not deleted, so they can be restored when client is reactivated
