namespace backend.Domain.Persistence;

public static class SlotAvailabilityValue
{
    public const string Public = "public";
    public const string Reserved = "reserved";

    public static string CheckSqlAllowed { get; } =
        $"\"Availability\" IN ('{Public}','{Reserved}')";
}
