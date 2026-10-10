#!/usr/bin/env bash
# Envia a pasta backups/ (um repositório git privado próprio) para o GitHub.
# Nunca derruba nada: se falhar (sem internet, etc.), avisa e tenta de novo na próxima vez.
set -u
cd "$(dirname "$0")/../backups" 2>/dev/null || exit 0

if [ ! -d .git ]; then
	echo "backups/ não é um repositório git; nada enviado." >&2
	exit 0
fi

git add -A
if ! git diff --cached --quiet; then
	git commit -q -m "backup $(date '+%Y-%m-%d %H:%M')" || exit 0
fi

# Commits locais que ainda não chegaram ao GitHub (inclui os de um envio anterior que falhou).
pendentes="$(git rev-list --count '@{u}..HEAD' 2>/dev/null || echo 1)"
if [ "$pendentes" = "0" ]; then
	echo "Backup: nada novo para enviar."
	exit 0
fi

if git push -q origin main 2>/dev/null; then
	echo "Backup enviado ao GitHub."
else
	echo "Backup salvo localmente, mas o envio falhou (sem internet?). Tento de novo na próxima vez." >&2
fi
