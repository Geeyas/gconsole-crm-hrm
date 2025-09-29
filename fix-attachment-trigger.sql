-- Fix for PDF attachment corruption issue
-- This script removes the problematic database trigger that overwrites Filestoreid with timestamps

-- Drop the trigger that's causing the corruption
DROP TRIGGER IF EXISTS Attachments_BEFORE_INSERT;

-- Create a new trigger that only sets Sysstarttime (not Filestoreid)
DELIMITER $$
CREATE TRIGGER Attachments_BEFORE_INSERT
BEFORE INSERT ON Attachments
FOR EACH ROW
BEGIN
    SET new.Sysstarttime = current_timestamp();
    -- Removed: SET new.Filestoreid = current_timestamp(); -- This was causing corruption
END$$
DELIMITER ;

-- Display the current trigger
SHOW TRIGGERS LIKE 'Attachments';

-- Test query to see recent attachments
SELECT 
    a.ID, 
    a.Filename, 
    a.Filestoreid, 
    a.Sysstarttime,
    a.Createdat
FROM Attachments a 
WHERE a.ID > 35
ORDER BY a.ID;

-- Note: After this fix, new uploads should store proper GCS paths in Filestoreid
-- instead of timestamps like "2025-09-29 11:04:43"
