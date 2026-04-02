# Labno Labs Center — Environment Setup Runbook

**Purpose:** Get any machine from zero to running dev server in under 10 minutes.
**Works on:** M2 MacBook Air (ARM), MSI PRO DP21 (x86), GitHub Codespaces

---

## Option 1: Local Setup (Recommended)

### Prerequisites
- Node.js 20+ (`node --version`)
- npm 10+ (`npm --version`)
- Git (`git --version`)
- Python 3.10+ (for API routes: `python3 --version`)
- Vercel CLI access (authenticated via `npx vercel login`)
- GitHub CLI (`gh auth login`)

### Steps

```bash
# 1. Clone
cd ~/dev  # or C:\Users\lance\dev on Windows
git clone https://github.com/llabno/labno-labs-center.git
cd labno-labs-center

# 2. Install dependencies
npm install
pip install -r api/requirements.txt  # optional, for Python API routes

# 3. Link Vercel and pull env vars
npx vercel link --project labno-labs-center --scope labno-labs --yes
npx vercel env pull .env.local --yes

# 4. Start dev server
npm run dev
# → http://localhost:5173/
```

### Post-setup verification
- [ ] `http://localhost:5173/` loads the login page
- [ ] Google OAuth redirects and authenticates
- [ ] Mission Control shows projects with tier view
- [ ] Clicking a project opens the 6-column Kanban board
- [ ] Work History page shows completed cases

---

## Option 2: GitHub Codespaces

1. Go to [github.com/llabno/labno-labs-center](https://github.com/llabno/labno-labs-center)
2. Click **Code → Codespaces → Create codespace on main**
3. Wait for devcontainer to build (~2-3 minutes)
4. Env vars pull automatically via `postStartCommand`
5. Run `npm run dev` in the terminal
6. Codespace forwards port 5173 automatically

**Note:** Codespace sessions expire after 30 minutes of inactivity. Commit and push before stepping away.

---

## Option 3: Cursor IDE

Open the project in Cursor. It reads `.devcontainer/devcontainer.json` for extension recommendations. Run the same local setup steps above.

---

## Environment Variables

All env vars are stored in Vercel and pulled via `npx vercel env pull .env.local`. **Never commit .env.local** — it's in .gitignore.

Key vars (see `.env.example` for full list):

| Variable | Source | Purpose |
|----------|--------|---------|
| `VITE_SUPABASE_URL` | Vercel | Frontend Supabase client |
| `VITE_SUPABASE_ANON_KEY` | Vercel | Frontend auth + queries |
| `SUPABASE_SERVICE_ROLE_KEY` | Vercel (server only) | API routes that bypass RLS |
| `ANTHROPIC_API_KEY` | Vercel | Agent task execution |
| `CRON_SECRET` | Vercel | Agent cron processor auth |

---

## Machine-Specific Notes

### MSI PRO DP21 (Windows 11, x86_64)
- Shell: Git Bash (MINGW64)
- Node: v24.14.0
- Dev path: `C:\Users\lance\dev\labno-labs-center`
- Google Drive backup: `g:\My Drive\0 Antigravity\Labno Labs Center`
- **Do NOT run npm from Google Drive** — file sync breaks node_modules

### M2 MacBook Air (macOS, ARM)
- Shell: zsh
- Dev path: `~/dev/labno-labs-center`
- **Watch for ARM vs x86 native module issues** — if `npm install` fails on a native module, try `npm install --force` or delete `node_modules` and reinstall
- Google Drive backup: `~/Google Drive/My Drive/0 Antigravity/Labno Labs Center`

---

## Keeping Environments in Sync

### After every work session:
1. Commit and push to GitHub (source of truth)
2. On the other machine: `git pull && npm install`

### If env vars change:
1. Update in Vercel dashboard
2. On each machine: `npx vercel env pull .env.local --yes`

### If dependencies change:
1. `npm install` pulls from `package-lock.json` — identical on both machines
2. If lock file conflicts: delete `node_modules` and `package-lock.json`, then `npm install`

### Monthly sync check:
1. Compare `node --version` and `npm --version` across machines
2. Run `npm ci` (clean install from lockfile) on both
3. Verify dev server starts on both machines
4. Update this runbook if anything changed

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| `npm install` fails with native module error | Delete `node_modules`, run `npm install --force` |
| Vite dev server won't start | Check if port 5173 is in use: `lsof -i :5173` (Mac) or `netstat -ano | findstr 5173` (Win) |
| Google OAuth redirect fails | Verify redirect URL in Supabase dashboard matches current dev URL |
| Supabase queries return 401 | Re-pull env vars: `npx vercel env pull .env.local --yes` |
| "Cannot find module" after git pull | Run `npm install` — new dependencies were added |
| Python API routes fail | Run `pip install -r api/requirements.txt` |
