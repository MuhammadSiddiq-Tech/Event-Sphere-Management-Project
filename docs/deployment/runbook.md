# EventSphere — Deployment Runbook

> **Version:** 1.0 · **Last Updated:** November 2026  
> **Project:** EventSphere Management (Aptech eProject)  
> **Stack:** React 18 + Vite 5 (client) · Plain Node.js native http (server) · MongoDB · Socket.IO

---

## 1. Prerequisites

| Tool | Minimum Version | Check |
|------|----------------|-------|
| Node.js | 20 LTS | `node --version` |
| npm | 10+ | `npm --version` |
| Git | 2.40+ | `git --version` |
| MongoDB | 6+ (or Atlas) | `mongod --version` |
| Docker | 24+ (optional) | `docker --version` |

---

## 2. Environment Variables

Create `server/.env` based on `server/.env.example`:

| Variable | Example | Description |
|----------|---------|-------------|
| `NODE_ENV` | `production` | Environment mode |
| `PORT` | `5000` | API server port |
| `MONGO_URI` | `mongodb+srv://...` | MongoDB connection string |
| `JWT_SECRET` | `<64-char-random>` | Access token signing secret |
| `JWT_REFRESH_SECRET` | `<64-char-random>` | Refresh token signing secret |
| `JWT_EXPIRES_IN` | `15m` | Access token TTL |
| `REFRESH_TOKEN_EXPIRES_IN` | `7d` | Refresh token TTL |
| `BCRYPT_ROUNDS` | `12` | bcrypt hashing rounds |
| `CORS_ORIGIN` | `https://yourdomain.com` | Allowed CORS origin |
| `SMTP_HOST` | `smtp.gmail.com` | SMTP server host |
| `SMTP_PORT` | `587` | SMTP port |
| `SMTP_USER` | `noreply@yourdomain.com` | SMTP username |
| `SMTP_PASS` | `<app-password>` | SMTP password / app key |
| `SMTP_FROM` | `"EventSphere <noreply@eventsphere.com>"` | From display name |
| `LOG_LEVEL` | `info` | Pino log level |
| `RATE_LIMIT_WINDOW_MS` | `900000` | Rate limit window (15 min) |
| `RATE_LIMIT_MAX` | `100` | Max requests per window |
| `CLOUDINARY_CLOUD_NAME` | _(optional)_ | Cloudinary cloud name |
| `CLOUDINARY_API_KEY` | _(optional)_ | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | _(optional)_ | Cloudinary API secret |

> [!IMPORTANT]
> Generate strong secrets: `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"`

---

## 3. Local Development Setup

```bash
# 1. Clone the repository
git clone https://github.com/MuhammadSiddiq-Tech/Event-Sphere-Management-Project.git
cd "Event-Sphere-Management-Project"

# 2. Install all dependencies (monorepo)
npm install          # Windows: npm.cmd install

# 3. Configure environment
cp server/.env.example server/.env
# Edit server/.env with your values (at minimum: MONGO_URI, JWT_SECRET, JWT_REFRESH_SECRET)

# 4. Seed the database with demo accounts
npm run seed         # Windows: npm.cmd run seed

# 5. Start development servers (runs client + server concurrently)
npm run dev          # Windows: npm.cmd run dev
# API  → http://localhost:5000
# SPA  → http://localhost:5173
```

### Demo Credentials

| Role | Email | Password |
|------|-------|----------|
| Admin | `admin@eventsphere.test` | `Admin@1234` |
| Exhibitor | `exhibitor@eventsphere.test` | `Exhibitor@1234` |
| Attendee | `attendee@eventsphere.test` | `Attendee@1234` |

---

## 4. Production Deployment — VPS (Ubuntu/Debian)

### 4.1 Build Client

```bash
cd client
npm.cmd run build
# Output: client/dist/  (static files ready to serve)
```

### 4.2 Install PM2

```bash
npm install -g pm2
```

### 4.3 PM2 Ecosystem File

Create `ecosystem.config.cjs` at the project root:

```js
module.exports = {
  apps: [{
    name: 'eventsphere-api',
    script: './server/src/index.js',
    cwd: '/var/www/eventsphere',
    instances: 'max',
    exec_mode: 'cluster',
    env_production: {
      NODE_ENV: 'production',
      PORT: 5000,
    },
  }],
};
```

```bash
pm2 start ecosystem.config.cjs --env production
pm2 save
pm2 startup   # follow the output command to enable on boot
```

### 4.4 Nginx Reverse Proxy

