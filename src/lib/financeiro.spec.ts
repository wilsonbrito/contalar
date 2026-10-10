import { describe, expect, it } from 'vitest';
import {
	deslocarMes,
	matrizCategorias,
	mesesRestantes,
	mesValido,
	parseCentavos,
	resumir,
	resumoPorMes,
	statusDe,
	totaisPorCategoria,
	vencimentoNoMes,
	vencimentosParcelas
} from './financeiro';

describe('deslocarMes', () => {
	it('vira o ano nos dois sentidos', () => {
		expect(deslocarMes('2026-12', 1)).toBe('2027-01');
		expect(deslocarMes('2026-01', -1)).toBe('2025-12');
		expect(deslocarMes('2026-10', 0)).toBe('2026-10');
	});
});

describe('vencimentoNoMes', () => {
	it('ajusta dia inexistente para o último dia do mês', () => {
		expect(vencimentoNoMes('2026-02', 31)).toBe('2026-02-28');
		expect(vencimentoNoMes('2028-02', 30)).toBe('2028-02-29');
		expect(vencimentoNoMes('2026-04', 31)).toBe('2026-04-30');
		expect(vencimentoNoMes('2026-10', 5)).toBe('2026-10-05');
	});
});

describe('vencimentosParcelas', () => {
	it('uma parcela mantém a data', () => {
		expect(vencimentosParcelas('2026-10-15', 1)).toEqual(['2026-10-15']);
	});
	it('vira o ano', () => {
		expect(vencimentosParcelas('2026-11-10', 3)).toEqual([
			'2026-11-10',
			'2026-12-10',
			'2027-01-10'
		]);
	});
	it('dia 31 volta ao 31 quando o mês comporta', () => {
		expect(vencimentosParcelas('2026-01-31', 3)).toEqual([
			'2026-01-31',
			'2026-02-28',
			'2026-03-31'
		]);
	});
});

describe('mesesRestantes', () => {
	it('do mês atual até dezembro, só no ano corrente', () => {
		expect(mesesRestantes(2026, '2026-10-10')).toEqual(['2026-10', '2026-11', '2026-12']);
		expect(mesesRestantes(2026, '2026-12-31')).toEqual(['2026-12']);
		expect(mesesRestantes(2026, '2026-01-01')).toHaveLength(12);
	});
	it('nenhum para outro ano', () => {
		expect(mesesRestantes(2025, '2026-10-10')).toEqual([]);
		expect(mesesRestantes(2027, '2026-10-10')).toEqual([]);
	});
});

describe('mesValido', () => {
	it('valida YYYY-MM', () => {
		expect(mesValido('2026-10')).toBe(true);
		expect(mesValido('2026-13')).toBe(false);
		expect(mesValido('2026-1')).toBe(false);
		expect(mesValido(null)).toBe(false);
	});
});

describe('statusDe', () => {
	const hoje = '2026-10-10';
	it('pago prevalece sobre vencimento', () => {
		expect(statusDe({ pagoEm: '2026-10-01', vencimento: '2026-09-01' }, hoje)).toBe('pago');
	});
	it('vence hoje ainda é pendente', () => {
		expect(statusDe({ pagoEm: null, vencimento: '2026-10-10' }, hoje)).toBe('pendente');
	});
	it('vencido sem pagamento é atrasado', () => {
		expect(statusDe({ pagoEm: null, vencimento: '2026-10-09' }, hoje)).toBe('atrasado');
	});
});

describe('resumir', () => {
	it('soma por status', () => {
		const r = resumir(
			[
				{ valor: 10000, pagoEm: '2026-10-02', vencimento: '2026-10-05' },
				{ valor: 5000, pagoEm: null, vencimento: '2026-10-08' },
				{ valor: 2500, pagoEm: null, vencimento: '2026-10-20' }
			],
			'2026-10-10'
		);
		expect(r).toEqual({ total: 17500, pago: 10000, faltaPagar: 7500, atrasado: 5000 });
	});
});

describe('totaisPorCategoria', () => {
	it('agrupa, inclui sem categoria e ordena do maior para o menor', () => {
		expect(
			totaisPorCategoria([
				{ valor: 1000, categoriaId: 'a' },
				{ valor: 5000, categoriaId: null },
				{ valor: 2000, categoriaId: 'a' },
				{ valor: 500, categoriaId: 'b' }
			])
		).toEqual([
			{ categoriaId: null, total: 5000 },
			{ categoriaId: 'a', total: 3000 },
			{ categoriaId: 'b', total: 500 }
		]);
	});
	it('lista vazia', () => {
		expect(totaisPorCategoria([])).toEqual([]);
	});
});

describe('resumoPorMes', () => {
	const ls = [
		{ valor: 10000, pagoEm: '2026-01-05', vencimento: '2026-01-05' },
		{ valor: 5000, pagoEm: null, vencimento: '2026-01-20' },
		{ valor: 7000, pagoEm: null, vencimento: '2026-03-10' },
		{ valor: 999, pagoEm: null, vencimento: '2027-01-10' }
	];
	it('sempre devolve 12 meses, com os vazios zerados', () => {
		const r = resumoPorMes(ls, 2026, '2026-02-15');
		expect(r).toHaveLength(12);
		expect(r[1]).toMatchObject({ mes: '2026-02', qtd: 0, total: 0 });
	});
	it('separa pago, a pagar e atrasado por mês e ignora outros anos', () => {
		const r = resumoPorMes(ls, 2026, '2026-02-15');
		expect(r[0]).toMatchObject({
			qtd: 2,
			total: 15000,
			pago: 10000,
			faltaPagar: 5000,
			atrasado: 5000
		});
		expect(r[2]).toMatchObject({ total: 7000, atrasado: 0 });
		expect(r.reduce((s, m) => s + m.total, 0)).toBe(22000);
	});
});

describe('matrizCategorias', () => {
	it('soma por categoria e mês, ordena pelo total e ignora outros anos', () => {
		const r = matrizCategorias(
			[
				{ valor: 100, categoriaId: 'a', vencimento: '2026-01-10' },
				{ valor: 300, categoriaId: 'a', vencimento: '2026-03-10' },
				{ valor: 900, categoriaId: null, vencimento: '2026-03-12' },
				{ valor: 777, categoriaId: 'a', vencimento: '2027-01-10' }
			],
			2026
		);
		expect(r.map((l) => [l.categoriaId, l.total])).toEqual([
			[null, 900],
			['a', 400]
		]);
		expect(r[1].porMes[0]).toBe(100);
		expect(r[1].porMes[2]).toBe(300);
		expect(r[1].porMes).toHaveLength(12);
	});
});

describe('parseCentavos', () => {
	it('entende formatos brasileiros e simples', () => {
		expect(parseCentavos('1.234,56')).toBe(123456);
		expect(parseCentavos('R$ 89,9')).toBe(8990);
		expect(parseCentavos('1234.5')).toBe(123450);
		expect(parseCentavos('100')).toBe(10000);
	});
	it('rejeita lixo', () => {
		expect(parseCentavos('')).toBeNull();
		expect(parseCentavos('abc')).toBeNull();
		expect(parseCentavos('-5')).toBeNull();
	});
});
