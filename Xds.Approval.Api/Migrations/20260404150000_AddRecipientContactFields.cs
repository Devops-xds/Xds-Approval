using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Xds.Approval.Api.Migrations
{
    public partial class AddRecipientContactFields : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
                IF COL_LENGTH('FinanceProcessings', 'RecipientAddress') IS NULL
                BEGIN
                    ALTER TABLE [FinanceProcessings]
                    ADD [RecipientAddress] nvarchar(500) NOT NULL CONSTRAINT [DF_FinanceProcessings_RecipientAddress] DEFAULT (N'')
                END;

                IF COL_LENGTH('FinanceProcessings', 'RecipientTelephone') IS NULL
                BEGIN
                    ALTER TABLE [FinanceProcessings]
                    ADD [RecipientTelephone] nvarchar(50) NOT NULL CONSTRAINT [DF_FinanceProcessings_RecipientTelephone] DEFAULT (N'')
                END;

                UPDATE [FinanceProcessings]
                SET [RecipientAddress] = N''
                WHERE [RecipientAddress] IS NULL;

                UPDATE [FinanceProcessings]
                SET [RecipientTelephone] = N''
                WHERE [RecipientTelephone] IS NULL;
                """);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
                IF COL_LENGTH('FinanceProcessings', 'RecipientTelephone') IS NOT NULL
                BEGIN
                    ALTER TABLE [FinanceProcessings] DROP CONSTRAINT [DF_FinanceProcessings_RecipientTelephone]
                    ALTER TABLE [FinanceProcessings] DROP COLUMN [RecipientTelephone]
                END;

                IF COL_LENGTH('FinanceProcessings', 'RecipientAddress') IS NOT NULL
                BEGIN
                    ALTER TABLE [FinanceProcessings] DROP CONSTRAINT [DF_FinanceProcessings_RecipientAddress]
                    ALTER TABLE [FinanceProcessings] DROP COLUMN [RecipientAddress]
                END;
                """);
        }
    }
}
