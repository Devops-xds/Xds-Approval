using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Xds.Approval.Api.Migrations
{
    public partial class AddFullNameToAuthUsers : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
                IF COL_LENGTH('AuthUsers', 'FullName') IS NULL
                BEGIN
                    ALTER TABLE [AuthUsers]
                    ADD [FullName] nvarchar(150) NOT NULL CONSTRAINT [DF_AuthUsers_FullName] DEFAULT (N'')
                END;

                UPDATE [AuthUsers]
                SET [FullName] = [Username]
                WHERE ISNULL(LTRIM(RTRIM([FullName])), '') = ''
                """);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
                IF COL_LENGTH('AuthUsers', 'FullName') IS NOT NULL
                BEGIN
                    ALTER TABLE [AuthUsers] DROP CONSTRAINT [DF_AuthUsers_FullName]
                    ALTER TABLE [AuthUsers] DROP COLUMN [FullName]
                END
                """);
        }
    }
}
