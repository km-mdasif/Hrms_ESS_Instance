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

-- 6. Field executive onsite visit table
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'FieldExecutiveVisit')
BEGIN
    CREATE TABLE [dbo].[FieldExecutiveVisit] (
        [VisitID] [int] IDENTITY(1,1) NOT NULL PRIMARY KEY,
        [companycode] [nvarchar](50) NULL,
        [empcode] [nvarchar](50) NOT NULL,
        [empname] [nvarchar](200) NULL,
        [natureofwork] [nvarchar](250) NULL,
        [visitdatetime] [datetime] NOT NULL DEFAULT GETDATE(),
        [visittype] [nvarchar](20) NOT NULL DEFAULT 'checkin',
        [clientname] [nvarchar](200) NULL,
        [latitude] [decimal](10, 8) NULL,
        [longitude] [decimal](11, 8) NULL,
        [accuracy] [decimal](10, 2) NULL,
        [remarks] [nvarchar](max) NULL,
        [employeeselfie] [varbinary](max) NULL,
        [employeeselfie_base64] [nvarchar](max) NULL,
        [clientselfie] [varbinary](max) NULL,
        [clientselfie_base64] [nvarchar](max) NULL,
        [documentname] [nvarchar](200) NULL,
        [documentextension] [nvarchar](50) NULL,
        [documentcontent] [varbinary](max) NULL,
        [createddate] [datetime] NOT NULL DEFAULT GETDATE()
    );

    CREATE INDEX idx_fieldexecutive_empcode ON [dbo].[FieldExecutiveVisit] ([empcode]);
    CREATE INDEX idx_fieldexecutive_date ON [dbo].[FieldExecutiveVisit] ([visitdatetime]);
    CREATE INDEX idx_fieldexecutive_company ON [dbo].[FieldExecutiveVisit] ([companycode]);
END
GO

CREATE OR  ALTER PROCEDURE [dbo].[sp_webapi]
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
    @selfiimage IMAGE = NULL,
    @selfie_image_base64 NVARCHAR(MAX) = NULL,
    @status NVARCHAR(20) = NULL,
    @remarks NVARCHAR(500) = NULL,
    @geofence_radius DECIMAL(10, 2) = NULL,
    @table_name NVARCHAR(128) = NULL,
    @status_column NVARCHAR(128) = NULL,
    @status_value NVARCHAR(50) = NULL,
    @column_name NVARCHAR(128) = NULL,
    @startDate DATETIME = NULL,
    @endDate DATETIME = NULL,
    @empname NVARCHAR(200) = NULL,
    @natureofwork NVARCHAR(250) = NULL,
    @visitdatetime DATETIME = NULL,
    @visittype NVARCHAR(20) = NULL,
    @clientname NVARCHAR(200) = NULL,
    @accuracy DECIMAL(10,2) = NULL,
    @employeeselfie VARBINARY(MAX) = NULL,
    @employeeselfie_base64 NVARCHAR(MAX) = NULL,
    @clientselfie VARBINARY(MAX) = NULL,
    @clientselfie_base64 NVARCHAR(MAX) = NULL,
    @documentcontent VARBINARY(MAX) = NULL,
    @documentcode NVARCHAR(50) = NULL,
    @documentId INT = NULL,
    @expirydate DATETIME = NULL,
    @remainderon DATETIME = NULL,
    @fromDate DATETIME = NULL,
    @toDate DATETIME = NULL,
    @location NVARCHAR(250) = NULL,
    @InterviewCode NVARCHAR(50) = NULL,
    @InterviewDate DATETIME = NULL,
    @CandidateName NVARCHAR(150) = NULL,
    @Gender NVARCHAR(50) = NULL,
    @Age INT = NULL,
    @MaritialStatus NVARCHAR(50) = NULL,
    @ContactNumber NVARCHAR(50) = NULL,
    @ContactNumber1 NVARCHAR(50) = NULL,
    @EmailID NVARCHAR(100) = NULL,
    @Address NVARCHAR(MAX) = NULL,
    @PermanentLocation NVARCHAR(250) = NULL,
    @PresentLocation NVARCHAR(250) = NULL,
    @HighestQualification NVARCHAR(150) = NULL,
    @PreviousDesignation NVARCHAR(250) = NULL,
    @PostingApplyingFor NVARCHAR(250) = NULL,
    @Category NVARCHAR(50) = NULL,
    @RefferedBy NVARCHAR(150) = NULL,
    @ReasontoReleave NVARCHAR(MAX) = NULL,
    @TotalExperience DECIMAL(18,2) = NULL,
    @CurrentCTC DECIMAL(18,0) = NULL,
    @ExpectedCTC DECIMAL(18,2) = NULL,
    @ExpectedCTCNegotiable BIT = NULL,
    @NoticePeriod DECIMAL(18,2) = NULL,
    @NoticePeriodNegotiable BIT = NULL,
    @ExpectedJoiningDate DATETIME = NULL,
    @InterviewID INT = NULL,
    @SkillName NVARCHAR(150) = NULL,
    @Experience DECIMAL(18,2) = NULL,
    @RelationName NVARCHAR(150) = NULL,
    @Relationship NVARCHAR(150) = NULL,
    @notes NVARCHAR(MAX) = NULL,
    @InterviewDateTime DATETIME = NULL,
    @IDProof NVARCHAR(50) = NULL,
    @IDProofNumber NVARCHAR(50) = NULL,
    @FinalRoundStatus INT = NULL,
    @FinalRoundScore INT = NULL,
    @InterviewStatus INT = NULL,
    @JoiningDate DATETIME = NULL,
    @FixedCTC INT = NULL
