# Lintas AI — Agent Skills

Drop-in skills for AI agents (Claude Code, Cursor, ChatGPT, custom SDK). Salin tautan skill yang relevan ke agent AI Anda untuk berinteraksi langsung dengan Lintas AI Gateway.

## Skills

| Capability | Deskripsi |
|---|---|
| **Chat / code-gen** | Menggunakan endpoint chat completions Lintas AI |
| **Image generation** | Integrasi generasi gambar melalui provider aktif |
| **Embeddings** | Integrasi teks vektor dan embeddings |
| **Web search & fetch** | Alat bantu browsing dan pengambilan konten |

## Konfigurasi Environment Agent

Tambahkan variabel environment ini di environment shell Anda:

```bash
export LINTAS_AI_URL="http://localhost:20127"   # Port Lintas AI Gateway lokal
export LINTAS_AI_KEY="laig_..."                 # Kunci API dari Dashboard Lintas AI
```

Verifikasi endpoint aktif:
```bash
curl $LINTAS_AI_URL/api/health
```
