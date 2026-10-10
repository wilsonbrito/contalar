import { gerarFixasPrevistas, listarAno, listarCategorias } from '../../lib/server/db/queries';
import { hojeISO, matrizCategorias, mesDe, resumir, resumoPorMes } from '../../lib/financeiro';
import type { PageServerLoad } from './$types';

// No ano corrente, gera as contas fixas dos meses que faltam (previsão com valor estimado);
// é idempotente. Em outros anos, só lê o que já foi lançado.
export const load: PageServerLoad = ({ url }) => {
	const hoje = hojeISO();
	const param = Number(url.searchParams.get('ano'));
	const ano =
		Number.isInteger(param) && param >= 2000 && param <= 2100 ? param : Number(hoje.slice(0, 4));

	gerarFixasPrevistas(ano, hoje);
	const lancamentos = listarAno(ano);
	const porId = new Map(listarCategorias().map((c) => [c.id, c]));

	return {
		ano,
		mesAtual: mesDe(hoje),
		meses: resumoPorMes(lancamentos, ano, hoje),
		linhas: matrizCategorias(lancamentos, ano).map((l) => ({
			...l,
			categoria: l.categoriaId ? (porId.get(l.categoriaId) ?? null) : null
		})),
		resumo: resumir(lancamentos, hoje)
	};
};
