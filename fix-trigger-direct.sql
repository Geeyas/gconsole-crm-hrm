-- Direct SQL fix for the database trigger corruption
-- Connect to MySQL and execute this script

USE testdb;

-- Show current trigger
SELECT 'Current triggers:' as Info;
SHOW TRIGGERS LIKE 'Attachments';

-- Drop the problematic trigger
SELECT 'Dropping problematic trigger...' as Info;
DROP TRIGGER IF EXISTS Attachments_BEFORE_INSERT;

-- Create new trigger without the Filestoreid corruption
SELECT 'Creating new trigger...' as Info;

DELIMITER $$
CREATE TRIGGER Attachments_BEFORE_INSERT
BEFORE INSERT ON Attachments
FOR EACH ROW
BEGIN
    SET new.Sysstarttime = current_timestamp();
    -- REMOVED: SET new.Filestoreid = current_timestamp();  -- This was the problem!
END$$
DELIMITER ;

-- Verify the new trigger
SELECT 'New triggers:' as Info;
SHOW TRIGGERS LIKE 'Attachments';

-- Show the problematic records
SELECT 'Problematic records:' as Info;
SELECT ID, Filename, Filestoreid, LENGTH(Filestoreid) as Path_Length, Createdat 
FROM Attachments 
WHERE ID >= 35 
ORDER BY ID;

SELECT 'Script completed successfully!' as Status;
