<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	const centavosParaTexto = (c: number) => (c / 100).toFixed(2).replace('.', ',');
</script>

<svelte:head>
	<title>Contas fixas</title>
</svelte:head>

<main class="mx-auto max-w-4xl space-y-6 p-6">
	<header>
		<h1 class="text-2xl font-semibold">Contas fixas</h1>
		<p class="text-sm text-slate-500">
			Geradas automaticamente todo mês. Alterar aqui atualiza também as contas futuras ainda não
			pagas e não ajustadas por você (valor, nome e categoria); o dia vale só para meses novos. O
			valor de um mês específico você ajusta direto na tela do mês.
		</p>
	</header>

	<section class="space-y-2">
		{#if data.contas.length === 0}
			<p class="rounded-lg border border-dashed p-6 text-center text-slate-500">
				Nenhuma conta fixa cadastrada.
			</p>
		{/if}
		{#each data.contas as c (c.id)}
			<div
				class="flex flex-wrap items-center gap-2 rounded-lg border p-3 {c.ativa
					? ''
					: 'opacity-50'}"
			>
				<form
					method="POST"
					action="?/editar"
					use:enhance={() =>
						async ({ update }) =>
							update({ reset: false })}
					class="grid flex-1 grid-cols-2 gap-x-2 gap-y-1 sm:grid-cols-6"
				>
					<input type="hidden" name="id" value={c.id} />
					<label class="block sm:col-span-2">
						<span class="text-xs text-slate-500">Nome</span>
						<input class="w-full rounded" name="nome" value={c.nome} required />
					</label>
					<label class="block">
						<span class="text-xs text-slate-500">Valor estimado</span>
						<input
							class="w-full rounded"
							name="valorPadrao"
							inputmode="decimal"
							value={centavosParaTexto(c.valorPadrao)}
							required
						/>
					</label>
					<label class="block">
						<span class="text-xs text-slate-500">Dia</span>
						<input
							class="w-full rounded"
							type="number"
							name="diaVencimento"
							min="1"
							max="31"
							value={c.diaVencimento}
							required
						/>
					</label>
					<label class="block sm:col-span-2">
						<span class="text-xs text-slate-500">Categoria</span>
						<select class="w-full rounded" name="categoriaId">
							<option value="">Sem categoria</option>
							{#each data.categorias as cat (cat.id)}
								<option value={cat.id} selected={cat.id === c.categoriaId}>{cat.nome}</option>
							{/each}
						</select>
					</label>
					<button class="rounded border px-2 py-1 text-sm hover:bg-slate-100 sm:col-span-6">
						Salvar
					</button>
				</form>
				<form method="POST" action="?/alternar" use:enhance>
					<input type="hidden" name="id" value={c.id} />
					<input type="hidden" name="ativa" value={String(!c.ativa)} />
					<button class="rounded border px-2 py-1 text-sm hover:bg-slate-100">
						{c.ativa ? 'Desativar' : 'Ativar'}
					</button>
				</form>
				<form
					method="POST"
					action="?/excluir"
					use:enhance={({ cancel }) => {
						if (
							!confirm(`Excluir a conta fixa "${c.nome}"? Os lançamentos já gerados são mantidos.`)
						)
							cancel();
					}}
				>
					<input type="hidden" name="id" value={c.id} />
					<button class="rounded border px-2 py-1 text-sm text-red-700 hover:bg-red-50">✕</button>
				</form>
			</div>
		{/each}
	</section>

	<section class="rounded-lg border p-4">
		<h2 class="mb-3 font-semibold">Nova conta fixa</h2>
		<form method="POST" action="?/criar" use:enhance class="grid grid-cols-2 gap-3 sm:grid-cols-6">
			<input class="rounded sm:col-span-2" name="nome" placeholder="Nome (ex.: Aluguel)" required />
			<input
				class="rounded"
				name="valorPadrao"
				inputmode="decimal"
				placeholder="Valor estimado"
				required
			/>
			<input
				class="rounded"
				type="number"
				name="diaVencimento"
				min="1"
				max="31"
				placeholder="Dia"
				required
			/>
			<select class="rounded" name="categoriaId">
				<option value="">Sem categoria</option>
				{#each data.categorias as cat (cat.id)}
					<option value={cat.id}>{cat.nome}</option>
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
