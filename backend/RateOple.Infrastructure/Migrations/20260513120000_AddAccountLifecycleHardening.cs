using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace RateOple.Infrastructure.Migrations
{
    [Migration("20260513120000_AddAccountLifecycleHardening")]
    public partial class AddAccountLifecycleHardening : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "IsSuspended",
                table: "AspNetUsers",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "SuspensionReason",
                table: "AspNetUsers",
                type: "character varying(1000)",
                maxLength: 1000,
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "SuspendedAt",
                table: "AspNetUsers",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "SuspensionAppeals",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    Text = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: false),
                    Status = table.Column<int>(type: "integer", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    ResolvedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    ResolvedByUserId = table.Column<Guid>(type: "uuid", nullable: true),
                    ResolutionNote = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SuspensionAppeals", x => x.Id);
                    table.ForeignKey(
                        name: "FK_SuspensionAppeals_AspNetUsers_ResolvedByUserId",
                        column: x => x.ResolvedByUserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_SuspensionAppeals_AspNetUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_SuspensionAppeals_CreatedAt",
                table: "SuspensionAppeals",
                column: "CreatedAt");

            migrationBuilder.CreateIndex(
                name: "IX_SuspensionAppeals_ResolvedByUserId",
                table: "SuspensionAppeals",
                column: "ResolvedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_SuspensionAppeals_UserId_Status",
                table: "SuspensionAppeals",
                columns: new[] { "UserId", "Status" });
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "SuspensionAppeals");

            migrationBuilder.DropColumn(
                name: "IsSuspended",
                table: "AspNetUsers");

            migrationBuilder.DropColumn(
                name: "SuspensionReason",
                table: "AspNetUsers");

            migrationBuilder.DropColumn(
                name: "SuspendedAt",
                table: "AspNetUsers");
        }
    }
}
