using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace backend.Data.Migrations;

/// <inheritdoc />
public partial class SeedBaseModifierCatalog : Migration
{
    private static readonly DateTime SeededAtUtc = new(2026, 9, 23, 12, 30, 0, DateTimeKind.Utc);

    private static readonly SeedModifier[] Modifiers =
    [
        new(
            new("10000000-0000-0000-0000-000000000001"),
            new("20000000-0000-0000-0000-000000000001"),
            "Чирик",
            "Первые 60 секунд разрешено перемещаться только на корточках.",
            "round",
            "💰",
            "!активировать чирик",
            3,
            5,
            ["движение", "приседание", "таймер"],
            """{"schemaVersion":2,"kind":"rule","phase":"round","performer":"activeTeam","requiresHostMonitoring":false,"rule":"\u041F\u0435\u0440\u0432\u044B\u0435 60 \u0441\u0435\u043A\u0443\u043D\u0434 \u0437\u0430 \u043A\u0430\u0436\u0434\u0443\u044E \u0430\u043A\u0442\u0438\u0432\u0430\u0446\u0438\u044E \u0440\u0430\u0437\u0440\u0435\u0448\u0435\u043D\u043E \u043F\u0435\u0440\u0435\u043C\u0435\u0449\u0430\u0442\u044C\u0441\u044F \u0442\u043E\u043B\u044C\u043A\u043E \u043D\u0430 \u043A\u043E\u0440\u0442\u043E\u0447\u043A\u0430\u0445.","stackingPolicy":"aggregateParameters","resolution":{"type":"ruleStatus"},"reward":"none","formulaReference":null,"durationSecondsPerActivation":60}"""
        ),
        new(
            new("10000000-0000-0000-0000-000000000002"),
            new("20000000-0000-0000-0000-000000000002"),
            "Жажда",
            "Участник должен убить врага, чтобы получить нарастающий с каждым убийством бонус +5. Миссия без убийств влечёт штраф 25 очков. Итоговый бонус умножается на количество убийств.",
            "result",
            "💉",
            "!активировать жажда",
            3,
            2,
            ["убийства", "очки", "бонус", "штраф", "риск"],
            """{"schemaVersion":2,"kind":"scoring","phase":"result","performer":"activeTeam","requiresHostMonitoring":true,"rule":"\u0412 \u043A\u043E\u043D\u0446\u0435 \u0440\u0430\u0443\u043D\u0434\u0430 \u0437\u0430 \u043A\u0430\u0436\u0434\u0443\u044E \u0430\u043A\u0442\u0438\u0432\u0430\u0446\u0438\u044E \u043A \u0441\u0442\u043E\u0438\u043C\u043E\u0441\u0442\u0438 \u043E\u0434\u043D\u043E\u0433\u043E \u0443\u0431\u0438\u0439\u0441\u0442\u0432\u0430 \u0434\u043E\u0431\u0430\u0432\u043B\u044F\u0435\u0442\u0441\u044F 5 \u00D7 \u043A\u043E\u043B\u0438\u0447\u0435\u0441\u0442\u0432\u043E \u0443\u0431\u0438\u0439\u0441\u0442\u0432. \u041D\u043E\u0432\u0430\u044F \u0441\u0442\u043E\u0438\u043C\u043E\u0441\u0442\u044C \u0443\u043C\u043D\u043E\u0436\u0430\u0435\u0442\u0441\u044F \u043D\u0430 \u043A\u043E\u043B\u0438\u0447\u0435\u0441\u0442\u0432\u043E \u0443\u0431\u0438\u0439\u0441\u0442\u0432. \u0415\u0441\u043B\u0438 \u0443\u0431\u0438\u0439\u0441\u0442\u0432 \u043D\u0435\u0442, \u043A\u0430\u0436\u0434\u0430\u044F \u0430\u043A\u0442\u0438\u0432\u0430\u0446\u0438\u044F \u0434\u0430\u0451\u0442 \u0448\u0442\u0440\u0430\u0444 25 \u043E\u0447\u043A\u043E\u0432.","stackingPolicy":"independentInstances","resolution":{"type":"automaticRoundMetric","metric":"killsCount"},"reward":"points","formulaReference":{"code":"kill_value_increase_per_unit","version":1,"parameters":{"type":"killValueIncreasePerUnit","incrementPointsPerUnit":5,"zeroCountPenaltyPoints":25}},"durationSecondsPerActivation":null}"""
        ),
        new(
            new("10000000-0000-0000-0000-000000000003"),
            new("20000000-0000-0000-0000-000000000003"),
            "Расходник",
            "Игроки могут заменить один расходник на свой выбор.",
            "preparation",
            "🎯",
            "!активировать расходник",
            4,
            4,
            ["снаряжение", "расходники", "замена"],
            """{"schemaVersion":2,"kind":"rule","phase":"preparation","performer":"activeTeam","requiresHostMonitoring":false,"rule":"\u041A\u043E\u043C\u0430\u043D\u0434\u0430 \u043C\u043E\u0436\u0435\u0442 \u0437\u0430\u043C\u0435\u043D\u0438\u0442\u044C \u043E\u0434\u0438\u043D \u0440\u0430\u0441\u0445\u043E\u0434\u043D\u0438\u043A \u043D\u0430 \u0441\u0432\u043E\u0439 \u0432\u044B\u0431\u043E\u0440 \u0437\u0430 \u043A\u0430\u0436\u0434\u0443\u044E \u0430\u043A\u0442\u0438\u0432\u0430\u0446\u0438\u044E.","stackingPolicy":"aggregateParameters","resolution":{"type":"ruleStatus"},"reward":"none","formulaReference":null,"durationSecondsPerActivation":null}"""
        ),
        new(
            new("10000000-0000-0000-0000-000000000004"),
            new("20000000-0000-0000-0000-000000000004"),
            "Трупы",
            "Запрет на сжигание трупов.",
            "round",
            "🔥",
            "!активировать трупы",
            4,
            1,
            ["трупы", "огонь", "запрет"],
            """{"schemaVersion":2,"kind":"rule","phase":"round","performer":"activeTeam","requiresHostMonitoring":true,"rule":"\u0417\u0430\u043F\u0440\u0435\u0449\u0435\u043D\u043E \u0441\u0436\u0438\u0433\u0430\u0442\u044C \u0442\u0440\u0443\u043F\u044B \u0432\u0435\u0441\u044C \u0440\u0430\u0443\u043D\u0434.","stackingPolicy":"aggregateParameters","resolution":{"type":"ruleStatus"},"reward":"none","formulaReference":null,"durationSecondsPerActivation":null}"""
        ),
        new(
            new("10000000-0000-0000-0000-000000000005"),
            new("20000000-0000-0000-0000-000000000005"),
            "Навыки",
            "Количество доступных очков навыков уменьшено на 20% за каждую активацию. При 10 очках вычитается 2.",
            "preparation",
            "⚙️",
            "!активировать навыки",
            4,
            5,
            ["навыки", "подготовка", "ограничение"],
            """{"schemaVersion":2,"kind":"rule","phase":"preparation","performer":"activeTeam","requiresHostMonitoring":true,"rule":"\u0412\u043D\u0435\u0448\u043D\u0438\u0439 \u043B\u0438\u043C\u0438\u0442 \u043D\u0430\u0432\u044B\u043A\u043E\u0432 \u0443\u043C\u0435\u043D\u044C\u0448\u0430\u0435\u0442\u0441\u044F \u043D\u0430 20% \u0437\u0430 \u0430\u043A\u0442\u0438\u0432\u0430\u0446\u0438\u044E, \u043D\u043E \u043D\u0435 \u0431\u043E\u043B\u0435\u0435 \u0447\u0435\u043C \u043D\u0430 100%.","stackingPolicy":"aggregateParameters","resolution":{"type":"ruleStatus"},"reward":"none","formulaReference":null,"durationSecondsPerActivation":null}"""
        ),
        new(
            new("10000000-0000-0000-0000-000000000006"),
            new("20000000-0000-0000-0000-000000000006"),
            "Патрон",
            "Если враг был убит первой пулей в миссии, команда получает +1 дополнительное убийство в счётчик. Не работает с луками, арбалетами и дробовиками.",
            "result",
            "🔫",
            "!активировать патрон",
            4,
            1,
            ["оружие", "точность", "первая пуля", "исключения"],
            """{"schemaVersion":2,"kind":"scoring","phase":"result","performer":"activeTeam","requiresHostMonitoring":true,"rule":"\u0415\u0441\u043B\u0438 \u0432\u0440\u0430\u0433 \u0443\u0431\u0438\u0442 \u043F\u0435\u0440\u0432\u043E\u0439 \u043F\u0443\u043B\u0435\u0439 \u043D\u0435 \u0438\u0437 \u043B\u0443\u043A\u0430, \u0430\u0440\u0431\u0430\u043B\u0435\u0442\u0430 \u0438\u043B\u0438 \u0434\u0440\u043E\u0431\u043E\u0432\u0438\u043A\u0430, \u043A\u043E\u043C\u0430\u043D\u0434\u0430 \u043F\u043E\u043B\u0443\u0447\u0430\u0435\u0442 \u0431\u043E\u043D\u0443\u0441\u043D\u043E\u0435 \u0443\u0431\u0438\u0439\u0441\u0442\u0432\u043E.","stackingPolicy":"independentInstances","resolution":{"type":"boolean","inputLabel":"\u0423\u0441\u043B\u043E\u0432\u0438\u0435 \u0432\u044B\u043F\u043E\u043B\u043D\u0435\u043D\u043E"},"reward":"bonusKills","formulaReference":{"code":"bonus_kills_per_unit","version":1,"parameters":{"type":"bonusKillsPerUnit","bonusKillsPerUnit":1}},"durationSecondsPerActivation":null}"""
        ),
        new(
            new("10000000-0000-0000-0000-000000000007"),
            new("20000000-0000-0000-0000-000000000007"),
            "Проказник",
            "Ментор запускается в катку с обманками и полтергейстом. В течение 5 минут либо пока не кончатся обманки старается пакостить. Убивать Ментора запрещено.",
            "round",
            "🙊",
            "!активировать проказник",
            6,
            2,
            ["ментор", "помеха", "обманки", "полтергейст", "таймер"],
            """{"schemaVersion":2,"kind":"rule","phase":"round","performer":"mentor","requiresHostMonitoring":true,"rule":"\u041C\u0435\u043D\u0442\u043E\u0440 \u0441 \u043E\u0431\u043C\u0430\u043D\u043A\u0430\u043C\u0438 \u0438 \u043F\u043E\u043B\u0442\u0435\u0440\u0433\u0435\u0439\u0441\u0442\u043E\u043C \u043C\u0435\u0448\u0430\u0435\u0442 \u043A\u043E\u043C\u0430\u043D\u0434\u0435 300 \u0441\u0435\u043A\u0443\u043D\u0434 \u0437\u0430 \u0430\u043A\u0442\u0438\u0432\u0430\u0446\u0438\u044E; \u0435\u0433\u043E \u043D\u0435\u043B\u044C\u0437\u044F \u0443\u0431\u0438\u0442\u044C \u0438\u043B\u0438 \u043F\u043E\u0434\u043D\u044F\u0442\u044C.","stackingPolicy":"aggregateParameters","resolution":{"type":"ruleStatus"},"reward":"none","formulaReference":null,"durationSecondsPerActivation":300}"""
        ),
        new(
            new("10000000-0000-0000-0000-000000000008"),
            new("20000000-0000-0000-0000-000000000008"),
            "Диарея",
            "Если вы увидели или услышали про туалет, вы обязаны зайти в него незамедлительно. Эффект игнорируется, если в поле видимости есть враг. Любой игрок и Ментор могут рассказывать про туалеты на локации.",
            "round",
            "💩",
            "!активировать диарея",
            7,
            1,
            ["окружение", "туалет", "триггер"],
            """{"schemaVersion":2,"kind":"rule","phase":"round","performer":"activeTeam","requiresHostMonitoring":true,"rule":"\u041F\u0440\u0438 \u0443\u043F\u043E\u043C\u0438\u043D\u0430\u043D\u0438\u0438 \u0438\u043B\u0438 \u043E\u0431\u043D\u0430\u0440\u0443\u0436\u0435\u043D\u0438\u0438 \u0442\u0443\u0430\u043B\u0435\u0442\u0430 \u0438\u0433\u0440\u043E\u043A \u043E\u0431\u044F\u0437\u0430\u043D \u0437\u0430\u0439\u0442\u0438 \u0432 \u043D\u0435\u0433\u043E, \u0435\u0441\u043B\u0438 \u0432\u0440\u0430\u0433\u0430 \u043D\u0435\u0442 \u0432 \u043F\u043E\u043B\u0435 \u0437\u0440\u0435\u043D\u0438\u044F.","stackingPolicy":"aggregateParameters","resolution":{"type":"ruleStatus"},"reward":"none","formulaReference":null,"durationSecondsPerActivation":null}"""
        ),
        new(
            new("10000000-0000-0000-0000-000000000009"),
            new("20000000-0000-0000-0000-000000000009"),
            "Менторбайт",
            "Ментор запускается в миссию с набором шумелок на 5 минут. Команда сама решает, как это использовать. Ментора воскрешать нельзя, к концу таймера Ментор должен использовать всё снаряжение.",
            "round",
            "📣",
            "!активировать менторбайт",
            8,
            1,
            ["ментор", "шум", "приманка", "таймер"],
            """{"schemaVersion":2,"kind":"rule","phase":"round","performer":"mentor","requiresHostMonitoring":true,"rule":"\u041C\u0435\u043D\u0442\u043E\u0440 \u0441 \u043D\u0430\u0431\u043E\u0440\u043E\u043C \u0448\u0443\u043C\u0435\u043B\u043E\u043A \u0434\u0435\u0439\u0441\u0442\u0432\u0443\u0435\u0442 300 \u0441\u0435\u043A\u0443\u043D\u0434; \u0435\u0433\u043E \u043C\u043E\u0436\u043D\u043E \u0443\u0431\u0438\u0442\u044C, \u043D\u043E \u043D\u0435\u043B\u044C\u0437\u044F \u043F\u043E\u0434\u043D\u044F\u0442\u044C.","stackingPolicy":"aggregateParameters","resolution":{"type":"ruleStatus"},"reward":"none","formulaReference":null,"durationSecondsPerActivation":300}"""
        ),
        new(
            new("10000000-0000-0000-0000-00000000000a"),
            new("20000000-0000-0000-0000-00000000000a"),
            "Кэп",
            "Команда выбирает капитана, и только капитан может пользоваться голосовым чатом. Второй игрок не может пользоваться голосовым чатом. Ментор может помогать с информацией.",
            "round",
            "🔇",
            "!активировать кэп",
            10,
            1,
            ["коммуникация", "капитан", "голос"],
            """{"schemaVersion":2,"kind":"rule","phase":"round","performer":"activeTeam","requiresHostMonitoring":true,"rule":"\u041F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u044C\u0441\u044F \u0433\u043E\u043B\u043E\u0441\u043E\u0432\u044B\u043C \u0447\u0430\u0442\u043E\u043C \u043C\u043E\u0436\u0435\u0442 \u0442\u043E\u043B\u044C\u043A\u043E \u043A\u0430\u043F\u0438\u0442\u0430\u043D.","stackingPolicy":"aggregateParameters","resolution":{"type":"ruleStatus"},"reward":"none","formulaReference":null,"durationSecondsPerActivation":null}"""
        ),
        new(
            new("10000000-0000-0000-0000-00000000000b"),
            new("20000000-0000-0000-0000-00000000000b"),
            "Фейерверк",
            "Ментор берёт оружие с осветительными снарядами и стреляет в небо раз в минуту на протяжении 5 минут. Убивать Ментора запрещено.",
            "round",
            "🎆",
            "!активировать фейерверк",
            11,
            1,
            ["ментор", "сигналы", "осветительные снаряды", "таймер"],
            """{"schemaVersion":2,"kind":"rule","phase":"round","performer":"mentor","requiresHostMonitoring":true,"rule":"\u041C\u0435\u043D\u0442\u043E\u0440 \u0441\u0442\u0440\u0435\u043B\u044F\u0435\u0442 \u043E\u0441\u0432\u0435\u0442\u0438\u0442\u0435\u043B\u044C\u043D\u044B\u043C\u0438 \u0441\u043D\u0430\u0440\u044F\u0434\u0430\u043C\u0438 \u043F\u0440\u0438 \u0441\u0442\u0430\u0440\u0442\u0435 \u0438 \u0447\u0435\u0440\u0435\u0437 60, 120, 180 \u0438 240 \u0441\u0435\u043A\u0443\u043D\u0434; \u0435\u0433\u043E \u043D\u0435\u043B\u044C\u0437\u044F \u0443\u0431\u0438\u0442\u044C \u0438\u043B\u0438 \u043F\u043E\u0434\u043D\u044F\u0442\u044C.","stackingPolicy":"aggregateParameters","resolution":{"type":"ruleStatus"},"reward":"none","formulaReference":null,"durationSecondsPerActivation":300}"""
        ),
        new(
            new("10000000-0000-0000-0000-00000000000c"),
            new("20000000-0000-0000-0000-00000000000c"),
            "Крыса",
            "Ментор запускается в миссию с полным набором ловушек и двумя тёмными динамитами. Все убийства Ментора идут в счёт команды. Ментора воскрешать нельзя.",
            "result",
            "🐀",
            "!активировать крыса",
            12,
            1,
            ["ментор", "ловушки", "убийства"],
            """{"schemaVersion":2,"kind":"scoring","phase":"result","performer":"mentor","requiresHostMonitoring":true,"rule":"\u0423\u0431\u0438\u0439\u0441\u0442\u0432\u0430 \u043C\u0435\u043D\u0442\u043E\u0440\u0430 \u0441 \u043F\u043E\u043B\u043D\u044B\u043C \u043D\u0430\u0431\u043E\u0440\u043E\u043C \u043B\u043E\u0432\u0443\u0448\u0435\u043A \u0441\u0447\u0438\u0442\u0430\u044E\u0442\u0441\u044F \u0431\u043E\u043D\u0443\u0441\u043D\u044B\u043C\u0438 \u0443\u0431\u0438\u0439\u0441\u0442\u0432\u0430\u043C\u0438 \u043A\u043E\u043C\u0430\u043D\u0434\u044B.","stackingPolicy":"independentInstances","resolution":{"type":"nonNegativeCount","inputLabel":"\u0423\u0441\u043F\u0435\u0448\u043D\u044B\u0435 \u0443\u0431\u0438\u0439\u0441\u0442\u0432\u0430 \u0432\u0435\u0434\u0443\u0449\u0435\u0433\u043E","maximumKind":"none","maximumPerActivation":null},"reward":"bonusKills","formulaReference":{"code":"bonus_kills_per_unit","version":1,"parameters":{"type":"bonusKillsPerUnit","bonusKillsPerUnit":1}},"durationSecondsPerActivation":null}"""
        ),
        new(
            new("10000000-0000-0000-0000-00000000000d"),
            new("20000000-0000-0000-0000-00000000000d"),
            "Шот",
            "Команда выбирает Ментору любое оружие, но у него есть только один выстрел, который он реализует по своему усмотрению. Убийство идёт в счёт команды, Ментора воскрешать нельзя.",
            "result",
            "🥠",
            "!активировать шот",
            13,
            null,
            ["ментор", "оружие", "один выстрел", "убийства"],
            """{"schemaVersion":2,"kind":"scoring","phase":"result","performer":"mentor","requiresHostMonitoring":true,"rule":"\u041A\u0430\u0436\u0434\u0430\u044F \u0430\u043A\u0442\u0438\u0432\u0430\u0446\u0438\u044F \u0434\u0430\u0451\u0442 \u043C\u0435\u043D\u0442\u043E\u0440\u0443 \u043E\u0440\u0443\u0436\u0438\u0435 \u0441 \u043E\u0434\u043D\u0438\u043C \u0432\u044B\u0441\u0442\u0440\u0435\u043B\u043E\u043C; \u0443\u0441\u043F\u0435\u0448\u043D\u044B\u0439 \u0432\u044B\u0441\u0442\u0440\u0435\u043B \u0441\u0447\u0438\u0442\u0430\u0435\u0442\u0441\u044F \u0431\u043E\u043D\u0443\u0441\u043D\u044B\u043C \u0443\u0431\u0438\u0439\u0441\u0442\u0432\u043E\u043C \u043A\u043E\u043C\u0430\u043D\u0434\u044B.","stackingPolicy":"independentInstances","resolution":{"type":"nonNegativeCount","inputLabel":"\u0423\u0441\u043F\u0435\u0448\u043D\u044B\u0435 \u0443\u0431\u0438\u0439\u0441\u0442\u0432\u0430 \u0432\u0435\u0434\u0443\u0449\u0435\u0433\u043E","maximumKind":"activations","maximumPerActivation":1},"reward":"bonusKills","formulaReference":{"code":"bonus_kills_per_unit","version":1,"parameters":{"type":"bonusKillsPerUnit","bonusKillsPerUnit":1}},"durationSecondsPerActivation":null}"""
        ),
        new(
            new("10000000-0000-0000-0000-00000000000e"),
            new("20000000-0000-0000-0000-00000000000e"),
            "Подъём",
            "Нельзя поднимать союзника, пока команда не убила врага.",
            "round",
            "☠️",
            "!активировать подъём",
            14,
            1,
            ["оживление", "союзник", "условие"],
            """{"schemaVersion":2,"kind":"rule","phase":"round","performer":"activeTeam","requiresHostMonitoring":true,"rule":"\u041D\u0435\u043B\u044C\u0437\u044F \u043F\u043E\u0434\u043D\u0438\u043C\u0430\u0442\u044C \u0441\u043E\u044E\u0437\u043D\u0438\u043A\u0430, \u043F\u043E\u043A\u0430 \u043A\u043E\u043C\u0430\u043D\u0434\u0430 \u043D\u0435 \u0443\u0431\u0438\u043B\u0430 \u0432\u0440\u0430\u0433\u0430.","stackingPolicy":"aggregateParameters","resolution":{"type":"ruleStatus"},"reward":"none","formulaReference":null,"durationSecondsPerActivation":null}"""
        ),
        new(
            new("10000000-0000-0000-0000-00000000000f"),
            new("20000000-0000-0000-0000-00000000000f"),
            "Хард75",
            "Одна большая и одна маленькая полоска здоровья, очки навыков за полоски не тратить. Каждое убийство имеет множитель +0.75 до восстановления полосок.",
            "result",
            "💀",
            "!активировать хард75",
            18,
            1,
            ["здоровье", "убийства", "окно действия", "бонус"],
            """{"schemaVersion":2,"kind":"scoring","phase":"result","performer":"activeTeam","requiresHostMonitoring":true,"rule":"\u041F\u043E\u0434\u0445\u043E\u0434\u044F\u0449\u0438\u0435 \u0443\u0431\u0438\u0439\u0441\u0442\u0432\u0430 \u0434\u043E \u0432\u043E\u0441\u0441\u0442\u0430\u043D\u043E\u0432\u043B\u0435\u043D\u0438\u044F \u0437\u0434\u043E\u0440\u043E\u0432\u044C\u044F \u0434\u0430\u044E\u0442 \u0434\u043E\u043F\u043E\u043B\u043D\u0438\u0442\u0435\u043B\u044C\u043D\u044B\u0435 75% \u0441\u0442\u043E\u0438\u043C\u043E\u0441\u0442\u0438 \u043A\u0430\u0440\u0442\u043E\u0447\u043A\u0438.","stackingPolicy":"independentInstances","resolution":{"type":"nonNegativeCount","inputLabel":"\u041F\u043E\u0434\u0445\u043E\u0434\u044F\u0449\u0438\u0435 \u0443\u0431\u0438\u0439\u0441\u0442\u0432\u0430 \u0434\u043E \u0432\u043E\u0441\u0441\u0442\u0430\u043D\u043E\u0432\u043B\u0435\u043D\u0438\u044F \u0437\u0434\u043E\u0440\u043E\u0432\u044C\u044F","maximumKind":"resolvedKills","maximumPerActivation":null},"reward":"points","formulaReference":{"code":"card_percent_per_unit","version":1,"parameters":{"type":"cardPercentPerUnit","rate":0.75}},"durationSecondsPerActivation":null}"""
        )
    ];

