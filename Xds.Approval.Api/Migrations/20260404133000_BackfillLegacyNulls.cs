using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Xds.Approval.Api.Migrations
{
    public partial class BackfillLegacyNulls : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
                IF OBJECT_ID(N'[AuthUsers]', N'U') IS NOT NULL
                BEGIN
                    IF COL_LENGTH('AuthUsers', 'Email') IS NOT NULL
                    BEGIN
                        UPDATE [AuthUsers]
                        SET [Email] = [Username]
                        WHERE [Email] IS NULL OR LTRIM(RTRIM([Email])) = ''
                    END;

                    IF COL_LENGTH('AuthUsers', 'FullName') IS NOT NULL
                    BEGIN
                        UPDATE [AuthUsers]
                        SET [FullName] = [Username]
                        WHERE [FullName] IS NULL OR LTRIM(RTRIM([FullName])) = ''
                    END;

                    IF COL_LENGTH('AuthUsers', 'Department') IS NOT NULL
                    BEGIN
                        UPDATE [AuthUsers]
                        SET [Department] = N'General'
                        WHERE [Department] IS NULL OR LTRIM(RTRIM([Department])) = ''
                    END
                END
                """);

            migrationBuilder.Sql("""
                IF OBJECT_ID(N'[PaymentRequests]', N'U') IS NOT NULL
                BEGIN
                    IF COL_LENGTH('PaymentRequests', 'Currency') IS NOT NULL
                    BEGIN
                        UPDATE [PaymentRequests]
                        SET [Currency] = N'GHS'
                        WHERE [Currency] IS NULL OR LTRIM(RTRIM([Currency])) = ''
                    END;

                    IF COL_LENGTH('PaymentRequests', 'PaymentType') IS NOT NULL
                    BEGIN
                        UPDATE [PaymentRequests]
                        SET [PaymentType] = N'Once-off'
                        WHERE [PaymentType] IS NULL OR LTRIM(RTRIM([PaymentType])) = '';

                        UPDATE [PaymentRequests]
                        SET [PaymentType] = N'Once-off'
                        WHERE [PaymentType] IN (N'One month', N'One off', N'one-off', N'one off', N'once off', N'once-off')
                    END
                END
                """);

            migrationBuilder.Sql("""
                IF OBJECT_ID(N'[Approvals]', N'U') IS NOT NULL
                BEGIN
                    IF COL_LENGTH('Approvals', 'Stage') IS NOT NULL
                    BEGIN
                        UPDATE [Approvals]
                        SET [Stage] = N'Initial'
                        WHERE [Stage] IS NULL OR LTRIM(RTRIM([Stage])) = ''
                    END;

                    IF COL_LENGTH('Approvals', 'Status') IS NOT NULL
                    BEGIN
                        UPDATE [Approvals]
                        SET [Status] = N'Approved'
                        WHERE [Status] IS NULL OR LTRIM(RTRIM([Status])) = ''
                    END;

                    IF COL_LENGTH('Approvals', 'Comment') IS NOT NULL
                    BEGIN
                        UPDATE [Approvals]
                        SET [Comment] = N''
                        WHERE [Comment] IS NULL
                    END
                END
                """);

            migrationBuilder.Sql("""
                IF OBJECT_ID(N'[FinanceProcessings]', N'U') IS NOT NULL
                BEGIN
                    IF COL_LENGTH('FinanceProcessings', 'CompanyName') IS NOT NULL
                    BEGIN
                        UPDATE [FinanceProcessings]
                        SET [CompanyName] = N''
                        WHERE [CompanyName] IS NULL
                    END;

                    IF COL_LENGTH('FinanceProcessings', 'RecipientName') IS NOT NULL
                    BEGIN
                        UPDATE [FinanceProcessings]
                        SET [RecipientName] = N''
                        WHERE [RecipientName] IS NULL
                    END;

                    IF COL_LENGTH('FinanceProcessings', 'Status') IS NOT NULL
                    BEGIN
                        UPDATE [FinanceProcessings]
                        SET [Status] = N'Prepared'
                        WHERE [Status] IS NULL OR LTRIM(RTRIM([Status])) = ''
                    END
                END
                """);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
        }
    }
}
