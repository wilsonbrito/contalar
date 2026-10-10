import { and, asc, eq, gt, gte, isNotNull, isNull, lt, lte } from 'drizzle-orm';
import { db } from './index';
import { categoria, contaFixa, fixaIgnorada, lancamento } from './schema';
import {
	deslocarMes,
	hojeISO,
	mesDe,
	mesesRestantes,
	vencimentoNoMes,
	vencimentosParcelas
} from '../../financeiro';

const CATEGORIAS_PADRAO = [
	{ nome: 'Moradia', cor: '#0ea5e9' },
	{ nome: 'Contas de consumo', cor: '#f59e0b' },
	{ nome: 'Mercado', cor: '#22c55e' },
	{ nome: 'Transporte', cor: '#8b5cf6' },
	{ nome: 'Saúde', cor: '#ef4444' },
	{ nome: 'Educação', cor: '#14b8a6' },
	{ nome: 'Lazer', cor: '#ec4899' },
	{ nome: 'Outros', cor: '#64748b' }
];

export function listarCategorias() {
	const existentes = db.select().from(categoria).orderBy(asc(categoria.nome)).all();
	if (existentes.length > 0) return existentes;
	db.insert(categoria).values(CATEGORIAS_PADRAO).onConflictDoNothing().run();
	return db.select().from(categoria).orderBy(asc(categoria.nome)).all();
}

export function listarMes(mes: string) {
	return db
		.select()
		.from(lancamento)
		.where(
			and(
				gte(lancamento.vencimento, `${mes}-01`),
				lt(lancamento.vencimento, `${deslocarMes(mes, 1)}-01`)
			)
		)
		.orderBy(asc(lancamento.vencimento), asc(lancamento.descricao))
		.all();
}

export function listarAno(ano: number) {
	return db
		.select()
		.from(lancamento)
		.where(
			and(gte(lancamento.vencimento, `${ano}-01-01`), lt(lancamento.vencimento, `${ano + 1}-01-01`))
		)
		.all();
}

type NovoLancamento = {
	descricao: string;
	valor: number;
	vencimento: string;
	categoriaId: string | null;
	observacao: string | null;
};

export function criarLancamento(dados: NovoLancamento) {
	db.insert(lancamento).values(dados).run();
}

/** Cria N parcelas mensais (valor = valor de cada parcela) numa única transação. */
export function criarParcelado(dados: NovoLancamento, parcelas: number) {
	const linhas = vencimentosParcelas(dados.vencimento, parcelas).map((vencimento, i) => ({
		...dados,
		vencimento,
		parcelaAtual: i + 1,
		parcelaTotal: parcelas
	}));
	db.transaction((tx) => {
		tx.insert(lancamento).values(linhas).run();
	});
}

export function atualizarPagamento(id: string, pagoEm: string | null) {
	db.update(lancamento).set({ pagoEm }).where(eq(lancamento.id, id)).run();
}

/**
 * Se a conta veio de uma conta fixa, registra o mês como dispensado; senão o app a geraria de
 * novo ao reabrir o mês. A conta fixa continua valendo para os outros meses.
 */
export function excluirLancamento(id: string) {
	db.transaction((tx) => {
		const l = tx.select().from(lancamento).where(eq(lancamento.id, id)).get();
		if (l?.contaFixaId)
			tx.insert(fixaIgnorada)
				.values({ contaFixaId: l.contaFixaId, mes: mesDe(l.vencimento) })
				.onConflictDoNothing()
				.run();
		tx.delete(lancamento).where(eq(lancamento.id, id)).run();
	});
}

export function atualizarValor(id: string, valor: number) {
	db.update(lancamento).set({ valor }).where(eq(lancamento.id, id)).run();
}

export function listarContasFixas() {
	return db
		.select()
		.from(contaFixa)
		.orderBy(asc(contaFixa.diaVencimento), asc(contaFixa.nome))
		.all();
}

type DadosContaFixa = {
	nome: string;
	categoriaId: string | null;
	valorPadrao: number;
	diaVencimento: number;
};

