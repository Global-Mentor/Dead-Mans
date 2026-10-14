namespace backend.Domain.GameModifiers;

public static class BuiltInModifierBehaviorCatalog
{
    public const string Chirik = "chirik";
    public const string Zhazhda = "zhazhda";
    public const string Rashodnik = "rashodnik";
    public const string Trupy = "trupy";
    public const string Navyki = "navyki";
    public const string Patron = "patron";
    public const string Prokaznik = "prokaznik";
    public const string Diareya = "diareya";
    public const string Mentorbait = "mentorbait";
    public const string Kep = "kep";
    public const string Feyerverk = "feyerverk";
    public const string Krysa = "krysa";
    public const string Shot = "shot";
    public const string Podem = "podem";
    public const string Hard75 = "hard75";

    private static readonly Dictionary<string, ModifierBehaviorV2> Items =
        new Dictionary<string, ModifierBehaviorV2>(StringComparer.Ordinal)
        {
            [Chirik] = Rule(
                ModifierPhase.Round,
                ModifierPerformer.ActiveTeam,
                false,
                "С начала миссии все участники команды должны перемещаться только на корточках в течение 60 секунд за каждую активацию. Длительность всех активаций складывается (пример: 2 активации - 120 секунд).",
                60
            ),
            [Rashodnik] = Rule(
                ModifierPhase.Preparation,
                ModifierPerformer.ActiveTeam,
                false,
                "За каждую активацию каждый участник команды может заменить один расходник на другой по своему выбору или добавить один расходник в свободный слот."
            ),
            [Trupy] = Rule(
                ModifierPhase.Round,
                ModifierPerformer.ActiveTeam,
                true,
                "В течение всей миссии участникам команды запрещено сжигать тела убитых охотников."
            ),
            [Navyki] = Rule(
                ModifierPhase.Preparation,
                ModifierPerformer.ActiveTeam,
                true,
                "По умолчанию доступно 10 очков навыков. Каждая активация уменьшает количество доступных очков навыков на 2 очка. Снижения от всех активаций складываются."
            ),
            [Diareya] = Rule(
                ModifierPhase.Round,
                ModifierPerformer.ActiveTeam,
                true,
                "Если команда проходит мимо туалета или любой участник команды либо ведущий упоминает конкретный туалет, один участник команды обязан зайти в этот туалет. Команда сама выбирает, кто пойдёт. Требование не действует, если в поле зрения есть враг."
            ),
            [Kep] = Rule(
                ModifierPhase.Round,
                ModifierPerformer.ActiveTeam,
                true,
                "Команда выбирает капитана. В течение всей миссии из участников команды говорить может только капитан. Ведущий может помогать команде информацией."
            ),
            [Podem] = Rule(
                ModifierPhase.Round,
                ModifierPerformer.ActiveTeam,
                true,
                "После каждого падения союзника команда должна совершить новое убийство вражеского охотника, прежде чем поднять этого союзника."
            ),
            [Prokaznik] = Rule(
                ModifierPhase.Round,
                ModifierPerformer.Mentor,
                true,
                "Ведущий в роли проказника мешает команде в течение 5 минут, используя все виды обманок и навык «Полтергейст».",
                300
            ),
            [Mentorbait] = Rule(
                ModifierPhase.Round,
                ModifierPerformer.Mentor,
                true,
                "Игроки могут использовать ведущего в роли приманки в течение 5 минут: привлекать врагов к себе или отвлекать их в другую сторону. До конца таймера ведущий должен израсходовать всё шумовое снаряжение. (Снаряжение ведущего: арбалет с шумовыми болтами, бомбы хаоса и обманки с бездымным порохом.)",
                300
            ),
            [Feyerverk] = Rule(
                ModifierPhase.Round,
                ModifierPerformer.Mentor,
                true,
                "Ведущий делает 5 выстрелов осветительными снарядами в небо с интервалом в 1 минуту. Первый выстрел - через 1 минуту после начала миссии, последний - через 5 минут.",
                300
            ),
            [Zhazhda] = Scoring(
                ModifierPerformer.ActiveTeam,
                "Бонус за каждое убийство зависит от общего числа убийств команды в миссии: "
                + "1 убийство - +5 очков, 2 - по 10 очков за каждое, 3 - по 15 очков за каждое и так далее. "
                + "Например, 3 убийства дают суммарно +45 очков. "
                + "Миссия без убийств приносит штраф 25 очков. Вторая активация удваивает бонус или штраф.",
                new AutomaticRoundMetricResolution("killsCount"),
                ModifierRewardKind.Points,
                new ModifierFormulaReference(
                    ModifierFormulaCodes.KillValueIncreasePerUnit,
                    ModifierFormulaCodes.Version1,
                    new KillValueIncreasePerUnitParameters(5, 25)
                )
            ),
            [Patron] = Scoring(
                ModifierPerformer.ActiveTeam,
                "Если первая пуля, выпущенная командой в миссии, убивает вражеского охотника, команда получает 1 дополнительное убийство при подсчёте результата. Модификатор не работает с луками, арбалетами и дробовиками.",
                new BooleanResolution("Условие выполнено"),
                ModifierRewardKind.BonusKills,
                new ModifierFormulaReference(
                    ModifierFormulaCodes.BonusKillsPerUnit,
                    ModifierFormulaCodes.Version1,
                    new BonusKillsPerUnitParameters(1)
                )
            ),
            [Krysa] = Scoring(
                ModifierPerformer.Mentor,
                "Ведущий действует независимо от команды и использует сигнальные ловушки, ловушки с колючей проволокой, ядовитые ловушки, капканы, два тёмных динамита и навык «Первопроходец». Все убийства, совершённые ведущим, идут в счёт команды.",
                new NonNegativeCountResolution(
                    "Успешные убийства ведущего",
                    ModifierCountMaximumKinds.None
                ),
                ModifierRewardKind.BonusKills,
                new ModifierFormulaReference(
                    ModifierFormulaCodes.BonusKillsPerUnit,
                    ModifierFormulaCodes.Version1,
                    new BonusKillsPerUnitParameters(1)
                )
            ),
            [Shot] = Scoring(
                ModifierPerformer.Mentor,
                "Команда выбирает ведущему оружие. Каждая активация даёт ему 1 выстрел, который он использует по своему усмотрению. Если этот выстрел убивает врага, убийство идёт в счёт команды.",
                new NonNegativeCountResolution(
                    "Успешные убийства ведущего",
                    ModifierCountMaximumKinds.Activations,
                    1
                ),
                ModifierRewardKind.BonusKills,
                new ModifierFormulaReference(
                    ModifierFormulaCodes.BonusKillsPerUnit,
                    ModifierFormulaCodes.Version1,
                    new BonusKillsPerUnitParameters(1)
                )
            ),
            [Hard75] = Scoring(
                ModifierPerformer.ActiveTeam,
                "Каждый участник команды начинает миссию с одной большой и одной маленькой полоской здоровья. Очки навыков, полученные за удаление полосок, тратить запрещено. Каждое убийство до восстановления полосок здоровья приносит дополнительно 75% стоимости карточки.",
                new NonNegativeCountResolution(
                    "Убийства до восстановления полосок здоровья",
                    ModifierCountMaximumKinds.ResolvedKills
                ),
                ModifierRewardKind.Points,
                new ModifierFormulaReference(
                    ModifierFormulaCodes.CardPercentPerUnit,
                    ModifierFormulaCodes.Version1,
                    new CardPercentPerUnitParameters(0.75m)
                )
            )
        };

