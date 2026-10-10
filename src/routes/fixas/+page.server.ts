import { fail } from '@sveltejs/kit';
import {
	atualizarContaFixa,
	criarContaFixa,
	definirContaFixaAtiva,
	excluirContaFixa,
	listarCategorias,
	listarContasFixas
} from '../../lib/server/db/queries';
import { hojeISO, mesDe, parseCentavos } from '../../lib/financeiro';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = () => ({
	categorias: listarCategorias(),
	contas: listarContasFixas()
});

function lerDados(form: FormData) {
	const nome = String(form.get('nome') ?? '').trim();
	const valorPadrao = parseCentavos(String(form.get('valorPadrao') ?? ''));
	const diaVencimento = Number(form.get('diaVencimento'));
	const categoriaId = String(form.get('categoriaId') ?? '') || null;

	if (!nome) return { erro: 'Informe o nome.' };
	if (valorPadrao === null || valorPadrao <= 0) return { erro: 'Valor inválido.' };
	if (!Number.isInteger(diaVencimento) || diaVencimento < 1 || diaVencimento > 31)
		return { erro: 'Dia de vencimento deve estar entre 1 e 31.' };
	return { dados: { nome, valorPadrao, diaVencimento, categoriaId } };
}

export const actions: Actions = {
	criar: async ({ request }) => {
		const r = lerDados(await request.formData());
		if ('erro' in r) return fail(400, { erro: r.erro });
		criarContaFixa({ ...r.dados, inicio: mesDe(hojeISO()) });
		return { ok: true };
	},

	editar: async ({ request }) => {
		const form = await request.formData();
		const id = String(form.get('id') ?? '');
		const r = lerDados(form);
		if (!id) return fail(400, { erro: 'Dados inválidos.' });
		if ('erro' in r) return fail(400, { erro: r.erro });
		atualizarContaFixa(id, r.dados);
		return { ok: true };
	},

	alternar: async ({ request }) => {
		const form = await request.formData();
		const id = String(form.get('id') ?? '');
		if (!id) return fail(400, { erro: 'Dados inválidos.' });
		definirContaFixaAtiva(id, form.get('ativa') === 'true');
		return { ok: true };
	},

	excluir: async ({ request }) => {
		const id = String((await request.formData()).get('id') ?? '');
		if (!id) return fail(400, { erro: 'Dados inválidos.' });
		excluirContaFixa(id);
		return { ok: true };
	}
};