    private static readonly (Guid SourceId, Guid TargetId)[] Conflicts =
    [
        (new("10000000-0000-0000-0000-000000000007"), new("10000000-0000-0000-0000-000000000009")),
        (new("10000000-0000-0000-0000-000000000007"), new("10000000-0000-0000-0000-00000000000c")),
        (new("10000000-0000-0000-0000-000000000007"), new("10000000-0000-0000-0000-00000000000d")),
        (new("10000000-0000-0000-0000-000000000009"), new("10000000-0000-0000-0000-000000000007")),
        (new("10000000-0000-0000-0000-000000000009"), new("10000000-0000-0000-0000-00000000000c")),
        (new("10000000-0000-0000-0000-00000000000c"), new("10000000-0000-0000-0000-000000000007")),
        (new("10000000-0000-0000-0000-00000000000c"), new("10000000-0000-0000-0000-000000000009")),
        (new("10000000-0000-0000-0000-00000000000d"), new("10000000-0000-0000-0000-000000000007"))
    ];

    /// <inheritdoc />
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        foreach (var modifier in Modifiers)
        {
            migrationBuilder.InsertData(
                table: "modifier_definitions",
                columns: ["id", "current_version_id", "is_archived", "created_by_user_id", "archived_at_utc", "archived_by_user_id", "created_at_utc"],
                values: [modifier.Id, null, false, null, null, null, SeededAtUtc]
            );
        }

