using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace RateOple.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddQuotaIndexes : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Reviews_UserId",
                table: "Reviews");

            migrationBuilder.DropIndex(
                name: "IX_GroupStaffMessages_GroupId",
                table: "GroupStaffMessages");

            migrationBuilder.DropIndex(
                name: "IX_Groups_OwnerId",
                table: "Groups");

            migrationBuilder.DropIndex(
                name: "IX_GroupPosts_UserId",
                table: "GroupPosts");

            migrationBuilder.DropIndex(
                name: "IX_Comments_UserId",
                table: "Comments");

            migrationBuilder.CreateIndex(
                name: "IX_Reviews_UserId_CreatedAt",
                table: "Reviews",
                columns: new[] { "UserId", "CreatedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_Reports_ReporterId_CreatedAt",
                table: "Reports",
                columns: new[] { "ReporterId", "CreatedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_Ratings_UserId_CreatedAt",
                table: "Ratings",
                columns: new[] { "UserId", "CreatedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_GroupStaffMessages_GroupId_CreatedAt",
                table: "GroupStaffMessages",
                columns: new[] { "GroupId", "CreatedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_Groups_OwnerId_CreatedAt",
                table: "Groups",
                columns: new[] { "OwnerId", "CreatedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_GroupPosts_UserId_GroupId_CreatedAt",
                table: "GroupPosts",
                columns: new[] { "UserId", "GroupId", "CreatedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_GroupMemberships_UserId_JoinedAt",
                table: "GroupMemberships",
                columns: new[] { "UserId", "JoinedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_GroupMediaLinks_GroupId_AddedAt",
                table: "GroupMediaLinks",
                columns: new[] { "GroupId", "AddedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_FollowCollections_UserId_FollowedAt",
                table: "FollowCollections",
                columns: new[] { "UserId", "FollowedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_Comments_UserId_CreatedAt",
                table: "Comments",
                columns: new[] { "UserId", "CreatedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_CollectionItems_CollectionId_AddedAt",
                table: "CollectionItems",
                columns: new[] { "CollectionId", "AddedAt" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Reviews_UserId_CreatedAt",
                table: "Reviews");

            migrationBuilder.DropIndex(
                name: "IX_Reports_ReporterId_CreatedAt",
                table: "Reports");

            migrationBuilder.DropIndex(
                name: "IX_Ratings_UserId_CreatedAt",
                table: "Ratings");

            migrationBuilder.DropIndex(
                name: "IX_GroupStaffMessages_GroupId_CreatedAt",
                table: "GroupStaffMessages");

            migrationBuilder.DropIndex(
                name: "IX_Groups_OwnerId_CreatedAt",
                table: "Groups");

            migrationBuilder.DropIndex(
                name: "IX_GroupPosts_UserId_GroupId_CreatedAt",
                table: "GroupPosts");

            migrationBuilder.DropIndex(
                name: "IX_GroupMemberships_UserId_JoinedAt",
                table: "GroupMemberships");

            migrationBuilder.DropIndex(
                name: "IX_GroupMediaLinks_GroupId_AddedAt",
                table: "GroupMediaLinks");

            migrationBuilder.DropIndex(
                name: "IX_FollowCollections_UserId_FollowedAt",
                table: "FollowCollections");

            migrationBuilder.DropIndex(
                name: "IX_Comments_UserId_CreatedAt",
                table: "Comments");

            migrationBuilder.DropIndex(
                name: "IX_CollectionItems_CollectionId_AddedAt",
                table: "CollectionItems");

            migrationBuilder.CreateIndex(
                name: "IX_Reviews_UserId",
                table: "Reviews",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_GroupStaffMessages_GroupId",
                table: "GroupStaffMessages",
                column: "GroupId");

            migrationBuilder.CreateIndex(
                name: "IX_Groups_OwnerId",
                table: "Groups",
                column: "OwnerId");

            migrationBuilder.CreateIndex(
                name: "IX_GroupPosts_UserId",
                table: "GroupPosts",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_Comments_UserId",
                table: "Comments",
                column: "UserId");
        }
    }
}
