using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace RateOple.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddMediaInteractions : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "MediaInteractions",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    MediaId = table.Column<Guid>(type: "uuid", nullable: true),
                    SeasonId = table.Column<Guid>(type: "uuid", nullable: true),
                    EpisodeId = table.Column<Guid>(type: "uuid", nullable: true),
                    InteractionType = table.Column<int>(type: "integer", nullable: false),
                    Points = table.Column<int>(type: "integer", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MediaInteractions", x => x.Id);
                    table.CheckConstraint("CK_MediaInteraction_ExactlyOneTarget", "(\n                (CASE WHEN \"MediaId\" IS NOT NULL THEN 1 ELSE 0 END) +\n                (CASE WHEN \"SeasonId\" IS NOT NULL THEN 1 ELSE 0 END) +\n                (CASE WHEN \"EpisodeId\" IS NOT NULL THEN 1 ELSE 0 END)\n            ) = 1");
                    table.ForeignKey(
                        name: "FK_MediaInteractions_AspNetUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_MediaInteractions_Episodes_EpisodeId",
                        column: x => x.EpisodeId,
                        principalTable: "Episodes",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_MediaInteractions_Media_MediaId",
                        column: x => x.MediaId,
                        principalTable: "Media",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_MediaInteractions_Seasons_SeasonId",
                        column: x => x.SeasonId,
                        principalTable: "Seasons",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_MediaInteractions_EpisodeId",
                table: "MediaInteractions",
                column: "EpisodeId");

            migrationBuilder.CreateIndex(
                name: "IX_MediaInteractions_MediaId",
                table: "MediaInteractions",
                column: "MediaId");

            migrationBuilder.CreateIndex(
                name: "IX_MediaInteractions_SeasonId",
                table: "MediaInteractions",
                column: "SeasonId");

            migrationBuilder.CreateIndex(
                name: "IX_MediaInteractions_UserId_CreatedAt",
                table: "MediaInteractions",
                columns: new[] { "UserId", "CreatedAt" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "MediaInteractions");
        }
    }
}
