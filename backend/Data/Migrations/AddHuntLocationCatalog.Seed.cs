using Microsoft.EntityFrameworkCore.Migrations;

namespace backend.Data.Data.Migrations;

public partial class AddHuntLocationCatalog
{
    // Frozen client 2.9.1.39 names. See docs/architecture/hunt-location-catalog.md.
    private static readonly CatalogMap[] CatalogMaps =
    [
        new(
            new(new Guid("ec15cf79-cb24-566a-a7b4-9fca316da2cd"), "cemetery", "STILLWATER BAYOU", "БОЛОТО СТИЛУОТЕР", "БОЛОТА СТИЛВОТЕР", "ROZLEWISKO STILLWATER"),
            [
                new(new Guid("3efe5870-ea29-5955-838f-f1096d2a57cd"), "com_a", "Pitching Crematorium", "Разрушенный крематорий", "Зруйнований крематорій", "Krematorium w Pitching"),
                new(new Guid("dfb2e0a1-f525-52ba-8231-6e1874596db3"), "com_b", "The Chapel of Madonna Noire", "Часовня Черной Мадонны", "Каплиця Чорної Мадонни", "Kaplica Czarnej Madonny"),
                new(new Guid("c188c6d9-e968-5b84-a863-897c469f2cce"), "com_c", "Stillwater Bend", "Излучина Стилуотер", "Закрут Стилвотер", "Miasteczko Stillwater"),
                new(new Guid("94ccb063-eb68-5c73-ad0d-36f1af3b1012"), "com_d", "Davant Ranch", "Ранчо Даванта", "Ранчо Даванта", "Stadnina w Davant"),
                new(new Guid("f128bc28-5725-58e9-9659-f7067276e64e"), "com_e", "The Slaughterhouse", "Скотобойня", "Скотобійня", "Rzeźnia"),
                new(new Guid("8bee1918-7fe7-59d7-ac89-31139611a65d"), "com_f", "Catfish Grove", "Сомовая роща", "Сомовий гай", "Osada Catfish"),
                new(new Guid("cd9a60f1-aefc-5138-a213-d3e3ebf515ad"), "com_g", "Scupper Lake", "Гиблое озеро", "Озеро потопельників", "Jezioro Scupper"),
                new(new Guid("1500324e-eb47-5f8e-965a-6c0997a84848"), "com_h", "Darrow Livestock", "Скотный двор Дэрроу", "Скотоферма Деррова", "Chlewnia w Darrow"),
                new(new Guid("7312776f-cbf2-5d03-88ea-3ca538952079"), "com_i", "Reynard Mill and Lumber", "Лесопильня Рейнарда", "Млин і лісопильня Рейнарда", "Tartak Reynarda"),
                new(new Guid("edac75b9-0c94-53a1-8eee-1935b5a3d453"), "com_j", "Cypress Huts", "Кипарисовая роща", "Кипарисовий гай", "Osada Cypress"),
                new(new Guid("f29fe5ce-59c1-5035-b287-842a81ac1829"), "com_k", "Lockbay Docks", "Верфь Локбей", "Доки Локбей", "Doki Lockbay"),
                new(new Guid("99b402da-1c26-5895-9669-1168d0fd9bed"), "com_l", "Alice Farm", "Ферма Элис", "Ферма Елісів", "Gospodarstwo Alicji"),
                new(new Guid("182f2866-b51f-52f4-94af-4922e0dbbfcb"), "com_m", "Alain and Son's Fish", "Рыбное хозяйство «Ален и сын»", "Рибне господарство «Ален і син»", "Przetwórnia ryb Alain and Son"),
                new(new Guid("2a8c404b-a4c6-557f-a436-84de5b4996c8"), "poi_a", "Blanchett Graves", "Кладбище Бланшетт", "Цвинтар Бланшетт", "Cmentarz w Blanchett"),
                new(new Guid("bdb0c069-09c0-5574-b9f7-cc920ff7feab"), "poi_b", "Healing-Waters Church", "Церковь «Исцеляющие воды»", "Церква «Цілющі води»", "Kościół w Healing-Waters"),
                new(new Guid("d51c9b9b-bb26-50a1-b909-3fb09fb6839b"), "poi_c", "Port Reeker", "Порт Рикер", "Порт Рікер", "Port Reeker"),
            ]),
        new(
            new(new Guid("6db45426-6c4b-5e33-ab24-c4450a6cb9dc"), "civilwar", "LAWSON DELTA", "ДЕЛЬТА ЛОУСОН", "ДЕЛЬТА ЛОВСОН", "LAWSON DELTA"),
            [
                new(new Guid("5e70faa9-d310-5b73-9694-3d524b9241da"), "com_a", "Godard Docks", "Пристань Годарда", "Доки Ґодарда", "Doki Godard"),
                new(new Guid("f811f71c-60f2-562a-8b82-01a70ca9b6d7"), "com_b", "Blanc Brinery", "Солодовня Бланка", "Солодівня Бланка", "Saliny w Blanc"),
                new(new Guid("de31c85b-68da-5ef5-af38-f4fb53a0f1fc"), "com_c", "Golden Acres", "Ферма «Золотые акры»", "Ферма «Золоті акри»", "Złote pola"),
                new(new Guid("7a7d6ae9-73d5-5901-8a62-fbebbeeb6737"), "com_d", "Salter's Pork", "Свинина Солтера", "Свинина Солтера", "Chlewnia Saltera"),
                new(new Guid("dd5dbd2e-417f-5fee-9e13-ba71121bc9a2"), "com_e", "Maw Battery", "Гарнизон «Кровавая пасть»", "Гарнізон «Кривава паща»", "Reduta Maw"),
                new(new Guid("6a7c7603-7712-5342-b4e8-642e15ef964c"), "com_f", "Sweetbell Flour", "Мельница «Лобелия»", "Млин «Солодкий дзвіночок»", "Młyn Sweetbell"),
                new(new Guid("fdf3c185-495b-5194-9585-c20dc8c46666"), "com_g", "Arden Parish", "Приход Арден", "Парафія Арден", "Gmina Arden"),
                new(new Guid("94c1594e-88eb-5df3-b6c5-ad60bfd7d6de"), "com_h", "Windy Run", "Ветреный простор", "Вітряний простір", "Windy Run"),
                new(new Guid("afa7fbfd-2aee-53a5-8bba-a94ee8b0d15c"), "com_i", "Iron Works", "Литейный завод", "Ливарня", "Huta żelaza"),
                new(new Guid("9719b7e4-a257-5df4-8fd9-9f873f14271e"), "com_j", "Wolfshead Arsenal", "Арсенал Вульфсхеда", "Арсенал «Вовча голова»", "Arsenał Wolfshead"),
                new(new Guid("7027f76b-efdc-5e26-8fe8-e7ed1b703215"), "com_k", "Bradley and Craven Brickworks", "Кирпичный завод Брэдли и Крейвена", "Цегельний завод Бредлі й Крейвена", "Cegielnia Bradley and Craven"),
                new(new Guid("4adfbb12-bfae-51d3-ab4e-f1a28c25386a"), "com_l", "C&A Lumber", "Лесопильня C&A", "Лісопильня C&A", "Tartak C&A"),
                new(new Guid("25509102-7bcb-500d-8f4b-0c2a7746a042"), "com_m", "Hemlock and Hide", "Дубильня «Коварный дурман»", "Дубильня Гемлока і Гайда", "Hemlock i Hide"),
                new(new Guid("8fa63cf7-f753-5e10-93f2-107dae11f7fd"), "poi_a", "Lawson Station", "Станция Лоусон", "Станція Ловсон", "Stacja Lawson"),
                new(new Guid("35ef8b3f-18de-536d-b9db-cd8de80d1c07"), "poi_b", "Fort Carmick", "Форт Кармик", "Форт Кармік", "Fort Carmick"),
                new(new Guid("4f4f3cfc-8e20-5b02-a4db-d8db8c8c41f7"), "poi_c", "Nicholls Prison", "Тюрьма Николлс", "В’язниця «Ніколлс»", "Więzienie Nicholls"),
            ]),
        new(
            new(new Guid("3de85b1d-8d29-5773-9f72-f5f7e0c1c193"), "creek", "DESALLE", "Де-Салль", "ДЮСЕЛЬ", "DESALLE"),
            [
                new(new Guid("eb636b40-ec9c-5efc-a401-821573b2e668"), "com_a", "Kingsnake Mine", "Шахта Пестрой Змеи", "Шахта Строкатої Змії", "Kopalnia Kingsnake"),
                new(new Guid("f48a3bcd-2f1a-52e2-80db-29f311a9009d"), "com_b", "Stanley Coal Company", "Угольная компания Стэнли", "Вугільна компанія Стенлі", "Przedsiębiorstwo węglowe Stanley"),
                new(new Guid("696085b0-b53c-55a5-aea2-347b10e63bb1"), "com_c", "Heritage Pork", "Племенные свиньи", "Племінні свині", "Ferma świń Dziedzictwo"),
                new(new Guid("0408d5a3-c060-5f0d-a494-1e247ba05d77"), "com_d", "Pearl Plantation", "Плантация «Перл-Ривер»", "Плантація Перл", "Plantacja Pearl"),
                new(new Guid("aa3a2a2d-2eca-5a26-a1d4-72bfa72492f3"), "com_e", "Moses Poultry", "Цыплята Мозеса", "Ферма «Курчата Мозеса»", "Ferma drobiu Mosesa"),
                new(new Guid("fece809d-2a22-521b-ba3d-0502f53b6b81"), "com_f", "Forked River Fishery", "Приречное рыбное хозяйство", "Річне рибне господарство", "Gospodarstwo rybne Forked River"),
                new(new Guid("685aab15-c28e-5c20-a589-c743a3f1b9b7"), "com_g", "Ash Creek Lumber", "Лесозаготовка «Эш-Крик»", "Лісозаготівля «Еш-Крік»", "Tartak Ash Creek"),
                new(new Guid("8c0a63e4-414c-5c6d-8584-a9c1201d6afe"), "com_h", "Upper DeSalle", "Верхний Де-Салль", "Верхній Дюсель", "Górne DeSalle"),
                new(new Guid("85acf92c-23e3-5ec9-8f45-2086976f7150"), "com_i", "Seven Sisters Estate", "Поместье семи сестер", "Маєток семи сестер", "Posiadłość Seven Sisters"),
                new(new Guid("675aca1a-f49f-5e91-a408-be05271b39a9"), "com_j", "Fort Bolden", "Форт Болден", "Форт Болден", "Fort Bolden"),
                new(new Guid("07c9436c-62a8-56d8-881f-49fa893dd20c"), "com_k", "Darin Shipyard", "Верфь Дэрина", "Доки Деріна", "Stocznia Darin"),
                new(new Guid("98e3be4c-8bc3-5e47-8cf6-fc5c535cd57e"), "com_l", "Reeves Quarry", "Карьер Ривзов", "Кар’єр Рівзів", "Kamieniołom Reevesów"),
                new(new Guid("e0255caf-9790-5370-81bb-51e126da6b21"), "com_m", "Lower DeSalle", "Нижний Де-Салль", "Нижній Дюсель", "Dolne DeSalle"),
                new(new Guid("6a7308a9-2f92-52f9-a756-6d3e0290f90a"), "poi_a", "Weeping Stone Mill", "Мельница «Плачущий камень»", "Млин «Плакучий камінь»", "Młyn Płaczący Kamień"),
                new(new Guid("b6e50b55-8cfb-5198-b9ad-41500fa81b93"), "poi_b", "Pelican Island Prison", "Тюрьма на Пеликаньем острове", "В’язниця на Пеліканячому острові", "Więzienie Wyspa Pelikanów"),
                new(new Guid("94736be1-b98a-569f-a1aa-e7ddded253b3"), "poi_c", "First Testimonial Church", "Церковь Первого Откровения", "Церква першого одкровення", "Kościół Pierwszego Świadectwa"),
            ]),
        new(
            new(new Guid("122a4723-8676-5cdb-b3ab-249940bbf15c"), "colorado", "Mammon's Gulch", "Распадок Маммоны", "Ущелина Мамона", "Gardziel Mammona"),
            [
                new(new Guid("a3527ab7-57fa-5045-9d8b-ff7523323413"), "com_a", "Blackthorn Stockyard", "Двор Блэкторнов", "Скотобійне подвір’я Блектерін", "Zagroda Blackthornów"),
                new(new Guid("8169d573-628f-5a99-8f20-d1265f7734a6"), "com_b", "Monteros Malt", "Хмель Монтеро", "Хміль Монтеро", "Słodownia Montenerosów"),
                new(new Guid("7e758939-8cbe-5288-87c7-72d55cf373b4"), "com_c", "Terminus Railyard", "Конечная станция", "Кінцева станція", "Stacja kolejowa Terminus"),
                new(new Guid("067928e7-0fcf-54d9-8f09-61eb94276367"), "com_d", "Grizzly Lodge", "Берлога гризли", "Барліг гризлі", "Domek myśliwski Grizzly"),
                new(new Guid("c5ed4593-543b-50ec-8a53-ae4c05db2877"), "com_e", "O'Donovan Stone", "Камни О'Донована", "Камінь О’Донована", "Kruszarka kamieni O’Donovanów"),
                new(new Guid("a67b7f0f-b756-5267-91b3-8b611fc52859"), "com_f", "Split River Mill", "Мельница Сплит-ривер", "Млин «Спліт-рівер»", "Młyn Split River"),
                new(new Guid("8cea2153-e541-5ba7-9b64-1849d6160d13"), "com_g", "East Mountain Corn", "Ферма «Ист-маунтайн»", "Ферма «Іст-Маунтайн»", "Plantacja kukurydzy East Mountain"),
                new(new Guid("2c5bc878-a63f-535d-a09a-fc5fe7ac9eb2"), "com_h", "Deadfall Timber", "Лесоповал Дедфолл", "Лісоповал «Дедфолл»", "Poręba Deadfall"),
                new(new Guid("07b5b097-6758-57c4-a3c4-d48293de84ba"), "com_i", "La Plata Mine", "Шахта Ла Плата", "Штольня «Ла Плата»", "Kopalnia La Plata"),
                new(new Guid("90cd5d61-9cda-5c4d-9827-153fd6c3fad9"), "com_j", "Oro Gordo Mine", "Шахта Оро Гордо", "Штольня «Оро Гордо»", "Kopalnia Oro Gordo"),
                new(new Guid("33474123-03b9-5cdd-bb71-a3e160cc7a6f"), "com_k", "Machine Gorge", "Машинная теснина", "Машинна ущелина", "Wąwóz Maszyn"),
                new(new Guid("8b278342-cdc9-5de5-955c-e6df52494878"), "com_l", "Kingfisher Foundry", "Литейная Кингфишер", "Ливарня «Зимородок»", "Odlewnia Kingfisher"),
                new(new Guid("50378ebd-ba4d-5020-a046-c601eda422b1"), "com_m", "Graystone Pit", "Карьер Грейстоун", "Провалля Грейстоун", "Kamieniołom Graystone"),
                new(new Guid("9503c020-47bf-5df2-bf19-f8d5d67741e2"), "poi_a", "The Gasworks", "Газовый завод", "Газовидобуток", "Gazownia"),
                new(new Guid("c723f9b8-8eb0-5042-b4e9-fec1466b31bb"), "poi_b", "Preston Oil", "Нефть Престона", "Нафта Престона", "Pola naftowe Prestonów"),
                new(new Guid("7e671bf1-8028-5f0f-b629-11ff29bf1e30"), "poi_c", "Miner's Folly", "Майнерс-Фолли", "Примха Шахтаря", "Głupota Górnika"),
            ]),
    ];