```nginx
# /etc/nginx/sites-available/eventsphere
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;

    ssl_certificate     /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    # Serve React SPA
    root /var/www/eventsphere/client/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # Proxy API + Socket.IO to Node.js
    location /api/ {
        proxy_pass         http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header   Upgrade $http_upgrade;
        proxy_set_header   Connection 'upgrade';
        proxy_set_header   Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    location /socket.io/ {
        proxy_pass         http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header   Upgrade $http_upgrade;
        proxy_set_header   Connection 'upgrade';
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/eventsphere /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
# SSL with Certbot
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

---

## 5. MongoDB Atlas Setup

1. Create account at [cloud.mongodb.com](https://cloud.mongodb.com)
2. Create a new **M0 Free Tier** cluster (or M10+ for production)
3. Database Access → Add Database User (username + strong password)
4. Network Access → Add IP Address (`0.0.0.0/0` for all, or restrict to your server IP)
5. Clusters → Connect → Drivers → Copy connection string
6. Paste into `server/.env` as `MONGO_URI=mongodb+srv://user:pass@cluster.mongodb.net/eventsphere`

---

## 6. Docker Deployment

### Dockerfile (server)

```dockerfile
FROM node:20-alpine AS base
WORKDIR /app
COPY package*.json ./
COPY server/package*.json ./server/
RUN npm ci --workspace=server --omit=dev

FROM base AS server
COPY server/ ./server/
EXPOSE 5000
CMD ["node", "server/src/index.js"]
```

### docker-compose.yml

```yaml
version: '3.9'
services:
  api:
    build:
      context: .
      target: server
    ports:
      - "5000:5000"
    environment:
      NODE_ENV: production
      MONGO_URI: mongodb://mongo:27017/eventsphere
      JWT_SECRET: ${JWT_SECRET}
      JWT_REFRESH_SECRET: ${JWT_REFRESH_SECRET}
      CORS_ORIGIN: http://localhost
    depends_on:
      - mongo
    restart: unless-stopped

  mongo:
    image: mongo:6
    volumes:
      - mongo_data:/data/db
    restart: unless-stopped

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
    volumes:
      - ./client/dist:/usr/share/nginx/html:ro
      - ./nginx.conf:/etc/nginx/conf.d/default.conf:ro
    depends_on:
      - api
    restart: unless-stopped

volumes:
  mongo_data:
```

```bash
# Build and start
docker compose up -d --build

# Seed database
docker compose exec api node server/seed/index.js
```

---

## 7. Environment Checklist

| Item | Development | Staging | Production |
|------|-------------|---------|------------|
| `NODE_ENV` | `development` | `staging` | `production` |
| MongoDB | Local / Docker | Atlas M0 | Atlas M10+ |
| JWT secrets | Any | Strong | 64+ char random |
| SMTP | MailHog | Mailtrap | Gmail/SendGrid |
| CORS_ORIGIN | `http://localhost:5173` | staging URL | production URL |
| LOG_LEVEL | `debug` | `info` | `warn` |
| Rate limiting | Disabled | Enabled | Enabled strict |
| SSL/HTTPS | No | Optional | Required |

---

## 8. Post-Deploy Smoke Tests

Run these checks after every deployment:

- [ ] `GET https://yourdomain.com/health` → `{"status":"ok"}`
- [ ] Login as `admin@eventsphere.test` / `Admin@1234` → Admin dashboard loads
- [ ] Login as `exhibitor@eventsphere.test` / `Exhibitor@1234` → Exhibitor dashboard loads
- [ ] Login as `attendee@eventsphere.test` / `Attendee@1234` → Attendee dashboard loads
- [ ] Create a new Expo as Admin → appears in public list
- [ ] WebSocket: open two browser tabs, trigger notification → real-time update on second tab
- [ ] Check server logs: `pm2 logs eventsphere-api` → no ERROR level entries

---

## 9. Rollback Procedure

```bash
# View recent deployments (git log)
git log --oneline -10

# Rollback to previous commit
git checkout <previous-commit-hash>
npm.cmd run build  # rebuild client
pm2 restart eventsphere-api

# Or rollback with PM2 deploy
pm2 deploy ecosystem.config.cjs production revert 1
```

---

## 10. Backup & Restore

### MongoDB Atlas Automated Backups
- Atlas M10+ clusters include **continuous cloud backups**
- Navigate: Clusters → Backup → take On-Demand Snapshot
- Restore: Backup → Restore → Point-in-time

### Manual Backup (Local/VPS)

```bash
# Backup
mongodump --uri="mongodb://localhost:27017/eventsphere" --out=./backup/$(date +%Y%m%d)

# Restore
mongorestore --uri="mongodb://localhost:27017/eventsphere" ./backup/20261112/eventsphere/
```
