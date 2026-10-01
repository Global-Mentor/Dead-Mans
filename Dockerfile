# syntax=docker/dockerfile:1.7

FROM node:22.23.2-alpine3.24 AS frontend-build
WORKDIR /src/frontend

COPY frontend/package.json frontend/package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci

COPY frontend/ ./
ARG VITE_PUBLIC_ORIGIN=https://deadman.bug.community
RUN VITE_PUBLIC_ORIGIN="$VITE_PUBLIC_ORIGIN" npm run build

FROM mcr.microsoft.com/dotnet/sdk:10.0.400-noble AS backend-build
WORKDIR /src

COPY global.json .editorconfig ./
COPY backend/*.csproj backend/Directory.Build.props backend/Directory.Packages.props backend/backend.slnx ./backend/
RUN --mount=type=cache,target=/root/.nuget/packages \
    dotnet restore backend/backend.csproj

COPY backend/ ./backend/
RUN --mount=type=cache,target=/root/.nuget/packages \
    dotnet publish backend/backend.csproj \
    --configuration Release \
    --no-restore \
    --output /out \
    /p:UseAppHost=false

FROM mcr.microsoft.com/dotnet/aspnet:10.0.11-noble AS runtime
WORKDIR /app
ARG RELEASE_SHA=local

ENV ASPNETCORE_ENVIRONMENT=Production \
    ASPNETCORE_HTTP_PORTS=8080 \
    DOTNET_EnableDiagnostics=0 \
    DOTNET_DbgEnableMiniDump=1 \
    DOTNET_EnableCrashReportOnly=1 \
    DOTNET_DbgMiniDumpName=/var/lib/deadmans/diagnostics/last-crash \
    Serilog__Using__1=Serilog.Sinks.File \
    Serilog__WriteTo__1__Name=File \
    Serilog__WriteTo__1__Args__path=/var/lib/deadmans/diagnostics/app-.clef \
    Serilog__WriteTo__1__Args__formatter="Serilog.Formatting.Compact.CompactJsonFormatter, Serilog.Formatting.Compact" \
    Serilog__WriteTo__1__Args__rollingInterval=Day \
    Serilog__WriteTo__1__Args__fileSizeLimitBytes=5242880 \
    Serilog__WriteTo__1__Args__rollOnFileSizeLimit=true \
    Serilog__WriteTo__1__Args__retainedFileCountLimit=6 \
    Serilog__WriteTo__1__Args__shared=true

RUN apt-get update \
    && apt-get install -y --no-install-recommends curl libgssapi-krb5-2 \
    && rm -rf /var/lib/apt/lists/* \
    && mkdir -p /var/lib/deadmans/keys /var/lib/deadmans/diagnostics \
    && chown -R app:app /var/lib/deadmans \
    && chmod 700 /var/lib/deadmans/diagnostics \
    && printf '%s' "$RELEASE_SHA" > /app/release-sha

COPY --from=backend-build --chown=app:app /out/ ./
COPY --from=frontend-build --chown=app:app /src/frontend/dist/ ./wwwroot/

USER app
EXPOSE 8080
VOLUME ["/var/lib/deadmans/keys", "/var/lib/deadmans/diagnostics"]

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
    CMD probe_host="${CanonicalUrl__Origin#https://}" \
    && curl --fail --silent --show-error --max-time 4 \
        --header "Host: ${probe_host%/}" http://127.0.0.1:8080/health/ready || exit 1

ENTRYPOINT ["dotnet", "backend.dll"]
