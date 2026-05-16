# syntax=docker/dockerfile:1

FROM node:22-bookworm-slim AS frontend-build
WORKDIR /src

COPY frontend/package*.json ./frontend/
RUN cd frontend && npm ci

COPY frontend ./frontend
RUN mkdir -p backend/RateOple \
    && cd frontend \
    && npm run build:backend

FROM mcr.microsoft.com/dotnet/sdk:9.0 AS backend-build
WORKDIR /src

COPY backend/RateOple/RateOple.csproj ./backend/RateOple/
COPY backend/RateOple.Core/RateOple.Core.csproj ./backend/RateOple.Core/
COPY backend/RateOple.Infrastructure/RateOple.Infrastructure.csproj ./backend/RateOple.Infrastructure/
COPY backend/RateOple.Constants/RateOple.Constants.csproj ./backend/RateOple.Constants/
RUN dotnet restore backend/RateOple/RateOple.csproj

COPY backend ./backend
COPY --from=frontend-build /src/backend/RateOple/wwwroot ./backend/RateOple/wwwroot
RUN dotnet publish backend/RateOple/RateOple.csproj \
    --configuration Release \
    --no-restore \
    --output /app/publish \
    /p:UseAppHost=false \
    -maxcpucount:1

FROM mcr.microsoft.com/dotnet/aspnet:9.0 AS runtime
WORKDIR /app

ENV ASPNETCORE_ENVIRONMENT=Production
ENV PORT=8080

EXPOSE 8080

COPY --from=backend-build /app/publish ./

ENTRYPOINT ["sh", "-c", "ASPNETCORE_URLS=http://0.0.0.0:${PORT} exec dotnet RateOple.dll"]
