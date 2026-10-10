export type Status = 'pago' | 'atrasado' | 'pendente';

export type Resumo = {
	total: number;
	pago: number;
	faltaPagar: number;
	atrasado: number;
};

const MES_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

export function hojeISO(agora = new Date()): string {
	const m = String(agora.getMonth() + 1).padStart(2, '0');
	const d = String(agora.getDate()).padStart(2, '0');
	return `${agora.getFullYear()}-${m}-${d}`;
}

export function mesDe(dataISO: string): string {
	return dataISO.slice(0, 7);
}

export function mesValido(mes: string | null | undefined): mes is string {
	return !!mes && MES_RE.test(mes);
}

export function deslocarMes(mes: string, delta: number): string {
	const [ano, m] = mes.split('-').map(Number);
	const indice = ano * 12 + (m - 1) + delta;
	return `${Math.floor(indice / 12)}-${String((indice % 12) + 1).padStart(2, '0')}`;
}

/** Data de vencimento no mês; dia 31 em fevereiro vira o último dia do mês. */
export function vencimentoNoMes(mes: string, dia: number): string {
	const [ano, m] = mes.split('-').map(Number);
	const ultimoDia = new Date(ano, m, 0).getDate();
	return `${mes}-${String(Math.min(dia, ultimoDia)).padStart(2, '0')}`;
}

/** Vencimentos de N parcelas mensais. O dia vem sempre da data original (31/01 → 28/02 → 31/03). */
export function vencimentosParcelas(primeiroVencimento: string, parcelas: number): string[] {
	const mesInicial = mesDe(primeiroVencimento);
	const dia = Number(primeiroVencimento.slice(8, 10));
	return Array.from({ length: parcelas }, (_, i) =>
		vencimentoNoMes(deslocarMes(mesInicial, i), dia)
	);
}

/** Meses (YYYY-MM) do mês atual até dezembro, se `ano` for o ano de `hoje`; senão, nenhum. */
export function mesesRestantes(ano: number, hoje: string): string[] {
	if (Number(hoje.slice(0, 4)) !== ano) return [];
	const atual = Number(hoje.slice(5, 7));
	return Array.from(
		{ length: 13 - atual },
		(_, i) => `${ano}-${String(atual + i).padStart(2, '0')}`
	);
}

export function statusDe(l: { pagoEm: string | null; vencimento: string }, hoje: string): Status {
	if (l.pagoEm) return 'pago';
	return l.vencimento < hoje ? 'atrasado' : 'pendente';
}

export function resumir(
	lancamentos: { valor: number; pagoEm: string | null; vencimento: string }[],
	hoje: string
): Resumo {
	const r: Resumo = { total: 0, pago: 0, faltaPagar: 0, atrasado: 0 };
	for (const l of lancamentos) {
		r.total += l.valor;
		const status = statusDe(l, hoje);
		if (status === 'pago') r.pago += l.valor;
		else {
			r.faltaPagar += l.valor;
			if (status === 'atrasado') r.atrasado += l.valor;
		}
	}
	return r;
}

export type MesResumo = Resumo & { mes: string; qtd: number };

/** Os 12 meses do ano, sempre presentes (mês sem lançamentos vem zerado). */
export function resumoPorMes(
	lancamentos: { valor: number; pagoEm: string | null; vencimento: string }[],
	ano: number,
	hoje: string
): MesResumo[] {
	return Array.from({ length: 12 }, (_, i) => {
		const mes = `${ano}-${String(i + 1).padStart(2, '0')}`;
		const doMes = lancamentos.filter((l) => mesDe(l.vencimento) === mes);
		return { mes, qtd: doMes.length, ...resumir(doMes, hoje) };
	});
}

export type LinhaCategoria = { categoriaId: string | null; porMes: number[]; total: number };

/** Categoria × mês (índice 0 = janeiro), da categoria mais cara para a mais barata. */
export function matrizCategorias(
	lancamentos: { valor: number; categoriaId: string | null; vencimento: string }[],
	ano: number
): LinhaCategoria[] {
	const mapa = new Map<string | null, number[]>();
	for (const l of lancamentos) {
		if (!l.vencimento.startsWith(`${ano}-`)) continue;
		const linha = mapa.get(l.categoriaId) ?? Array<number>(12).fill(0);
		linha[Number(l.vencimento.slice(5, 7)) - 1] += l.valor;
		mapa.set(l.categoriaId, linha);
	}
	return [...mapa]
		.map(([categoriaId, porMes]) => ({
			categoriaId,
			porMes,
			total: porMes.reduce((a, b) => a + b, 0)
		}))
		.sort((a, b) => b.total - a.total);
}

export type TotalCategoria = { categoriaId: string | null; total: number };

/** Soma por categoria (null = sem categoria), do maior para o menor. */
export function totaisPorCategoria(
	lancamentos: { valor: number; categoriaId: string | null }[]
): TotalCategoria[] {
	const mapa = new Map<string | null, number>();
	for (const l of lancamentos) mapa.set(l.categoriaId, (mapa.get(l.categoriaId) ?? 0) + l.valor);
	return [...mapa]
		.map(([categoriaId, total]) => ({ categoriaId, total }))
		.sort((a, b) => b.total - a.total);
}

const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

export function formatarCentavos(centavos: number): string {
	return brl.format(centavos / 100);
}

/** Aceita "1.234,56", "1234,56" ou "1234.56". Retorna centavos ou null se inválido. */
export function parseCentavos(texto: string): number | null {
	let s = texto.trim().replace(/^R\$\s*/, '');
	if (!s) return null;
	if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.');
	if (!/^\d+(\.\d{1,2})?$/.test(s)) return null;
	return Math.round(parseFloat(s) * 100);
}

export function nomeDoMes(mes: string): string {
	const [ano, m] = mes.split('-').map(Number);
	const nome = new Date(ano, m - 1, 1).toLocaleDateString('pt-BR', {
		month: 'long',
		year: 'numeric'
	});
	return nome.charAt(0).toUpperCase() + nome.slice(1);
}
