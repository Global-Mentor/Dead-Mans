using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace backend.Data.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddHuntLocationCatalog : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "hunt_maps",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    code = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    is_enabled = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_hunt_maps", x => x.id);
                    table.CheckConstraint("ck_hunt_maps_code", "code ~ '^[a-z][a-z0-9_]*$'");
                });

            migrationBuilder.CreateTable(
                name: "hunt_locations",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    map_id = table.Column<Guid>(type: "uuid", nullable: false),
                    code = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    is_enabled = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_hunt_locations", x => x.id);
                    table.CheckConstraint("ck_hunt_locations_code", "code ~ '^[a-z][a-z0-9_]*$'");
                    table.ForeignKey(
                        name: "fk_hunt_locations_hunt_maps_map_id",
                        column: x => x.map_id,
                        principalTable: "hunt_maps",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "hunt_map_translations",
                columns: table => new
                {
                    map_id = table.Column<Guid>(type: "uuid", nullable: false),
                    locale = table.Column<string>(type: "character varying(2)", maxLength: 2, nullable: false),
                    name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_hunt_map_translations", x => new { x.map_id, x.locale });
                    table.CheckConstraint("ck_hunt_map_translations_locale", "locale IN ('en', 'ru', 'uk', 'pl')");
                    table.CheckConstraint("ck_hunt_map_translations_name", "name ~ '[^[:space:]]'");
                    table.ForeignKey(
                        name: "fk_hunt_map_translations_hunt_maps_map_id",
                        column: x => x.map_id,
                        principalTable: "hunt_maps",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "hunt_location_translations",
                columns: table => new
                {
                    location_id = table.Column<Guid>(type: "uuid", nullable: false),
                    locale = table.Column<string>(type: "character varying(2)", maxLength: 2, nullable: false),
                    name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_hunt_location_translations", x => new { x.location_id, x.locale });
                    table.CheckConstraint("ck_hunt_location_translations_locale", "locale IN ('en', 'ru', 'uk', 'pl')");
                    table.CheckConstraint("ck_hunt_location_translations_name", "name ~ '[^[:space:]]'");
                    table.ForeignKey(
                        name: "fk_hunt_location_translations_hunt_locations_location_id",
                        column: x => x.location_id,
                        principalTable: "hunt_locations",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "ix_hunt_locations_map_id_code",
                table: "hunt_locations",
                columns: new[] { "map_id", "code" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_hunt_maps_code",
                table: "hunt_maps",
                column: "code",
                unique: true);

            SeedCatalog(migrationBuilder);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "hunt_location_translations");

            migrationBuilder.DropTable(
                name: "hunt_map_translations");

            migrationBuilder.DropTable(
                name: "hunt_locations");

            migrationBuilder.DropTable(
                name: "hunt_maps");
        }
    }
}
