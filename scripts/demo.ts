// Preenche um banco com uma família FICTÍCIA, para conhecer o Contalar sem digitar nada
// (e para gerar os prints da documentação). Apaga tudo no banco indicado e recria.
//   npm run demo        -> cria/recria demo.db
//   npm run demo:dev    -> abre o app usando demo.db
import { basename } from 'node:path';
import Database from 'better-sqlite3';
import { deslocarMes, hojeISO, vencimentoNoMes } from '../src/lib/financeiro.ts';

const caminho = process.env.DATABASE_URL ?? 'demo.db';
if (basename(caminho) === 'local.db')
	throw new Error('Recusando apagar local.db: use outro banco (ex.: demo.db).');

const db = new Database(caminho);
db.pragma('foreign_keys = ON');

const hoje = hojeISO();
const ano = hoje.slice(0, 4);
const mesAtual = hoje.slice(0, 7);
const diaHoje = Number(hoje.slice(8, 10));

// Gerador pseudoaleatório fixo: a demo é sempre igual para a mesma data.
let semente = 42;
const aleatorio = () => (semente = (semente * 1664525 + 1013904223) % 4294967296) / 4294967296;
const variar = (centavos: number, pct: number) =>
	Math.round(centavos * (1 + pct * (aleatorio() * 2 - 1)));

const CATEGORIAS: [string, string][] = [
	['Moradia', '#0ea5e9'],
	['Contas de consumo', '#f59e0b'],
	['Mercado', '#22c55e'],
	['Transporte', '#8b5cf6'],
	['Saúde', '#ef4444'],
	['Educação', '#14b8a6'],
	['Lazer', '#ec4899'],
	['Outros', '#64748b']
];

// nome, categoria, valor (centavos), dia, variação
const FIXAS: [string, string, number, number, number][] = [
	['Aluguel', 'Moradia', 185000, 5, 0],
	['Condomínio', 'Moradia', 52000, 10, 0.05],
	['Luz', 'Contas de consumo', 24000, 15, 0.25],
	['Água', 'Contas de consumo', 9800, 12, 0.2],
	['Internet', 'Contas de consumo', 12990, 8, 0],
	['Plano de saúde', 'Saúde', 41000, 10, 0],
	['Escola', 'Educação', 95000, 5, 0],
	['Streaming', 'Lazer', 5590, 18, 0],
	['Seguro do carro', 'Transporte', 19000, 3, 0],
	['Feira e mercado', 'Mercado', 120000, 20, 0.15],
	['Fatura do cartão', 'Outros', 210000, 25, 0.3]
];

// Esta fica sem pagar no mês atual para o status "atrasado" aparecer na demo.
const ATRASADA_NA_DEMO = 'Seguro do carro';

db.transaction(() => {
	for (const t of ['fixa_ignorada', 'lancamento', 'conta_fixa', 'categoria'])
		db.prepare(`delete from ${t}`).run();

	const idCategoria = new Map<string, string>();
	for (const [nome, cor] of CATEGORIAS) {
		const id = crypto.randomUUID();
		idCategoria.set(nome, id);
		db.prepare('insert into categoria (id, nome, cor) values (?, ?, ?)').run(id, nome, cor);
	}

	const inserir = db.prepare(
		`insert into lancamento (id, descricao, valor, vencimento, pago_em, categoria_id, conta_fixa_id, parcela_atual, parcela_total)
		 values (?, ?, ?, ?, ?, ?, ?, ?, ?)`
	);
	// Pago se o vencimento já passou (ou é hoje); o resto fica pendente.
	const pagoEm = (vencimento: string) => (vencimento <= hoje ? vencimento : null);

	// Contas fixas: regra + um lançamento por mês, de janeiro até o mês atual.
	for (const [nome, cat, valor, dia, variacao] of FIXAS) {
		const idFixa = crypto.randomUUID();
		db.prepare(
			'insert into conta_fixa (id, nome, categoria_id, valor_padrao, dia_vencimento, ativa, inicio) values (?, ?, ?, ?, ?, 1, ?)'
		).run(idFixa, nome, idCategoria.get(cat), valor, dia, `${ano}-01`);

		for (let m = 1; m <= Number(mesAtual.slice(5, 7)); m++) {
			const mes = `${ano}-${String(m).padStart(2, '0')}`;
			const vencimento = vencimentoNoMes(mes, dia);
			const deixarAtrasada = nome === ATRASADA_NA_DEMO && mes === mesAtual && dia < diaHoje;
			inserir.run(
				crypto.randomUUID(),
				nome,
				variar(valor, variacao),
				vencimento,
				deixarAtrasada ? null : pagoEm(vencimento),
				idCategoria.get(cat),
				idFixa,
				null,
				null
			);
		}
	}

	// Compras parceladas.
	const parcelado = (
		nome: string,
		cat: string,
		valor: number,
		total: number,
		inicio: string,
		dia: number
	) => {
		for (let i = 0; i < total; i++) {
			const vencimento = vencimentoNoMes(deslocarMes(inicio, i), dia);
			inserir.run(
				crypto.randomUUID(),
				nome,
				valor,
				vencimento,
				pagoEm(vencimento),
				idCategoria.get(cat),
				null,
				i + 1,
				total
			);
		}
	};
	parcelado('Notebook', 'Outros', 38990, 10, deslocarMes(mesAtual, -3), 20);
	parcelado('Geladeira', 'Moradia', 28900, 12, `${ano}-02`, 15);

	// Contas avulsas.
	const avulsa = (nome: string, cat: string, valor: number, mes: string, dia: number) => {
		const vencimento = vencimentoNoMes(mes, dia);
		inserir.run(
			crypto.randomUUID(),
			nome,
			valor,
			vencimento,
			pagoEm(vencimento),
			idCategoria.get(cat),
			null,
			null,
			null
		);
	};
	avulsa('IPVA', 'Transporte', 124000, `${ano}-03`, 15);
	avulsa('Dentista', 'Saúde', 35000, `${ano}-05`, 9);
	avulsa('Presente de aniversário', 'Lazer', 18000, `${ano}-07`, 22);
	avulsa('Revisão do carro', 'Transporte', 72000, deslocarMes(mesAtual, -1), 18);
})();

const n = (db.prepare('select count(*) n from lancamento').get() as { n: number }).n;
console.log(`Demo criada em ${caminho}: ${n} lançamentos de uma família fictícia (${ano}).`);
console.log('Para abrir:  npm run demo:dev');
