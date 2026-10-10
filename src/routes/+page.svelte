<script lang="ts">
	import { enhance } from '$app/forms';
	import { deslocarMes, formatarCentavos, nomeDoMes, type Status } from '../lib/financeiro';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	const corStatus: Record<Status, string> = {
		pago: 'bg-green-100 text-green-800',
		atrasado: 'bg-red-100 text-red-800',
		pendente: 'bg-amber-100 text-amber-800'
	};
	const rotuloStatus: Record<Status, string> = {
		pago: 'Pago',
		atrasado: 'Atrasado',
		pendente: 'Pendente'
	};

	const cartoes = $derived([
		{ rotulo: 'Total do mês', valor: data.resumo.total, cor: 'text-slate-900' },
		{ rotulo: 'Pago', valor: data.resumo.pago, cor: 'text-green-700' },
		{ rotulo: 'Falta pagar', valor: data.resumo.faltaPagar, cor: 'text-amber-700' },
		{ rotulo: 'Atrasado', valor: data.resumo.atrasado, cor: 'text-red-700' }
	]);

	type Filtro = 'todos' | Status;
	let filtro = $state<Filtro>('todos');
	const filtros: { valor: Filtro; rotulo: string }[] = [
		{ valor: 'todos', rotulo: 'Todas' },
		{ valor: 'pendente', rotulo: 'Pendentes' },
		{ valor: 'atrasado', rotulo: 'Atrasadas' },
		{ valor: 'pago', rotulo: 'Pagas' }
	];
	const visiveis = $derived(
		filtro === 'todos' ? data.lancamentos : data.lancamentos.filter((l) => l.status === filtro)
	);

	// O enhance navega para a URL da ação sem o nome dela; o mês precisa estar nela
	// para o usuário continuar no mês que está vendo.
	const acao = (nome: string) => `?/${nome}&mes=${data.mes}`;

	function dia(iso: string) {
		return iso.slice(8, 10) + '/' + iso.slice(5, 7);
	}
</script>

<svelte:head>
	<title>Contas — {nomeDoMes(data.mes)}</title>
</svelte:head>

