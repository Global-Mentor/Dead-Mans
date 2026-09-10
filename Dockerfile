# syntax=docker/dockerfile:1.7

FROM node:22.23.2-alpine3.24 AS frontend-build
WORKDIR /src/frontend

COPY frontend/package.json frontend/package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci

COPY frontend/ ./
RUN npm run build

FROM mcr.microsoft.com/dotnet/sdk:10.0.400-alpine3.23 AS backend-build
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

FROM mcr.microsoft.com/dotnet/aspnet:10.0.11-alpine3.23 AS runtime
WORKDIR /app
ARG RELEASE_SHA=local

ENV ASPNETCORE_ENVIRONMENT=Production \
    ASPNETCORE_HTTP_PORTS=8080 \
    DOTNET_EnableDiagnostics=0

RUN apk add --no-cache curl krb5-libs \
    && mkdir -p /var/lib/deadmans/keys \
    && chown -R app:app /var/lib/deadmans \
    && printf '%s' "$RELEASE_SHA" > /app/release-sha

COPY --from=backend-build --chown=app:app /out/ ./
COPY --from=frontend-build --chown=app:app /src/frontend/dist/ ./wwwroot/

USER app
EXPOSE 8080
VOLUME ["/var/lib/deadmans/keys"]

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
    CMD probe_host="${CanonicalUrl__Origin#https://}" \
    && wget -q --spider --header "Host: ${probe_host%/}" http://127.0.0.1:8080/health/ready || exit 1

ENTRYPOINT ["dotnet", "backend.dll"]
