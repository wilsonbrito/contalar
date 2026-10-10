import { integer, primaryKey, sqliteTable, text } from 'drizzle-orm/sqlite-core';

const id = () =>
	text('id')
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID());

export const categoria = sqliteTable('categoria', {
	id: id(),
	nome: text('nome').notNull().unique(),
	cor: text('cor').notNull().default('#64748b')
});

// Regra de recorrência: gera um lançamento por mês enquanto estiver ativa.
export const contaFixa = sqliteTable('conta_fixa', {
	id: id(),
	nome: text('nome').notNull(),
	categoriaId: text('categoria_id').references(() => categoria.id),
	valorPadrao: integer('valor_padrao').notNull(),
	diaVencimento: integer('dia_vencimento').notNull(),
	// Primeiro mês (YYYY-MM) em que a conta passa a ser gerada.
	inicio: text('inicio').notNull(),
	ativa: integer('ativa', { mode: 'boolean' }).notNull().default(true)
});

// Valores em centavos (inteiro). Datas em ISO 'YYYY-MM-DD'. Status é derivado de pagoEm + vencimento.
export const lancamento = sqliteTable('lancamento', {
	id: id(),
	descricao: text('descricao').notNull(),
	valor: integer('valor').notNull(),
	vencimento: text('vencimento').notNull(),
	pagoEm: text('pago_em'),
	categoriaId: text('categoria_id').references(() => categoria.id),
	contaFixaId: text('conta_fixa_id').references(() => contaFixa.id),
	parcelaAtual: integer('parcela_atual'),
	parcelaTotal: integer('parcela_total'),
	observacao: text('observacao')
});

// Meses (YYYY-MM) em que o usuário apagou a conta gerada por uma conta fixa; a geração os pula.
export const fixaIgnorada = sqliteTable(
	'fixa_ignorada',
	{
		contaFixaId: text('conta_fixa_id')
			.notNull()
			.references(() => contaFixa.id),
		mes: text('mes').notNull()
	},
	(t) => [primaryKey({ columns: [t.contaFixaId, t.mes] })]
);

export type Categoria = typeof categoria.$inferSelect;
export type ContaFixa = typeof contaFixa.$inferSelect;
export type Lancamento = typeof lancamento.$inferSelect;
