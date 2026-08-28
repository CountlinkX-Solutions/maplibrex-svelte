<script lang="ts">
	import type { IControl, Map as MapLibreMap, Subscription } from 'maplibre-gl';
	import { Control, MapLibre, NavigationControl } from '$lib/index.js';
	import DemoFrame from '../ui/DemoFrame.svelte';
	import { DEMO_STYLE } from './data.js';

	type BadgeOptions = { label: string };

	let label = $state('zoom');

	/**
	 * A control written the plain MapLibre way, with no Svelte in it. This is the
	 * shape every third-party control ships, and the generic Control component
	 * exists to mount exactly this.
	 */
	function createBadge(options: BadgeOptions): IControl {
		let container: HTMLDivElement | null = null;
		let subscription: Subscription | undefined;

		return {
			onAdd(map: MapLibreMap) {
				container = document.createElement('div');
				container.className = 'maplibregl-ctrl maplibregl-ctrl-group';
				container.style.cssText =
					'padding: 4px 10px; background: #fff; color: #222; font: 600 12px/1.7 system-ui, sans-serif;';

				const update = () => {
					if (container) container.textContent = `${options.label} ${map.getZoom().toFixed(2)}`;
				};

				update();
				subscription = map.on('zoom', update);

				return container;
			},

			onRemove() {
				subscription?.unsubscribe();
				container?.remove();
				container = null;
			}
		};
	}
</script>

<DemoFrame
	title="Mounting a control that knows nothing about Svelte"
	caption="Options are compared by a stable key, so key order is not a change — but a real change recreates the control, because MapLibre controls take their options in the constructor and expose no setters."
>
	<MapLibre mapStyle={DEMO_STYLE} center={[6, 46]} zoom={3.4}>
		<NavigationControl position="top-right" />
		<Control factory={createBadge} options={{ label }} position="top-left" />
	</MapLibre>

	{#snippet controls()}
		<label>
			label
			<input type="text" bind:value={label} size="10" />
		</label>
		<span>editing it rebuilds the control, which is why the reading resets</span>
	{/snippet}
</DemoFrame>

<style>
	label {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	input {
		font: inherit;
		font-size: 0.85rem;
		padding: 0.2rem 0.4rem;
		border: 1px solid var(--border);
		border-radius: var(--radius-sm);
		background: var(--bg-raised);
		color: var(--text);
	}
</style>
