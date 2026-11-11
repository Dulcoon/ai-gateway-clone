# Lintas AI Gateway

**Lintas AI Gateway** adalah platform routing dan proxy AI multi-provider terpusat. Mengeskpos satu endpoint standar kompatibel OpenAI (`/v1/*`) yang meneruskan request ke berbagai AI provider (OpenAI, Anthropic, Google Gemini, DeepSeek, xAI Grok, dll) dengan fitur format translation, streaming SSE, serta **automatic fallback** (failover otomatis saat terjadi timeout, 429, atau 5xx).

Sesuai spesifikasi **Lintas AI Functional Specification Document (FSD Bagian 2.1)**:
> *"Lintas AI Gateway bersifat generik: hanya meneruskan request, tidak mengenal konsep bot. Layanan Chatbot dan platform produk hidup sebagai microservice/aplikasi terpisah yang memanggil Gateway ini melalui jaringan internal."*

---

## 🌟 Arsitektur & Alur Request

```text
[ Layanan Chatbot / Microservice Produk ]
                    │
                    │ POST /v1/chat/completions (Bearer Gateway API Key)
                    ▼
     ┌──────────────────────────────┐
     │      LINTAS AI GATEWAY       │
     │  • Otentikasi API Key        │
     │  • Combos & Failover Logic   │
     │  • SSE Streaming Passthrough │
     │  • Metrik Latensi & Token    │
     └──────────────┬───────────────┘
                    │
      ┌─────────────┼─────────────┐
      ▼             ▼             ▼
 [ OpenAI ]   [ Anthropic ]  [ Google ] ... (40+ Providers)
```

1. **Proxy Endpoint Kompatibel OpenAI (`/v1/*`):**
   * `POST /v1/chat/completions`: Mendukung parameter `stream: true/false`, format tools/function calling, dan multimodal image.
   * `GET /v1/models`: Mengembalikan daftar model aktif dari seluruh provider yang terhubung.
2. **Failover Otomatis (Combos / Fallback):**
   * Berpindah otomatis ke provider/model cadangan bila provider utama mengalami timeout, rate limit (429), atau error server (5xx).
3. **Penyimpanan Terpusat PostgreSQL:**
   * Kredensial provider, API key gateway, konfigurasi fallback, dan log agregasi disimpan di database PostgreSQL menggunakan **Prisma ORM v7**.
4. **Keamanan Internal (GW-09):**
   * Gateway dirancang untuk beroperasi di dalam jaringan privat (internal/VPN/allowlist), melayani request dari service backend/Chatbot tanpa diekspos langsung ke publik.

---

## 🛠️ Tech Stack

* **Runtime & Server:** Next.js (App Router, Node.js >= 20)
* **Routing & Streaming Engine:** `open-sse` (Provider-agnostic SSE engine)
* **Database & ORM:** PostgreSQL + Prisma ORM v7 (Driver Adapter `@prisma/adapter-pg` + `pg`)
* **Styling & Dashboard UI:** Tailwind CSS, Material Symbols

---

## 🚀 Setup & Deployment (Native)

### 1. Prasyarat
* **Node.js:** `>= 20.0.0`
* **PostgreSQL:** `>= 14.0` (aktif di port `5432`)

### 2. Konfigurasi Environment
Salin template environment:
```bash
cp .env.example .env
```
Sesuaikan nilai di `.env`:
```env
DATABASE_URL="postgresql://lintas:password_rahasia@localhost:5432/lintas_ai_gateway?schema=public"
JWT_SECRET=rahasia-string-acak-panjang
INITIAL_PASSWORD=admin-password-dashboard
PORT=20127
```

> **Tip PostgreSQL Native Linux:** Buat database & user baru jika dibutuhkan:
> ```sql
> CREATE DATABASE lintas_ai_gateway;
> CREATE USER lintas WITH ENCRYPTED PASSWORD 'password_rahasia';
> GRANT ALL PRIVILEGES ON DATABASE lintas_ai_gateway TO lintas;
> ALTER DATABASE lintas_ai_gateway OWNER TO lintas;
> ```

### 3. Setup & Jalankan

#### Mode Development (Lokal)
```bash
npm install
npm run db:migrate
npm run dev
```

#### Mode Production (VPS Linux / PM2)
```bash
npm install
npm run db:migrate
npm run build
pm2 start custom-server.js --name "lintas-ai"
pm2 save
# (Atau jika tanpa PM2: npm start)
```

Cek status kesehatan server:
```bash
curl http://localhost:20127/health
# Output: {"status":"healthy","database":"connected"}
```

* **Dashboard Admin:** [http://localhost:20127/dashboard](http://localhost:20127/dashboard)
* **Endpoint Chat:** `http://localhost:20127/v1/chat/completions`

---

### 🌐 Konfigurasi Nginx Reverse Proxy
Matikan buffering agar streaming respons AI (Server-Sent Events) lancar kata demi kata:

```nginx
location / {
    proxy_pass http://127.0.0.1:20127;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;

    # Wajib untuk AI Streaming (SSE passthrough)
    proxy_buffering off;
    proxy_cache off;
    proxy_read_timeout 600s;
}
```

---

## 📡 Integrasi Klien / Microservice Chatbot

Untuk memanggil Lintas AI Gateway dari microservice Chatbot atau backend platform Anda:

```bash
curl http://localhost:20127/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <GATEWAY_API_KEY>" \
  -d '{
    "model": "gpt-4o",
    "messages": [
      { "role": "system", "content": "You are a helpful assistant." },
      { "role": "user", "content": "Halo Lintas AI!" }
    ],
    "stream": true
  }'
```

---

## 📄 Lisensi
Hak Cipta © 2026 Lintas AI. Berlisensi di bawah lisensi MIT.
