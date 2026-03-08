using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace RateOple.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddModerationReportsAndAssignments : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "ModeratorAssignments",
                columns: table => new
                {
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    ScopeType = table.Column<int>(type: "integer", nullable: false),
                    ScopeId = table.Column<Guid>(type: "uuid", nullable: false),
                    AssignedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    AssignedById = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ModeratorAssignments", x => new { x.UserId, x.ScopeType, x.ScopeId });
                    table.ForeignKey(
                        name: "FK_ModeratorAssignments_AspNetUsers_AssignedById",
                        column: x => x.AssignedById,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_ModeratorAssignments_AspNetUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "Reports",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ReporterId = table.Column<Guid>(type: "uuid", nullable: false),
                    TargetType = table.Column<int>(type: "integer", nullable: false),
                    TargetId = table.Column<Guid>(type: "uuid", nullable: false),
                    Reason = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: false),
                    Status = table.Column<int>(type: "integer", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    ReviewedById = table.Column<Guid>(type: "uuid", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Reports", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Reports_AspNetUsers_ReporterId",
                        column: x => x.ReporterId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_Reports_AspNetUsers_ReviewedById",
                        column: x => x.ReviewedById,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateIndex(
                name: "IX_ModeratorAssignments_AssignedById",
                table: "ModeratorAssignments",
                column: "AssignedById");

            migrationBuilder.CreateIndex(
                name: "IX_ModeratorAssignments_ScopeType_ScopeId",
                table: "ModeratorAssignments",
                columns: new[] { "ScopeType", "ScopeId" });

            migrationBuilder.CreateIndex(
                name: "IX_Reports_CreatedAt",
                table: "Reports",
                column: "CreatedAt");

            migrationBuilder.CreateIndex(
                name: "IX_Reports_ReporterId_TargetType_TargetId",
                table: "Reports",
                columns: new[] { "ReporterId", "TargetType", "TargetId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Reports_ReviewedById",
                table: "Reports",
                column: "ReviewedById");

            migrationBuilder.CreateIndex(
                name: "IX_Reports_Status",
                table: "Reports",
                column: "Status");

            migrationBuilder.CreateIndex(
                name: "IX_Reports_TargetType_TargetId",
                table: "Reports",
                columns: new[] { "TargetType", "TargetId" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ModeratorAssignments");

            migrationBuilder.DropTable(
                name: "Reports");
        }
    }
}
