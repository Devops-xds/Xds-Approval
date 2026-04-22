using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Xds.Approval.Api.Migrations
{
    [DbContext(typeof(AppDbContext))]
    [Migration("20260422170000_EnsurePaymentRequestColumns")]
    public partial class EnsurePaymentRequestColumns : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
                IF OBJECT_ID(N'[PaymentRequests]', N'U') IS NOT NULL
                BEGIN
                    IF COL_LENGTH('PaymentRequests', 'Currency') IS NULL
                    BEGIN
                        ALTER TABLE [PaymentRequests]
                        ADD [Currency] nvarchar(10) NULL;
                    END;

                    IF COL_LENGTH('PaymentRequests', 'Deadline') IS NULL
                    BEGIN
                        ALTER TABLE [PaymentRequests]
                        ADD [Deadline] datetime2 NOT NULL
                        CONSTRAINT [DF_PaymentRequests_Deadline_EnsurePaymentRequestColumns] DEFAULT (GETUTCDATE());
                    END;

                    IF COL_LENGTH('PaymentRequests', 'PaymentType') IS NULL
                    BEGIN
                        ALTER TABLE [PaymentRequests]
                        ADD [PaymentType] nvarchar(50) NULL;
                    END;

                    EXEC(N'
                        UPDATE [PaymentRequests]
                        SET [Currency] = N''GHS''
                        WHERE [Currency] IS NULL OR LTRIM(RTRIM([Currency])) = '''';
                    ');

                    EXEC(N'
                        UPDATE [PaymentRequests]
                        SET [PaymentType] = N''One-off''
                        WHERE [PaymentType] IS NULL
                           OR LTRIM(RTRIM([PaymentType])) = ''''
                           OR [PaymentType] IN (N''One month'', N''One off'', N''one-off'', N''one off'', N''Once-off'', N''once off'', N''once-off'');
                    ');
                END;
                """);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
        }
    }
}
