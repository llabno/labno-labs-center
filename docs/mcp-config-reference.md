# MCP Config Reference — Cross-Machine Consistency

## Current Machine: MSI Intel / Windows 11

- **Hostname:** MSI
- **OS:** Windows 11 Pro 10.0.26200
- **Node:** v24.14.0
- **NPM:** 11.9.0
- **Claude Code settings:** `C:\Users\lance\.claude\settings.json`

## Claude Code Settings (must match on both machines)

```json
{
  "permissions": {
    "additionalDirectories": [
      "C:\\Users\\lance\\dev\\labno-labs-center",
      "C:\\Users\\lance\\dev\\design-to-code-app"
    ]
  }
}
```

## Required Vercel Env Vars (Production)

| Variable | Purpose | Required |
|----------|---------|----------|
| `SUPABASE_URL` | Supabase project URL | Yes |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-side DB access | Yes |
| `SUPABASE_ANON_KEY` | Public/RLS-gated access | Yes |
| `VITE_SUPABASE_URL` | Frontend Supabase URL | Yes |
| `VITE_SUPABASE_ANON_KEY` | Frontend auth | Yes |
| `ANTHROPIC_API_KEY` | Oracle RAG + agent dispatch | Yes |
| `ANTHROPIC_SNIPER_KEY` | Blog Sniper agent | Yes |
| `CRON_SECRET` | Vercel cron job auth | Yes |
| `OPENAI_API_KEY` | pgvector embeddings (V1.1) | No |
| `GEMINI_API_KEY` | Memory consolidation daemon | No |

## Local Dev Env Files

| File | Purpose | Committed |
|------|---------|-----------|
| `.env.local` | Local dev (pulled from Vercel) | NO |
| `.env.prod` | Reference copy of prod vars | NO |
| `.env.example` | Template documenting all vars | YES |

## Cross-Machine Sync Checklist

When switching between M2 Air and MSI Intel:

1. `git pull` on the target machine
2. `npx vercel env pull .env.local` to sync env vars
3. Verify `~/.claude/settings.json` has same `additionalDirectories`
4. Run `npm install` if `package-lock.json` changed
5. Test: `curl http://localhost:5173` (Vite dev server)

## Security Notes

- `.env.prod` and `.env.vercel` are in `.gitignore` — never commit
- Vercel encrypts all env vars at rest
- Key rotation checklist is in `.env.example`
- Budget enforcer caps agent API spend at $25/mo
