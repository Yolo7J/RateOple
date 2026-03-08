using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace RateOple.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddPostMediaAttachments : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "PostMediaLinks",
                columns: table => new
                {
                    PostId = table.Column<Guid>(type: "uuid", nullable: false),
                    MediaId = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PostMediaLinks", x => new { x.PostId, x.MediaId });
                    table.ForeignKey(
                        name: "FK_PostMediaLinks_GroupPosts_PostId",
                        column: x => x.PostId,
                        principalTable: "GroupPosts",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_PostMediaLinks_Media_MediaId",
                        column: x => x.MediaId,
                        principalTable: "Media",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_PostMediaLinks_MediaId",
                table: "PostMediaLinks",
                column: "MediaId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "PostMediaLinks");
        }
    }
}
