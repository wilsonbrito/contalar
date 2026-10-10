import { describe, expect, it } from 'vitest';
import { backupsParaRemover } from './backup';

describe('backupsParaRemover', () => {
	const nomes = [
		'local-2026-10-03.db',
		'local-2026-10-01.db',
		'local-2026-10-02.db',
		'outro-2026-09-01.db',
		'notas.txt'
	];

	it('remove os mais antigos além do limite', () => {
		expect(backupsParaRemover(nomes, 'local', 2)).toEqual(['local-2026-10-01.db']);
	});
	it('não remove nada dentro do limite', () => {
		expect(backupsParaRemover(nomes, 'local', 3)).toEqual([]);
	});
	it('ignora arquivos de outras bases', () => {
		expect(backupsParaRemover(nomes, 'local', 0)).not.toContain('outro-2026-09-01.db');
	});
});
