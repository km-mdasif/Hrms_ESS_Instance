-- SQL Script for Employee Document Management System
-- Run this script in your MSSQL database to create the required tables

-- 1. Document master table for all document types
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Document')
BEGIN
    CREATE TABLE [dbo].[Document](
        [DocumentID] [int] IDENTITY(1,1) NOT NULL,
        [DocumentCode] [nvarchar](50) NULL,
        [DocumentName] [nvarchar](100) NULL,
        [DocumentValue] [decimal](18, 0) NULL
    );

    INSERT INTO [dbo].[Document] ([DocumentCode], [DocumentName], [DocumentValue]) VALUES
    ('1', 'AADHAR CARD', 100),
    ('2', 'RATION CARD', 500),
    ('3', 'PF CLAIM FORM', 0),
    ('4', 'Bank Pass Book', 0),
    ('5', 'EPF Acknowledgement Copy', 0),
    ('6', 'Driving License', 0),
    ('7', 'School Certificate', 0),
    ('8', 'NOC Form', 0),
    ('9', 'PAN CARD', 0),
    ('10', 'APPLICATION FORM', 0),
    ('11', 'Document 1', 0),
    ('12', 'Document 2', 0),
    ('13', 'Document 3', 0),
    ('14', 'Document 4', 0),
    ('15', 'Document 5', 0);
END
GO

-- 2. Document Path table to store document directory paths
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'DocumentPath')
BEGIN
    CREATE TABLE [dbo].[DocumentPath] (
        [documentpath] NVARCHAR(MAX) NOT NULL
    );

    INSERT INTO [dbo].[DocumentPath] ([documentpath]) VALUES ('z:\HRMS DOCUMENTS\');
END
GO

-- 3. Employee document table to store upload metadata
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'empdocument')
BEGIN
    CREATE TABLE [dbo].[empdocument] (
        [companycode] NVARCHAR(50) NULL,
        [empcode] NVARCHAR(50) NOT NULL,
        [documentname] NVARCHAR(100) NOT NULL,
        [documentextension] NVARCHAR(10) NOT NULL,
        [uploaddate] DATETIME NULL DEFAULT GETDATE()
    );
END
ELSE
BEGIN
    IF COL_LENGTH('dbo.empdocument', 'uploaddate') IS NULL
    BEGIN
        ALTER TABLE [dbo].[empdocument] ADD [uploaddate] DATETIME NULL DEFAULT GETDATE();
    END
END
GO

-- 4. Employee image table for one employee photo
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'empimage')
BEGIN
    CREATE TABLE [dbo].[empimage] (
        [companycode] NVARCHAR(50) NULL,
        [empcode] NVARCHAR(50) NOT NULL,
        [empimage] IMAGE NULL,
        [imagename] NVARCHAR(200) NULL,
        [description] NVARCHAR(200) NULL
    );
END
GO

-- 5. Employee signature table for one employee signature
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'empsignature')
BEGIN
    CREATE TABLE [dbo].[empsignature] (
        [companycode] NVARCHAR(50) NULL,
        [empcode] NVARCHAR(50) NOT NULL,
        [signatureimage] IMAGE NULL,
        [description] NVARCHAR(200) NULL
    );
END
GO

-- 6. Company document table for company documents with validity metadata
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'DocumentCompany')
BEGIN
    CREATE TABLE [dbo].[DocumentCompany](
        [DocumentID] [int] IDENTITY(1,1) NOT NULL,
        [DocumentCode] [nvarchar](50) NULL,
        [DocumentName] [nvarchar](50) NULL,
        [Status] [bit] NULL,
        [ExpiryDate] [datetime] NULL,
        [RemainderOn] [datetime] NULL,
        CONSTRAINT [PK_DocumentCompany] PRIMARY KEY CLUSTERED ([DocumentID] ASC)
    ) ON [PRIMARY];
END
GO

