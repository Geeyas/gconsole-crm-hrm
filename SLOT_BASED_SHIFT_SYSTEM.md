# Slot-Based Shift Assignment System

## Overview
The slot-based shift assignment system ensures that each qualified employee only sees **ONE available slot** per shift, regardless of how many staff positions are needed. This prevents confusion and creates a fair assignment process.

## Core Logic

### How It Works

1. **Shift Creation**: When a shift requires 2 staff members, 2 separate slots are created in the `Clientstaffshifts` table
2. **Employee View**: Each qualified employee only sees 1 available slot per shift
3. **Slot Assignment**: Once an employee accepts a slot, they don't see additional slots for that shift
4. **Slot Recycling**: If an employee rejects a slot, it becomes available again for other qualified employees

### Employee Portal Behavior

#### Scenario 1: Employee Has No Slot
- **Display**: Shows "1 slot available" 
- **Action**: Can accept the shift
- **Button**: "Accept Shift"

#### Scenario 2: Employee Has Accepted Slot
- **Display**: Shows "Pending Approval" status
- **Action**: Cannot accept additional slots for this shift
- **Button**: "Pending" (disabled)

#### Scenario 3: Employee Slot Approved
- **Display**: Shows "Approved" status
- **Action**: Shift is confirmed
- **Button**: "Approved" (disabled)

#### Scenario 4: Employee Slot Rejected
- **Display**: Slot becomes available again
- **Action**: Can accept the shift again
- **Button**: "Accept Shift"

## Database Structure

### Clientshiftrequests Table
- Contains the main shift information
- `Totalrequiredstaffnumber` defines how many slots to create

### Clientstaffshifts Table
- Contains individual slots for each shift
- Each row represents one position/slot
- Status values: `'open'`, `'pending approval'`, `'approved'`, `'rejected'`

## API Changes

### GET /api/available-client-shifts (Employee View)

#### New Response Fields
```javascript
{
  "shiftrequestid": 123,
  "clientname": "ABC Hospital",
  "locationname": "ICU Ward",
  "Shiftdate": "2025-08-15",
  "Starttime": "08:00:00",
  "Endtime": "16:00:00",
  
  // NEW SLOT-BASED FIELDS
  "slotStatus": "available|pending approval|approved|unavailable",
  "slotId": 456,              // ID of the slot for this employee
  "availableSlots": 1,        // Always 1 for employees (0 if none available)
  "hasUserSlot": false,       // true if employee already has a slot
  "canAccept": true,          // false if employee already has a slot
  
  "StaffShifts": [
    {
      "id": 456,
      "Status": "open",
      "Assignedtouserid": null,
      "employee_name": null
    }
  ]
}
```

#### Status Definitions
- **`available`**: Employee can accept this slot
- **`pending approval`**: Employee has accepted, waiting for admin approval
- **`approved`**: Employee's slot has been approved by admin
- **`unavailable`**: No slots available for this shift

## Workflow Examples

### Example 1: 2-Person Shift Assignment

1. **Initial State**: Shift created requiring 2 staff
   - Slot A: Status = 'open'
   - Slot B: Status = 'open'

2. **Employee John Views**: Sees "1 slot available"

3. **Employee Sarah Views**: Sees "1 slot available" (different slot)

4. **John Accepts**: 
   - Slot A: Status = 'pending approval', Assigned to John
   - John sees: "Pending Approval"
   - Sarah still sees: "1 slot available" (Slot B)

5. **Sarah Accepts**:
   - Slot B: Status = 'pending approval', Assigned to Sarah
   - John sees: "Pending Approval"
   - Sarah sees: "Pending Approval"

6. **Admin Approves John**:
   - Slot A: Status = 'approved'
   - John sees: "Approved"

7. **Admin Rejects Sarah**:
   - Slot B: Status = 'open', Assigned to null
   - Sarah sees: "1 slot available" (can try again)
   - Other qualified employees now see: "1 slot available"

## Benefits

1. **Simplified UI**: Employees see clear, simple options
2. **Fair Distribution**: Prevents one employee from taking multiple slots
3. **Flexible Management**: Admins can still manage all slots
4. **Automatic Recycling**: Rejected slots become available immediately
5. **No Double Booking**: System prevents employees from having multiple slots per shift

## Technical Implementation

### Database Queries
The system uses subqueries to:
- Check if employee already has a slot for the shift
- Count available open slots
- Determine employee's current slot status
- Filter shifts to show only relevant ones

### Status Transitions
- `open` → `pending approval` (employee accepts)
- `pending approval` → `approved` (admin approves)
- `pending approval` → `open` (admin rejects)
- Any status → `open` (if employee is removed)

## Testing Scenarios

1. **Test Slot Visibility**: Ensure employees only see 1 slot per shift
2. **Test Acceptance**: Verify employee can accept available slots
3. **Test Pending Status**: Confirm pending slots show correct status
4. **Test Rejection Recovery**: Verify rejected slots become available again
5. **Test Multiple Employees**: Test with multiple employees on same shift
6. **Test Admin View**: Ensure admins still see all slots

## Frontend Integration

The frontend should:
1. Check `slotStatus` to determine button text and state
2. Use `canAccept` to enable/disable accept button
3. Display `slotStatus` as status indicator
4. Use `slotId` for accept/reject API calls

## API Endpoints Affected

- `GET /api/available-client-shifts` - Modified for employee slot logic
- `POST /api/client-staff-shifts/:id/accept` - Existing, works with new system
- `POST /api/client-staff-shifts/:id/approve` - Existing, works with new system
- `POST /api/client-staff-shifts/:id/reject` - Existing, works with new system
