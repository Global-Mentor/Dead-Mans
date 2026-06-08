using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace backend.Data.Migrations
{
    public partial class MediaAssetCheckConstraints : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddCheckConstraint(
                name: "CK_media_assets_scope_allowed",
                table: "media_assets",
                sql: "\"Scope\" IN ('private')");

            migrationBuilder.AddCheckConstraint(
                name: "CK_media_assets_status_allowed",
                table: "media_assets",
                sql: "\"Status\" IN ('pending','active')");
        }
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropCheckConstraint(
                name: "CK_media_assets_scope_allowed",
                table: "media_assets");

            migrationBuilder.DropCheckConstraint(
                name: "CK_media_assets_status_allowed",
                table: "media_assets");
        }
    }
}
