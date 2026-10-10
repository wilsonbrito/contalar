#!/usr/bin/env bash
# Sobe o app de contas: build, servidor local e navegador.
set -euo pipefail

cd "$(dirname "$0")"

PORT="${PORT:-3000}"
export HOST=127.0.0.1 PORT
export DATABASE_URL="${DATABASE_URL:-local.db}"

# O SvelteKit exige Node >= 22.17; usa o do nvm indicado no .nvmrc, se existir.
VERSAO="$(cat .nvmrc 2>/dev/null || true)"
NODE_NVM="$HOME/.nvm/versions/node/v${VERSAO}/bin"
if [ -n "$VERSAO" ] && [ -d "$NODE_NVM" ]; then
	export PATH="$NODE_NVM:$PATH"
fi

MAJOR="$(node -p 'process.versions.node.split(".")[0]')"
if [ "$MAJOR" -lt 22 ]; then
	echo "Node $(node -v) é antigo demais. Instale o Node 22.17+ (nvm install ${VERSAO:-24})." >&2
	exit 1
fi

if [ ! -d node_modules ]; then
	echo "Instalando dependências..."
	npm install
fi

# Cria/atualiza as tabelas do banco (não apaga dados).
npm run db:push --silent -- --force >/dev/null

echo "Gerando build..."
rm -rf build
npm run build --silent >/dev/null

if lsof -iTCP:"$PORT" -sTCP:LISTEN >/dev/null 2>&1; then
	echo "A porta $PORT já está em uso. O app talvez já esteja rodando: http://localhost:$PORT" >&2
	exit 1
fi

# Abre o navegador assim que o servidor responder; depois, com o backup do dia já feito
# pelo app, envia a pasta backups/ ao GitHub (em segundo plano; SEM_ENVIO_BACKUP=1 desliga).
(
	for _ in $(seq 1 50); do
		if curl -s -o /dev/null "http://localhost:$PORT"; then
			open "http://localhost:$PORT" 2>/dev/null || true
			if [ -z "${SEM_ENVIO_BACKUP:-}" ]; then
				sleep 8
				./scripts/enviar-backup.sh >>backups/envio.log 2>&1 || true
			fi
			break
		fi
		sleep 0.2
	done
) &

echo "App em http://localhost:$PORT  (Ctrl+C para parar)"
exec node build
