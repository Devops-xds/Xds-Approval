using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Xds.Approval.Api.Migrations
{
    /// <inheritdoc />
    public partial class _20260404140000_ApplyCurrentWorkflowSchema : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
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

                IF COL_LENGTH('PaymentRequests', 'PaymentType') IS NULL
                BEGIN
                    ALTER TABLE [PaymentRequests] ADD [PaymentType] nvarchar(50) NULL;
                END
                ELSE
                BEGIN
                    DECLARE @paymentTypeDefault sysname;
                    SELECT @paymentTypeDefault = [d].[name]
                    FROM [sys].[default_constraints] [d]
                    INNER JOIN [sys].[columns] [c]
                        ON [d].[parent_column_id] = [c].[column_id]
                       AND [d].[parent_object_id] = [c].[object_id]
                    WHERE [d].[parent_object_id] = OBJECT_ID(N'[PaymentRequests]')
                      AND [c].[name] = N'PaymentType';

                    IF @paymentTypeDefault IS NOT NULL
                        EXEC(N'ALTER TABLE [PaymentRequests] DROP CONSTRAINT [' + @paymentTypeDefault + '];');

                    ALTER TABLE [PaymentRequests] ALTER COLUMN [PaymentType] nvarchar(50) NULL;
                END;

                IF COL_LENGTH('PaymentRequests', 'Currency') IS NULL
                BEGIN
                    ALTER TABLE [PaymentRequests] ADD [Currency] nvarchar(10) NULL;
                END;

                IF COL_LENGTH('FinanceProcessings', 'Status') IS NOT NULL
                BEGIN
                    ALTER TABLE [FinanceProcessings] ALTER COLUMN [Status] nvarchar(50) NULL;
                END;

                IF COL_LENGTH('FinanceProcessings', 'AuthorizedAt') IS NULL
                BEGIN
                    ALTER TABLE [FinanceProcessings] ADD [AuthorizedAt] datetime2 NULL;
                END;

                IF COL_LENGTH('FinanceProcessings', 'AuthorizedBy') IS NULL
                BEGIN
                    ALTER TABLE [FinanceProcessings] ADD [AuthorizedBy] int NULL;
                END;

                IF COL_LENGTH('FinanceProcessings', 'CompanyName') IS NULL
                BEGIN
                    ALTER TABLE [FinanceProcessings] ADD [CompanyName] nvarchar(255) NULL;
                END;

                IF COL_LENGTH('FinanceProcessings', 'RecipientName') IS NULL
                BEGIN
                    ALTER TABLE [FinanceProcessings] ADD [RecipientName] nvarchar(255) NULL;
                END;

                IF COL_LENGTH('AuthUsers', 'FullName') IS NOT NULL
                BEGIN
                    ALTER TABLE [AuthUsers] ALTER COLUMN [FullName] nvarchar(150) NULL;
                END;

                IF COL_LENGTH('AuthUsers', 'Department') IS NOT NULL
                BEGIN
                    ALTER TABLE [AuthUsers] ALTER COLUMN [Department] nvarchar(100) NULL;
                END;

                IF COL_LENGTH('Approvals', 'Status') IS NOT NULL
                BEGIN
                    ALTER TABLE [Approvals] ALTER COLUMN [Status] nvarchar(50) NULL;
                END;

                IF COL_LENGTH('Approvals', 'Comment') IS NOT NULL
                BEGIN
                    ALTER TABLE [Approvals] ALTER COLUMN [Comment] nvarchar(max) NULL;
                END;

                IF COL_LENGTH('Approvals', 'Stage') IS NULL
                BEGIN
                    ALTER TABLE [Approvals] ADD [Stage] nvarchar(50) NULL;
                END;

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

                IF COL_LENGTH('Approvals', 'Status') IS NOT NULL
                BEGIN
                    EXEC(N'
                        UPDATE [Approvals]
                        SET [Status] = N''Approved''
                        WHERE [Status] IS NULL OR LTRIM(RTRIM([Status])) = '''';
                    ');
                END;

                IF COL_LENGTH('Approvals', 'Comment') IS NOT NULL
                BEGIN
                    EXEC(N'
                        UPDATE [Approvals]
                        SET [Comment] = N''''
                        WHERE [Comment] IS NULL;
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

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_AuthUsers_Email",
                table: "AuthUsers");

            migrationBuilder.DropColumn(
                name: "Currency",
                table: "PaymentRequests");

            migrationBuilder.DropColumn(
                name: "AuthorizedAt",
                table: "FinanceProcessings");

            migrationBuilder.DropColumn(
                name: "AuthorizedBy",
                table: "FinanceProcessings");

            migrationBuilder.DropColumn(
                name: "CompanyName",
                table: "FinanceProcessings");

            migrationBuilder.DropColumn(
                name: "RecipientName",
                table: "FinanceProcessings");

            migrationBuilder.DropColumn(
                name: "Stage",
                table: "Approvals");

            migrationBuilder.RenameColumn(
                name: "PreparedBy",
                table: "FinanceProcessings",
                newName: "ProcessedBy");

            migrationBuilder.RenameColumn(
                name: "PreparedAt",
                table: "FinanceProcessings",
                newName: "ProcessedAt");

            migrationBuilder.AlterColumn<string>(
                name: "PaymentType",
                table: "PaymentRequests",
                type: "nvarchar(50)",
                maxLength: 50,
                nullable: false,
                defaultValue: "",
                oldClrType: typeof(string),
                oldType: "nvarchar(50)",
                oldMaxLength: 50,
                oldNullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "Status",
                table: "FinanceProcessings",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "",
                oldClrType: typeof(string),
                oldType: "nvarchar(50)",
                oldMaxLength: 50,
                oldNullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "FullName",
                table: "AuthUsers",
                type: "nvarchar(150)",
                maxLength: 150,
                nullable: false,
                defaultValue: "",
                oldClrType: typeof(string),
                oldType: "nvarchar(150)",
                oldMaxLength: 150,
                oldNullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "Department",
                table: "AuthUsers",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: false,
                defaultValue: "",
                oldClrType: typeof(string),
                oldType: "nvarchar(100)",
                oldMaxLength: 100,
                oldNullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "Status",
                table: "Approvals",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "",
                oldClrType: typeof(string),
                oldType: "nvarchar(50)",
                oldMaxLength: 50,
                oldNullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "Comment",
                table: "Approvals",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "",
                oldClrType: typeof(string),
                oldType: "nvarchar(max)",
                oldNullable: true);
        }
    }
}