export function criarContaFixa(dados: DadosContaFixa & { inicio: string }) {
	db.insert(contaFixa).values(dados).run();
}

/**
 * Atualiza a regra e as contas futuras ainda não pagas dela (a previsão). Contas já pagas ou
 * com vencimento até hoje não mudam; o valor/nome só muda se ainda for o estimado antigo,
 * para não sobrescrever um ajuste feito à mão. O dia de vencimento vale só para meses novos.
 */
export function atualizarContaFixa(id: string, dados: DadosContaFixa) {
	db.transaction((tx) => {
		const antiga = tx.select().from(contaFixa).where(eq(contaFixa.id, id)).get();
		tx.update(contaFixa).set(dados).where(eq(contaFixa.id, id)).run();
		if (!antiga) return;

		const previstas = and(
			eq(lancamento.contaFixaId, id),
			isNull(lancamento.pagoEm),
			gt(lancamento.vencimento, hojeISO())
		);
		tx.update(lancamento).set({ categoriaId: dados.categoriaId }).where(previstas).run();
		tx.update(lancamento)
			.set({ valor: dados.valorPadrao })
			.where(and(previstas, eq(lancamento.valor, antiga.valorPadrao)))
			.run();
		tx.update(lancamento)
			.set({ descricao: dados.nome })
			.where(and(previstas, eq(lancamento.descricao, antiga.nome)))
			.run();
	});
}

/** Previsão: gera as contas fixas do mês atual até dezembro (só quando `ano` é o ano corrente). */
export function gerarFixasPrevistas(ano: number, hoje: string) {
	for (const mes of mesesRestantes(ano, hoje)) gerarFixasDoMes(mes);
}

export function definirContaFixaAtiva(id: string, ativa: boolean) {
	db.update(contaFixa).set({ ativa }).where(eq(contaFixa.id, id)).run();
}

// Lançamentos já gerados permanecem, apenas perdem o vínculo com a regra.
export function excluirContaFixa(id: string) {
	db.transaction((tx) => {
		tx.delete(fixaIgnorada).where(eq(fixaIgnorada.contaFixaId, id)).run();
		tx.update(lancamento).set({ contaFixaId: null }).where(eq(lancamento.contaFixaId, id)).run();
		tx.delete(contaFixa).where(eq(contaFixa.id, id)).run();
	});
}

/** Cria o lançamento do mês para cada conta fixa ativa que ainda não tem um. Idempotente. */
export function gerarFixasDoMes(mes: string) {
	db.transaction((tx) => {
		const ativas = tx
			.select()
			.from(contaFixa)
			.where(and(eq(contaFixa.ativa, true), lte(contaFixa.inicio, mes)))
			.all();
		if (ativas.length === 0) return;

		// "já resolvidas" no mês: tem lançamento ou o usuário o apagou de propósito
		const dispensadas = tx
			.select({ contaFixaId: fixaIgnorada.contaFixaId })
			.from(fixaIgnorada)
			.where(eq(fixaIgnorada.mes, mes))
			.all()
			.map((r) => r.contaFixaId);

		const jaGeradas = new Set(
			tx
				.select({ contaFixaId: lancamento.contaFixaId })
				.from(lancamento)
				.where(
					and(
						isNotNull(lancamento.contaFixaId),
						gte(lancamento.vencimento, `${mes}-01`),
						lt(lancamento.vencimento, `${deslocarMes(mes, 1)}-01`)
					)
				)
				.all()
				.map((r) => r.contaFixaId)
				.concat(dispensadas)
		);

		const novas = ativas
			.filter((c) => !jaGeradas.has(c.id))
			.map((c) => ({
				descricao: c.nome,
				valor: c.valorPadrao,
				vencimento: vencimentoNoMes(mes, c.diaVencimento),
				categoriaId: c.categoriaId,
				contaFixaId: c.id
			}));
		if (novas.length > 0) tx.insert(lancamento).values(novas).run();
	});
}
