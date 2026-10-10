<script lang="ts">
	import './layout.css';
	import favicon from '#lib/assets/favicon.svg';
	import { page } from '$app/state';
	import type { LayoutProps } from './$types';

	let { children }: LayoutProps = $props();

	const links = [
		{ href: '/', rotulo: 'Contas do mês' },
		{ href: '/visao-geral', rotulo: 'Visão geral' },
		{ href: '/fixas', rotulo: 'Contas fixas' }
	];
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<nav class="border-b bg-white">
	<div
		class="mx-auto flex items-center gap-4 px-6 py-3 text-sm {page.url.pathname === '/visao-geral'
			? 'max-w-5xl'
			: 'max-w-4xl'}"
	>
		<a href="/" class="mr-2 text-base font-bold tracking-tight">Contalar</a>
		{#each links as l (l.href)}
			<a
				class="hover:underline {page.url.pathname === l.href ? 'font-semibold' : 'text-slate-600'}"
				href={l.href}
				aria-current={page.url.pathname === l.href ? 'page' : undefined}>{l.rotulo}</a
			>
		{/each}
	</div>
</nav>

{@render children()}