-- 7. Company document path table for upload storage location
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'DocumentPathCompany')
BEGIN
    CREATE TABLE [dbo].[DocumentPathCompany] (
        [documentpath] NVARCHAR(MAX) NOT NULL
    );

    INSERT INTO [dbo].[DocumentPathCompany] ([documentpath]) VALUES ('z:\HRMS COMPANY DOCUMENTS\');
END
GO

-- Optional: ensure common lookup columns exist for aligned document logic
IF COL_LENGTH('dbo.empdocument', 'companycode') IS NULL
BEGIN
    ALTER TABLE [dbo].[empdocument] ADD [companycode] NVARCHAR(50) NULL;
END
GO

-- Indexes
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_empcode' AND object_id = OBJECT_ID('dbo.empdocument'))
BEGIN
    CREATE INDEX idx_empcode ON [dbo].[empdocument] ([empcode]);
END
GO

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_documentname' AND object_id = OBJECT_ID('dbo.empdocument'))
BEGIN
    CREATE INDEX idx_documentname ON [dbo].[empdocument] ([documentname]);
END
GO

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_empimage_empcode' AND object_id = OBJECT_ID('dbo.empimage'))
BEGIN
    CREATE INDEX idx_empimage_empcode ON [dbo].[empimage] ([empcode]);
END
GO

-- 5. Attendance Geofence table for selfie attendance with location
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'AttendanceGeofence')
BEGIN
    CREATE TABLE [dbo].[AttendanceGeofence] (
        [AttendanceID] [int] IDENTITY(1,1) NOT NULL PRIMARY KEY,
        [companycode] [nvarchar](50) NOT NULL,
        [empcode] [nvarchar](50) NOT NULL,
        [attendancedate] [datetime] NOT NULL DEFAULT GETDATE(),
        [latitude] [decimal](10, 8) NOT NULL,
        [longitude] [decimal](11, 8) NOT NULL,
        [selfiimage] [image] NULL,
        [selfieimage_base64] [nvarchar](max) NULL,
        [status] [nvarchar](20) NOT NULL DEFAULT 'Present',
        [remarks] [nvarchar](500) NULL,
        [geofenceradius] [decimal](10, 2) NULL
    );
    
    CREATE INDEX idx_attendance_empcode ON [dbo].[AttendanceGeofence] ([empcode]);
    CREATE INDEX idx_attendance_date ON [dbo].[AttendanceGeofence] ([attendancedate]);
    CREATE INDEX idx_attendance_company ON [dbo].[AttendanceGeofence] ([companycode]);
END
GO

IF COL_LENGTH('dbo.AttendanceGeofence', 'geofenceradius') IS NULL
BEGIN
    ALTER TABLE [dbo].[AttendanceGeofence] ADD [geofenceradius] [decimal](10, 2) NULL;
END
GO

CREATE OR ALTER PROCEDURE [dbo].[sp_webapi]
    @operation NVARCHAR(50),
    @empcode NVARCHAR(50) = NULL,
    @documentname NVARCHAR(100) = NULL,
    @documentextension NVARCHAR(10) = NULL,
    @companycode NVARCHAR(50) = NULL,
    @username NVARCHAR(100) = NULL,
    @password NVARCHAR(100) = NULL,
    @empimage IMAGE = NULL,
    @imagename NVARCHAR(200) = NULL,
    @description NVARCHAR(200) = NULL,
    @signatureimage IMAGE = NULL,
    @latitude DECIMAL(10, 8) = NULL,
    @longitude DECIMAL(11, 8) = NULL,
    @selfie_image_base64 NVARCHAR(MAX) = NULL,
    @status NVARCHAR(20) = NULL,
    @remarks NVARCHAR(500) = NULL,
    @geofence_radius DECIMAL(10, 2) = NULL
