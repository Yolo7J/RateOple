using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace RateOple.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class ExpandCollectionsHierarchyOwnershipFollow : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Collections_AspNetUsers_OwnerId",
                table: "Collections");

            migrationBuilder.AlterColumn<Guid>(
                name: "OwnerId",
                table: "Collections",
                type: "uuid",
                nullable: true,
                oldClrType: typeof(Guid),
                oldType: "uuid");

            migrationBuilder.AddColumn<string>(
                name: "CoverImageUrl",
                table: "Collections",
                type: "character varying(512)",
                maxLength: 512,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Name",
                table: "Collections",
                type: "character varying(200)",
                maxLength: 200,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<int>(
                name: "OwnerType",
                table: "Collections",
                type: "integer",
                nullable: false,
                defaultValue: 2);

            migrationBuilder.AddColumn<Guid>(
                name: "ParentCollectionId",
                table: "Collections",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "SortMode",
                table: "Collections",
                type: "integer",
                nullable: false,
                defaultValue: 1);

            migrationBuilder.AddColumn<int>(
                name: "OrderIndex",
                table: "CollectionItems",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.Sql("UPDATE \"Collections\" SET \"Name\" = \"Title\" WHERE \"Name\" = '';");

            migrationBuilder.CreateTable(
                name: "FollowCollections",
                columns: table => new
                {
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    CollectionId = table.Column<Guid>(type: "uuid", nullable: false),
                    FollowedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_FollowCollections", x => new { x.UserId, x.CollectionId });
                    table.ForeignKey(
                        name: "FK_FollowCollections_AspNetUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_FollowCollections_Collections_CollectionId",
                        column: x => x.CollectionId,
                        principalTable: "Collections",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Collections_OwnerType_OwnerId",
                table: "Collections",
                columns: new[] { "OwnerType", "OwnerId" });

            migrationBuilder.CreateIndex(
                name: "IX_Collections_ParentCollectionId",
                table: "Collections",
                column: "ParentCollectionId");

            migrationBuilder.CreateIndex(
                name: "IX_CollectionItems_CollectionId_OrderIndex",
                table: "CollectionItems",
                columns: new[] { "CollectionId", "OrderIndex" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_FollowCollections_CollectionId",
                table: "FollowCollections",
                column: "CollectionId");

            migrationBuilder.AddForeignKey(
                name: "FK_Collections_AspNetUsers_OwnerId",
                table: "Collections",
                column: "OwnerId",
                principalTable: "AspNetUsers",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "FK_Collections_Collections_ParentCollectionId",
                table: "Collections",
                column: "ParentCollectionId",
                principalTable: "Collections",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Collections_AspNetUsers_OwnerId",
                table: "Collections");

            migrationBuilder.DropForeignKey(
                name: "FK_Collections_Collections_ParentCollectionId",
                table: "Collections");

            migrationBuilder.DropTable(
                name: "FollowCollections");

            migrationBuilder.DropIndex(
                name: "IX_Collections_OwnerType_OwnerId",
                table: "Collections");

            migrationBuilder.DropIndex(
                name: "IX_Collections_ParentCollectionId",
                table: "Collections");

            migrationBuilder.DropIndex(
                name: "IX_CollectionItems_CollectionId_OrderIndex",
                table: "CollectionItems");

            migrationBuilder.DropColumn(
                name: "CoverImageUrl",
                table: "Collections");

            migrationBuilder.DropColumn(
                name: "Name",
                table: "Collections");

            migrationBuilder.DropColumn(
                name: "OwnerType",
                table: "Collections");

            migrationBuilder.DropColumn(
                name: "ParentCollectionId",
                table: "Collections");

            migrationBuilder.DropColumn(
                name: "SortMode",
                table: "Collections");

            migrationBuilder.DropColumn(
                name: "OrderIndex",
                table: "CollectionItems");

            migrationBuilder.AlterColumn<Guid>(
                name: "OwnerId",
                table: "Collections",
                type: "uuid",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"),
                oldClrType: typeof(Guid),
                oldType: "uuid",
                oldNullable: true);

            migrationBuilder.AddForeignKey(
                name: "FK_Collections_AspNetUsers_OwnerId",
                table: "Collections",
                column: "OwnerId",
                principalTable: "AspNetUsers",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }
    }
}
