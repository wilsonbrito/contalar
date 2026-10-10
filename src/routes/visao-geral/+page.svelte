<script lang="ts">
	import { formatarCentavos } from '../../lib/financeiro';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const MESES = [
		'jan',
		'fev',
		'mar',
		'abr',
		'mai',
		'jun',
		'jul',
		'ago',
		'set',
		'out',
		'nov',
		'dez'
	];
	const MESES_LONGO = [
		'Janeiro',
		'Fevereiro',
		'Março',
		'Abril',
		'Maio',
		'Junho',
		'Julho',
		'Agosto',
		'Setembro',
		'Outubro',
		'Novembro',
		'Dezembro'
	];

	// --- indicadores -------------------------------------------------------------------------
	const comLancamentos = $derived(data.meses.filter((m) => m.qtd > 0));
	const media = $derived(
		comLancamentos.length ? Math.round(data.resumo.total / comLancamentos.length) : 0
	);
	const maisPesado = $derived(
		comLancamentos.reduce<(typeof data.meses)[number] | null>(
			(max, m) => (max === null || m.total > max.total ? m : max),
			null
		)
	);

	// --- gráfico (valores em reais) ---------------------------------------------------------
	const W = 720;
	const H = 280;
	const M = { top: 20, right: 8, bottom: 30, left: 52 };
	const plotW = W - M.left - M.right;
	const plotH = H - M.top - M.bottom;
	const slot = plotW / 12;
	const LARGURA_BARRA = 24; // barras finas: nunca preenchem o slot
	const GAP = 2; // espaço de superfície entre segmentos empilhados
	const base = M.top + plotH;

	function escalaBonita(maxReais: number) {
		if (maxReais <= 0) return { passo: 1000, topo: 4000 };
		const bruto = maxReais / 4;
		const mag = 10 ** Math.floor(Math.log10(bruto));
		const passo = [1, 2, 2.5, 5, 10].map((f) => f * mag).find((p) => p >= bruto) ?? 10 * mag;
		return { passo, topo: Math.ceil(maxReais / passo) * passo };
	}

	const escala = $derived(escalaBonita(Math.max(0, ...data.meses.map((m) => m.total)) / 100));
	const ticks = $derived(
		Array.from({ length: Math.round(escala.topo / escala.passo) + 1 }, (_, i) => i * escala.passo)
	);
	const altura = (centavos: number) => (centavos / 100 / escala.topo) * plotH;

	const barras = $derived(
		data.meses.map((m, i) => {
			const hPago = altura(m.pago);
			const hAPagar = altura(m.faltaPagar);
			const x = M.left + i * slot + (slot - LARGURA_BARRA) / 2;
			const folga = hPago > 0 && hAPagar > 0 ? GAP : 0;
			return {
				m,
				i,
				x,
				cx: M.left + i * slot + slot / 2,
				hPago,
				hAPagar,
				yPago: base - hPago,
				yAPagar: base - hPago - folga - hAPagar,
				topo: base - hPago - folga - hAPagar,
				// o segmento de cima é o "fim do dado": cantos de cima arredondados; o de baixo, só se estiver sozinho
				arredondaPago: hAPagar === 0
			};
		})
	);

	/** Retângulo com os 4px de cima arredondados e a base reta. */
	function barraPath(x: number, y: number, w: number, h: number, arredondar: boolean) {
		const r = arredondar ? Math.min(4, h, w / 2) : 0;
		return `M${x},${y + h} V${y + r} ${r ? `a${r},${r} 0 0 1 ${r},${-r}` : ''} H${x + w - r} ${
			r ? `a${r},${r} 0 0 1 ${r},${r}` : ''
		} V${y + h} Z`;
	}

	const compacto = (reais: number) =>
		reais >= 1000
			? `${(reais / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} mil`
			: String(reais);
	const compactoCentavos = (c: number) =>
		c === 0 ? '·' : compacto(Math.round(c / 100)).replace(' mil', 'k');

	let hover = $state<number | null>(null);
	const dica = $derived(hover === null ? null : barras[hover]);
	const dicaEsquerda = $derived(dica ? Math.min(88, Math.max(12, (dica.cx / W) * 100)) : 0);

	// --- mapa de calor ----------------------------------------------------------------------
	const maxCelula = $derived(Math.max(1, ...data.linhas.flatMap((l) => l.porMes)));
	function celulaStyle(valor: number) {
		if (valor === 0) return '';
		const p = Math.round(8 + (valor / maxCelula) * 82); // 8–90 % de azul sobre a superfície
		return `background: color-mix(in srgb, var(--series-1) ${p}%, var(--surface-1)); color: ${
			p > 52 ? '#ffffff' : 'var(--text-primary)'
		};`;
	}
