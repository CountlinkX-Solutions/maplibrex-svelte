<script lang="ts">
	import type { PropDoc } from '../registry.js';

	let { props: rows }: { props: PropDoc[] } = $props();
</script>

<div class="scroller">
	<table>
		<thead>
			<tr>
				<th scope="col">Prop</th>
				<th scope="col">Type</th>
				<th scope="col">Default</th>
				<th scope="col">Description</th>
			</tr>
		</thead>
		<tbody>
			{#each rows as row (row.name)}
				<tr>
					<td>
						<code>{row.name}</code>
						{#if row.required}<span class="required">required</span>{/if}
					</td>
					<td><code class="type">{row.type}</code></td>
					<td
						>{#if row.default}<code>{row.default}</code>{:else}<span class="dash">—</span>{/if}</td
					>
					<td>{row.description}</td>
				</tr>
			{/each}
		</tbody>
	</table>
</div>

<style>
	/* Wide tables scroll inside themselves rather than pushing the page sideways. */
	.scroller {
		overflow-x: auto;
		border: 1px solid var(--border);
		border-radius: var(--radius);
		margin: 1.25rem 0;
	}

	table {
		width: 100%;
		border-collapse: collapse;
		font-size: 0.9rem;
		min-width: 42rem;
	}

	th {
		text-align: left;
		font-size: 0.72rem;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		color: var(--text-faint);
		font-weight: 640;
		padding: 0.6rem 0.9rem;
		background: var(--bg-subtle);
		border-bottom: 1px solid var(--border);
	}

	td {
		padding: 0.7rem 0.9rem;
		border-bottom: 1px solid var(--border);
		vertical-align: top;
		color: var(--text-muted);
	}

	tr:last-child td {
		border-bottom: 0;
	}

	td:first-child {
		color: var(--text);
		white-space: nowrap;
	}

	.type {
		color: var(--tok-tag);
		white-space: nowrap;
	}

	.required {
		display: inline-block;
		margin-left: 0.4rem;
		padding: 0.05rem 0.35rem;
		border-radius: 999px;
		background: var(--accent-soft);
		color: var(--accent);
		font-size: 0.67rem;
		letter-spacing: 0.03em;
		text-transform: uppercase;
	}

	.dash {
		color: var(--text-faint);
	}
</style>
