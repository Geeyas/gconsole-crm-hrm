# Database Trigger Fix Commands

## Option 1: Using MySQL Command Line
```bash
mysql -h 34.129.181.173 -u root -p testdb
# Enter password: #Business12

# Then run these commands:
DROP TRIGGER IF EXISTS Attachments_BEFORE_INSERT;

DELIMITER $$
CREATE TRIGGER Attachments_BEFORE_INSERT
BEFORE INSERT ON Attachments
FOR EACH ROW
BEGIN
    SET new.Sysstarttime = current_timestamp();
    -- REMOVED the problematic line: SET new.Filestoreid = current_timestamp();
END$$
DELIMITER ;

SHOW TRIGGERS LIKE 'Attachments';
exit
```

## Option 2: Using MySQL Workbench or phpMyAdmin
1. Connect to your database (34.129.181.173)
2. Select database `testdb`
3. Go to Triggers section
4. Delete the `Attachments_BEFORE_INSERT` trigger
5. Create new trigger with this code:
```sql
CREATE TRIGGER `Attachments_BEFORE_INSERT`
BEFORE INSERT ON `Attachments`
FOR EACH ROW
BEGIN
    SET new.Sysstarttime = current_timestamp();
END
```

## Verification
After fixing the trigger, test by uploading a new PDF. The `Filestoreid` field should contain GCS paths like:
`Shifts/2025/09/29/shift-191_1759144668146_d36s1vfdggq.pdf`

Instead of timestamps like:
`2025-09-29 11:17:50`
