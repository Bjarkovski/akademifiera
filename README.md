# Akademifiera

Förvandla råa förolämpningar till akademiska, rumsrena formuleringar.

## Snabbstart

### 1. Klona/kopiera projektet till din server

### 2. Installera beroenden
```bash
npm install
```

### 3. Skapa .env-fil
```bash
cp .env.example .env
```
Öppna `.env` och fyll i din Anthropic API-nyckel:
```
ANTHROPIC_API_KEY=sk-ant-...
PORT=3000
```

Skaffa nyckel på: https://console.anthropic.com

### 4. Starta servern
```bash
npm start
```
Appen körs nu på http://localhost:3000

---

## Driftsättning på bjarki.se/akademifiera

Appen behöver köras som en bakgrundsprocess. Rekommenderat verktyg: **PM2**.

### Installera PM2
```bash
npm install -g pm2
```

### Starta med PM2
```bash
pm2 start server.js --name akademifiera
pm2 save
pm2 startup   # Gör att appen startar automatiskt vid omstart
```

### Nginx-konfiguration (för /akademifiera-sökvägen)

Lägg till detta i din Nginx-konfiguration för bjarki.se:

```nginx
location /akademifiera {
    alias /sökväg/till/akademifiera/public;
    try_files $uri $uri/ /akademifiera/index.html;
}

location /akademifiera/api/ {
    rewrite ^/akademifiera/api/(.*) /$1 break;
    proxy_pass http://localhost:3000;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
}
```

**OBS:** Om du kör på en undersökväg (/akademifiera) behöver du uppdatera
fetch-anropet i `public/index.html` från `/akademifiera` till `/akademifiera/api/akademifiera`.

### Alternativ: Kör på port 3000 och proxya hela domänen/subdomänen

```nginx
server {
    listen 80;
    server_name akademifiera.bjarki.se;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

---

## Kostnad

Ungefär $0.001 per akademifiering = över 1 000 översättningar per krona.

## Teknisk stack

- **Backend**: Node.js + Express
- **AI**: Claude Sonnet via Anthropic API
- **Frontend**: Vanilla HTML/CSS/JS (inga beroenden)
