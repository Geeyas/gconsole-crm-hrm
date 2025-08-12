# Duplicate Shift Prevention Documentation

## Overview
A new duplicate shift prevention mechanism has been implemented to prevent the creation of conflicting shifts and encourage the modification of existing shifts instead.

## What Constitutes a Duplicate Shift
A shift is considered a duplicate if it has **ALL** of the following identical attributes:
- **Location** (Clientlocationid)
- **Date** (Shiftdate) 
- **Start Time** (Starttime)
- **End Time** (Endtime)
- **Qualification Group** (Qualificationgroupid)

## Implementation Details

### Affected Endpoints
1. **POST /clientshiftrequests** - Creating new shifts
2. **PUT /clientshiftrequests/:id** - Updating existing shifts

### When the Check is Triggered

#### For New Shift Creation (POST)
- The duplicate check runs **before** inserting the new shift into the database
- If a duplicate is found, the creation is blocked with HTTP 409 (Conflict) status

#### For Shift Updates (PUT)
- The duplicate check runs **only** when fields that affect duplication are being updated:
  - `shiftdate`
  - `starttime` 
  - `endtime`
  - `qualificationgroupid`
- The check excludes the current shift being updated from the duplicate search
- If a duplicate would be created, the update is blocked with HTTP 409 (Conflict) status

### Response Format
When a duplicate is detected, the API returns:

```json
{
  "message": "A shift already exists for the same location, date, time, and qualification. Please modify the existing shift instead of creating a new one.",
  "existingShift": {
    "id": 123,
    "locationName": "Main Office",
    "currentStaffNumber": 3,
    "suggestedAction": "Consider updating the staff count on shift ID 123 instead of creating a duplicate shift."
  }
}
```

### User Experience Flow

#### For System Admins, Staff, and Clients:
1. **Attempt to create/update a shift** with parameters that would create a duplicate
2. **Receive error message** explaining that a duplicate exists
3. **Get information** about the existing shift including:
   - Shift ID
   - Location name
   - Current staff requirement
   - Suggested action
4. **Choose to either:**
   - Modify the existing shift's staff count using the update endpoint
   - Change the new shift's parameters (time, date, location, or qualification)

## Benefits

### For System Administration:
- **Prevents data inconsistency** from having multiple shifts for the same slot
- **Reduces confusion** for employees who might see duplicate shift postings
- **Encourages proper shift management** by consolidating requirements

### For Staff Scheduling:
- **Clearer shift visibility** - one shift per time slot per location
- **Easier staff allocation** - modify existing shifts rather than creating new ones
- **Better resource planning** - consolidated view of staffing needs

### For Clients:
- **Guided workflow** - clear direction on how to handle staffing changes
- **Prevents accidental duplicates** from repeated form submissions
- **Improved user experience** with helpful error messages

## Examples

### Example 1: Prevented Duplicate Creation
```
Existing Shift:
- Location: Downtown Office
- Date: 2025-08-15
- Time: 09:00 - 17:00
- Qualification: Security Guards
- Staff Required: 2

Attempted New Shift (BLOCKED):
- Location: Downtown Office
- Date: 2025-08-15  
- Time: 09:00 - 17:00
- Qualification: Security Guards
- Staff Required: 1

Suggested Action: Update existing shift to require 3 staff instead
```

### Example 2: Allowed Similar Shift (Different Time)
```
Existing Shift:
- Location: Downtown Office
- Date: 2025-08-15
- Time: 09:00 - 17:00
- Qualification: Security Guards

New Shift (ALLOWED):
- Location: Downtown Office
- Date: 2025-08-15
- Time: 17:00 - 01:00  ← Different time slot
- Qualification: Security Guards
```

### Example 3: Allowed Similar Shift (Different Qualification)
```
Existing Shift:
- Location: Downtown Office  
- Date: 2025-08-15
- Time: 09:00 - 17:00
- Qualification: Security Guards

New Shift (ALLOWED):
- Location: Downtown Office
- Date: 2025-08-15
- Time: 09:00 - 17:00
- Qualification: Cleaning Staff  ← Different qualification
```

## Database Query Used
The duplicate detection uses the following SQL query:

```sql
SELECT csr.id, csr.Totalrequiredstaffnumber, cl.LocationName 
FROM Clientshiftrequests csr
LEFT JOIN Clientlocations cl ON csr.Clientlocationid = cl.ID
WHERE csr.Clientlocationid = ? 
  AND csr.Shiftdate = ? 
  AND csr.Starttime = ? 
  AND csr.Endtime = ? 
  AND csr.Qualificationgroupid = ? 
  AND csr.Deletedat IS NULL
  [AND csr.id != ? -- Only for updates]
```

## Technical Notes
- All datetime comparisons are done in UTC as stored in the database
- Soft-deleted shifts (Deletedat IS NOT NULL) are excluded from duplicate checks
- The check is performed after input validation but before database insertion/update
- The existing shift information is returned to help users make informed decisions

## Future Enhancements
Potential improvements that could be added:
- Option to automatically merge shifts with a confirmation prompt
- Bulk shift management interface for handling multiple related shifts
- Shift conflict warnings for overlapping but not identical shifts
- Historical tracking of duplicate prevention actions