    private static void SeedCatalog(MigrationBuilder migrationBuilder)
    {
        foreach (var map in CatalogMaps)
        {
            migrationBuilder.InsertData("hunt_maps", ["id", "code", "is_enabled"],
                [map.Entry.Id, map.Entry.Code, true]);
            InsertTranslations(migrationBuilder, "hunt_map_translations", "map_id", map.Entry);
            foreach (var location in map.Locations)
            {
                migrationBuilder.InsertData("hunt_locations", ["id", "map_id", "code", "is_enabled"],
                    [location.Id, map.Entry.Id, location.Code, true]);
                InsertTranslations(migrationBuilder, "hunt_location_translations", "location_id", location);
            }
        }
    }

    private static void InsertTranslations(MigrationBuilder migrationBuilder, string table, string keyColumn,
        CatalogEntry entry) => migrationBuilder.InsertData(table, [keyColumn, "locale", "name"], new object[,]
        {
            { entry.Id, "en", entry.English },
            { entry.Id, "ru", entry.Russian },
            { entry.Id, "uk", entry.Ukrainian },
            { entry.Id, "pl", entry.Polish }
        });

    private sealed record CatalogMap(CatalogEntry Entry, CatalogEntry[] Locations);
    private sealed record CatalogEntry(Guid Id, string Code, string English, string Russian, string Ukrainian, string Polish);
}
