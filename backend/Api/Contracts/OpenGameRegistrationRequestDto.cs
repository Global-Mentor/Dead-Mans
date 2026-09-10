using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace backend.Api.Contracts;

public sealed record OpenGameRegistrationRequestDto(
    [property: JsonRequired] Guid GameId,
    [Range(1, int.MaxValue)] int ExpectedVersion
);
