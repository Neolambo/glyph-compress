# Credentials

**No secret value appears in this repository, and none ever should.** This file explains where they live and how they are used.

## Where they live

```
C:\Users\dede7\.glyph-secrets\credentials.env
```

Deliberately **outside** the project tree. This repository takes around twenty commits a day, many of them via `git add -A`, and pushes to a public remote — a secrets file inside it is not a question of whether it leaks but when. A path outside the working tree is invisible to git regardless of what any command stages.

`.gitignore` also carries patterns for `*.env`, `*secret*`, `*credential*`, `*.pem` and `*.key`. That is a second line of defence for the case where something lands in the tree anyway, not the primary control.

## Format

```
KEY=value
```

No quotes, no spaces around `=`. Keys currently expected:

| Key | Used by |
| --- | --- |
| `ANTHROPIC_API_KEY` | `test/comprehension-check-anthropic.js` |
| `OPENAI_API_KEY` | `test/comprehension-check-openai.js`, `doctor` |
| `GEMINI_API_KEY` | `test/comprehension-check-gemini.js` |
| `COMPOSIO_API_KEY` | YouTube publishing via the Composio API |
| `NPM_TOKEN` | only if `npm whoami` stops working; normally the local login suffices |
| `VSCE_PAT` | Marketplace publishing. Needs Organization **All accessible organizations** and scope **Marketplace → Manage** — a token scoped to a single organization produces `TF400813`, which reads like an authorisation failure and is really a scoping mistake |

## Loading them

PowerShell, for the current session only:

```powershell
Get-Content "$env:USERPROFILE\.glyph-secrets\credentials.env" |
  Where-Object { $_ -match '^\s*[A-Z_]+=.+' } |
  ForEach-Object { $p = $_ -split '=', 2; [Environment]::SetEnvironmentVariable($p[0].Trim(), $p[1].Trim(), 'Process') }
```

Bash:

```bash
set -a; . "$HOME/.glyph-secrets/credentials.env"; set +a
```

Both set the variables for the running shell and nothing else. Do not add them to a persistent profile: a key in `$PROFILE` or in the user environment is readable by every process on the machine and outlives the reason it was added.

## Rules that come from things that actually happened here

**A key pasted into a chat transcript is compromised.** Not "risky" — compromised, because the transcript is stored, may be reviewed, and is outside anyone's control once sent. Rotate it and put the new value here; never copy the pasted one into this store, which would give a burned credential a permanent home.

**Never commit a key even for a moment.** `git rm` does not remove it — the object stays in history and on every clone and fork. Recovering means rewriting history and force-pushing, and the key is still burned. Rotation is the only real remedy, so the only cheap moment is before the commit.

**Prefer the tool's own login.** `npm whoami` and `gh auth status` already work on this machine without any token in a file. A credential that does not need to exist is the only kind that cannot leak.
