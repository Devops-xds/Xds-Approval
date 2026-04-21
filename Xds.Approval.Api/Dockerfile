FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

COPY Xds.Approval.Api/Xds.Approval.Api.csproj Xds.Approval.Api/
RUN dotnet restore Xds.Approval.Api/Xds.Approval.Api.csproj

COPY Xds.Approval.Api/ Xds.Approval.Api/
RUN dotnet publish Xds.Approval.Api/Xds.Approval.Api.csproj -c Release -o /app/publish /p:UseAppHost=false

FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS final
WORKDIR /app

COPY --from=build /app/publish .

EXPOSE 8080

ENTRYPOINT ["dotnet", "Xds.Approval.Api.dll"]
