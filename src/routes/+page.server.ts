import { fail } from '@sveltejs/kit';
import {
	atualizarPagamento,
	atualizarValor,
	criarLancamento,
	criarParcelado,
	excluirLancamento,
	gerarFixasDoMes,
	listarCategorias,
	listarMes
} from '../lib/server/db/queries';
import {
	hojeISO,
	mesDe,
	mesValido,
	parseCentavos,
	resumir,
	statusDe,
	totaisPorCategoria
} from '../lib/financeiro';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = ({ url }) => {
	const hoje = hojeISO();
	const param = url.searchParams.get('mes');
	const mes = mesValido(param) ? param : mesDe(hoje);

	gerarFixasDoMes(mes);
	const categorias = listarCategorias();
	const porId = new Map(categorias.map((c) => [c.id, c]));
	const lancamentos = listarMes(mes).map((l) => ({
		...l,
		status: statusDe(l, hoje),
		categoria: l.categoriaId ? (porId.get(l.categoriaId) ?? null) : null
	}));

	const porCategoria = totaisPorCategoria(lancamentos).map((t) => ({
		...t,
		categoria: t.categoriaId ? (porId.get(t.categoriaId) ?? null) : null
	}));

	return { mes, hoje, categorias, lancamentos, porCategoria, resumo: resumir(lancamentos, hoje) };
};

const DATA_RE = /^\d{4}-\d{2}-\d{2}$/;

export const actions: Actions = {
	criar: async ({ request }) => {
		const form = await request.formData();
		const descricao = String(form.get('descricao') ?? '').trim();
		const valor = parseCentavos(String(form.get('valor') ?? ''));
		const vencimento = String(form.get('vencimento') ?? '');
		const categoriaId = String(form.get('categoriaId') ?? '') || null;
		const observacao = String(form.get('observacao') ?? '').trim() || null;

		if (!descricao) return fail(400, { erro: 'Informe a descrição.' });
		if (valor === null || valor <= 0) return fail(400, { erro: 'Valor inválido.' });
		if (!DATA_RE.test(vencimento)) return fail(400, { erro: 'Vencimento inválido.' });
		const parcelas = Number(form.get('parcelas') || 1);
		if (!Number.isInteger(parcelas) || parcelas < 1 || parcelas > 120)
			return fail(400, { erro: 'Parcelas deve estar entre 1 e 120.' });

		const dados = { descricao, valor, vencimento, categoriaId, observacao };
		if (parcelas === 1) criarLancamento(dados);
		else criarParcelado(dados, parcelas);
		return { ok: true };
	},

	pagar: async ({ request }) => {
		const form = await request.formData();
		const id = String(form.get('id') ?? '');
		const pagoEm = String(form.get('pagoEm') ?? '') || hojeISO();
		if (!id || !DATA_RE.test(pagoEm)) return fail(400, { erro: 'Dados inválidos.' });

		// Valor real da conta (luz, água...) informado junto com o pagamento; vazio mantém o estimado.
		const textoValor = String(form.get('valor') ?? '').trim();
		if (textoValor) {
			const valor = parseCentavos(textoValor);
			if (valor === null || valor <= 0) return fail(400, { erro: 'Valor inválido.' });
			atualizarValor(id, valor);
		}
		atualizarPagamento(id, pagoEm);
		return { ok: true };
	},

	valor: async ({ request }) => {
		const form = await request.formData();
		const id = String(form.get('id') ?? '');
		const valor = parseCentavos(String(form.get('valor') ?? ''));
		if (!id || valor === null || valor <= 0) return fail(400, { erro: 'Valor inválido.' });
		atualizarValor(id, valor);
		return { ok: true };
	},

	desfazer: async ({ request }) => {
		const id = String((await request.formData()).get('id') ?? '');
		if (!id) return fail(400, { erro: 'Dados inválidos.' });
		atualizarPagamento(id, null);
		return { ok: true };
	},

	excluir: async ({ request }) => {
		const id = String((await request.formData()).get('id') ?? '');
		if (!id) return fail(400, { erro: 'Dados inválidos.' });
		excluirLancamento(id);
		return { ok: true };
	}
};
