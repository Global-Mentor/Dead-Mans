namespace backend.Data.Entities;

public sealed class UserRoleAuditEvent
{
    public const string GrantedAction = "granted";
    public const string RevokedAction = "revoked";

    public Guid Id { get; set; }

    public Guid UserId { get; set; }

    public short RoleId { get; set; }

    public Guid? ChangedByUserId { get; set; }

    public string Action { get; set; } = string.Empty;

    public DateTime OccurredAtUtc { get; set; }

    public User User { get; set; } = default!;

    public Role Role { get; set; } = default!;

    public User? ChangedByUser { get; set; }
}
