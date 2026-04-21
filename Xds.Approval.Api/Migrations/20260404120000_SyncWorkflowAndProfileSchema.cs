using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Xds.Approval.Api.Migrations
{
    public partial class SyncWorkflowAndProfileSchema : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
                IF COL_LENGTH('AuthUsers', 'Email') IS NULL
                BEGIN
                    ALTER TABLE [AuthUsers]
                    ADD [Email] nvarchar(180) NOT NULL CONSTRAINT [DF_AuthUsers_Email] DEFAULT (N'')
                END;

                UPDATE [AuthUsers]
                SET [Email] = [Username]
                WHERE ISNULL(LTRIM(RTRIM([Email])), '') = '';

                IF NOT EXISTS (
                    SELECT 1
                    FROM sys.indexes
                    WHERE name = 'IX_AuthUsers_Email'
                      AND object_id = OBJECT_ID(N'[AuthUsers]')
                )
                BEGIN
                    CREATE UNIQUE INDEX [IX_AuthUsers_Email] ON [AuthUsers] ([Email])
                END
                """);

            migrationBuilder.Sql("""
                IF COL_LENGTH('PaymentRequests', 'Currency') IS NULL
                BEGIN
                    ALTER TABLE [PaymentRequests]
                    ADD [Currency] nvarchar(10) NOT NULL CONSTRAINT [DF_PaymentRequests_Currency] DEFAULT (N'GHS')
                END;

                UPDATE [PaymentRequests]
                SET [Currency] = N'GHS'
                WHERE ISNULL(LTRIM(RTRIM([Currency])), '') = ''
                """);

            migrationBuilder.Sql("""
                IF COL_LENGTH('Approvals', 'Stage') IS NULL
                BEGIN
                    ALTER TABLE [Approvals]
                    ADD [Stage] nvarchar(50) NOT NULL CONSTRAINT [DF_Approvals_Stage] DEFAULT (N'Initial')
                END
                """);

            migrationBuilder.Sql("""
                IF COL_LENGTH('FinanceProcessings', 'PreparedBy') IS NULL
                BEGIN
                    ALTER TABLE [FinanceProcessings]
                    ADD [PreparedBy] int NOT NULL CONSTRAINT [DF_FinanceProcessings_PreparedBy] DEFAULT (0)
                END;

                IF COL_LENGTH('FinanceProcessings', 'ProcessedBy') IS NOT NULL
                BEGIN
                    UPDATE [FinanceProcessings]
                    SET [PreparedBy] = [ProcessedBy]
                    WHERE [PreparedBy] = 0
                END;

                IF COL_LENGTH('FinanceProcessings', 'PreparedAt') IS NULL
                BEGIN
                    ALTER TABLE [FinanceProcessings]
                    ADD [PreparedAt] datetime2 NOT NULL CONSTRAINT [DF_FinanceProcessings_PreparedAt] DEFAULT (GETUTCDATE())
                END;

                IF COL_LENGTH('FinanceProcessings', 'ProcessedAt') IS NOT NULL
                BEGIN
                    UPDATE [FinanceProcessings]
                    SET [PreparedAt] = [ProcessedAt]
                END;

                IF COL_LENGTH('FinanceProcessings', 'AuthorizedBy') IS NULL
                BEGIN
                    ALTER TABLE [FinanceProcessings]
                    ADD [AuthorizedBy] int NULL
                END;

                IF COL_LENGTH('FinanceProcessings', 'AuthorizedAt') IS NULL
                BEGIN
                    ALTER TABLE [FinanceProcessings]
                    ADD [AuthorizedAt] datetime2 NULL
                END;

                IF COL_LENGTH('FinanceProcessings', 'CompanyName') IS NULL
                BEGIN
                    ALTER TABLE [FinanceProcessings]
                    ADD [CompanyName] nvarchar(255) NOT NULL CONSTRAINT [DF_FinanceProcessings_CompanyName] DEFAULT (N'')
                END;

                IF COL_LENGTH('FinanceProcessings', 'RecipientName') IS NULL
                BEGIN
                    ALTER TABLE [FinanceProcessings]
                    ADD [RecipientName] nvarchar(255) NOT NULL CONSTRAINT [DF_FinanceProcessings_RecipientName] DEFAULT (N'')
                END;

                UPDATE [FinanceProcessings]
                SET [RecipientName] = N''
                WHERE [RecipientName] IS NULL;

                IF EXISTS (
                    SELECT 1
                    FROM sys.columns
                    WHERE Name = N'Status'
                      AND Object_ID = Object_ID(N'[FinanceProcessings]')
                )
                BEGIN
                    ALTER TABLE [FinanceProcessings] ALTER COLUMN [Status] nvarchar(50) NOT NULL
                END
                """);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
                IF EXISTS (
                    SELECT 1
                    FROM sys.indexes
                    WHERE name = 'IX_AuthUsers_Email'
                      AND object_id = OBJECT_ID(N'[AuthUsers]')
                )
                BEGIN
                    DROP INDEX [IX_AuthUsers_Email] ON [AuthUsers]
                END
                """);
        }
    }
}
