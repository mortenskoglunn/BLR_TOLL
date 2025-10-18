-- BLR TOLL Database Schema for SQL Server
-- Kjør dette scriptet for å opprette tabeller og initial data

USE [BLR_TOLL_DB];
GO

-- Slette eksisterende tabeller hvis de eksisterer (for ren installasjon)
IF OBJECT_ID('dbo.audit_log', 'U') IS NOT NULL DROP TABLE dbo.audit_log;
IF OBJECT_ID('dbo.blomster', 'U') IS NOT NULL DROP TABLE dbo.blomster;
IF OBJECT_ID('dbo.users', 'U') IS NOT NULL DROP TABLE dbo.users;
GO

-- Brukertabell
CREATE TABLE dbo.users (
    id INT IDENTITY(1,1) PRIMARY KEY,
    username NVARCHAR(50) UNIQUE NOT NULL,
    password_hash NVARCHAR(255) NOT NULL,
    role NVARCHAR(20) DEFAULT 'user' CHECK (role IN ('admin', 'user', 'viewer')),
    full_name NVARCHAR(100),
    email NVARCHAR(100),
    created_at DATETIME2 DEFAULT GETDATE(),
    last_login DATETIME2 NULL,
    login_count INT DEFAULT 0,
    active BIT DEFAULT 1
);
GO

-- Indekser for users tabell
CREATE INDEX IX_users_username ON dbo.users(username);
CREATE INDEX IX_users_active ON dbo.users(active);
CREATE INDEX IX_users_role ON dbo.users(role);
GO

-- Blomster database (hovedtabell for matching)
CREATE TABLE dbo.blomster (
    id INT IDENTITY(1,1) PRIMARY KEY,
    navn NVARCHAR(100) NOT NULL,
    vekt DECIMAL(10,3) NOT NULL, -- Vekt i kg med 3 desimaler
    klassifisering NVARCHAR(50) NOT NULL,
    beskrivelse NTEXT,
    synonymer NTEXT, -- Kommaseparerte alternative navn
    opprinnelse NVARCHAR(100), -- Land eller region
    sesong NVARCHAR(50), -- Sesong for blomsten
    pris_per_kg DECIMAL(10,2), -- Pris per kg i NOK
    leverandor NVARCHAR(100),
    kvalitetsgrad NVARCHAR(1) DEFAULT 'B' CHECK (kvalitetsgrad IN ('A', 'B', 'C', 'D')),
    created_at DATETIME2 DEFAULT GETDATE(),
    updated_at DATETIME2 DEFAULT GETDATE(),
    created_by INT,
    
    FOREIGN KEY (created_by) REFERENCES dbo.users(id)
);
GO

-- Indekser for blomster tabell
CREATE INDEX IX_blomster_navn ON dbo.blomster(navn);
CREATE INDEX IX_blomster_klassifisering ON dbo.blomster(klassifisering);
CREATE INDEX IX_blomster_kvalitetsgrad ON dbo.blomster(kvalitetsgrad);
CREATE INDEX IX_blomster_vekt ON dbo.blomster(vekt);
CREATE INDEX IX_blomster_composite ON dbo.blomster(klassifisering, kvalitetsgrad, vekt);
GO

-- Full-text search på blomster (hvis støttet)
IF NOT EXISTS (SELECT * FROM sys.fulltext_catalogs WHERE name = 'BLR_TOLL_Catalog')
BEGIN
    CREATE FULLTEXT CATALOG BLR_TOLL_Catalog AS DEFAULT;
END
GO

IF NOT EXISTS (SELECT * FROM sys.fulltext_indexes WHERE object_id = OBJECT_ID('dbo.blomster'))
BEGIN
    CREATE FULLTEXT INDEX ON dbo.blomster(navn, synonymer, beskrivelse) 
    KEY INDEX PK__blomster__3213E83F WITH CHANGE_TRACKING AUTO;
END
GO

-- Audit log for å spore alle endringer
CREATE TABLE dbo.audit_log (
    id INT IDENTITY(1,1) PRIMARY KEY,
    user_id INT NOT NULL,
    action NVARCHAR(50) NOT NULL, -- CREATE, UPDATE, DELETE, LOGIN, etc.
    table_name NVARCHAR(50) NOT NULL,
    record_id INT,
    old_values NVARCHAR(MAX), -- JSON format
    new_values NVARCHAR(MAX), -- JSON format
    ip_address NVARCHAR(45),
    user_agent NVARCHAR(MAX),
    timestamp DATETIME2 DEFAULT GETDATE(),
    
    FOREIGN KEY (user_id) REFERENCES dbo.users(id)
);
GO

