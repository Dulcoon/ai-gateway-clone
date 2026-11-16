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

Sesuaikan nilai di `.env` sesuai kebutuhan server Anda:
```env
# Database Connection (PostgreSQL - Prisma ORM)
DATABASE_URL="postgresql://lintas:password_rahasia@localhost:5432/lintas_ai_gateway?schema=public"

# Keamanan & Admin Dashboard
JWT_SECRET=lintas-ai-change-this-to-a-long-random-secret-string
INITIAL_PASSWORD=admin-password-dashboard
AUTH_COOKIE_SECURE=false

# Direktori Data Lokal (pastikan writable)
DATA_DIR=./data

# Server Runtime
PORT=20127
HOSTNAME=0.0.0.0
NODE_ENV=production

# Konfigurasi Domain / URL Gateway
BASE_URL=http://localhost:20127
NEXT_PUBLIC_BASE_URL=http://localhost:20127

# Pengamanan Endpoint AI Gateway
REQUIRE_API_KEY=false
```

#### 📋 Panduan Variabel Environment 

| Variabel | Tipe / Default | Keterangan & Rekomendasi Production |
|---|---|---|
| `DATABASE_URL` | String | Connection string PostgreSQL untuk Prisma ORM. Format: `postgresql://<user>:<password>@<host>:<port>/<dbname>?schema=public`. |
| `JWT_SECRET` | String (Acak) | Kunci enkripsi token sesi login admin dashboard. **Wajib diubah** ke string acak panjang di production. |
| `INITIAL_PASSWORD` | String | Password login default saat pertama kali setup dashboard. Dapat diubah langsung setelah login. |
| `AUTH_COOKIE_SECURE` | Boolean (`false`) | Ubah ke `true` jika server diakses menggunakan **HTTPS / SSL**. Tetap `false` jika menggunakan HTTP biasa / IP lokal. |
| `DATA_DIR` | Path (`./data`) | Lokasi file runtime lokal (cache token-saver, machine-id, certs). Pastikan user PM2/systemd memiliki izin tulis (*write access*). |
| `PORT` | Number (`20127`) | Port listener server aplikasi. |
| `HOSTNAME` | IP (`0.0.0.0`) | Bind address. `0.0.0.0` memastikan server dapat menerima trafik dari Nginx / reverse proxy lokal. |
| `NODE_ENV` | Enum (`production`) | Gunakan `production` di VPS/server untuk performa maksimal dan caching Next.js. |
| `BASE_URL` | URL | URL root server (misal: `https://ai-proxy.perusahaan.com` atau `http://localhost:20127`). Digunakan untuk callback & navigasi. |
| `NEXT_PUBLIC_BASE_URL` | URL | Harus bernilai sama dengan `BASE_URL`, diakses oleh komponen frontend dashboard. |
| `REQUIRE_API_KEY` | Boolean (`false`) | Jika `true`, memanggil endpoint `/v1/*` wajib menyertakan `Authorization: Bearer <KEY>`. |


> **💡 Panduan Setup Database PostgreSQL (Wajib Hak Akses Schema & Tabel):**
> Di PostgreSQL (terutama versi 15 & 16 ke atas), hak akses harus diberikan hingga ke tingkat **schema `public`** dan **tabel**, bukan hanya di tingkat database saja, agar Prisma tidak mengalami error `User was denied access`:
> ```sql
> -- 1. Buat database dan user baru
> CREATE DATABASE lintas_ai_gateway;
> CREATE USER lintas WITH ENCRYPTED PASSWORD 'password_rahasia';
> ALTER DATABASE lintas_ai_gateway OWNER TO lintas;
> GRANT ALL PRIVILEGES ON DATABASE lintas_ai_gateway TO lintas;
> 
> -- 2. Pindah ke database tersebut (Wajib!)
> \c lintas_ai_gateway
> 
> -- 3. Berikan hak akses penuh pada schema public & tabel (Wajib untuk Prisma ORM)
> GRANT ALL ON SCHEMA public TO lintas;
> GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO lintas;
> GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO lintas;
> ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO lintas;
> ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO lintas;
> ```
> *Catatan: Jika nama database mengandung tanda strip/minus (misalnya `"stg-routeright"`), selalu apit nama database dengan tanda kutip ganda.*

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