<main class="mx-auto max-w-4xl space-y-6 p-6">
	<header class="flex items-center justify-between">
		<a class="rounded border px-3 py-1 hover:bg-slate-100" href="?mes={deslocarMes(data.mes, -1)}"
			>←</a
		>
		<h1 class="text-2xl font-semibold">{nomeDoMes(data.mes)}</h1>
		<a class="rounded border px-3 py-1 hover:bg-slate-100" href="?mes={deslocarMes(data.mes, 1)}"
			>→</a
		>
	</header>

	<section class="grid grid-cols-2 gap-3 sm:grid-cols-4">
		{#each cartoes as c (c.rotulo)}
			<div class="rounded-lg border p-3">
				<div class="text-xs text-slate-500">{c.rotulo}</div>
				<div class="text-lg font-semibold {c.cor}">{formatarCentavos(c.valor)}</div>
			</div>
		{/each}
	</section>

	<section class="space-y-2">
		<div class="flex gap-1 text-sm">
			{#each filtros as f (f.valor)}
				<button
					type="button"
					class="rounded-full border px-3 py-1 {filtro === f.valor
						? 'bg-slate-900 text-white'
						: 'hover:bg-slate-100'}"
					onclick={() => (filtro = f.valor)}>{f.rotulo}</button
				>
			{/each}
		</div>
		{#if visiveis.length === 0}
			<p class="rounded-lg border border-dashed p-6 text-center text-slate-500">
				{data.lancamentos.length === 0 ? 'Nenhuma conta neste mês.' : 'Nenhuma conta neste filtro.'}
			</p>
		{:else}
			<ul class="divide-y rounded-lg border">
				{#each visiveis as l (l.id)}
					<li class="flex items-center gap-3 p-3">
						<span class="w-12 text-sm text-slate-500">{dia(l.vencimento)}</span>
						<div class="min-w-0 flex-1">
							<div class="truncate font-medium">
								{l.descricao}
								{#if l.parcelaTotal}
									<span class="ml-1 text-xs font-normal text-slate-500"
										>{l.parcelaAtual}/{l.parcelaTotal}</span
									>
								{/if}
							</div>
							{#if l.categoria}
								<div class="flex items-center gap-1 text-xs text-slate-500">
									<span
										class="inline-block size-2 rounded-full"
										style="background:{l.categoria.cor}"
									></span>
									{l.categoria.nome}
								</div>
							{/if}
						</div>
						<span class="rounded px-2 py-0.5 text-xs {corStatus[l.status]}"
							>{rotuloStatus[l.status]}</span
						>
						{#if l.status === 'pago'}
							<form
								method="POST"
								action={acao('valor')}
								use:enhance={() =>
									async ({ update }) =>
										update({ reset: false })}
							>
								<input type="hidden" name="id" value={l.id} />
								<input
									class="w-28 rounded border-transparent text-right tabular-nums hover:border-slate-300"
									name="valor"
									inputmode="decimal"
									value={(l.valor / 100).toFixed(2).replace('.', ',')}
									onchange={(e) => e.currentTarget.form?.requestSubmit()}
									aria-label="Valor de {l.descricao}"
								/>
							</form>
						{/if}
						<div class="flex gap-1">
							{#if l.status === 'pago'}
								<form method="POST" action={acao('desfazer')} use:enhance>
									<input type="hidden" name="id" value={l.id} />
									<button class="rounded border px-2 py-1 text-sm hover:bg-slate-100"
										>Desfazer</button
									>
								</form>
							{:else}
								<form method="POST" action={acao('pagar')} use:enhance class="flex gap-1">
									<input type="hidden" name="id" value={l.id} />
									<input
										class="w-28 rounded text-right tabular-nums"
										name="valor"
										inputmode="decimal"
										value={(l.valor / 100).toFixed(2).replace('.', ',')}
										aria-label="Valor de {l.descricao}"
									/>
									<input
										class="rounded px-1 py-1 text-sm"
										type="date"
										name="pagoEm"
										value={data.hoje}
										aria-label="Data do pagamento de {l.descricao}"
									/>
									<!-- Pagar vem primeiro: é o botão acionado pelo Enter no campo de valor. -->
									<button
										class="rounded bg-green-600 px-2 py-1 text-sm text-white hover:bg-green-700"
									>
										Pagar
									</button>
									<button
										type="submit"
										formaction={acao('valor')}
										class="rounded border px-2 py-1 text-sm hover:bg-slate-100"
										title="Salvar o valor sem marcar como pago">Salvar</button
									>
								</form>
							{/if}
							<form
								method="POST"
								action={acao('excluir')}
								use:enhance={({ cancel }) => {
									const aviso = l.contaFixaId
										? ` Só neste mês: a conta fixa continua nos outros.`
										: '';
									if (!confirm(`Excluir "${l.descricao}"?${aviso}`)) cancel();
								}}
							>
								<input type="hidden" name="id" value={l.id} />
								<button class="rounded border px-2 py-1 text-sm text-red-700 hover:bg-red-50"
									>✕</button
								>
							</form>
						</div>
					</li>
				{/each}
			</ul>
		{/if}
	</section>

	{#if data.porCategoria.length > 0}
		<section class="rounded-lg border p-4">
			<h2 class="mb-3 font-semibold">Por categoria</h2>
			<ul class="space-y-1 text-sm">
				{#each data.porCategoria as t (t.categoriaId)}
					<li class="flex items-center gap-2">
						<span
							class="inline-block size-2 rounded-full"
							style="background:{t.categoria?.cor ?? '#cbd5e1'}"
						></span>
						<span class="flex-1">{t.categoria?.nome ?? 'Sem categoria'}</span>
						<span class="tabular-nums">{formatarCentavos(t.total)}</span>
					</li>
				{/each}
			</ul>
		</section>
	{/if}

	<section class="rounded-lg border p-4">
		<h2 class="mb-3 font-semibold">Nova conta</h2>
		<form
			method="POST"
			action={acao('criar')}
			use:enhance
			class="grid grid-cols-1 gap-3 sm:grid-cols-4"
		>
			<input class="rounded sm:col-span-2" name="descricao" placeholder="Descrição" required />
			<input
				class="rounded"
				name="valor"
				inputmode="decimal"
				placeholder="Valor (de cada parcela)"
				required
			/>
			<input
				class="rounded"
				type="number"
				name="parcelas"
				min="1"
				max="120"
				value="1"
				aria-label="Número de parcelas"
				title="Número de parcelas (1 = à vista)"
			/>
			<input class="rounded" type="date" name="vencimento" value="{data.mes}-01" required />
			<select class="rounded" name="categoriaId">
				<option value="">Sem categoria</option>
				{#each data.categorias as c (c.id)}
					<option value={c.id}>{c.nome}</option>
				{/each}
			</select>
			<button class="rounded bg-slate-900 px-3 py-2 text-white hover:bg-slate-700">Adicionar</button
			>
		</form>
		{#if form?.erro}
			<p class="mt-2 text-sm text-red-700">{form.erro}</p>
		{/if}
	</section>
</main>