        foreach (var modifier in Modifiers)
        {
            migrationBuilder.InsertData(
                table: "modifier_definition_versions",
                columns:
                [
                    "id", "modifier_id", "revision", "name", "description", "category",
                    "icon_emoji", "activation_command", "activation_cost",
                    "max_activations_per_round", "normalized_tags", "behavior_v2_json",
                    "created_at_utc", "created_by_user_id", "created_by_display_name_snapshot",
                    "change_note", "change_type", "changed_fields", "cascade_source_modifier_id"
                ],
                values:
                [
                    modifier.VersionId, modifier.Id, 1, modifier.Name, modifier.Description,
                    modifier.Category, modifier.IconEmoji, modifier.ActivationCommand,
                    modifier.ActivationCost, modifier.MaxActivationsPerRound, modifier.NormalizedTags,
                    modifier.BehaviorV2Json, SeededAtUtc, null, "System migration",
                    "Стартовый базовый набор модификаторов.", "migration_baseline",
                    new[] { "created" }, null
                ]
            );
        }

        var byId = Modifiers.ToDictionary(modifier => modifier.Id);
        foreach (var (sourceId, targetId) in Conflicts)
        {
            migrationBuilder.InsertData(
                table: "modifier_definition_version_conflicts",
                columns: ["modifier_version_id", "conflicting_modifier_id", "conflicting_modifier_name_snapshot"],
                values: [byId[sourceId].VersionId, targetId, byId[targetId].Name]
            );
        }

