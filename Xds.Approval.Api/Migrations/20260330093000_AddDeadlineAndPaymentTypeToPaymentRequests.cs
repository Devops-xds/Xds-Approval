using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Xds.Approval.Api.Migrations
{
    public partial class AddDeadlineAndPaymentTypeToPaymentRequests : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "Deadline",
                table: "PaymentRequests",
                type: "datetime2",
                nullable: false,
                defaultValue: new DateTime(2026, 3, 30, 0, 0, 0, DateTimeKind.Utc));

            migrationBuilder.AddColumn<string>(
                name: "PaymentType",
                table: "PaymentRequests",
                type: "nvarchar(50)",
                maxLength: 50,
                nullable: false,
                defaultValue: "One month");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Deadline",
                table: "PaymentRequests");

            migrationBuilder.DropColumn(
                name: "PaymentType",
                table: "PaymentRequests");
        }
    }
}
