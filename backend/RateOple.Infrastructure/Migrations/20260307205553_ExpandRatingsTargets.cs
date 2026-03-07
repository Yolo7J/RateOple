using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace RateOple.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class ExpandRatingsTargets : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Ratings_UserId_MediaId",
                table: "Ratings");

            migrationBuilder.AlterColumn<Guid>(
                name: "MediaId",
                table: "Ratings",
                type: "uuid",
                nullable: true,
                oldClrType: typeof(Guid),
                oldType: "uuid");

            migrationBuilder.AddColumn<Guid>(
                name: "EpisodeId",
                table: "Ratings",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "SeasonId",
                table: "Ratings",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "UpdatedAt",
                table: "Ratings",
                type: "timestamp with time zone",
                nullable: false,
                defaultValue: new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified));

            migrationBuilder.CreateIndex(
                name: "IX_Ratings_EpisodeId",
                table: "Ratings",
                column: "EpisodeId");

            migrationBuilder.CreateIndex(
                name: "IX_Ratings_SeasonId",
                table: "Ratings",
                column: "SeasonId");

            migrationBuilder.CreateIndex(
                name: "IX_Ratings_UserId_EpisodeId",
                table: "Ratings",
                columns: new[] { "UserId", "EpisodeId" },
                unique: true,
                filter: "\"EpisodeId\" IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_Ratings_UserId_MediaId",
                table: "Ratings",
                columns: new[] { "UserId", "MediaId" },
                unique: true,
                filter: "\"MediaId\" IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_Ratings_UserId_SeasonId",
                table: "Ratings",
                columns: new[] { "UserId", "SeasonId" },
                unique: true,
                filter: "\"SeasonId\" IS NOT NULL");

            migrationBuilder.AddCheckConstraint(
                name: "CK_Rating_ExactlyOneTarget",
                table: "Ratings",
                sql: "(\n                (CASE WHEN \"MediaId\" IS NOT NULL THEN 1 ELSE 0 END) +\n                (CASE WHEN \"SeasonId\" IS NOT NULL THEN 1 ELSE 0 END) +\n                (CASE WHEN \"EpisodeId\" IS NOT NULL THEN 1 ELSE 0 END)\n            ) = 1");

            migrationBuilder.AddForeignKey(
                name: "FK_Ratings_Episodes_EpisodeId",
                table: "Ratings",
                column: "EpisodeId",
                principalTable: "Episodes",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_Ratings_Seasons_SeasonId",
                table: "Ratings",
                column: "SeasonId",
                principalTable: "Seasons",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Ratings_Episodes_EpisodeId",
                table: "Ratings");

            migrationBuilder.DropForeignKey(
                name: "FK_Ratings_Seasons_SeasonId",
                table: "Ratings");

            migrationBuilder.DropIndex(
                name: "IX_Ratings_EpisodeId",
                table: "Ratings");

            migrationBuilder.DropIndex(
                name: "IX_Ratings_SeasonId",
                table: "Ratings");

            migrationBuilder.DropIndex(
                name: "IX_Ratings_UserId_EpisodeId",
                table: "Ratings");

            migrationBuilder.DropIndex(
                name: "IX_Ratings_UserId_MediaId",
                table: "Ratings");

            migrationBuilder.DropIndex(
                name: "IX_Ratings_UserId_SeasonId",
                table: "Ratings");

            migrationBuilder.DropCheckConstraint(
                name: "CK_Rating_ExactlyOneTarget",
                table: "Ratings");

            migrationBuilder.DropColumn(
                name: "EpisodeId",
                table: "Ratings");

            migrationBuilder.DropColumn(
                name: "SeasonId",
                table: "Ratings");

            migrationBuilder.DropColumn(
                name: "UpdatedAt",
                table: "Ratings");

            migrationBuilder.AlterColumn<Guid>(
                name: "MediaId",
                table: "Ratings",
                type: "uuid",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"),
                oldClrType: typeof(Guid),
                oldType: "uuid",
                oldNullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Ratings_UserId_MediaId",
                table: "Ratings",
                columns: new[] { "UserId", "MediaId" },
                unique: true);
        }
    }
}