-- Indekser for audit_log tabell
CREATE INDEX IX_audit_log_user_id ON dbo.audit_log(user_id);
CREATE INDEX IX_audit_log_action ON dbo.audit_log(action);
CREATE INDEX IX_audit_log_table_name ON dbo.audit_log(table_name);
CREATE INDEX IX_audit_log_timestamp ON dbo.audit_log(timestamp);
CREATE INDEX IX_audit_log_date ON dbo.audit_log(CAST(timestamp AS DATE));
GO

-- Trigger for automatisk oppdatering av updated_at
CREATE TRIGGER tr_blomster_update
ON dbo.blomster
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE dbo.blomster 
    SET updated_at = GETDATE() 
    WHERE id IN (SELECT id FROM inserted);
END
GO

-- Opprett initial admin bruker
-- Passord: admin123 (hashet med bcrypt)
INSERT INTO dbo.users (username, password_hash, role, full_name, email) 
VALUES ('admin', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewtkBnW1fUrz1eLG', 'admin', 'System Administrator', 'admin@blr.no');

-- Opprett test bruker
-- Passord: bruker123 (hashet med bcrypt)
INSERT INTO dbo.users (username, password_hash, role, full_name, email) 
VALUES ('bruker', '$2a$12$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'user', 'Test Bruker', 'bruker@blr.no');

-- Legg til viewer bruker for kun lesing
-- Passord: viewer123 (hashet med bcrypt)
INSERT INTO dbo.users (username, password_hash, role, full_name, email) 
VALUES ('viewer', '$2a$12$2X8QG3h4t5u9Ry6Kz8Mj3.A9Zv4Bx5Cy6Dw7Ex8Fy9Gz1Hz2Iz3Jy', 'viewer', 'Leser Bruker', 'viewer@blr.no');
GO

-- Eksempel blomster-data med norske blomster og deres egenskaper
INSERT INTO dbo.blomster (navn, vekt, klassifisering, beskrivelse, synonymer, opprinnelse, sesong, pris_per_kg, kvalitetsgrad, created_by) 
VALUES
('Rose', 0.500, 'A1', 'Klassisk rød rose, populær for buketter', 'red rose,rød rose,rosa', 'Nederland', 'Hele året', 150.00, 'A', 1),
('Tulipan', 0.300, 'B2', 'Gul tulipan, vårsymbol', 'yellow tulip,gul tulipan', 'Nederland', 'Vinter/Vår', 120.00, 'B', 1),
('Nellik', 0.200, 'A2', 'Hvit nellik med lang holdbarhet', 'carnation,hvit nellik,dianthus', 'Colombia', 'Hele året', 80.00, 'A', 1),
('Solsikke', 1.200, 'C1', 'Stor gul solsikke', 'sunflower,stor solsikke,helianthus', 'Kenya', 'Sommer/Høst', 200.00, 'C', 1),
('Orkidé', 0.800, 'A1', 'Lilla phalaenopsis orkidé', 'orchid,purple orchid,phalaenopsis', 'Thailand', 'Hele året', 300.00, 'A', 1),
('Lilje', 0.600, 'B1', 'Hvit orientalsk lilje', 'lily,white lily,oriental lily,lilium', 'Nederland', 'Sommer', 180.00, 'B', 1),
('Chrysanthemum', 0.400, 'B2', 'Gul krysantemum', 'mum,gul krysantemum,chrysant', 'Nederland', 'Høst', 100.00, 'B', 1),
('Petunia', 0.100, 'C3', 'Lilla petunia for uteplanting', 'purple petunia', 'Argentina', 'Vår/Sommer', 60.00, 'C', 1),
('Begonia', 0.300, 'B3', 'Rosa begonia', 'pink begonia', 'Brasil', 'Sommer', 90.00, 'B', 1),
('Dahlia', 0.900, 'A2', 'Rød georgine med store blomster', 'red dahlia,rød georgine', 'Mexico', 'Sommer/Høst', 250.00, 'A', 1),
('Fresia', 0.250, 'B1', 'Hvit fresia med intens duft', 'freesia,white freesia', 'Sør-Afrika', 'Vinter/Vår', 110.00, 'B', 1),
('Iris', 0.450, 'A2', 'Blå iris', 'blue iris,blå iris', 'Nederland', 'Vår', 160.00, 'A', 1),
('Anturium', 0.350, 'A1', 'Rød anturium med blank overflate', 'anthurium,red anthurium', 'Colombia', 'Hele året', 280.00, 'A', 1),
('Gerbera', 0.280, 'B1', 'Orange gerbera', 'orange gerbera', 'Sør-Afrika', 'Hele året', 95.00, 'B', 1),
('Lisianthus', 0.220, 'A2', 'Hvit lisianthus med doble blomster', 'white lisianthus,eustoma', 'Mexico', 'Hele året', 220.00, 'A', 1);
GO

-- Stored procedure for å søke blomster med fuzzy matching
CREATE PROCEDURE dbo.SearchBlomster
    @SearchTerm NVARCHAR(100)
AS
BEGIN
    SET NOCOUNT ON;
    
    SELECT 
        id,
        navn,
        vekt,
        klassifisering,
        beskrivelse,
        synonymer,
        opprinnelse,
        pris_per_kg,
        kvalitetsgrad,
        CASE 
            WHEN navn = @SearchTerm THEN 1
            WHEN navn LIKE @SearchTerm + '%' THEN 2
            WHEN navn LIKE '%' + @SearchTerm + '%' THEN 3
            WHEN synonymer LIKE '%' + @SearchTerm + '%' THEN 4
            ELSE 5
        END as relevance_score
    FROM dbo.blomster 
    WHERE 
        navn LIKE '%' + @SearchTerm + '%'
        OR synonymer LIKE '%' + @SearchTerm + '%'
        OR beskrivelse LIKE '%' + @SearchTerm + '%'
    ORDER BY relevance_score, navn
    OFFSET 0 ROWS FETCH NEXT 10 ROWS ONLY;
END
GO

-- Stored procedure for å logge brukeraktivitet
CREATE PROCEDURE dbo.LogUserActivity
    @UserId INT,
    @Action NVARCHAR(50),
    @TableName NVARCHAR(50),
    @RecordId INT = NULL,
    @OldValues NVARCHAR(MAX) = NULL,
    @NewValues NVARCHAR(MAX) = NULL,
    @IpAddress NVARCHAR(45) = NULL,
    @UserAgent NVARCHAR(MAX) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    
    INSERT INTO dbo.audit_log (
        user_id, action, table_name, record_id, 
        old_values, new_values, ip_address, user_agent
    ) VALUES (
        @UserId, @Action, @TableName, @RecordId,
        @OldValues, @NewValues, @IpAddress, @UserAgent
    );
END
GO

-- View for enklere queries
CREATE VIEW dbo.blomster_summary AS
SELECT 
    id,
    navn,
    vekt,
    klassifisering,
    kvalitetsgrad,
    pris_per_kg,
    opprinnelse,
    created_at,
    CASE 
        WHEN pris_per_kg IS NULL THEN 'Ikke priset'
        WHEN pris_per_kg < 100 THEN 'Lavpris'
        WHEN pris_per_kg BETWEEN 100 AND 200 THEN 'Middels'
        ELSE 'Premium'
    END as priskategori
FROM dbo.blomster
WHERE navn IS NOT NULL;
GO

-- Database statistics
SELECT 
    'Database Setup Complete' as Status,
    (SELECT COUNT(*) FROM dbo.users) as Total_Users,
    (SELECT COUNT(*) FROM dbo.blomster) as Total_Blomster,
    (SELECT COUNT(*) FROM dbo.audit_log) as Total_Audit_Entries,
    GETDATE() as Setup_Time;

-- Vis alle tabeller
SELECT 
    TABLE_NAME,
    (SELECT COUNT(*) 
     FROM INFORMATION_SCHEMA.COLUMNS 
     WHERE TABLE_NAME = t.TABLE_NAME) as Column_Count
FROM INFORMATION_SCHEMA.TABLES t
WHERE TABLE_TYPE = 'BASE TABLE' AND TABLE_SCHEMA = 'dbo'
ORDER BY TABLE_NAME;

PRINT '✅ BLR TOLL Database er satt opp og klar til bruk!';
GO