    public static ModifierBehaviorV2 Get(string code) =>
        Items.TryGetValue(code, out var item)
            ? item
            : throw new ArgumentOutOfRangeException(nameof(code), code, "Unknown built-in modifier.");

    private static ModifierBehaviorV2 Rule(
        ModifierPhase phase,
        ModifierPerformer performer,
        bool requiresHostMonitoring,
        string rule,
        int? durationSecondsPerActivation = null
    ) => new(
        ModifierBehaviorSchemaVersions.V2,
        ModifierBehaviorKind.Rule,
        phase,
        performer,
        requiresHostMonitoring,
        rule,
        ModifierStackingPolicy.AggregateParameters,
        new RuleStatusResolution(),
        ModifierRewardKind.None,
        null,
        durationSecondsPerActivation
    );

    private static ModifierBehaviorV2 Scoring(
        ModifierPerformer performer,
        string rule,
        ModifierResolution resolution,
        ModifierRewardKind reward,
        ModifierFormulaReference formula
    ) => new(
        ModifierBehaviorSchemaVersions.V2,
        ModifierBehaviorKind.Scoring,
        ModifierPhase.Result,
        performer,
        true,
        rule,
        ModifierStackingPolicy.IndependentInstances,
        resolution,
        reward,
        formula
    );
}
