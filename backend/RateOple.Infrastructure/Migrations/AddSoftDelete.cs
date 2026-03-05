using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace RateOple.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddSoftDelete : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "IsDeleted",
                table: "Media",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "IsDeleted",
                table: "Seasons",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "IsDeleted",
                table: "Episodes",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            // Index to speed up the very common WHERE IsDeleted = false filter on Media
            migrationBuilder.CreateIndex(
                name: "IX_Media_IsDeleted",
                table: "Media",
                column: "IsDeleted");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Media_IsDeleted",
                table: "Media");

            migrationBuilder.DropColumn(
                name: "IsDeleted",
                table: "Episodes");

            migrationBuilder.DropColumn(
                name: "IsDeleted",
                table: "Seasons");

            migrationBuilder.DropColumn(
                name: "IsDeleted",
                table: "Media");
        }
    }
}