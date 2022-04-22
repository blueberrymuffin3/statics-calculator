<script lang="ts">
	import { Canvas, Layer } from "svelte-canvas";
	import { renderer } from "./render";

	export const point_names = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

	export let points = [
		{
			pos: { x: 0, y: 0 },
			load: { x: 0, y: 0 },
			support: { x: true, y: true },
		},
		{
			pos: { x: 5, y: 5 },
			load: { x: 0, y: -100 },
			support: { x: false, y: false },
		},
		{
			pos: { x: 10, y: 0 },
			load: { x: 0, y: 0 },
			support: { x: true, y: false },
		},
	];

	$: render = renderer.bind(null, points);
</script>

<main>
	<h1>Statics Calculator</h1>
	<Canvas width={640} height={320}>
		<Layer {render} />
	</Canvas>
	<table>
		<thead>
			<tr>
				<th>Name</th>
				<th>Position</th>
				<th>Load</th>
				<th>Support</th>
			</tr>
		</thead>
		<tbody>
			{#each points as point, i}
				<tr>
					<td>{point_names[i]}</td>
					<td>
						(<input type="number" bind:value={point.pos.x} />,
						<input type="number" bind:value={point.pos.y} />)
					</td>
					<td>
						(<input type="number" bind:value={point.load.x} />,
						<input type="number" bind:value={point.load.y} />)
					</td>
					<td>
						(X: <input
							type="checkbox"
							bind:checked={point.support.x}
						/>, Y:
						<input
							type="checkbox"
							bind:checked={point.support.y}
						/>)
					</td>
				</tr>
			{/each}
		</tbody>
	</table>
</main>

<style>
	* {
		margin: 0;
		padding: 0;
	}

	main {
		padding: 8px;
		max-width: 500px;
		margin: 0 auto;
	}

	h1 {
		color: #ff3e00;
		text-transform: uppercase;
		font-size: 2em;
		font-weight: 100;
		margin-bottom: 16px;
	}

	table {
		border-collapse: collapse;
		margin: 25px auto;
		width: 100%;
		font-size: 0.9em;
		box-shadow: 0 0 10px rgba(0, 0, 0, 0.15);
	}

	table thead tr {
		background-color: #009879;
		color: #ffffff;
		text-align: left;
	}

	table th,
	table td {
		padding: 12px 15px;
	}

	table tbody tr {
		border-bottom: 1px solid #dddddd;
	}

	table tbody tr:nth-of-type(even) {
		background-color: #f3f3f3;
	}

	table tbody tr:last-of-type {
		border-bottom: 2px solid #009879;
	}

	table tbody tr:focus-within {
		font-weight: bold;
		color: #009879;
	}

	/* Chrome, Safari, Edge, Opera */
	input::-webkit-outer-spin-button,
	input::-webkit-inner-spin-button {
		-webkit-appearance: none;
		margin: 0;
	}

	/* Firefox */
	input[type="number"] {
		-moz-appearance: textfield;
	}

	input[type="number"] {
		width: 3em;
	}

	input[type="checkbox"] {
		transform: translateY(0.17em);
	}
</style>
