using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Xds.Approval.Api.Migrations
{
    public partial class RepairDockerSchemaDrift : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
                IF COL_LENGTH('AuthUsers', 'Email') IS NULL
                BEGIN
                    ALTER TABLE [AuthUsers] ADD [Email] nvarchar(180) NULL;
                END;

                IF COL_LENGTH('AuthUsers', 'FullName') IS NULL
                BEGIN
                    ALTER TABLE [AuthUsers] ADD [FullName] nvarchar(150) NULL;
                END;

                IF COL_LENGTH('AuthUsers', 'Department') IS NULL
                BEGIN
                    ALTER TABLE [AuthUsers] ADD [Department] nvarchar(100) NULL;
                END;

                IF COL_LENGTH('PaymentRequests', 'Currency') IS NULL
                BEGIN
                    ALTER TABLE [PaymentRequests] ADD [Currency] nvarchar(10) NULL;
                END;

                IF COL_LENGTH('PaymentRequests', 'Deadline') IS NULL
                BEGIN
                    ALTER TABLE [PaymentRequests]
                    ADD [Deadline] datetime2 NOT NULL
                    CONSTRAINT [DF_PaymentRequests_Deadline_RepairDockerSchemaDrift] DEFAULT ('2026-03-30T00:00:00.0000000Z');
                END;

                IF COL_LENGTH('PaymentRequests', 'PaymentType') IS NULL
                BEGIN
                    ALTER TABLE [PaymentRequests] ADD [PaymentType] nvarchar(50) NULL;
                END;

                IF COL_LENGTH('Approvals', 'Stage') IS NULL
                BEGIN
                    ALTER TABLE [Approvals] ADD [Stage] nvarchar(50) NULL;
                END;

                IF COL_LENGTH('FinanceProcessings', 'ProcessedBy') IS NOT NULL
                   AND COL_LENGTH('FinanceProcessings', 'PreparedBy') IS NULL
                BEGIN
                    EXEC sp_rename N'[FinanceProcessings].[ProcessedBy]', N'PreparedBy', N'COLUMN';
                END;

                IF COL_LENGTH('FinanceProcessings', 'ProcessedAt') IS NOT NULL
                   AND COL_LENGTH('FinanceProcessings', 'PreparedAt') IS NULL
                BEGIN
                    EXEC sp_rename N'[FinanceProcessings].[ProcessedAt]', N'PreparedAt', N'COLUMN';
                END;

                IF COL_LENGTH('FinanceProcessings', 'PreparedBy') IS NULL
                BEGIN
                    ALTER TABLE [FinanceProcessings]
                    ADD [PreparedBy] int NOT NULL
                    CONSTRAINT [DF_FinanceProcessings_PreparedBy_RepairDockerSchemaDrift] DEFAULT (0);
                END;

                IF COL_LENGTH('FinanceProcessings', 'PreparedAt') IS NULL
                BEGIN
                    ALTER TABLE [FinanceProcessings]
                    ADD [PreparedAt] datetime2 NOT NULL
                    CONSTRAINT [DF_FinanceProcessings_PreparedAt_RepairDockerSchemaDrift] DEFAULT (GETUTCDATE());
                END;

                IF COL_LENGTH('FinanceProcessings', 'AuthorizedBy') IS NULL
                BEGIN
                    ALTER TABLE [FinanceProcessings] ADD [AuthorizedBy] int NULL;
                END;

                IF COL_LENGTH('FinanceProcessings', 'AuthorizedAt') IS NULL
                BEGIN
                    ALTER TABLE [FinanceProcessings] ADD [AuthorizedAt] datetime2 NULL;
                END;

                IF COL_LENGTH('FinanceProcessings', 'CompanyName') IS NULL
                BEGIN
                    ALTER TABLE [FinanceProcessings] ADD [CompanyName] nvarchar(255) NULL;
                END;

                IF COL_LENGTH('FinanceProcessings', 'RecipientName') IS NULL
                BEGIN
                    ALTER TABLE [FinanceProcessings] ADD [RecipientName] nvarchar(255) NULL;
                END;

                IF COL_LENGTH('FinanceProcessings', 'RecipientAddress') IS NULL
                BEGIN
                    ALTER TABLE [FinanceProcessings] ADD [RecipientAddress] nvarchar(500) NULL;
                END;

                IF COL_LENGTH('FinanceProcessings', 'RecipientTelephone') IS NULL
                BEGIN
                    ALTER TABLE [FinanceProcessings] ADD [RecipientTelephone] nvarchar(50) NULL;
                END;
                """);

            migrationBuilder.Sql("""
                IF COL_LENGTH('AuthUsers', 'Email') IS NOT NULL
                BEGIN
                    EXEC(N'
                        UPDATE [AuthUsers]
                        SET [Email] = [Username]
                        WHERE [Email] IS NULL OR LTRIM(RTRIM([Email])) = '''';
                    ');
                END;

                IF COL_LENGTH('AuthUsers', 'FullName') IS NOT NULL
                BEGIN
                    EXEC(N'
                        UPDATE [AuthUsers]
                        SET [FullName] = [Username]
                        WHERE [FullName] IS NULL OR LTRIM(RTRIM([FullName])) = '''';
                    ');
                END;

                IF COL_LENGTH('AuthUsers', 'Department') IS NOT NULL
                BEGIN
                    EXEC(N'
                        UPDATE [AuthUsers]
                        SET [Department] = N''General''
                        WHERE [Department] IS NULL OR LTRIM(RTRIM([Department])) = '''';
                    ');
                END;

                IF COL_LENGTH('PaymentRequests', 'Currency') IS NOT NULL
                BEGIN
                    EXEC(N'
                        UPDATE [PaymentRequests]
                        SET [Currency] = N''GHS''
                        WHERE [Currency] IS NULL OR LTRIM(RTRIM([Currency])) = '''';
                    ');
                END;

                IF COL_LENGTH('PaymentRequests', 'PaymentType') IS NOT NULL
                BEGIN
                    EXEC(N'
                        UPDATE [PaymentRequests]
                        SET [PaymentType] = N''Once-off''
                        WHERE [PaymentType] IS NULL
                           OR LTRIM(RTRIM([PaymentType])) = ''''
                           OR [PaymentType] IN (N''One month'', N''One off'', N''one-off'', N''one off'', N''once off'', N''once-off'');
                    ');
                END;

                IF COL_LENGTH('Approvals', 'Stage') IS NOT NULL
                BEGIN
                    EXEC(N'
                        UPDATE [Approvals]
                        SET [Stage] = N''Initial''
                        WHERE [Stage] IS NULL OR LTRIM(RTRIM([Stage])) = '''';
                    ');
                END;

                IF COL_LENGTH('FinanceProcessings', 'CompanyName') IS NOT NULL
                BEGIN
                    EXEC(N'
                        UPDATE [FinanceProcessings]
                        SET [CompanyName] = N''''
                        WHERE [CompanyName] IS NULL;
                    ');
                END;

                IF COL_LENGTH('FinanceProcessings', 'RecipientName') IS NOT NULL
                BEGIN
                    EXEC(N'
                        UPDATE [FinanceProcessings]
                        SET [RecipientName] = N''''
                        WHERE [RecipientName] IS NULL;
                    ');
                END;

                IF COL_LENGTH('FinanceProcessings', 'RecipientAddress') IS NOT NULL
                BEGIN
                    EXEC(N'
                        UPDATE [FinanceProcessings]
                        SET [RecipientAddress] = N''''
                        WHERE [RecipientAddress] IS NULL;
                    ');
                END;

                IF COL_LENGTH('FinanceProcessings', 'RecipientTelephone') IS NOT NULL
                BEGIN
                    EXEC(N'
                        UPDATE [FinanceProcessings]
                        SET [RecipientTelephone] = N''''
                        WHERE [RecipientTelephone] IS NULL;
                    ');
                END;

                IF COL_LENGTH('FinanceProcessings', 'Status') IS NOT NULL
                BEGIN
                    EXEC(N'
                        UPDATE [FinanceProcessings]
                        SET [Status] = N''Prepared''
                        WHERE [Status] IS NULL OR LTRIM(RTRIM([Status])) = '''';
                    ');
                END;
                """);

            migrationBuilder.Sql("""
                IF COL_LENGTH('AuthUsers', 'Email') IS NOT NULL
                   AND NOT EXISTS (
                       SELECT 1
                       FROM sys.indexes
                       WHERE name = 'IX_AuthUsers_Email'
                         AND object_id = OBJECT_ID(N'[AuthUsers]')
                   )
                BEGIN
                    CREATE UNIQUE INDEX [IX_AuthUsers_Email] ON [AuthUsers] ([Email]) WHERE [Email] IS NOT NULL;
                END
                """);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
        }
    }
}