AS
BEGIN
    SET NOCOUNT ON;

    -- Get Document Directory
    IF @operation = 'get_document_directory'
    BEGIN
        SELECT TOP 1 [documentpath] AS DocumentPath FROM [dbo].[DocumentPath];
        RETURN;
    END

    -- Get Companies
    IF @operation = 'get_companies'
    BEGIN
        SELECT [companyname] FROM [dbo].[companycreation];
        RETURN;
    END

    -- Dashboard summary
    IF @operation = 'get_dashboard_summary'
    BEGIN
        DECLARE @dashboard_total_employees INT = 0;
        DECLARE @dashboard_left_employees INT = 0;
        DECLARE @dashboard_candidate_count INT = 0;
        DECLARE @dashboard_table_name NVARCHAR(128);
        DECLARE @dashboard_status_column NVARCHAR(128);
        DECLARE @dashboard_sql NVARCHAR(MAX);

        DECLARE dashboard_table_cursor CURSOR FOR
            SELECT name FROM (VALUES ('Employee'), ('employee')) AS v(name);

        OPEN dashboard_table_cursor;
        FETCH NEXT FROM dashboard_table_cursor INTO @dashboard_table_name;
        WHILE @@FETCH_STATUS = 0
        BEGIN
            DECLARE dashboard_status_cursor CURSOR FOR
                SELECT name FROM (VALUES ('EmpStatus'), ('empstatus'), ('empstaus'), ('Status'), ('status')) AS v(name);

            OPEN dashboard_status_cursor;
            FETCH NEXT FROM dashboard_status_cursor INTO @dashboard_status_column;
            WHILE @@FETCH_STATUS = 0
            BEGIN
                IF OBJECT_ID(N'dbo.' + @dashboard_table_name) IS NOT NULL
                   AND COL_LENGTH(N'dbo.' + @dashboard_table_name, @dashboard_status_column) IS NOT NULL
                BEGIN
                    SET @dashboard_sql = N'SELECT @dashboard_total = COUNT(*) FROM [dbo].' + QUOTENAME(@dashboard_table_name) + N' WHERE ' + QUOTENAME(@dashboard_status_column) + N' = 1;';
                    EXEC sp_executesql @dashboard_sql, N'@dashboard_total INT OUTPUT', @dashboard_total = @dashboard_total_employees OUTPUT;
                    IF @dashboard_total_employees > 0 BREAK;
                END

                FETCH NEXT FROM dashboard_status_cursor INTO @dashboard_status_column;
            END
            CLOSE dashboard_status_cursor;
            DEALLOCATE dashboard_status_cursor;

            IF @dashboard_total_employees > 0 BREAK;
            FETCH NEXT FROM dashboard_table_cursor INTO @dashboard_table_name;
        END
        CLOSE dashboard_table_cursor;
        DEALLOCATE dashboard_table_cursor;

        DECLARE dashboard_left_cursor CURSOR FOR
            SELECT name FROM (VALUES ('Employee'), ('employee')) AS v(name);

        OPEN dashboard_left_cursor;
        FETCH NEXT FROM dashboard_left_cursor INTO @dashboard_table_name;
        WHILE @@FETCH_STATUS = 0
        BEGIN
            DECLARE dashboard_left_status_cursor CURSOR FOR
                SELECT name FROM (VALUES ('EmpStatus'), ('empstatus'), ('empstaus'), ('Status'), ('status')) AS v(name);

            OPEN dashboard_left_status_cursor;
            FETCH NEXT FROM dashboard_left_status_cursor INTO @dashboard_status_column;
            WHILE @@FETCH_STATUS = 0
            BEGIN
                IF OBJECT_ID(N'dbo.' + @dashboard_table_name) IS NOT NULL
                   AND COL_LENGTH(N'dbo.' + @dashboard_table_name, @dashboard_status_column) IS NOT NULL
                BEGIN
                    SET @dashboard_sql = N'SELECT @dashboard_left = COUNT(*) FROM [dbo].' + QUOTENAME(@dashboard_table_name) + N' WHERE ' + QUOTENAME(@dashboard_status_column) + N' = 0;';
                    EXEC sp_executesql @dashboard_sql, N'@dashboard_left INT OUTPUT', @dashboard_left = @dashboard_left_employees OUTPUT;
                    IF @dashboard_left_employees > 0 BREAK;
                END

                FETCH NEXT FROM dashboard_left_status_cursor INTO @dashboard_status_column;
            END
            CLOSE dashboard_left_status_cursor;
            DEALLOCATE dashboard_left_status_cursor;

            IF @dashboard_left_employees > 0 BREAK;
            FETCH NEXT FROM dashboard_left_cursor INTO @dashboard_table_name;
        END
        CLOSE dashboard_left_cursor;
        DEALLOCATE dashboard_left_cursor;

        IF @dashboard_candidate_count = 0
        BEGIN
            SET @dashboard_candidate_count = @dashboard_total_employees;
        END

        SELECT
            @dashboard_total_employees AS total_employees,
            @dashboard_left_employees AS left_employees,
            @dashboard_candidate_count AS candidate_count;
        RETURN;
    END

    -- Get Document Types
    IF @operation = 'get_document_types'
    BEGIN
        SELECT [DocumentName] AS documentname,
               [DocumentCode] AS documentcode,
               [DocumentValue] AS documentvalue
        FROM [dbo].[Document]
        WHERE LEN(ISNULL([DocumentName],'')) > 0
        ORDER BY [DocumentID];
        RETURN;
    END

    -- Get Employee Documents
    IF @operation = 'get_emp_documents'
    BEGIN
        SELECT d.[DocumentName] AS documentname,
               d.[DocumentCode] AS documentcode,
               d.[DocumentValue] AS documentvalue,
               e.[empcode],
               e.[documentextension],
               CASE WHEN e.[empcode] IS NULL THEN 0 ELSE 1 END AS isuploaded
        FROM [dbo].[Document] d
        LEFT JOIN [dbo].[empdocument] e
            ON e.[empcode] = @empcode AND e.[documentname] = d.[DocumentName]
        WHERE LEN(ISNULL(d.[DocumentName],'')) > 0
        ORDER BY d.[DocumentID];
        RETURN;
    END

    -- Get Document Metadata
    IF @operation = 'get_document_metadata'
    BEGIN
        SELECT TOP 1 [companycode], [documentextension]
        FROM [dbo].[empdocument]
        WHERE [empcode] = @empcode AND [documentname] = @documentname;
        RETURN;
    END

    -- Upsert Employee Document
    IF @operation = 'upsert_emp_document'
    BEGIN
        IF EXISTS (SELECT 1 FROM [dbo].[empdocument] WHERE [empcode] = @empcode AND [documentname] = @documentname)
        BEGIN
            UPDATE [dbo].[empdocument]
            SET [documentextension] = @documentextension,
                [companycode] = @companycode
            WHERE [empcode] = @empcode AND [documentname] = @documentname;
        END
        ELSE
        BEGIN
            INSERT INTO [dbo].[empdocument] ([companycode], [empcode], [documentname], [documentextension])
            VALUES (@companycode, @empcode, @documentname, @documentextension);
        END
        RETURN;
    END

    -- Delete Employee Document
    IF @operation = 'delete_emp_document'
    BEGIN
        DELETE FROM [dbo].[empdocument]
        WHERE [empcode] = @empcode AND [documentname] = @documentname;
        RETURN;
    END

    -- Ensure Employee Image Table
    IF @operation = 'ensure_emp_image_table'
    BEGIN
        IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'empimage')
        BEGIN
            CREATE TABLE [dbo].[empimage] (
                [companycode] NVARCHAR(50) NULL,
                [empcode] NVARCHAR(50) NOT NULL,
                [empimage] IMAGE NULL,
                [imagename] NVARCHAR(200) NULL,
                [description] NVARCHAR(200) NULL
            );
            CREATE INDEX idx_empimage_empcode ON [dbo].[empimage] ([empcode]);
        END
        RETURN;
    END

    -- Ensure Employee Signature Table
    IF @operation = 'ensure_emp_signature_table'
    BEGIN
        IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'empsignature')
        BEGIN
            CREATE TABLE [dbo].[empsignature] (
                [companycode] NVARCHAR(50) NULL,
                [empcode] NVARCHAR(50) NOT NULL,
                [signatureimage] IMAGE NULL,
                [description] NVARCHAR(200) NULL
            );
            CREATE INDEX idx_empsignature_empcode ON [dbo].[empsignature] ([empcode]);
        END
        RETURN;
    END

    -- Employee Exists Check
    IF @operation = 'employee_exists'
    BEGIN
        IF EXISTS (SELECT 1 FROM [dbo].[Employee] WHERE [empcode] = @empcode)
        BEGIN
            SELECT 1 AS employee_exists;
            RETURN;
        END
        IF EXISTS (SELECT 1 FROM [dbo].[employee] WHERE [empcode] = @empcode)
        BEGIN
            SELECT 1 AS employee_exists;
            RETURN;
        END
        SELECT 0 AS employee_exists;
        RETURN;
    END

    -- Authenticate User
    IF @operation = 'authenticate_user'
    BEGIN
        SELECT TOP 1 username, usertype, empname
        FROM (
            SELECT [username], 'admin' AS usertype, NULL AS empname, 1 AS rank
            FROM [dbo].[usermaster]
            WHERE [username] = @username AND [password] = @password
            UNION ALL
            SELECT [empcode] AS username, 'employee' AS usertype, [empname], 2 AS rank
            FROM [dbo].[employee]
            WHERE [empcode] = @username AND [empcode] = @password
        ) AS auth
        ORDER BY rank;
        RETURN;
    END

    -- Upsert Employee Image
    IF @operation = 'upsert_emp_image'
    BEGIN
        IF EXISTS (SELECT 1 FROM [dbo].[empimage] WHERE [empcode] = @empcode)
        BEGIN
            UPDATE [dbo].[empimage]
            SET [companycode] = @companycode,
                [empimage] = @empimage,
                [imagename] = @imagename,
                [description] = @description
            WHERE [empcode] = @empcode;
        END
        ELSE
        BEGIN
            INSERT INTO [dbo].[empimage] ([companycode], [empcode], [empimage], [imagename], [description])
            VALUES (@companycode, @empcode, @empimage, @imagename, @description);
        END
        RETURN;
    END

    -- Get Employee Image
    IF @operation = 'get_emp_image'
    BEGIN
        SELECT TOP 1 [companycode], [empcode], [empimage], [imagename], [description]
        FROM [dbo].[empimage]
        WHERE [empcode] = @empcode;
        RETURN;
    END

    -- Upsert Employee Signature
    IF @operation = 'upsert_emp_signature'
    BEGIN
        IF EXISTS (SELECT 1 FROM [dbo].[empsignature] WHERE [empcode] = @empcode)
        BEGIN
            UPDATE [dbo].[empsignature]
            SET [companycode] = @companycode,
                [signatureimage] = @signatureimage,
                [description] = @description
            WHERE [empcode] = @empcode;
        END
        ELSE
        BEGIN
            INSERT INTO [dbo].[empsignature] ([companycode], [empcode], [signatureimage], [description])
            VALUES (@companycode, @empcode, @signatureimage, @description);
        END
        RETURN;
    END

    -- Get Employee Signature
    IF @operation = 'get_emp_signature'
    BEGIN
        SELECT TOP 1 [companycode], [empcode], [signatureimage], [description]
        FROM [dbo].[empsignature]
        WHERE [empcode] = @empcode;
        RETURN;
    END

    -- Delete Employee Signature
    IF @operation = 'delete_emp_signature'
    BEGIN
        DELETE FROM [dbo].[empsignature]
        WHERE [empcode] = @empcode;
        RETURN;
    END

    -- Save Attendance with Geofence and Selfie
    IF @operation = 'save_attendance_geofence'
    BEGIN
        INSERT INTO [dbo].[AttendanceGeofence] ([companycode], [empcode], [latitude], [longitude], [selfieimage_base64], [status], [remarks], [geofenceradius])
        VALUES (@companycode, @empcode, @latitude, @longitude, @selfie_image_base64, @status, @remarks, @geofence_radius);
        
        SELECT SCOPE_IDENTITY() AS AttendanceID;
        RETURN;
    END

    -- Get Attendance History
    IF @operation = 'get_attendance_history'
    BEGIN
        SELECT [AttendanceID], [companycode], [empcode], [attendancedate], [latitude], [longitude], [status], [remarks], [geofenceradius]
        FROM [dbo].[AttendanceGeofence]
        WHERE [empcode] = @empcode AND CAST([attendancedate] AS DATE) = CAST(GETDATE() AS DATE)
        ORDER BY [attendancedate] DESC;
        RETURN;
    END

    -- Get Today Attendance Count
    IF @operation = 'get_today_attendance_count'
    BEGIN
        SELECT COUNT(*) AS attendance_count
        FROM [dbo].[AttendanceGeofence]
        WHERE [empcode] = @empcode AND CAST([attendancedate] AS DATE) = CAST(GETDATE() AS DATE);
        RETURN;
    END
END
GO

-- Verify tables are created
SELECT 'Document' AS TableName, COUNT(*) AS RecordCount FROM [dbo].[Document]
UNION ALL
SELECT 'DocumentPath', COUNT(*) FROM [dbo].[DocumentPath]
UNION ALL
SELECT 'empdocument', COUNT(*) FROM [dbo].[empdocument]
UNION ALL
SELECT 'empimage', COUNT(*) FROM [dbo].[empimage]
UNION ALL
SELECT 'empsignature', COUNT(*) FROM [dbo].[empsignature];