        foreach (var modifier in Modifiers)
        {
            migrationBuilder.UpdateData(
                table: "modifier_definitions",
                keyColumn: "id",
                keyValue: modifier.Id,
                column: "current_version_id",
                value: modifier.VersionId
            );
        }
    }

    /// <inheritdoc />
    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.Sql(
            """
            ALTER TABLE modifier_definition_version_conflicts
                DISABLE TRIGGER trg_modifier_definition_version_conflicts_immutable;
            ALTER TABLE modifier_definition_versions
                DISABLE TRIGGER trg_modifier_definition_versions_immutable;

            UPDATE modifier_definitions AS definition
            SET current_version_id = NULL
            FROM (VALUES
                ('10000000-0000-0000-0000-000000000001'::uuid, '20000000-0000-0000-0000-000000000001'::uuid),
                ('10000000-0000-0000-0000-000000000002'::uuid, '20000000-0000-0000-0000-000000000002'::uuid),
                ('10000000-0000-0000-0000-000000000003'::uuid, '20000000-0000-0000-0000-000000000003'::uuid),
                ('10000000-0000-0000-0000-000000000004'::uuid, '20000000-0000-0000-0000-000000000004'::uuid),
                ('10000000-0000-0000-0000-000000000005'::uuid, '20000000-0000-0000-0000-000000000005'::uuid),
                ('10000000-0000-0000-0000-000000000006'::uuid, '20000000-0000-0000-0000-000000000006'::uuid),
                ('10000000-0000-0000-0000-000000000007'::uuid, '20000000-0000-0000-0000-000000000007'::uuid),
                ('10000000-0000-0000-0000-000000000008'::uuid, '20000000-0000-0000-0000-000000000008'::uuid),
                ('10000000-0000-0000-0000-000000000009'::uuid, '20000000-0000-0000-0000-000000000009'::uuid),
                ('10000000-0000-0000-0000-00000000000a'::uuid, '20000000-0000-0000-0000-00000000000a'::uuid),
                ('10000000-0000-0000-0000-00000000000b'::uuid, '20000000-0000-0000-0000-00000000000b'::uuid),
                ('10000000-0000-0000-0000-00000000000c'::uuid, '20000000-0000-0000-0000-00000000000c'::uuid),
                ('10000000-0000-0000-0000-00000000000d'::uuid, '20000000-0000-0000-0000-00000000000d'::uuid),
                ('10000000-0000-0000-0000-00000000000e'::uuid, '20000000-0000-0000-0000-00000000000e'::uuid),
                ('10000000-0000-0000-0000-00000000000f'::uuid, '20000000-0000-0000-0000-00000000000f'::uuid)
            ) AS seeded(modifier_id, version_id)
            WHERE definition.id = seeded.modifier_id
              AND definition.current_version_id = seeded.version_id;

            DELETE FROM modifier_definition_version_conflicts
            WHERE modifier_version_id::text LIKE '20000000-0000-0000-0000-0000000000__';

            DELETE FROM modifier_definition_versions
            WHERE id::text LIKE '20000000-0000-0000-0000-0000000000__';

            DELETE FROM modifier_definitions
            WHERE id::text LIKE '10000000-0000-0000-0000-0000000000__'
              AND current_version_id IS NULL;

            ALTER TABLE modifier_definition_versions
                ENABLE TRIGGER trg_modifier_definition_versions_immutable;
            ALTER TABLE modifier_definition_version_conflicts
                ENABLE TRIGGER trg_modifier_definition_version_conflicts_immutable;
            """
        );
    }

    private sealed record SeedModifier(
        Guid Id,
        Guid VersionId,
        string Name,
        string Description,
        string Category,
        string IconEmoji,
        string ActivationCommand,
        int ActivationCost,
        int? MaxActivationsPerRound,
        string[] NormalizedTags,
        string BehaviorV2Json
    );
}
