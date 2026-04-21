using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Xds.Approval.Api.Migrations
{
    public partial class AddDepartmentToAuthUsers : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
                IF COL_LENGTH('AuthUsers', 'Department') IS NULL
                BEGIN
                    ALTER TABLE [AuthUsers]
                    ADD [Department] nvarchar(100) NOT NULL CONSTRAINT [DF_AuthUsers_Department] DEFAULT (N'General')
                END;

                IF COL_LENGTH('AuthUsers', 'Department') IS NOT NULL
                BEGIN
                    EXEC(N'
                        UPDATE [AuthUsers]
                        SET [Department] = N''General''
                        WHERE ISNULL(LTRIM(RTRIM([Department])), '''') = ''''
                    ')
                END
                """);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
                IF COL_LENGTH('AuthUsers', 'Department') IS NOT NULL
                BEGIN
                    ALTER TABLE [AuthUsers] DROP CONSTRAINT [DF_AuthUsers_Department]
                    ALTER TABLE [AuthUsers] DROP COLUMN [Department]
                END
                """);
        }
    }
}