</script>

<svelte:head>
	<title>Visão geral — {data.ano}</title>
</svelte:head>

<main class="viz-root mx-auto max-w-5xl space-y-6 p-6">
	<header class="flex items-center justify-between">
		<a class="rounded border px-3 py-1 hover:bg-slate-100" href="?ano={data.ano - 1}">←</a>
		<h1 class="text-2xl font-semibold">Visão geral de {data.ano}</h1>
		<a class="rounded border px-3 py-1 hover:bg-slate-100" href="?ano={data.ano + 1}">→</a>
	</header>

	<section class="grid grid-cols-2 gap-3 sm:grid-cols-4">
		<div class="rounded-lg border p-3">
			<div class="text-xs text-[var(--text-secondary)]">Total do ano</div>
			<div class="text-2xl font-semibold">{formatarCentavos(data.resumo.total)}</div>
			<div class="text-xs text-[var(--text-secondary)]">
				{formatarCentavos(data.resumo.pago)} pagos
			</div>
		</div>
		<div class="rounded-lg border p-3">
			<div class="text-xs text-[var(--text-secondary)]">Média por mês</div>
			<div class="text-2xl font-semibold">{formatarCentavos(media)}</div>
			<div class="text-xs text-[var(--text-secondary)]">
				em {comLancamentos.length}
				{comLancamentos.length === 1 ? 'mês' : 'meses'} com contas
			</div>
		</div>
		<div class="rounded-lg border p-3">
			<div class="text-xs text-[var(--text-secondary)]">Mês mais pesado</div>
			<div class="text-2xl font-semibold">
				{maisPesado ? MESES_LONGO[Number(maisPesado.mes.slice(5)) - 1] : '—'}
			</div>
			<div class="text-xs text-[var(--text-secondary)]">
				{maisPesado ? formatarCentavos(maisPesado.total) : 'sem contas'}
			</div>
		</div>
		<div class="rounded-lg border p-3">
			<div class="text-xs text-[var(--text-secondary)]">A pagar no ano</div>
			<div class="text-2xl font-semibold">{formatarCentavos(data.resumo.faltaPagar)}</div>
			<div
				class="text-xs {data.resumo.atrasado > 0
					? 'font-medium text-red-700'
					: 'text-[var(--text-secondary)]'}"
			>
				{data.resumo.atrasado > 0
					? `⚠ ${formatarCentavos(data.resumo.atrasado)} atrasado`
					: 'nada atrasado'}
			</div>
		</div>
	</section>

	<section class="rounded-lg border p-4">
		<div class="mb-2 flex flex-wrap items-baseline justify-between gap-2">
			<h2 class="font-semibold">Quanto saiu e quanto falta, mês a mês</h2>
			<div class="flex items-center gap-4 text-xs text-[var(--text-secondary)]">
				<span class="flex items-center gap-1.5">
					<span class="inline-block size-2.5 rounded-sm" style="background: var(--series-1)"></span>
					Pago
				</span>
				<span class="flex items-center gap-1.5">
					<span class="inline-block size-2.5 rounded-sm" style="background: var(--series-2)"></span>
					A pagar (inclui atrasado)
				</span>
			</div>
		</div>

		<div class="relative">
			<svg
				viewBox="0 0 {W} {H}"
				class="w-full"
				role="img"
				aria-label="Total de contas por mês em {data.ano}, dividido em pago e a pagar"
			>
				{#each ticks as t (t)}
					{@const y = base - (t / escala.topo) * plotH}
					<line x1={M.left} x2={W - M.right} y1={y} y2={y} stroke="var(--grid)" stroke-width="1" />
					<text
						x={M.left - 8}
						{y}
						dy="0.32em"
						text-anchor="end"
						font-size="11"
						fill="var(--text-muted)"
					>
						{compacto(t)}
					</text>
				{/each}

				{#each barras as b (b.m.mes)}
					{#if b.hPago > 0}
						<path
							d={barraPath(b.x, b.yPago, LARGURA_BARRA, b.hPago, b.arredondaPago)}
							fill="var(--series-1)"
						/>
					{/if}
					{#if b.hAPagar > 0}
						<path
							d={barraPath(b.x, b.yAPagar, LARGURA_BARRA, b.hAPagar, true)}
							fill="var(--series-2)"
						/>
					{/if}
				{/each}

				<!-- rótulo só no mês mais pesado: o resto fica no eixo e no tooltip -->
				{#each barras as b (b.m.mes)}
					{#if maisPesado && b.m.mes === maisPesado.mes}
						<text
							x={b.cx}
							y={b.topo - 6}
							text-anchor="middle"
							font-size="11"
							font-weight="600"
							fill="var(--text-primary)"
						>
							{formatarCentavos(b.m.total)}
						</text>
					{/if}
				{/each}

				<!-- alvo de clique/hover maior que a barra: o slot inteiro; clicar abre o mês -->
				{#each barras as b (b.m.mes)}
					<a href="/?mes={b.m.mes}" aria-label="{MESES_LONGO[b.i]}: {formatarCentavos(b.m.total)}">
						<rect
							x={M.left + b.i * slot}
							y={M.top}
							width={slot}
							height={plotH + M.bottom}
							fill={hover === b.i ? 'var(--hover)' : 'transparent'}
							role="presentation"
							onmouseenter={() => (hover = b.i)}
							onmouseleave={() => (hover = null)}
							onfocus={() => (hover = b.i)}
							onblur={() => (hover = null)}
						/>
						<text
							x={b.cx}
							y={H - 10}
							text-anchor="middle"
							font-size="12"
							pointer-events="none"
							font-weight={b.m.mes === data.mesAtual ? 700 : 400}
							fill={b.m.mes === data.mesAtual ? 'var(--text-primary)' : 'var(--text-secondary)'}
						>
							{MESES[b.i]}
						</text>
					</a>
				{/each}

				<line
					x1={M.left}
					x2={W - M.right}
					y1={base}
					y2={base}
					stroke="var(--axis)"
					stroke-width="1"
				/>
			</svg>

			{#if dica}
				<div
					class="pointer-events-none absolute top-2 z-10 w-52 -translate-x-1/2 rounded-lg border bg-white p-3 text-xs shadow-md"
					style="left: {dicaEsquerda}%"
				>
					<div class="mb-1 font-semibold">{MESES_LONGO[dica.i]} de {data.ano}</div>
					{#if dica.m.qtd === 0}
						<div class="text-[var(--text-secondary)]">Sem contas lançadas</div>
					{:else}
						<div class="flex justify-between">
							<span>Total</span><b class="tabular-nums">{formatarCentavos(dica.m.total)}</b>
						</div>
						<div class="flex justify-between text-[var(--text-secondary)]">
							<span class="flex items-center gap-1.5"
								><span class="inline-block size-2 rounded-sm" style="background: var(--series-1)"
								></span>Pago</span
							>
							<span class="tabular-nums">{formatarCentavos(dica.m.pago)}</span>
						</div>
						<div class="flex justify-between text-[var(--text-secondary)]">
							<span class="flex items-center gap-1.5"
								><span class="inline-block size-2 rounded-sm" style="background: var(--series-2)"
								></span>A pagar</span
							>
							<span class="tabular-nums">{formatarCentavos(dica.m.faltaPagar)}</span>
						</div>
						{#if dica.m.atrasado > 0}
							<div class="mt-1 font-medium text-red-700">
								⚠ {formatarCentavos(dica.m.atrasado)} atrasado
							</div>
						{/if}
						<div class="mt-1 text-[var(--text-muted)]">{dica.m.qtd} contas · clique para abrir</div>
					{/if}
				</div>
			{/if}
		</div>
		<p class="mt-1 text-xs text-[var(--text-muted)]">
			Meses futuros incluem as contas fixas previstas, com o valor estimado (último pago); ajuste o
			valor real ao pagar.
		</p>
	</section>

	<section class="rounded-lg border p-4">
		<h2 class="mb-3 font-semibold">Mês a mês</h2>
		<div class="overflow-x-auto">
			<table class="w-full text-sm">
				<thead>
					<tr class="border-b text-left text-xs text-[var(--text-secondary)]">
						<th class="py-1 font-medium">Mês</th>
						<th class="py-1 text-right font-medium">Total</th>
						<th class="py-1 text-right font-medium">Pago</th>
						<th class="py-1 text-right font-medium">A pagar</th>
						<th class="py-1 text-right font-medium">Atrasado</th>
						<th class="py-1 text-right font-medium">Contas</th>
					</tr>
				</thead>
				<tbody>
					{#each data.meses as m, i (m.mes)}
						<tr class="border-b last:border-0 {m.qtd === 0 ? 'text-[var(--text-muted)]' : ''}">
							<td class="py-1">
								<a
									class="hover:underline {m.mes === data.mesAtual ? 'font-semibold' : ''}"
									href="/?mes={m.mes}"
								>
									{MESES_LONGO[i]}
								</a>
							</td>
							<td class="py-1 text-right tabular-nums">{formatarCentavos(m.total)}</td>
							<td class="py-1 text-right tabular-nums">{formatarCentavos(m.pago)}</td>
							<td class="py-1 text-right tabular-nums">{formatarCentavos(m.faltaPagar)}</td>
							<td
								class="py-1 text-right tabular-nums {m.atrasado > 0
									? 'font-medium text-red-700'
									: ''}"
							>
								{m.atrasado > 0 ? formatarCentavos(m.atrasado) : '—'}
							</td>
							<td class="py-1 text-right tabular-nums">{m.qtd}</td>
						</tr>
					{/each}
				</tbody>
				<tfoot>
					<tr class="border-t font-semibold">
						<td class="py-1">Ano</td>
						<td class="py-1 text-right tabular-nums">{formatarCentavos(data.resumo.total)}</td>
						<td class="py-1 text-right tabular-nums">{formatarCentavos(data.resumo.pago)}</td>
						<td class="py-1 text-right tabular-nums">{formatarCentavos(data.resumo.faltaPagar)}</td>
						<td class="py-1 text-right tabular-nums">{formatarCentavos(data.resumo.atrasado)}</td>
						<td class="py-1 text-right tabular-nums">{data.meses.reduce((s, m) => s + m.qtd, 0)}</td
						>
					</tr>
				</tfoot>
			</table>
		</div>
	</section>

	{#if data.linhas.length > 0}
		<section class="rounded-lg border p-4">
			<h2 class="mb-1 font-semibold">Para onde o dinheiro vai</h2>
			<p class="mb-3 text-xs text-[var(--text-secondary)]">
				Valores em reais; quanto mais escuro, maior o gasto da categoria naquele mês.
			</p>
			<div class="overflow-x-auto">
				<table class="w-full border-separate border-spacing-0.5 text-xs">
					<thead>
						<tr class="text-[var(--text-secondary)]">
							<th class="py-1 pr-2 text-left font-medium">Categoria</th>
							{#each MESES as mes (mes)}
								<th class="w-12 py-1 text-center font-medium">{mes}</th>
							{/each}
							<th class="py-1 pl-2 text-right font-medium">Total</th>
						</tr>
					</thead>
					<tbody>
						{#each data.linhas as l (l.categoriaId)}
							<tr>
								<td class="py-1 pr-2 whitespace-nowrap">
									<span
										class="mr-1.5 inline-block size-2 rounded-full"
										style="background: {l.categoria?.cor ?? '#cbd5e1'}"
									></span>
									{l.categoria?.nome ?? 'Sem categoria'}
								</td>
								{#each l.porMes as v, i (i)}
									<td
										class="rounded-sm py-1.5 text-center tabular-nums {v === 0
											? 'text-[var(--text-muted)]'
											: ''}"
										style={celulaStyle(v)}
										title="{l.categoria?.nome ?? 'Sem categoria'} · {MESES_LONGO[
											i
										]}: {formatarCentavos(v)}"
									>
										{compactoCentavos(v)}
									</td>
								{/each}
								<td class="py-1 pl-2 text-right font-semibold whitespace-nowrap tabular-nums">
									{formatarCentavos(l.total)}
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</section>
	{/if}
</main>

<style>
	/* Tokens do chart (paleta validada). Modo claro; o app não tem tema escuro. */
	.viz-root {
		--surface-1: #fcfcfb;
		--text-primary: #0b0b0b;
		--text-secondary: #52514e;
		--text-muted: #7a7974;
		--series-1: #2a78d6; /* pago */
		--series-2: #eb6834; /* a pagar */
		--grid: #e7e6e2;
		--axis: #c9c8c2;
		--hover: rgba(11, 11, 11, 0.05);
	}
</style>
