using backend.Domain.GameModifiers;

namespace Backend.Tests.Unit.Domain.GameModifiers;

public sealed class ModifierBehaviorV2ContractTests
{
    private static readonly string[] BuiltInCodes =
    [
        BuiltInModifierBehaviorCatalog.Chirik,
        BuiltInModifierBehaviorCatalog.Zhazhda,
        BuiltInModifierBehaviorCatalog.Rashodnik,
        BuiltInModifierBehaviorCatalog.Trupy,
        BuiltInModifierBehaviorCatalog.Navyki,
        BuiltInModifierBehaviorCatalog.Patron,
        BuiltInModifierBehaviorCatalog.Prokaznik,
        BuiltInModifierBehaviorCatalog.Diareya,
        BuiltInModifierBehaviorCatalog.Mentorbait,
        BuiltInModifierBehaviorCatalog.Kep,
        BuiltInModifierBehaviorCatalog.Feyerverk,
        BuiltInModifierBehaviorCatalog.Krysa,
        BuiltInModifierBehaviorCatalog.Shot,
        BuiltInModifierBehaviorCatalog.Podem,
        BuiltInModifierBehaviorCatalog.Hard75
    ];

    [Fact]
    public void BuiltInCatalog_EveryBehaviorRoundTripsThroughStrictV2Codec()
    {
        Assert.Equal(15, BuiltInCodes.Distinct(StringComparer.Ordinal).Count());

        foreach (var code in BuiltInCodes)
        {
            var item = BuiltInModifierBehaviorCatalog.Get(code);
            var json = ModifierBehaviorV2Json.Serialize(item);
            var roundTripped = ModifierBehaviorV2Json.Deserialize(json);

            Assert.Equal(item, roundTripped);
        }
    }

    [Fact]
    public void StrictCodec_WhenPayloadContainsUnknownField_FailsClosed()
    {
        var behavior = BuiltInModifierBehaviorCatalog.Get(
            BuiltInModifierBehaviorCatalog.Chirik
        );
        var json = ModifierBehaviorV2Json.Serialize(behavior);
        var tampered = json.Replace(
            "\"schemaVersion\":2",
            "\"schemaVersion\":2,\"unknown\":true",
            StringComparison.Ordinal
        );

        Assert.False(ModifierBehaviorV2Json.TryDeserialize(tampered, out var parsed));
        Assert.Null(parsed);
    }

    [Fact]
    public void StrictCodec_WhenJsonbMovesFormulaDiscriminatorAfterRate_Deserializes()
    {
        var behavior = BuiltInModifierBehaviorCatalog.Get(
            BuiltInModifierBehaviorCatalog.Hard75
        );
        var json = ModifierBehaviorV2Json.Serialize(behavior);
        var jsonbOrdered = json.Replace(
            "\"parameters\":{\"type\":\"cardPercentPerUnit\",\"rate\":0.75}",
            "\"parameters\":{\"rate\":0.75,\"type\":\"cardPercentPerUnit\"}",
            StringComparison.Ordinal
        );

        Assert.NotEqual(json, jsonbOrdered);
        Assert.Equal(behavior, ModifierBehaviorV2Json.Deserialize(jsonbOrdered));
    }

    [Fact]
    public void BuiltInCatalog_UsesOnlyTheGenericVersionedFormulaReferences()
    {
        var formulas = BuiltInCodes
            .Select(code => BuiltInModifierBehaviorCatalog.Get(code).FormulaReference)
            .Where(reference => reference is not null)
            .Select(reference => (reference!.Code, reference.Version))
            .Distinct()
            .OrderBy(value => value.Code, StringComparer.Ordinal)
            .ToArray();

        Assert.Equal(
            [
                (ModifierFormulaCodes.BonusKillsPerUnit, 1),
                (ModifierFormulaCodes.CardPercentPerUnit, 1),
                (ModifierFormulaCodes.KillValueIncreasePerUnit, 1)
            ],
            formulas
        );
    }

    [Fact]
    public void BuiltInCatalog_ZhazhdaExplainsTheApprovedPlayerCalculation()
    {
        var behavior = BuiltInModifierBehaviorCatalog.Get(
            BuiltInModifierBehaviorCatalog.Zhazhda
        );
        var formula = Assert.IsType<KillValueIncreasePerUnitParameters>(
            behavior.FormulaReference?.Parameters
        );

        Assert.Contains("1 убийство - +5 очков", behavior.Rule, StringComparison.Ordinal);
        Assert.Contains("2 - по 10 очков за каждое", behavior.Rule, StringComparison.Ordinal);
        Assert.Contains("3 - по 15 очков за каждое", behavior.Rule, StringComparison.Ordinal);
        Assert.Contains("3 убийства дают суммарно +45 очков", behavior.Rule, StringComparison.Ordinal);
        Assert.Contains("штраф 25 очков", behavior.Rule, StringComparison.Ordinal);
        Assert.Contains("Вторая активация удваивает бонус или штраф", behavior.Rule, StringComparison.Ordinal);
        Assert.Equal(5, formula.IncrementPointsPerUnit);
        Assert.Equal(25, formula.ZeroCountPenaltyPoints);
    }

    [Fact]
    public void BuiltInCatalog_PinsApprovedStackingSemanticsForRuleModifiers()
    {
        var chirik = BuiltInModifierBehaviorCatalog.Get(BuiltInModifierBehaviorCatalog.Chirik);
        var rashodnik = BuiltInModifierBehaviorCatalog.Get(BuiltInModifierBehaviorCatalog.Rashodnik);
        var navyki = BuiltInModifierBehaviorCatalog.Get(BuiltInModifierBehaviorCatalog.Navyki);
        var prokaznik = BuiltInModifierBehaviorCatalog.Get(BuiltInModifierBehaviorCatalog.Prokaznik);

        Assert.Equal(ModifierStackingPolicy.AggregateParameters, chirik.StackingPolicy);
        Assert.Equal(60, chirik.DurationSecondsPerActivation);
        Assert.Contains("за каждую активацию", chirik.Rule, StringComparison.OrdinalIgnoreCase);

        Assert.Equal(ModifierStackingPolicy.AggregateParameters, rashodnik.StackingPolicy);
        Assert.Contains("один расходник", rashodnik.Rule, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("за каждую активацию", rashodnik.Rule, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("каждый участник команды", rashodnik.Rule, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("или добавить один расходник в свободный слот", rashodnik.Rule, StringComparison.OrdinalIgnoreCase);

        Assert.Equal(ModifierStackingPolicy.AggregateParameters, navyki.StackingPolicy);
        Assert.Contains("По умолчанию доступно 10 очков навыков", navyki.Rule, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("Каждая активация уменьшает количество доступных очков навыков на 2 очка", navyki.Rule, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("Снижения от всех активаций складываются", navyki.Rule, StringComparison.OrdinalIgnoreCase);

        Assert.Equal(ModifierStackingPolicy.AggregateParameters, prokaznik.StackingPolicy);
        Assert.Equal(300, prokaznik.DurationSecondsPerActivation);
        Assert.Contains("в течение 5 минут", prokaznik.Rule, StringComparison.OrdinalIgnoreCase);
    }
}
