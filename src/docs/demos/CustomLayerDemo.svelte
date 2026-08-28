<script lang="ts">
	import { MercatorCoordinate } from 'maplibre-gl';
	import type { CustomLayerInterface, Map as MapLibreMap } from 'maplibre-gl';
	import { CustomLayer, MapLibre, NavigationControl } from '$lib/index.js';
	import DemoFrame from '../ui/DemoFrame.svelte';
	import { DEMO_STYLE } from './data.js';

	let map = $state<MapLibreMap | null>(null);
	let colour = $state('#0d9488');

	// Read inside render, so changing the control needs no new layer — only a
	// repaint. This is the whole point of a custom layer: the frame is yours.
	let rgb = $derived([
		Number.parseInt(colour.slice(1, 3), 16) / 255,
		Number.parseInt(colour.slice(3, 5), 16) / 255,
		Number.parseInt(colour.slice(5, 7), 16) / 255
	]);

	$effect(() => {
		void rgb;
		map?.triggerRepaint();
	});

	const corners = [
		MercatorCoordinate.fromLngLat({ lng: 25.004, lat: 60.239 }),
		MercatorCoordinate.fromLngLat({ lng: 13.403, lat: 52.562 }),
		MercatorCoordinate.fromLngLat({ lng: 30.498, lat: 50.541 })
	];

	const VERTEX = `#version 300 es
uniform mat4 u_matrix;
in vec2 a_pos;
void main() {
	gl_Position = u_matrix * vec4(a_pos, 0.0, 1.0);
}`;

	const FRAGMENT = `#version 300 es
precision highp float;
uniform vec3 u_colour;
out vec4 fragColour;
void main() {
	fragColour = vec4(u_colour, 0.72);
}`;

	// Shader failures are silent by default: the draw call simply produces
	// nothing. Checking the status is what turns that into a real error.
	function compile(gl: WebGL2RenderingContext, type: number, source: string): WebGLShader {
		const shader = gl.createShader(type) as WebGLShader;
		gl.shaderSource(shader, source);
		gl.compileShader(shader);

		if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
			throw new Error(`[maplibrex demo] shader failed: ${gl.getShaderInfoLog(shader)}`);
		}

		return shader;
	}

	const triangle: CustomLayerInterface = (() => {
		let program: WebGLProgram | null = null;
		let buffer: WebGLBuffer | null = null;
		let positionLocation = 0;
		let matrixLocation: WebGLUniformLocation | null = null;
		let colourLocation: WebGLUniformLocation | null = null;

		return {
			id: 'gl-triangle',
			type: 'custom',
			renderingMode: '2d',

			onAdd(_map, gl) {
				program = gl.createProgram();
				gl.attachShader(program, compile(gl, gl.VERTEX_SHADER, VERTEX));
				gl.attachShader(program, compile(gl, gl.FRAGMENT_SHADER, FRAGMENT));
				gl.linkProgram(program);

				if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
					throw new Error(`[maplibrex demo] link failed: ${gl.getProgramInfoLog(program)}`);
				}

				positionLocation = gl.getAttribLocation(program, 'a_pos');
				matrixLocation = gl.getUniformLocation(program, 'u_matrix');
				colourLocation = gl.getUniformLocation(program, 'u_colour');

				buffer = gl.createBuffer();
				gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
				gl.bufferData(
					gl.ARRAY_BUFFER,
					new Float32Array(corners.flatMap((corner) => [corner.x, corner.y])),
					gl.STATIC_DRAW
				);
			},

			render(gl, args) {
				if (!program) return;

				gl.useProgram(program);
				// v6 puts the matrix a custom layer needs on the projection data, so
				// that the same layer works under mercator and globe. The older
				// modelViewProjectionMatrix compiles and draws nothing visible.
				gl.uniformMatrix4fv(matrixLocation, false, args.defaultProjectionData.mainMatrix);
				gl.uniform3f(colourLocation, rgb[0], rgb[1], rgb[2]);
				gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
				gl.enableVertexAttribArray(positionLocation);
				gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);
				gl.enable(gl.BLEND);
				gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
				gl.drawArrays(gl.TRIANGLES, 0, 3);
			},

			onRemove(_map, gl) {
				if (program) gl.deleteProgram(program);
				if (buffer) gl.deleteBuffer(buffer);
				program = null;
				buffer = null;
			}
		};
	})();
</script>

<DemoFrame
	title="Your own WebGL, in the layer stack"
	caption="A triangle drawn with raw shaders, positioned in mercator coordinates so it stays pinned to Helsinki, Berlin and Kyiv as you pan. MapLibre hands over the matrix; everything inside the frame is yours."
>
	<MapLibre mapStyle={DEMO_STYLE} center={[23, 55]} zoom={3.4} bind:map>
		<NavigationControl />
		<CustomLayer layer={triangle} />
	</MapLibre>

	{#snippet controls()}
		<label>
			colour
			<input type="color" bind:value={colour} />
		</label>
		<span>changing it repaints, it does not rebuild the layer</span>
	{/snippet}
</DemoFrame>

<style>
	label {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}
</style>
