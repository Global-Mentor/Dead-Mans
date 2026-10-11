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
            "Черепаха",
            "С начала миссии все участники команды должны перемещаться только на корточках в течение 60 секунд за каждую активацию. Длительность всех активаций складывается (пример: 2 активации - 120 секунд).",
            "round",
            "🐢",
            "!активировать черепаха",
            2,
            5,
            """{"schemaVersion":2,"kind":"rule","phase":"round","performer":"activeTeam","requiresHostMonitoring":false,"rule":"\u0421 \u043D\u0430\u0447\u0430\u043B\u0430 \u043C\u0438\u0441\u0441\u0438\u0438 \u0432\u0441\u0435 \u0443\u0447\u0430\u0441\u0442\u043D\u0438\u043A\u0438 \u043A\u043E\u043C\u0430\u043D\u0434\u044B \u0434\u043E\u043B\u0436\u043D\u044B \u043F\u0435\u0440\u0435\u043C\u0435\u0449\u0430\u0442\u044C\u0441\u044F \u0442\u043E\u043B\u044C\u043A\u043E \u043D\u0430 \u043A\u043E\u0440\u0442\u043E\u0447\u043A\u0430\u0445 \u0432 \u0442\u0435\u0447\u0435\u043D\u0438\u0435 60 \u0441\u0435\u043A\u0443\u043D\u0434 \u0437\u0430 \u043A\u0430\u0436\u0434\u0443\u044E \u0430\u043A\u0442\u0438\u0432\u0430\u0446\u0438\u044E. \u0414\u043B\u0438\u0442\u0435\u043B\u044C\u043D\u043E\u0441\u0442\u044C \u0432\u0441\u0435\u0445 \u0430\u043A\u0442\u0438\u0432\u0430\u0446\u0438\u0439 \u0441\u043A\u043B\u0430\u0434\u044B\u0432\u0430\u0435\u0442\u0441\u044F (\u043F\u0440\u0438\u043C\u0435\u0440: 2 \u0430\u043A\u0442\u0438\u0432\u0430\u0446\u0438\u0438 - 120 \u0441\u0435\u043A\u0443\u043D\u0434).","stackingPolicy":"aggregateParameters","resolution":{"type":"ruleStatus"},"reward":"none","formulaReference":null,"durationSecondsPerActivation":60}"""
        ),
        new(
            new("10000000-0000-0000-0000-000000000002"),
            new("20000000-0000-0000-0000-000000000002"),
            "Жажда",
            "Бонус за каждое убийство зависит от общего числа убийств команды в миссии: 1 убийство - +5 очков, 2 - по 10 очков за каждое, 3 - по 15 очков за каждое и так далее. Например, 3 убийства дают суммарно +45 очков. Миссия без убийств приносит штраф 25 очков. Вторая активация удваивает бонус или штраф.",
            "result",
            "🩸",
            "!активировать жажда",
            3,
            2,
            """{"schemaVersion":2,"kind":"scoring","phase":"result","performer":"activeTeam","requiresHostMonitoring":true,"rule":"\u0411\u043E\u043D\u0443\u0441 \u0437\u0430 \u043A\u0430\u0436\u0434\u043E\u0435 \u0443\u0431\u0438\u0439\u0441\u0442\u0432\u043E \u0437\u0430\u0432\u0438\u0441\u0438\u0442 \u043E\u0442 \u043E\u0431\u0449\u0435\u0433\u043E \u0447\u0438\u0441\u043B\u0430 \u0443\u0431\u0438\u0439\u0441\u0442\u0432 \u043A\u043E\u043C\u0430\u043D\u0434\u044B \u0432 \u043C\u0438\u0441\u0441\u0438\u0438: 1 \u0443\u0431\u0438\u0439\u0441\u0442\u0432\u043E - +5 \u043E\u0447\u043A\u043E\u0432, 2 - \u043F\u043E 10 \u043E\u0447\u043A\u043E\u0432 \u0437\u0430 \u043A\u0430\u0436\u0434\u043E\u0435, 3 - \u043F\u043E 15 \u043E\u0447\u043A\u043E\u0432 \u0437\u0430 \u043A\u0430\u0436\u0434\u043E\u0435 \u0438 \u0442\u0430\u043A \u0434\u0430\u043B\u0435\u0435. \u041D\u0430\u043F\u0440\u0438\u043C\u0435\u0440, 3 \u0443\u0431\u0438\u0439\u0441\u0442\u0432\u0430 \u0434\u0430\u044E\u0442 \u0441\u0443\u043C\u043C\u0430\u0440\u043D\u043E +45 \u043E\u0447\u043A\u043E\u0432. \u041C\u0438\u0441\u0441\u0438\u044F \u0431\u0435\u0437 \u0443\u0431\u0438\u0439\u0441\u0442\u0432 \u043F\u0440\u0438\u043D\u043E\u0441\u0438\u0442 \u0448\u0442\u0440\u0430\u0444 25 \u043E\u0447\u043A\u043E\u0432. \u0412\u0442\u043E\u0440\u0430\u044F \u0430\u043A\u0442\u0438\u0432\u0430\u0446\u0438\u044F \u0443\u0434\u0432\u0430\u0438\u0432\u0430\u0435\u0442 \u0431\u043E\u043D\u0443\u0441 \u0438\u043B\u0438 \u0448\u0442\u0440\u0430\u0444.","stackingPolicy":"independentInstances","resolution":{"type":"automaticRoundMetric","metric":"killsCount"},"reward":"points","formulaReference":{"code":"kill_value_increase_per_unit","version":1,"parameters":{"type":"killValueIncreasePerUnit","incrementPointsPerUnit":5,"zeroCountPenaltyPoints":25}},"durationSecondsPerActivation":null}"""
        ),
        new(
            new("10000000-0000-0000-0000-000000000003"),
            new("20000000-0000-0000-0000-000000000003"),
            "Расходник",
            "За каждую активацию каждый участник команды может заменить один расходник на другой по своему выбору или добавить один расходник в свободный слот.",
            "preparation",
            "📦",
            "!активировать расходник",
            4,
            4,
            """{"schemaVersion":2,"kind":"rule","phase":"preparation","performer":"activeTeam","requiresHostMonitoring":false,"rule":"\u0417\u0430 \u043A\u0430\u0436\u0434\u0443\u044E \u0430\u043A\u0442\u0438\u0432\u0430\u0446\u0438\u044E \u043A\u0430\u0436\u0434\u044B\u0439 \u0443\u0447\u0430\u0441\u0442\u043D\u0438\u043A \u043A\u043E\u043C\u0430\u043D\u0434\u044B \u043C\u043E\u0436\u0435\u0442 \u0437\u0430\u043C\u0435\u043D\u0438\u0442\u044C \u043E\u0434\u0438\u043D \u0440\u0430\u0441\u0445\u043E\u0434\u043D\u0438\u043A \u043D\u0430 \u0434\u0440\u0443\u0433\u043E\u0439 \u043F\u043E \u0441\u0432\u043E\u0435\u043C\u0443 \u0432\u044B\u0431\u043E\u0440\u0443 \u0438\u043B\u0438 \u0434\u043E\u0431\u0430\u0432\u0438\u0442\u044C \u043E\u0434\u0438\u043D \u0440\u0430\u0441\u0445\u043E\u0434\u043D\u0438\u043A \u0432 \u0441\u0432\u043E\u0431\u043E\u0434\u043D\u044B\u0439 \u0441\u043B\u043E\u0442.","stackingPolicy":"aggregateParameters","resolution":{"type":"ruleStatus"},"reward":"none","formulaReference":null,"durationSecondsPerActivation":null}"""
        ),
        new(
            new("10000000-0000-0000-0000-000000000004"),
            new("20000000-0000-0000-0000-000000000004"),
            "Трупы",
            "В течение всей миссии участникам команды запрещено сжигать тела убитых охотников.",
            "round",
            "🪦",
            "!активировать трупы",
            4,
            1,
            """{"schemaVersion":2,"kind":"rule","phase":"round","performer":"activeTeam","requiresHostMonitoring":true,"rule":"\u0412 \u0442\u0435\u0447\u0435\u043D\u0438\u0435 \u0432\u0441\u0435\u0439 \u043C\u0438\u0441\u0441\u0438\u0438 \u0443\u0447\u0430\u0441\u0442\u043D\u0438\u043A\u0430\u043C \u043A\u043E\u043C\u0430\u043D\u0434\u044B \u0437\u0430\u043F\u0440\u0435\u0449\u0435\u043D\u043E \u0441\u0436\u0438\u0433\u0430\u0442\u044C \u0442\u0435\u043B\u0430 \u0443\u0431\u0438\u0442\u044B\u0445 \u043E\u0445\u043E\u0442\u043D\u0438\u043A\u043E\u0432.","stackingPolicy":"aggregateParameters","resolution":{"type":"ruleStatus"},"reward":"none","formulaReference":null,"durationSecondsPerActivation":null}"""
        ),
        new(
            new("10000000-0000-0000-0000-000000000005"),
            new("20000000-0000-0000-0000-000000000005"),
            "Навыки",
            "По умолчанию доступно 10 очков навыков. Каждая активация уменьшает количество доступных очков навыков на 2 очка. Снижения от всех активаций складываются.",
            "preparation",
            "⚙️",
            "!активировать навыки",
            4,
            5,
            """{"schemaVersion":2,"kind":"rule","phase":"preparation","performer":"activeTeam","requiresHostMonitoring":true,"rule":"\u041F\u043E \u0443\u043C\u043E\u043B\u0447\u0430\u043D\u0438\u044E \u0434\u043E\u0441\u0442\u0443\u043F\u043D\u043E 10 \u043E\u0447\u043A\u043E\u0432 \u043D\u0430\u0432\u044B\u043A\u043E\u0432. \u041A\u0430\u0436\u0434\u0430\u044F \u0430\u043A\u0442\u0438\u0432\u0430\u0446\u0438\u044F \u0443\u043C\u0435\u043D\u044C\u0448\u0430\u0435\u0442 \u043A\u043E\u043B\u0438\u0447\u0435\u0441\u0442\u0432\u043E \u0434\u043E\u0441\u0442\u0443\u043F\u043D\u044B\u0445 \u043E\u0447\u043A\u043E\u0432 \u043D\u0430\u0432\u044B\u043A\u043E\u0432 \u043D\u0430 2 \u043E\u0447\u043A\u0430. \u0421\u043D\u0438\u0436\u0435\u043D\u0438\u044F \u043E\u0442 \u0432\u0441\u0435\u0445 \u0430\u043A\u0442\u0438\u0432\u0430\u0446\u0438\u0439 \u0441\u043A\u043B\u0430\u0434\u044B\u0432\u0430\u044E\u0442\u0441\u044F.","stackingPolicy":"aggregateParameters","resolution":{"type":"ruleStatus"},"reward":"none","formulaReference":null,"durationSecondsPerActivation":null}"""
        ),
        new(
            new("10000000-0000-0000-0000-000000000006"),
            new("20000000-0000-0000-0000-000000000006"),
            "Первая пуля",
            "Если первая пуля, выпущенная командой в миссии, убивает вражеского охотника, команда получает 1 дополнительное убийство при подсчёте результата. Модификатор не работает с луками, арбалетами и дробовиками.",
            "result",
            "🔫",
            "!активировать первая пуля",
            4,
            1,
            """{"schemaVersion":2,"kind":"scoring","phase":"result","performer":"activeTeam","requiresHostMonitoring":true,"rule":"\u0415\u0441\u043B\u0438 \u043F\u0435\u0440\u0432\u0430\u044F \u043F\u0443\u043B\u044F, \u0432\u044B\u043F\u0443\u0449\u0435\u043D\u043D\u0430\u044F \u043A\u043E\u043C\u0430\u043D\u0434\u043E\u0439 \u0432 \u043C\u0438\u0441\u0441\u0438\u0438, \u0443\u0431\u0438\u0432\u0430\u0435\u0442 \u0432\u0440\u0430\u0436\u0435\u0441\u043A\u043E\u0433\u043E \u043E\u0445\u043E\u0442\u043D\u0438\u043A\u0430, \u043A\u043E\u043C\u0430\u043D\u0434\u0430 \u043F\u043E\u043B\u0443\u0447\u0430\u0435\u0442 1 \u0434\u043E\u043F\u043E\u043B\u043D\u0438\u0442\u0435\u043B\u044C\u043D\u043E\u0435 \u0443\u0431\u0438\u0439\u0441\u0442\u0432\u043E \u043F\u0440\u0438 \u043F\u043E\u0434\u0441\u0447\u0451\u0442\u0435 \u0440\u0435\u0437\u0443\u043B\u044C\u0442\u0430\u0442\u0430. \u041C\u043E\u0434\u0438\u0444\u0438\u043A\u0430\u0442\u043E\u0440 \u043D\u0435 \u0440\u0430\u0431\u043E\u0442\u0430\u0435\u0442 \u0441 \u043B\u0443\u043A\u0430\u043C\u0438, \u0430\u0440\u0431\u0430\u043B\u0435\u0442\u0430\u043C\u0438 \u0438 \u0434\u0440\u043E\u0431\u043E\u0432\u0438\u043A\u0430\u043C\u0438.","stackingPolicy":"independentInstances","resolution":{"type":"boolean","inputLabel":"\u0423\u0441\u043B\u043E\u0432\u0438\u0435 \u0432\u044B\u043F\u043E\u043B\u043D\u0435\u043D\u043E"},"reward":"bonusKills","formulaReference":{"code":"bonus_kills_per_unit","version":1,"parameters":{"type":"bonusKillsPerUnit","bonusKillsPerUnit":1}},"durationSecondsPerActivation":null}"""
        ),
        new(
            new("10000000-0000-0000-0000-000000000007"),
            new("20000000-0000-0000-0000-000000000007"),
            "Проказник",
            "Ведущий в роли проказника мешает команде в течение 5 минут, используя все виды обманок и навык «Полтергейст».",
            "round",
            "🙊",
            "!активировать проказник",
            6,
            1,
            """{"schemaVersion":2,"kind":"rule","phase":"round","performer":"mentor","requiresHostMonitoring":true,"rule":"\u0412\u0435\u0434\u0443\u0449\u0438\u0439 \u0432 \u0440\u043E\u043B\u0438 \u043F\u0440\u043E\u043A\u0430\u0437\u043D\u0438\u043A\u0430 \u043C\u0435\u0448\u0430\u0435\u0442 \u043A\u043E\u043C\u0430\u043D\u0434\u0435 \u0432 \u0442\u0435\u0447\u0435\u043D\u0438\u0435 5 \u043C\u0438\u043D\u0443\u0442, \u0438\u0441\u043F\u043E\u043B\u044C\u0437\u0443\u044F \u0432\u0441\u0435 \u0432\u0438\u0434\u044B \u043E\u0431\u043C\u0430\u043D\u043E\u043A \u0438 \u043D\u0430\u0432\u044B\u043A \u00AB\u041F\u043E\u043B\u0442\u0435\u0440\u0433\u0435\u0439\u0441\u0442\u00BB.","stackingPolicy":"aggregateParameters","resolution":{"type":"ruleStatus"},"reward":"none","formulaReference":null,"durationSecondsPerActivation":300}"""
        ),
        new(
            new("10000000-0000-0000-0000-000000000008"),
            new("20000000-0000-0000-0000-000000000008"),
            "Диарея",
            "Если команда проходит мимо туалета или любой участник команды либо ведущий упоминает конкретный туалет, один участник команды обязан зайти в этот туалет. Команда сама выбирает, кто пойдёт. Требование не действует, если в поле зрения есть враг.",
            "round",
            "💩",
            "!активировать диарея",
            7,
            1,
            """{"schemaVersion":2,"kind":"rule","phase":"round","performer":"activeTeam","requiresHostMonitoring":true,"rule":"\u0415\u0441\u043B\u0438 \u043A\u043E\u043C\u0430\u043D\u0434\u0430 \u043F\u0440\u043E\u0445\u043E\u0434\u0438\u0442 \u043C\u0438\u043C\u043E \u0442\u0443\u0430\u043B\u0435\u0442\u0430 \u0438\u043B\u0438 \u043B\u044E\u0431\u043E\u0439 \u0443\u0447\u0430\u0441\u0442\u043D\u0438\u043A \u043A\u043E\u043C\u0430\u043D\u0434\u044B \u043B\u0438\u0431\u043E \u0432\u0435\u0434\u0443\u0449\u0438\u0439 \u0443\u043F\u043E\u043C\u0438\u043D\u0430\u0435\u0442 \u043A\u043E\u043D\u043A\u0440\u0435\u0442\u043D\u044B\u0439 \u0442\u0443\u0430\u043B\u0435\u0442, \u043E\u0434\u0438\u043D \u0443\u0447\u0430\u0441\u0442\u043D\u0438\u043A \u043A\u043E\u043C\u0430\u043D\u0434\u044B \u043E\u0431\u044F\u0437\u0430\u043D \u0437\u0430\u0439\u0442\u0438 \u0432 \u044D\u0442\u043E\u0442 \u0442\u0443\u0430\u043B\u0435\u0442. \u041A\u043E\u043C\u0430\u043D\u0434\u0430 \u0441\u0430\u043C\u0430 \u0432\u044B\u0431\u0438\u0440\u0430\u0435\u0442, \u043A\u0442\u043E \u043F\u043E\u0439\u0434\u0451\u0442. \u0422\u0440\u0435\u0431\u043E\u0432\u0430\u043D\u0438\u0435 \u043D\u0435 \u0434\u0435\u0439\u0441\u0442\u0432\u0443\u0435\u0442, \u0435\u0441\u043B\u0438 \u0432 \u043F\u043E\u043B\u0435 \u0437\u0440\u0435\u043D\u0438\u044F \u0435\u0441\u0442\u044C \u0432\u0440\u0430\u0433.","stackingPolicy":"aggregateParameters","resolution":{"type":"ruleStatus"},"reward":"none","formulaReference":null,"durationSecondsPerActivation":null}"""
        ),
        new(
            new("10000000-0000-0000-0000-000000000009"),
            new("20000000-0000-0000-0000-000000000009"),
            "Провокация",
            "Игроки могут использовать ведущего в роли приманки в течение 5 минут: привлекать врагов к себе или отвлекать их в другую сторону. До конца таймера ведущий должен израсходовать всё шумовое снаряжение. (Снаряжение ведущего: арбалет с шумовыми болтами, бомбы хаоса и обманки с бездымным порохом.)",
            "round",
            "📣",
            "!активировать провокация",
            8,
            1,
            """{"schemaVersion":2,"kind":"rule","phase":"round","performer":"mentor","requiresHostMonitoring":true,"rule":"\u0418\u0433\u0440\u043E\u043A\u0438 \u043C\u043E\u0433\u0443\u0442 \u0438\u0441\u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u044C \u0432\u0435\u0434\u0443\u0449\u0435\u0433\u043E \u0432 \u0440\u043E\u043B\u0438 \u043F\u0440\u0438\u043C\u0430\u043D\u043A\u0438 \u0432 \u0442\u0435\u0447\u0435\u043D\u0438\u0435 5 \u043C\u0438\u043D\u0443\u0442: \u043F\u0440\u0438\u0432\u043B\u0435\u043A\u0430\u0442\u044C \u0432\u0440\u0430\u0433\u043E\u0432 \u043A \u0441\u0435\u0431\u0435 \u0438\u043B\u0438 \u043E\u0442\u0432\u043B\u0435\u043A\u0430\u0442\u044C \u0438\u0445 \u0432 \u0434\u0440\u0443\u0433\u0443\u044E \u0441\u0442\u043E\u0440\u043E\u043D\u0443. \u0414\u043E \u043A\u043E\u043D\u0446\u0430 \u0442\u0430\u0439\u043C\u0435\u0440\u0430 \u0432\u0435\u0434\u0443\u0449\u0438\u0439 \u0434\u043E\u043B\u0436\u0435\u043D \u0438\u0437\u0440\u0430\u0441\u0445\u043E\u0434\u043E\u0432\u0430\u0442\u044C \u0432\u0441\u0451 \u0448\u0443\u043C\u043E\u0432\u043E\u0435 \u0441\u043D\u0430\u0440\u044F\u0436\u0435\u043D\u0438\u0435. (\u0421\u043D\u0430\u0440\u044F\u0436\u0435\u043D\u0438\u0435 \u0432\u0435\u0434\u0443\u0449\u0435\u0433\u043E: \u0430\u0440\u0431\u0430\u043B\u0435\u0442 \u0441 \u0448\u0443\u043C\u043E\u0432\u044B\u043C\u0438 \u0431\u043E\u043B\u0442\u0430\u043C\u0438, \u0431\u043E\u043C\u0431\u044B \u0445\u0430\u043E\u0441\u0430 \u0438 \u043E\u0431\u043C\u0430\u043D\u043A\u0438 \u0441 \u0431\u0435\u0437\u0434\u044B\u043C\u043D\u044B\u043C \u043F\u043E\u0440\u043E\u0445\u043E\u043C.)","stackingPolicy":"aggregateParameters","resolution":{"type":"ruleStatus"},"reward":"none","formulaReference":null,"durationSecondsPerActivation":300}"""
        ),
        new(
            new("10000000-0000-0000-0000-00000000000a"),
            new("20000000-0000-0000-0000-00000000000a"),
            "Кэп",
            "Команда выбирает капитана. В течение всей миссии из участников команды говорить может только капитан. Ведущий может помогать команде информацией.",
            "round",
            "🔇",
            "!активировать кэп",
            10,
            1,
            """{"schemaVersion":2,"kind":"rule","phase":"round","performer":"activeTeam","requiresHostMonitoring":true,"rule":"\u041A\u043E\u043C\u0430\u043D\u0434\u0430 \u0432\u044B\u0431\u0438\u0440\u0430\u0435\u0442 \u043A\u0430\u043F\u0438\u0442\u0430\u043D\u0430. \u0412 \u0442\u0435\u0447\u0435\u043D\u0438\u0435 \u0432\u0441\u0435\u0439 \u043C\u0438\u0441\u0441\u0438\u0438 \u0438\u0437 \u0443\u0447\u0430\u0441\u0442\u043D\u0438\u043A\u043E\u0432 \u043A\u043E\u043C\u0430\u043D\u0434\u044B \u0433\u043E\u0432\u043E\u0440\u0438\u0442\u044C \u043C\u043E\u0436\u0435\u0442 \u0442\u043E\u043B\u044C\u043A\u043E \u043A\u0430\u043F\u0438\u0442\u0430\u043D. \u0412\u0435\u0434\u0443\u0449\u0438\u0439 \u043C\u043E\u0436\u0435\u0442 \u043F\u043E\u043C\u043E\u0433\u0430\u0442\u044C \u043A\u043E\u043C\u0430\u043D\u0434\u0435 \u0438\u043D\u0444\u043E\u0440\u043C\u0430\u0446\u0438\u0435\u0439.","stackingPolicy":"aggregateParameters","resolution":{"type":"ruleStatus"},"reward":"none","formulaReference":null,"durationSecondsPerActivation":null}"""
        ),
        new(
            new("10000000-0000-0000-0000-00000000000b"),
            new("20000000-0000-0000-0000-00000000000b"),
            "Фейерверк",
            "Ведущий делает 5 выстрелов осветительными снарядами в небо: первый в начале миссии, остальные с интервалом в 1 минуту.",
            "round",
            "🎆",
            "!активировать фейерверк",
            11,
            1,
            """{"schemaVersion":2,"kind":"rule","phase":"round","performer":"mentor","requiresHostMonitoring":true,"rule":"\u0412\u0435\u0434\u0443\u0449\u0438\u0439 \u0434\u0435\u043B\u0430\u0435\u0442 5 \u0432\u044B\u0441\u0442\u0440\u0435\u043B\u043E\u0432 \u043E\u0441\u0432\u0435\u0442\u0438\u0442\u0435\u043B\u044C\u043D\u044B\u043C\u0438 \u0441\u043D\u0430\u0440\u044F\u0434\u0430\u043C\u0438 \u0432 \u043D\u0435\u0431\u043E: \u043F\u0435\u0440\u0432\u044B\u0439 \u0432 \u043D\u0430\u0447\u0430\u043B\u0435 \u043C\u0438\u0441\u0441\u0438\u0438, \u043E\u0441\u0442\u0430\u043B\u044C\u043D\u044B\u0435 \u0441 \u0438\u043D\u0442\u0435\u0440\u0432\u0430\u043B\u043E\u043C \u0432 1 \u043C\u0438\u043D\u0443\u0442\u0443.","stackingPolicy":"aggregateParameters","resolution":{"type":"ruleStatus"},"reward":"none","formulaReference":null,"durationSecondsPerActivation":300}"""
        ),
        new(
            new("10000000-0000-0000-0000-00000000000c"),
            new("20000000-0000-0000-0000-00000000000c"),
            "Крыса",
            "Ведущий действует независимо от команды и использует сигнальные ловушки, ловушки с колючей проволокой, ядовитые ловушки, капканы, два тёмных динамита и навык «Первопроходец». Все убийства, совершённые ведущим, идут в счёт команды.",
            "result",
            "🐀",
            "!активировать крыса",
            12,
            1,
            """{"schemaVersion":2,"kind":"scoring","phase":"result","performer":"mentor","requiresHostMonitoring":true,"rule":"\u0412\u0435\u0434\u0443\u0449\u0438\u0439 \u0434\u0435\u0439\u0441\u0442\u0432\u0443\u0435\u0442 \u043D\u0435\u0437\u0430\u0432\u0438\u0441\u0438\u043C\u043E \u043E\u0442 \u043A\u043E\u043C\u0430\u043D\u0434\u044B \u0438 \u0438\u0441\u043F\u043E\u043B\u044C\u0437\u0443\u0435\u0442 \u0441\u0438\u0433\u043D\u0430\u043B\u044C\u043D\u044B\u0435 \u043B\u043E\u0432\u0443\u0448\u043A\u0438, \u043B\u043E\u0432\u0443\u0448\u043A\u0438 \u0441 \u043A\u043E\u043B\u044E\u0447\u0435\u0439 \u043F\u0440\u043E\u0432\u043E\u043B\u043E\u043A\u043E\u0439, \u044F\u0434\u043E\u0432\u0438\u0442\u044B\u0435 \u043B\u043E\u0432\u0443\u0448\u043A\u0438, \u043A\u0430\u043F\u043A\u0430\u043D\u044B, \u0434\u0432\u0430 \u0442\u0451\u043C\u043D\u044B\u0445 \u0434\u0438\u043D\u0430\u043C\u0438\u0442\u0430 \u0438 \u043D\u0430\u0432\u044B\u043A \u00AB\u041F\u0435\u0440\u0432\u043E\u043F\u0440\u043E\u0445\u043E\u0434\u0435\u0446\u00BB. \u0412\u0441\u0435 \u0443\u0431\u0438\u0439\u0441\u0442\u0432\u0430, \u0441\u043E\u0432\u0435\u0440\u0448\u0451\u043D\u043D\u044B\u0435 \u0432\u0435\u0434\u0443\u0449\u0438\u043C, \u0438\u0434\u0443\u0442 \u0432 \u0441\u0447\u0451\u0442 \u043A\u043E\u043C\u0430\u043D\u0434\u044B.","stackingPolicy":"independentInstances","resolution":{"type":"nonNegativeCount","inputLabel":"\u0423\u0441\u043F\u0435\u0448\u043D\u044B\u0435 \u0443\u0431\u0438\u0439\u0441\u0442\u0432\u0430 \u0432\u0435\u0434\u0443\u0449\u0435\u0433\u043E","maximumKind":"none","maximumPerActivation":null},"reward":"bonusKills","formulaReference":{"code":"bonus_kills_per_unit","version":1,"parameters":{"type":"bonusKillsPerUnit","bonusKillsPerUnit":1}},"durationSecondsPerActivation":null}"""
        ),
        new(
            new("10000000-0000-0000-0000-00000000000d"),
            new("20000000-0000-0000-0000-00000000000d"),
            "Шот",
            "Команда выбирает ведущему оружие. Каждая активация даёт ему 1 выстрел, который он использует по своему усмотрению. Если этот выстрел убивает врага, убийство идёт в счёт команды.",
            "result",
            "🥠",
            "!активировать шот",
            13,
            4,
            """{"schemaVersion":2,"kind":"scoring","phase":"result","performer":"mentor","requiresHostMonitoring":true,"rule":"\u041A\u043E\u043C\u0430\u043D\u0434\u0430 \u0432\u044B\u0431\u0438\u0440\u0430\u0435\u0442 \u0432\u0435\u0434\u0443\u0449\u0435\u043C\u0443 \u043E\u0440\u0443\u0436\u0438\u0435. \u041A\u0430\u0436\u0434\u0430\u044F \u0430\u043A\u0442\u0438\u0432\u0430\u0446\u0438\u044F \u0434\u0430\u0451\u0442 \u0435\u043C\u0443 1 \u0432\u044B\u0441\u0442\u0440\u0435\u043B, \u043A\u043E\u0442\u043E\u0440\u044B\u0439 \u043E\u043D \u0438\u0441\u043F\u043E\u043B\u044C\u0437\u0443\u0435\u0442 \u043F\u043E \u0441\u0432\u043E\u0435\u043C\u0443 \u0443\u0441\u043C\u043E\u0442\u0440\u0435\u043D\u0438\u044E. \u0415\u0441\u043B\u0438 \u044D\u0442\u043E\u0442 \u0432\u044B\u0441\u0442\u0440\u0435\u043B \u0443\u0431\u0438\u0432\u0430\u0435\u0442 \u0432\u0440\u0430\u0433\u0430, \u0443\u0431\u0438\u0439\u0441\u0442\u0432\u043E \u0438\u0434\u0451\u0442 \u0432 \u0441\u0447\u0451\u0442 \u043A\u043E\u043C\u0430\u043D\u0434\u044B.","stackingPolicy":"independentInstances","resolution":{"type":"nonNegativeCount","inputLabel":"\u0423\u0441\u043F\u0435\u0448\u043D\u044B\u0435 \u0443\u0431\u0438\u0439\u0441\u0442\u0432\u0430 \u0432\u0435\u0434\u0443\u0449\u0435\u0433\u043E","maximumKind":"activations","maximumPerActivation":1},"reward":"bonusKills","formulaReference":{"code":"bonus_kills_per_unit","version":1,"parameters":{"type":"bonusKillsPerUnit","bonusKillsPerUnit":1}},"durationSecondsPerActivation":null}"""
        ),
        new(
            new("10000000-0000-0000-0000-00000000000e"),
            new("20000000-0000-0000-0000-00000000000e"),
            "Подъём",
            "После каждого падения союзника команда должна совершить новое убийство вражеского охотника, прежде чем поднять этого союзника.",
            "round",
            "☠️",
            "!активировать подъём",
            14,
            1,
            """{"schemaVersion":2,"kind":"rule","phase":"round","performer":"activeTeam","requiresHostMonitoring":true,"rule":"\u041F\u043E\u0441\u043B\u0435 \u043A\u0430\u0436\u0434\u043E\u0433\u043E \u043F\u0430\u0434\u0435\u043D\u0438\u044F \u0441\u043E\u044E\u0437\u043D\u0438\u043A\u0430 \u043A\u043E\u043C\u0430\u043D\u0434\u0430 \u0434\u043E\u043B\u0436\u043D\u0430 \u0441\u043E\u0432\u0435\u0440\u0448\u0438\u0442\u044C \u043D\u043E\u0432\u043E\u0435 \u0443\u0431\u0438\u0439\u0441\u0442\u0432\u043E \u0432\u0440\u0430\u0436\u0435\u0441\u043A\u043E\u0433\u043E \u043E\u0445\u043E\u0442\u043D\u0438\u043A\u0430, \u043F\u0440\u0435\u0436\u0434\u0435 \u0447\u0435\u043C \u043F\u043E\u0434\u043D\u044F\u0442\u044C \u044D\u0442\u043E\u0433\u043E \u0441\u043E\u044E\u0437\u043D\u0438\u043A\u0430.","stackingPolicy":"aggregateParameters","resolution":{"type":"ruleStatus"},"reward":"none","formulaReference":null,"durationSecondsPerActivation":null}"""
        ),
        new(
            new("10000000-0000-0000-0000-00000000000f"),
            new("20000000-0000-0000-0000-00000000000f"),
            "Хард75",
            "Каждый участник команды начинает миссию с одной большой и одной маленькой полоской здоровья. Очки навыков, полученные за удаление полосок, тратить запрещено. Каждое убийство до восстановления полосок здоровья приносит дополнительно 75% стоимости карточки.",
            "result",
            "💀",
            "!активировать хард75",
            18,
            1,
            """{"schemaVersion":2,"kind":"scoring","phase":"result","performer":"activeTeam","requiresHostMonitoring":true,"rule":"\u041A\u0430\u0436\u0434\u044B\u0439 \u0443\u0447\u0430\u0441\u0442\u043D\u0438\u043A \u043A\u043E\u043C\u0430\u043D\u0434\u044B \u043D\u0430\u0447\u0438\u043D\u0430\u0435\u0442 \u043C\u0438\u0441\u0441\u0438\u044E \u0441 \u043E\u0434\u043D\u043E\u0439 \u0431\u043E\u043B\u044C\u0448\u043E\u0439 \u0438 \u043E\u0434\u043D\u043E\u0439 \u043C\u0430\u043B\u0435\u043D\u044C\u043A\u043E\u0439 \u043F\u043E\u043B\u043E\u0441\u043A\u043E\u0439 \u0437\u0434\u043E\u0440\u043E\u0432\u044C\u044F. \u041E\u0447\u043A\u0438 \u043D\u0430\u0432\u044B\u043A\u043E\u0432, \u043F\u043E\u043B\u0443\u0447\u0435\u043D\u043D\u044B\u0435 \u0437\u0430 \u0443\u0434\u0430\u043B\u0435\u043D\u0438\u0435 \u043F\u043E\u043B\u043E\u0441\u043E\u043A, \u0442\u0440\u0430\u0442\u0438\u0442\u044C \u0437\u0430\u043F\u0440\u0435\u0449\u0435\u043D\u043E. \u041A\u0430\u0436\u0434\u043E\u0435 \u0443\u0431\u0438\u0439\u0441\u0442\u0432\u043E \u0434\u043E \u0432\u043E\u0441\u0441\u0442\u0430\u043D\u043E\u0432\u043B\u0435\u043D\u0438\u044F \u043F\u043E\u043B\u043E\u0441\u043E\u043A \u0437\u0434\u043E\u0440\u043E\u0432\u044C\u044F \u043F\u0440\u0438\u043D\u043E\u0441\u0438\u0442 \u0434\u043E\u043F\u043E\u043B\u043D\u0438\u0442\u0435\u043B\u044C\u043D\u043E 75% \u0441\u0442\u043E\u0438\u043C\u043E\u0441\u0442\u0438 \u043A\u0430\u0440\u0442\u043E\u0447\u043A\u0438.","stackingPolicy":"independentInstances","resolution":{"type":"nonNegativeCount","inputLabel":"\u0423\u0431\u0438\u0439\u0441\u0442\u0432\u0430 \u0434\u043E \u0432\u043E\u0441\u0441\u0442\u0430\u043D\u043E\u0432\u043B\u0435\u043D\u0438\u044F \u043F\u043E\u043B\u043E\u0441\u043E\u043A \u0437\u0434\u043E\u0440\u043E\u0432\u044C\u044F","maximumKind":"resolvedKills","maximumPerActivation":null},"reward":"points","formulaReference":{"code":"card_percent_per_unit","version":1,"parameters":{"type":"cardPercentPerUnit","rate":0.75}},"durationSecondsPerActivation":null}"""
        )
    ];

    private static readonly (Guid SourceId, Guid TargetId)[] Conflicts =
    [
        (new("10000000-0000-0000-0000-000000000007"), new("10000000-0000-0000-0000-000000000009")),
        (new("10000000-0000-0000-0000-000000000007"), new("10000000-0000-0000-0000-00000000000c")),
        (new("10000000-0000-0000-0000-000000000007"), new("10000000-0000-0000-0000-00000000000d")),
        (new("10000000-0000-0000-0000-000000000009"), new("10000000-0000-0000-0000-000000000007")),
        (new("10000000-0000-0000-0000-000000000009"), new("10000000-0000-0000-0000-00000000000c")),
        (new("10000000-0000-0000-0000-00000000000b"), new("10000000-0000-0000-0000-00000000000c")),
        (new("10000000-0000-0000-0000-00000000000b"), new("10000000-0000-0000-0000-00000000000d")),
        (new("10000000-0000-0000-0000-00000000000c"), new("10000000-0000-0000-0000-000000000007")),
        (new("10000000-0000-0000-0000-00000000000c"), new("10000000-0000-0000-0000-000000000009")),
        (new("10000000-0000-0000-0000-00000000000c"), new("10000000-0000-0000-0000-00000000000b")),
        (new("10000000-0000-0000-0000-00000000000d"), new("10000000-0000-0000-0000-000000000007")),
        (new("10000000-0000-0000-0000-00000000000d"), new("10000000-0000-0000-0000-00000000000b"))
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
                    modifier.ActivationCost, modifier.MaxActivationsPerRound, Array.Empty<string>(),
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
        string BehaviorV2Json
    );
}
