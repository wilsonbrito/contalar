import { mkdirSync, readdirSync, rmSync } from 'node:fs';
import { basename, dirname, extname, join, resolve } from 'node:path';
import type Database from 'better-sqlite3';
import { hojeISO } from '../../financeiro';

const MANTER = 30;

/** Nomes são `<base>-YYYY-MM-DD.db`, então ordem alfabética = ordem cronológica. */
export function backupsParaRemover(nomes: string[], base: string, manter = MANTER): string[] {
	const meus = nomes.filter((n) => n.startsWith(`${base}-`) && n.endsWith('.db')).sort();
	return meus.slice(0, Math.max(0, meus.length - manter));
}

/** No máximo um backup por dia, ao subir o app. Falha de backup nunca derruba o app. */
export function backupDiario(client: Database.Database, caminhoDb: string) {
	try {
		const arquivo = resolve(caminhoDb);
		const base = basename(arquivo, extname(arquivo));
		const pasta = join(dirname(arquivo), 'backups');
		mkdirSync(pasta, { recursive: true });

		const destino = join(pasta, `${base}-${hojeISO()}.db`);
		if (readdirSync(pasta).includes(basename(destino))) return;

		client
			.backup(destino)
			.then(() => {
				for (const antigo of backupsParaRemover(readdirSync(pasta), base)) {
					rmSync(join(pasta, antigo));
				}
			})
			.catch((e) => console.error('Falha no backup do banco:', e));
	} catch (e) {
		console.error('Falha no backup do banco:', e);
	}
}