AS
BEGIN
    SET NOCOUNT ON;

    -- Get Document Directory
    IF @operation = 'get_document_directory'
    BEGIN
        SELECT TOP 1 [documentpath] AS DocumentPath FROM [dbo].[DocumentPath];
        RETURN;
    END

    -- Table bootstrap: company document path
    IF @operation = 'ensure_company_document_path_table'
    BEGIN
        IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'DocumentPathCompany')
        BEGIN
            CREATE TABLE [dbo].[DocumentPathCompany] (
                [documentpath] NVARCHAR(MAX) NOT NULL
            );
            INSERT INTO [dbo].[DocumentPathCompany] ([documentpath]) VALUES ('z:\HRMS COMPANY DOCUMENTS\');
        END
        RETURN;
    END

    -- Table bootstrap: employee image
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

    -- Table bootstrap: employee signature
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
        IF COL_LENGTH('dbo.empsignature', 'companycode') IS NULL
        BEGIN
            ALTER TABLE [dbo].[empsignature] ADD [companycode] NVARCHAR(50) NULL;
        END
        IF COL_LENGTH('dbo.empsignature', 'signatureimage') IS NULL
        BEGIN
            ALTER TABLE [dbo].[empsignature] ADD [signatureimage] IMAGE NULL;
        END
        IF COL_LENGTH('dbo.empsignature', 'description') IS NULL
        BEGIN
            ALTER TABLE [dbo].[empsignature] ADD [description] NVARCHAR(200) NULL;
        END
        RETURN;
    END

    -- Table bootstrap: attendance geofence
    IF @operation = 'ensure_attendance_geofence_table'
    BEGIN
        IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'AttendanceGeofence')
        BEGIN
            CREATE TABLE [dbo].[AttendanceGeofence] (
                [AttendanceID] INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
                [companycode] NVARCHAR(50) NOT NULL,
                [empcode] NVARCHAR(50) NOT NULL,
                [attendancedate] DATETIME NOT NULL DEFAULT GETDATE(),
                [latitude] DECIMAL(10,8) NOT NULL,
                [longitude] DECIMAL(11,8) NOT NULL,
                [selfiimage] IMAGE NULL,
                [selfieimage_base64] NVARCHAR(MAX) NULL,
                [status] NVARCHAR(20) NOT NULL DEFAULT 'Present',
                [remarks] NVARCHAR(500) NULL,
                [geofenceradius] DECIMAL(10,2) NULL
            );
            CREATE INDEX idx_attendance_empcode ON [dbo].[AttendanceGeofence] ([empcode]);
            CREATE INDEX idx_attendance_date ON [dbo].[AttendanceGeofence] ([attendancedate]);
            CREATE INDEX idx_attendance_company ON [dbo].[AttendanceGeofence] ([companycode]);
        END
        IF COL_LENGTH('dbo.AttendanceGeofence', 'selfiimage') IS NULL
        BEGIN
            ALTER TABLE [dbo].[AttendanceGeofence] ADD [selfiimage] IMAGE NULL;
        END
        IF COL_LENGTH('dbo.AttendanceGeofence', 'selfieimage_base64') IS NULL
        BEGIN
            ALTER TABLE [dbo].[AttendanceGeofence] ADD [selfieimage_base64] NVARCHAR(MAX) NULL;
        END
        IF COL_LENGTH('dbo.AttendanceGeofence', 'geofenceradius') IS NULL
        BEGIN
            ALTER TABLE [dbo].[AttendanceGeofence] ADD [geofenceradius] DECIMAL(10,2) NULL;
        END
        RETURN;
    END

    -- Table bootstrap: field executive visit
    IF @operation = 'ensure_field_executive_table'
    BEGIN
        IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'FieldExecutiveVisit')
        BEGIN
            CREATE TABLE [dbo].[FieldExecutiveVisit] (
                [VisitID] INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
                [companycode] NVARCHAR(50) NULL,
                [empcode] NVARCHAR(50) NOT NULL,
                [empname] NVARCHAR(200) NULL,
                [natureofwork] NVARCHAR(250) NULL,
                [visitdatetime] DATETIME NOT NULL DEFAULT GETDATE(),
                [visittype] NVARCHAR(20) NOT NULL DEFAULT 'checkin',
                [clientname] NVARCHAR(200) NULL,
                [latitude] DECIMAL(10,8) NULL,
                [longitude] DECIMAL(11,8) NULL,
                [accuracy] DECIMAL(10,2) NULL,
                [remarks] NVARCHAR(MAX) NULL,
                [employeeselfie] VARBINARY(MAX) NULL,
                [employeeselfie_base64] NVARCHAR(MAX) NULL,
                [clientselfie] VARBINARY(MAX) NULL,
                [clientselfie_base64] NVARCHAR(MAX) NULL,
                [documentname] NVARCHAR(200) NULL,
                [documentextension] NVARCHAR(50) NULL,
                [documentcontent] VARBINARY(MAX) NULL,
                [createddate] DATETIME NOT NULL DEFAULT GETDATE()
            );
            CREATE INDEX idx_fieldexecutive_empcode ON [dbo].[FieldExecutiveVisit] ([empcode]);
            CREATE INDEX idx_fieldexecutive_date ON [dbo].[FieldExecutiveVisit] ([visitdatetime]);
            CREATE INDEX idx_fieldexecutive_company ON [dbo].[FieldExecutiveVisit] ([companycode]);
        END
        IF COL_LENGTH('dbo.FieldExecutiveVisit', 'companycode') IS NULL BEGIN ALTER TABLE [dbo].[FieldExecutiveVisit] ADD [companycode] NVARCHAR(50) NULL; END
        IF COL_LENGTH('dbo.FieldExecutiveVisit', 'empcode') IS NULL BEGIN ALTER TABLE [dbo].[FieldExecutiveVisit] ADD [empcode] NVARCHAR(50) NOT NULL; END
        IF COL_LENGTH('dbo.FieldExecutiveVisit', 'empname') IS NULL BEGIN ALTER TABLE [dbo].[FieldExecutiveVisit] ADD [empname] NVARCHAR(200) NULL; END
        IF COL_LENGTH('dbo.FieldExecutiveVisit', 'natureofwork') IS NULL BEGIN ALTER TABLE [dbo].[FieldExecutiveVisit] ADD [natureofwork] NVARCHAR(250) NULL; END
        IF COL_LENGTH('dbo.FieldExecutiveVisit', 'visitdatetime') IS NULL BEGIN ALTER TABLE [dbo].[FieldExecutiveVisit] ADD [visitdatetime] DATETIME NOT NULL DEFAULT GETDATE(); END
        IF COL_LENGTH('dbo.FieldExecutiveVisit', 'visittype') IS NULL BEGIN ALTER TABLE [dbo].[FieldExecutiveVisit] ADD [visittype] NVARCHAR(20) NOT NULL DEFAULT 'checkin'; END
        IF COL_LENGTH('dbo.FieldExecutiveVisit', 'clientname') IS NULL BEGIN ALTER TABLE [dbo].[FieldExecutiveVisit] ADD [clientname] NVARCHAR(200) NULL; END
        IF COL_LENGTH('dbo.FieldExecutiveVisit', 'latitude') IS NULL BEGIN ALTER TABLE [dbo].[FieldExecutiveVisit] ADD [latitude] DECIMAL(10,8) NULL; END
        IF COL_LENGTH('dbo.FieldExecutiveVisit', 'longitude') IS NULL BEGIN ALTER TABLE [dbo].[FieldExecutiveVisit] ADD [longitude] DECIMAL(11,8) NULL; END
        IF COL_LENGTH('dbo.FieldExecutiveVisit', 'accuracy') IS NULL BEGIN ALTER TABLE [dbo].[FieldExecutiveVisit] ADD [accuracy] DECIMAL(10,2) NULL; END
        IF COL_LENGTH('dbo.FieldExecutiveVisit', 'remarks') IS NULL BEGIN ALTER TABLE [dbo].[FieldExecutiveVisit] ADD [remarks] NVARCHAR(MAX) NULL; END
        IF COL_LENGTH('dbo.FieldExecutiveVisit', 'employeeselfie') IS NULL BEGIN ALTER TABLE [dbo].[FieldExecutiveVisit] ADD [employeeselfie] VARBINARY(MAX) NULL; END
        IF COL_LENGTH('dbo.FieldExecutiveVisit', 'employeeselfie_base64') IS NULL BEGIN ALTER TABLE [dbo].[FieldExecutiveVisit] ADD [employeeselfie_base64] NVARCHAR(MAX) NULL; END
        IF COL_LENGTH('dbo.FieldExecutiveVisit', 'clientselfie') IS NULL BEGIN ALTER TABLE [dbo].[FieldExecutiveVisit] ADD [clientselfie] VARBINARY(MAX) NULL; END
        IF COL_LENGTH('dbo.FieldExecutiveVisit', 'clientselfie_base64') IS NULL BEGIN ALTER TABLE [dbo].[FieldExecutiveVisit] ADD [clientselfie_base64] NVARCHAR(MAX) NULL; END
        IF COL_LENGTH('dbo.FieldExecutiveVisit', 'documentname') IS NULL BEGIN ALTER TABLE [dbo].[FieldExecutiveVisit] ADD [documentname] NVARCHAR(200) NULL; END
        IF COL_LENGTH('dbo.FieldExecutiveVisit', 'documentextension') IS NULL BEGIN ALTER TABLE [dbo].[FieldExecutiveVisit] ADD [documentextension] NVARCHAR(50) NULL; END
        IF COL_LENGTH('dbo.FieldExecutiveVisit', 'documentcontent') IS NULL BEGIN ALTER TABLE [dbo].[FieldExecutiveVisit] ADD [documentcontent] VARBINARY(MAX) NULL; END
        IF COL_LENGTH('dbo.FieldExecutiveVisit', 'createddate') IS NULL BEGIN ALTER TABLE [dbo].[FieldExecutiveVisit] ADD [createddate] DATETIME NOT NULL DEFAULT GETDATE(); END
        RETURN;
    END

    -- Table bootstrap: company documents
    IF @operation = 'ensure_company_document_table'
    BEGIN
        IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'DocumentCompany')
        BEGIN
            CREATE TABLE [dbo].[DocumentCompany](
                [DocumentID] [int] IDENTITY(1,1) NOT NULL,
                [DocumentCode] [nvarchar](50) NULL,
                [DocumentName] [nvarchar](50) NULL,
                [DocumentExtension] [nvarchar](50) NULL,
                [Status] [bit] NULL,
                [ExpiryDate] [datetime] NULL,
                [RemainderOn] [datetime] NULL,
                CONSTRAINT [PK_DocumentCompany] PRIMARY KEY CLUSTERED ([DocumentID] ASC)
            ) ON [PRIMARY];
            CREATE INDEX idx_documentcompany_name ON [dbo].[DocumentCompany] ([DocumentName]);
        END
        IF COL_LENGTH('dbo.DocumentCompany', 'DocumentCode') IS NULL BEGIN ALTER TABLE [dbo].[DocumentCompany] ADD [DocumentCode] NVARCHAR(50) NULL; END
        IF COL_LENGTH('dbo.DocumentCompany', 'DocumentName') IS NULL BEGIN ALTER TABLE [dbo].[DocumentCompany] ADD [DocumentName] NVARCHAR(50) NULL; END
        IF COL_LENGTH('dbo.DocumentCompany', 'DocumentExtension') IS NULL BEGIN ALTER TABLE [dbo].[DocumentCompany] ADD [DocumentExtension] NVARCHAR(50) NULL; END
        IF COL_LENGTH('dbo.DocumentCompany', 'Status') IS NULL BEGIN ALTER TABLE [dbo].[DocumentCompany] ADD [Status] BIT NULL; END
        IF COL_LENGTH('dbo.DocumentCompany', 'ExpiryDate') IS NULL BEGIN ALTER TABLE [dbo].[DocumentCompany] ADD [ExpiryDate] DATETIME NULL; END
        IF COL_LENGTH('dbo.DocumentCompany', 'RemainderOn') IS NULL BEGIN ALTER TABLE [dbo].[DocumentCompany] ADD [RemainderOn] DATETIME NULL; END
        RETURN;
    END

    -- Table bootstrap: leave log
    IF @operation = 'ensure_leave_log_table'
    BEGIN
        IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'LeaveLog')
        BEGIN
            CREATE TABLE [dbo].[LeaveLog](
                [LeaveLogID] [int] IDENTITY(1,1) NOT NULL,
                [CompanyCode] [nvarchar](50) NULL,
                [EmpCode] [nvarchar](50) NULL,
                [FromDate] [datetime] NULL,
                [ToDate] [datetime] NULL,
                [Information] [nvarchar](50) NULL,
                [Description] [nvarchar](500) NULL,
                [isApproved] [bit] NOT NULL CONSTRAINT [DF__LeaveLog__isAppr__25077354] DEFAULT ((0)),
                [IsCancel] [bit] NOT NULL CONSTRAINT [DF_LeaveLog_IsCancel] DEFAULT ((0)),
                CONSTRAINT [PK_LeaveLog] PRIMARY KEY CLUSTERED ([LeaveLogID] ASC)
            ) ON [PRIMARY];
            CREATE INDEX idx_leave_log_empcode ON [dbo].[LeaveLog] ([EmpCode]);
            CREATE INDEX idx_leave_log_company ON [dbo].[LeaveLog] ([CompanyCode]);
        END
        IF COL_LENGTH('dbo.LeaveLog', 'CompanyCode') IS NULL BEGIN ALTER TABLE [dbo].[LeaveLog] ADD [CompanyCode] NVARCHAR(50) NULL; END
        IF COL_LENGTH('dbo.LeaveLog', 'EmpCode') IS NULL BEGIN ALTER TABLE [dbo].[LeaveLog] ADD [EmpCode] NVARCHAR(50) NULL; END
        IF COL_LENGTH('dbo.LeaveLog', 'FromDate') IS NULL BEGIN ALTER TABLE [dbo].[LeaveLog] ADD [FromDate] DATETIME NULL; END
        IF COL_LENGTH('dbo.LeaveLog', 'ToDate') IS NULL BEGIN ALTER TABLE [dbo].[LeaveLog] ADD [ToDate] DATETIME NULL; END
        IF COL_LENGTH('dbo.LeaveLog', 'Information') IS NULL BEGIN ALTER TABLE [dbo].[LeaveLog] ADD [Information] NVARCHAR(50) NULL; END
        IF COL_LENGTH('dbo.LeaveLog', 'Description') IS NULL BEGIN ALTER TABLE [dbo].[LeaveLog] ADD [Description] NVARCHAR(500) NULL; END
        IF COL_LENGTH('dbo.LeaveLog', 'isApproved') IS NULL BEGIN ALTER TABLE [dbo].[LeaveLog] ADD [isApproved] BIT NOT NULL CONSTRAINT [DF__LeaveLog__isAppr__25077354] DEFAULT ((0)); END
        IF COL_LENGTH('dbo.LeaveLog', 'IsCancel') IS NULL BEGIN ALTER TABLE [dbo].[LeaveLog] ADD [IsCancel] BIT NOT NULL CONSTRAINT [DF_LeaveLog_IsCancel] DEFAULT ((0)); END
        RETURN;
    END

    -- Table bootstrap: interview tables
    IF @operation = 'ensure_interview_tables'
    BEGIN
        IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'InterviewEntry')
        BEGIN
            CREATE TABLE [dbo].[InterviewEntry](
                [InterviewID] [int] IDENTITY(1,1) NOT NULL,
                [InterviewCode] [nvarchar](50) NOT NULL,
                [CompanyCode] [nvarchar](50) NULL,
                [InterviewDate] [datetime] NULL,
                [CandidateName] [nvarchar](50) NULL,
                [Gender] [nvarchar](50) NULL,
                [Age] [int] NULL,
                [MaritialStatus] [nvarchar](50) NULL,
                [ContactNumber] [nvarchar](50) NULL,
                [ContactNumber1] [nvarchar](50) NULL,
                [EmailID] [nvarchar](50) NULL,
                [Address] [nvarchar](max) NULL,
                [PermanentLocation] [nvarchar](250) NULL,
                [PresentLocation] [nvarchar](250) NULL,
                [HighestQualification] [nvarchar](50) NULL,
                [PreviousDesignation] [nvarchar](250) NULL,
                [PostingApplyingFor] [nvarchar](250) NULL,
                [Category] [nvarchar](50) NULL,
                [RefferedBy] [nvarchar](150) NULL,
                [ReasontoReleave] [nvarchar](max) NULL,
                [Remarks] [nvarchar](max) NULL,
                [TotalExperience] [decimal](18, 2) NULL,
                [CurrentCTC] [decimal](18, 0) NULL,
                [ExpectedCTC] [decimal](18, 2) NULL,
                [ExpectedCTCNegotiable] [bit] NULL,
                [NoticePeriod] [decimal](18, 2) NULL,
                [NoticePeriodNegotiable] [bit] NULL,
                [ExpectedJoiningDate] [datetime] NULL,
                CONSTRAINT [PK_InterviewEntry] PRIMARY KEY CLUSTERED ([InterviewID] ASC)
            ) ON [PRIMARY];
        END
        IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'InterviewTimeEntry')
        BEGIN
            CREATE TABLE [dbo].[InterviewTimeEntry](
                [InterviewTimeID] [int] IDENTITY(1,1) NOT NULL,
                [InterviewID] [int] NULL,
                [InterviewDateTime] [datetime] NULL,
                [notes] [nvarchar](max) NULL,
                CONSTRAINT [PK_InterviewTimeEntry] PRIMARY KEY CLUSTERED ([InterviewTimeID] ASC)
            ) ON [PRIMARY];
        END
        IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'InterviewSkillEntry')
        BEGIN
            CREATE TABLE [dbo].[InterviewSkillEntry](
                [SkillID] [int] IDENTITY(1,1) NOT NULL,
                [InterviewID] [int] NULL,
                [SkillName] [nvarchar](150) NULL,
                [Experience] [decimal](18, 2) NULL,
                CONSTRAINT [PK_InterviewSkillEntry] PRIMARY KEY CLUSTERED ([SkillID] ASC)
            ) ON [PRIMARY];
        END
        IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'InterviewRelationEntry')
        BEGIN
            CREATE TABLE [dbo].[InterviewRelationEntry](
                [RelationID] [int] IDENTITY(1,1) NOT NULL,
                [InterviewID] [int] NULL,
                [RelationName] [nvarchar](150) NULL,
                [Relationship] [nvarchar](150) NULL,
                [Age] [int] NULL,
                CONSTRAINT [PK_InterviewRelationEntry] PRIMARY KEY CLUSTERED ([RelationID] ASC)
            ) ON [PRIMARY];
        END
        IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'InterviewTimeEntryLevel')
        BEGIN
            CREATE TABLE [dbo].[InterviewTimeEntryLevel](
                [InterviewTimeEntryLevelID] [int] IDENTITY(1,1) NOT NULL,
                [InterviewID] [int] NULL,
                [ConductedBy] [nvarchar](max) NULL,
                [NotesConductedBy] [nvarchar](max) NULL,
                [NotesCandiadate] [nvarchar](max) NULL,
                [RoundStatus] [int] NULL,
                [RoundScore] [int] NULL,
                [MoveToNextRound] [bit] NULL,
                CONSTRAINT [PK_InterviewFinalEntry] PRIMARY KEY CLUSTERED ([InterviewTimeEntryLevelID] ASC)
            ) ON [PRIMARY];
        END
        IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'InterviewFinalEntry')
        BEGIN
            CREATE TABLE [dbo].[InterviewFinalEntry](
                [InterviewFinalID] [int] IDENTITY(1,1) NOT NULL,
                [InterviewID] [int] NULL,
                [IDProof] [nvarchar](50) NULL,
                [IDProofNumber] [nvarchar](50) NULL,
                [FinalRoundStatus] [int] NULL,
                [FinalRoundScore] [int] NULL,
                [InterviewStatus] [int] NULL,
                [Notes] [nvarchar](max) NULL,
                [JoiningDate] [datetime] NULL,
                [FixedCTC] [int] NULL,
                CONSTRAINT [PK_InterviewFinalEntry] PRIMARY KEY CLUSTERED ([InterviewFinalID] ASC)
            ) ON [PRIMARY];
        END
        IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'InterviewExperienceEntry')
        BEGIN
            CREATE TABLE [dbo].[InterviewExperienceEntry](
                [ExperienceID] [int] IDENTITY(1,1) NOT NULL,
                [InterViewID] [int] NULL,
                [CompanyName] [nvarchar](250) NULL,
                [Experience] [decimal](18, 2) NULL,
                [Salary] [decimal](18, 2) NULL,
                CONSTRAINT [PK_InterviewExperienceEntry] PRIMARY KEY CLUSTERED ([ExperienceID] ASC)
            ) ON [PRIMARY];
        END
        IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'InterviewAddress')
        BEGIN
            CREATE TABLE [dbo].[InterviewAddress](
                [InterviewAddressID] [int] IDENTITY(1,1) NOT NULL,
                [InterviewID] [int] NOT NULL,
                [ContactPersonName] [nvarchar](150) NULL,
                [Careof] [nvarchar](50) NULL,
                [CareOfName] [nvarchar](150) NULL,
                [DoorNo] [nvarchar](150) NULL,
                [Address1] [nvarchar](500) NULL,
                [Address2] [nvarchar](500) NULL,
                [AddressType] [nvarchar](50) NULL,
                [LandMark] [nvarchar](500) NULL,
                [CurrentLocation] [nvarchar](500) NULL,
                [PermanentLocation] [nvarchar](500) NULL,
                [CurrentAddress] [nvarchar](max) NULL,
                [Village] [nvarchar](50) NULL,
                [Town] [nvarchar](50) NULL,
                [District] [nvarchar](50) NULL,
                [State] [nvarchar](50) NULL,
                [Country] [nvarchar](50) NULL,
                [PinCode] [nvarchar](50) NULL,
                [ContactNo] [nvarchar](50) NULL,
                [Remarks] [nvarchar](500) NULL,
                CONSTRAINT [PK__Intervie__687C1EE805C3D225] PRIMARY KEY CLUSTERED ([InterviewAddressID] ASC)
            ) ON [PRIMARY];
        END
        RETURN;
    END

    -- Table bootstrap: visitor tables
    IF @operation = 'ensure_visitor_tables'
    BEGIN
        IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'VisitorEntry')
        BEGIN
            CREATE TABLE [dbo].[VisitorEntry](
                [VisitorID] [int] IDENTITY(1,1) NOT NULL,
                [VisitorCode] [nvarchar](50) NULL,
                [VisitDate] [datetime] NULL,
                [VisitorName] [nvarchar](150) NULL,
                [VisitorCompanyName] [nvarchar](150) NULL,
                [ContactNumber] [nvarchar](50) NULL,
                [Empcode] [nvarchar](50) NULL,
                [EmpName] [nvarchar](150) NULL,
                [Department] [nvarchar](50) NULL,
                [Purpose] [bit] NULL,
                [PurposeRegarding] [nvarchar](max) NULL,
                [AppointmentType] [bit] NULL,
                [AppointmentDate] [datetime] NULL,
                [VechileNumber] [nvarchar](50) NULL,
                [EmailID] [nvarchar](50) NULL,
                [ConformationRequired] [bit] NULL,
                [CoVisitor1] [nvarchar](50) NULL,
                [CoVisitor2] [nvarchar](50) NULL,
                [IdProof] [nvarchar](50) NULL,
                [IDProofNumber] [nvarchar](150) NULL,
                [MaterialsCarrying] [nvarchar](50) NULL,
                [IsReturnableMaterial] [bit] NULL,
                [ReturnableMaterialDescription] [nvarchar](max) NULL,
                CONSTRAINT [PK_VisitorEntry] PRIMARY KEY CLUSTERED ([VisitorID] ASC)
            ) ON [PRIMARY];
            CREATE INDEX idx_visitor_empcode ON [dbo].[VisitorEntry] ([Empcode]);
            CREATE INDEX idx_visitor_date ON [dbo].[VisitorEntry] ([VisitDate]);
        END
        RETURN;
    END

    -- Count status for employee tables
    IF @operation = 'count_employee_status'
    BEGIN
        DECLARE @status_sql NVARCHAR(MAX);
        SET @status_sql = N'SELECT COUNT(*) AS status_count FROM [dbo].' + QUOTENAME(@table_name) + N' WHERE ' + QUOTENAME(@status_column) + N' = ''' + REPLACE(CAST(@status_value AS NVARCHAR(50)), '''', '''''') + N''';';
        EXEC sp_executesql @status_sql;
        RETURN;
    END

    -- Count active employee rows
    IF @operation = 'count_active_employees'
    BEGIN
        DECLARE @active_sql NVARCHAR(MAX);
        SET @active_sql = N'SELECT COUNT(*) AS total_employees FROM [dbo].' + QUOTENAME(@table_name) + N' WHERE ' + QUOTENAME(@column_name) + N' = 1;';
        EXEC sp_executesql @active_sql;
        RETURN;
    END

    -- Count geofence check-ins today
    IF @operation = 'count_geofence_checkins'
    BEGIN
        SELECT COUNT(*) AS geofence_checkins
        FROM [dbo].[AttendanceGeofence]
        WHERE [attendancedate] >= @startDate AND [attendancedate] < @endDate;
        RETURN;
    END

    -- Count field visits today
    IF @operation = 'count_field_visits'
    BEGIN
        SELECT COUNT(DISTINCT [empcode]) AS field_visits
        FROM [dbo].[AttendanceGeofence]
        WHERE [attendancedate] >= @startDate AND [attendancedate] < @endDate AND LEN(ISNULL([empcode], '')) > 0;
        RETURN;
    END

    -- Count leave entries
    IF @operation = 'count_leave_entries'
    BEGIN
        SELECT COUNT(*) AS leave_count FROM [dbo].[LeaveLog];
        RETURN;
    END

    -- Count visitors
    IF @operation = 'count_visitor_entries'
    BEGIN
        SELECT COUNT(*) AS visitor_count FROM [dbo].[VisitorEntry];
        RETURN;
    END

    -- Count interviews today
    IF @operation = 'count_interviews_today'
    BEGIN
        SELECT COUNT(*) AS interview_today_count
        FROM [dbo].[InterviewEntry]
        WHERE [InterviewDate] >= @startDate AND [InterviewDate] < @endDate;
        RETURN;
    END

    -- Get Companies
    IF @operation = 'get_companies'
    BEGIN
        SELECT [companycode], [companyname] FROM [dbo].[companycreation] ORDER BY [companyname];
        RETURN;
    END

    -- Get Company Document Directory
    IF @operation = 'get_company_document_directory'
    BEGIN
        SELECT TOP 1 [documentpath] AS DocumentPath FROM [dbo].[DocumentPathCompany];
        RETURN;
    END

    -- Recent Interviews
    IF @operation = 'get_recent_interviews'
    BEGIN
        SELECT TOP 20 *
        FROM [dbo].[InterviewEntry]
        ORDER BY [InterviewID] DESC;
        RETURN;
    END

    -- Recent Visitors
    IF @operation = 'get_recent_visitors'
    BEGIN
        SELECT TOP 50 *
        FROM [dbo].[VisitorEntry]
        ORDER BY [VisitorID] DESC;
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

    -- Get Employee Details
    IF @operation = 'get_employee_details'
    BEGIN
        IF OBJECT_ID('dbo.Employee') IS NOT NULL
        BEGIN
            IF COL_LENGTH('dbo.Employee', 'UserName') IS NOT NULL
            BEGIN
                SELECT TOP 1 [EmpCode] AS empcode, [EmpName] AS empname, empcode AS username
                FROM [dbo].[Employee]
                WHERE [EmpCode] = @empcode;
                RETURN;
            END

            SELECT TOP 1 [EmpCode] AS empcode, [EmpName] AS empname, NULL AS username
            FROM [dbo].[Employee]
            WHERE [EmpCode] = @empcode;
            RETURN;
        END

        IF OBJECT_ID('dbo.employee') IS NOT NULL
        BEGIN
            IF COL_LENGTH('dbo.employee', 'UserName') IS NOT NULL
            BEGIN
                SELECT TOP 1 [EmpCode] AS empcode, [EmpName] AS empname, empcode AS username
                FROM [dbo].[employee]
                WHERE [EmpCode] = @empcode;
                RETURN;
            END

            SELECT TOP 1 [EmpCode] AS empcode, [EmpName] AS empname, NULL AS username
            FROM [dbo].[employee]
            WHERE [EmpCode] = @empcode;
            RETURN;
        END

        SELECT TOP 1 NULL AS empcode, NULL AS empname, NULL AS username;
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
        INSERT INTO [dbo].[AttendanceGeofence] ([companycode], [empcode], [latitude], [longitude], [selfiimage], [selfieimage_base64], [status], [remarks], [geofenceradius])
        OUTPUT INSERTED.[AttendanceID]
        VALUES (@companycode, @empcode, @latitude, @longitude, @selfiimage, @selfie_image_base64, @status, @remarks, @geofence_radius);
        RETURN;
    END

    -- Insert Field Executive Visit
    IF @operation = 'insert_field_executive_visit'
    BEGIN
        INSERT INTO [dbo].[FieldExecutiveVisit] ([companycode], [empcode], [empname], [natureofwork], [visitdatetime], [visittype], [clientname], [latitude], [longitude], [accuracy], [remarks], [employeeselfie], [employeeselfie_base64], [clientselfie], [clientselfie_base64], [documentname], [documentextension], [documentcontent])
        OUTPUT INSERTED.[VisitID]
        VALUES (@companycode, @empcode, @empname, @natureofwork, @visitdatetime, @visittype, @clientname, @latitude, @longitude, @accuracy, @remarks, @employeeselfie, @employeeselfie_base64, @clientselfie, @clientselfie_base64, @documentname, @documentextension, @documentcontent);
        RETURN;
    END

    -- Insert Company Document
    IF @operation = 'insert_company_document'
    BEGIN
        INSERT INTO [dbo].[DocumentCompany] ([DocumentCode], [DocumentName], [DocumentExtension], [Status], [ExpiryDate], [RemainderOn])
        OUTPUT INSERTED.[DocumentID]
        VALUES (@documentcode, @documentname, @documentextension, @status, @expirydate, @remainderon);
        RETURN;
    END

    -- Get Company Document
    IF @operation = 'get_company_document'
    BEGIN
        SELECT TOP 1 [DocumentID], [DocumentCode], [DocumentName], [DocumentExtension]
        FROM [dbo].[DocumentCompany]
        WHERE [DocumentID] = @documentId;
        RETURN;
    END

    -- Delete Company Document
    IF @operation = 'delete_company_document'
    BEGIN
        DELETE FROM [dbo].[DocumentCompany]
        WHERE [DocumentID] = @documentId;
        RETURN;
    END

    -- Get Field Executive List
    IF @operation = 'get_field_executive_list'
    BEGIN
        SELECT TOP 100
            [VisitID], [companycode], [empcode], [empname], [natureofwork], [visitdatetime], [visittype], [clientname], [latitude], [longitude], [accuracy], [remarks], [documentname]
        FROM [dbo].[FieldExecutiveVisit]
        ORDER BY [visitdatetime] DESC;
        RETURN;
    END

    -- Get Field Executive Report
    IF @operation = 'get_field_executive_report'
    BEGIN
        SELECT [VisitID], [companycode], [empcode], [empname], [natureofwork], [visitdatetime], [visittype], [clientname], [latitude], [longitude], [accuracy], [remarks], [documentname]
        FROM [dbo].[FieldExecutiveVisit]
        WHERE 1 = 1
            AND (@fromDate IS NULL OR [visitdatetime] >= @fromDate)
            AND (@toDate IS NULL OR [visitdatetime] <= @toDate)
            AND (@location IS NULL OR [clientname] LIKE @location OR [natureofwork] LIKE @location OR [empname] LIKE @location)
        ORDER BY [visitdatetime] DESC;
        RETURN;
    END

    -- Get Attendance History
    IF @operation = 'get_attendance_history'
    BEGIN
        SELECT TOP 5 [AttendanceID], [companycode], [empcode], [attendancedate], [latitude], [longitude], [status], [remarks], [geofenceradius]
        FROM [dbo].[AttendanceGeofence]
        WHERE [empcode] = @empcode
        ORDER BY [attendancedate] DESC;
        RETURN;
    END

    -- Get Company Documents
    IF @operation = 'get_company_documents'
    BEGIN
        SELECT [DocumentID], [DocumentCode], [DocumentName], [DocumentExtension], [Status], [ExpiryDate], [RemainderOn]
        FROM [dbo].[DocumentCompany]
        ORDER BY [DocumentID] DESC;
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

    -- Insert Interview Entry
    IF @operation = 'insert_interview_entry'
    BEGIN
        INSERT INTO [dbo].[InterviewEntry]
            ([InterviewCode],[CompanyCode],[InterviewDate],[CandidateName],[Gender],[Age],[MaritialStatus],[ContactNumber],[ContactNumber1],[EmailID],[Address],[PermanentLocation],[PresentLocation],[HighestQualification],[PreviousDesignation],[PostingApplyingFor],[Category],[RefferedBy],[ReasontoReleave],[Remarks],[TotalExperience],[CurrentCTC],[ExpectedCTC],[ExpectedCTCNegotiable],[NoticePeriod],[NoticePeriodNegotiable],[ExpectedJoiningDate])
        OUTPUT INSERTED.[InterviewID]
        VALUES (@InterviewCode,@CompanyCode,@InterviewDate,@CandidateName,@Gender,@Age,@MaritialStatus,@ContactNumber,@ContactNumber1,@EmailID,@Address,@PermanentLocation,@PresentLocation,@HighestQualification,@PreviousDesignation,@PostingApplyingFor,@Category,@RefferedBy,@ReasontoReleave,@Remarks,@TotalExperience,@CurrentCTC,@ExpectedCTC,@ExpectedCTCNegotiable,@NoticePeriod,@NoticePeriodNegotiable,@ExpectedJoiningDate);
        RETURN;
    END

    -- Insert Interview Skill
    IF @operation = 'insert_interview_skill'
    BEGIN
        INSERT INTO [dbo].[InterviewSkillEntry] ([InterviewID],[SkillName],[Experience])
        VALUES (@InterviewID,@SkillName,@Experience);
        RETURN;
    END

    -- Insert Interview Relation
    IF @operation = 'insert_interview_relation'
    BEGIN
        INSERT INTO [dbo].[InterviewRelationEntry] ([InterviewID],[RelationName],[Relationship],[Age])
        VALUES (@InterviewID,@RelationName,@Relationship,@Age);
        RETURN;
    END

    -- Insert Interview Time
    IF @operation = 'insert_interview_time'
    BEGIN
        INSERT INTO [dbo].[InterviewTimeEntry] ([InterviewID],[InterviewDateTime],[notes])
        VALUES (@InterviewID,@InterviewDateTime,@notes);
        RETURN;
    END

    -- Insert Interview Final
    IF @operation = 'insert_interview_final'
    BEGIN
        INSERT INTO [dbo].[InterviewFinalEntry] ([InterviewID],[IDProof],[IDProofNumber],[FinalRoundScore],[InterviewStatus],[Notes],[JoiningDate],[FixedCTC])
        VALUES (@InterviewID,@IDProof,@IDProofNumber,@FinalRoundScore,@InterviewStatus,@Notes,@JoiningDate,@FixedCTC);
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