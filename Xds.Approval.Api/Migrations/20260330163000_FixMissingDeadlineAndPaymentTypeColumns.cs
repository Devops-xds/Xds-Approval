using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Xds.Approval.Api.Migrations
{
    public partial class FixMissingDeadlineAndPaymentTypeColumns : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
                IF COL_LENGTH('PaymentRequests', 'Deadline') IS NULL
                BEGIN
                    ALTER TABLE [PaymentRequests]
                    ADD [Deadline] datetime2 NOT NULL CONSTRAINT [DF_PaymentRequests_Deadline] DEFAULT ('2026-03-30T00:00:00.0000000Z')
                END
                """);

            migrationBuilder.Sql("""
                IF COL_LENGTH('PaymentRequests', 'PaymentType') IS NULL
                BEGIN
                    ALTER TABLE [PaymentRequests]
                    ADD [PaymentType] nvarchar(50) NOT NULL CONSTRAINT [DF_PaymentRequests_PaymentType] DEFAULT (N'One month')
                END
                """);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
                IF COL_LENGTH('PaymentRequests', 'PaymentType') IS NOT NULL
                BEGIN
                    ALTER TABLE [PaymentRequests] DROP CONSTRAINT [DF_PaymentRequests_PaymentType]
                    ALTER TABLE [PaymentRequests] DROP COLUMN [PaymentType]
                END
                """);

            migrationBuilder.Sql("""
                IF COL_LENGTH('PaymentRequests', 'Deadline') IS NOT NULL
                BEGIN
                    ALTER TABLE [PaymentRequests] DROP CONSTRAINT [DF_PaymentRequests_Deadline]
                    ALTER TABLE [PaymentRequests] DROP COLUMN [Deadline]
                END
                """);
        }
    }
}
