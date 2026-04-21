# Docker and Hostinger Deployment

## Local run

1. Copy the environment template:

```powershell
Copy-Item .env.example .env
```

2. Update `.env` with your real values.

3. Start the stack:

```powershell
docker compose up -d --build
```

Default local URLs:

- Frontend: `http://localhost`
- API: `http://127.0.0.1:5256`
- SQL Server: `127.0.0.1,1433`

## Hostinger Ubuntu 24 deployment

1. Connect to the server:

```bash
ssh root@187.124.119.164
```

2. Install Git if needed:

```bash
sudo apt update
sudo apt install -y git
```

3. Clone the repository and move into it:

```bash
git clone https://github.com/Devops-xds/Xds-Approval.git
cd Xds-Approval
```

4. Create the production environment file:

```bash
cp .env.example .env
nano .env
```

Recommended production values:

- `APP_BASE_URL=http://187.124.119.164` or `https://your-domain.com`
- `MSSQL_SA_PASSWORD=` a strong SQL password
- `JWT_KEY=` a long random secret
- `WEB_PORT=80`
- `API_BIND_ADDRESS=127.0.0.1`
- `DB_BIND_ADDRESS=127.0.0.1`

5. Build and start the containers:

```bash
docker compose up -d --build
```

6. Check container status:

```bash
docker compose ps
docker compose logs -f api
```

7. If Ubuntu firewall is enabled, allow web traffic:

```bash
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
```

## Updates

```bash
git pull
docker compose up -d --build
```

## Stop or reset

Stop containers:

```bash
docker compose down
```

Stop and delete volumes too:

```bash
docker compose down -v
```

## Notes

- The frontend proxies `/api` to the API container through Nginx.
- The API and SQL Server are bound to `127.0.0.1` by default, so they are not exposed publicly on the VPS.
- The API runs EF Core migrations automatically on startup.
- Uploaded files and generated PDF documents are stored in Docker volumes.
- If you later add an external reverse proxy for HTTPS, keep `WEB_PORT=80` and point the proxy to this container.
