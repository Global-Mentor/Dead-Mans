using backend.Api.Auth;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;

namespace backend.Api.Realtime;

// This audience receives only invalidations, never panel events or private payloads.
[Authorize(AuthenticationSchemes = GameOverlayAuthenticationHandler.SchemeName)]
public sealed class GameOverlayHub : Hub;
