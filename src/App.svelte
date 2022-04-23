<script lang="ts">
	import "bulma/css/bulma.min.css";
	import { Canvas, Layer } from "svelte-canvas";
	import Icon from "mdi-svelte";
	import { mdiDeleteOutline } from "@mdi/js";
	import { solve, State, Vector2 } from "./math";
	import { renderers } from "./render";

	export const defaultJointNames = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
	export let canvasWidth = 640;
	export let canvasHeight = 320;
	export let renderMode = "structure";

	let nextId = 0;

	export let state: State = {
		joints: [
			{
				id: nextId++,
				name: "A",
				pos: new Vector2(0, 0),
				load: new Vector2(0, 0),
				support: { x: true, y: true },
			},
			{
				id: nextId++,
				name: "B",
				pos: new Vector2(10, 0),
				load: new Vector2(0, 0),
				support: { x: true, y: false },
			},
			{
				id: nextId++,
				name: "C",
				pos: new Vector2(5, 5),
				load: new Vector2(0, -10),
				support: { x: false, y: false },
			},
		],
		members: [
			{
				id: nextId++,
				jointIds: [0, 1],
			},
			{
				id: nextId++,
				jointIds: [1, 2],
			},
			{
				id: nextId++,
				jointIds: [0, 2],
			},
		],
	};

	console.log(state);

	export const removeJoint = (id: number) => {
		state.joints = state.joints.filter((joint) => joint.id != id);
		state.members = state.members.filter(
			(joint) => !joint.jointIds.includes(id)
		);
	};

	export const addJoint = () => {
		state.joints.push({
			id: nextId++,
			name: defaultJointNames[state.joints.length],
			pos: new Vector2(-2, 2),
			load: new Vector2(0, 0),
			support: { x: false, y: false },
		});
		state.joints = state.joints;
	};

	export const removeMember = (id: number) => {
		state.members = state.members.filter((joint) => joint.id != id);
	};

	export const addMember = () => {
		state.members.push({
			id: nextId++,
			jointIds: [state.joints[0].id, state.joints[1].id],
		});
		state.members = state.members;
	};

	$: solution = solve(state);
	$: render = (context: any) => renderers.structure(context, state);
</script>

<main class="container">
	<div class="box" id="canvas" bind:clientWidth={canvasWidth}>
		<Canvas width={canvasWidth - 16} height={canvasHeight}>
			<Layer {render} />
		</Canvas>
		<div class="select is-small">
			<select bind:value={renderMode}>
				<option value="structure">Structure</option>
				<option value="full">Full Free Body Diagram</option>
				{#each state.joints as joint (joint.id)}
					<option value={`joint-${joint.id}`}
						>Free Body Diagram for Joint {joint.name}</option
					>
				{/each}
			</select>
		</div>
	</div>
	<div class="columns is-desktop">
		<div class="column">
			<div class="box">
				<h3 class="is-size-3">Joints</h3>
				<table class="table is-striped is-fullwidth">
					<thead>
						<tr>
							<th>Name</th>
							<th>Position</th>
							<th>Load</th>
							<th>Support</th>
							<th>Delete</th>
						</tr>
					</thead>
					<tbody>
						{#each state.joints as joint (joint.id)}
							<tr>
								<td>
									<input
										type="input"
										class="input is-small"
										bind:value={joint.name}
									/>
								</td>
								<td>
									(<input
										type="number"
										class="input is-small"
										bind:value={joint.pos.x}
									/>,
									<input
										type="number"
										class="input is-small"
										bind:value={joint.pos.y}
									/>)
								</td>
								<td>
									(<input
										type="number"
										class="input is-small"
										bind:value={joint.load.x}
									/>,
									<input
										type="number"
										class="input is-small"
										bind:value={joint.load.y}
									/>)
								</td>
								<td>
									(X: <input
										type="checkbox"
										bind:checked={joint.support.x}
									/>, Y:
									<input
										type="checkbox"
										bind:checked={joint.support.y}
									/>)
								</td>
								<td>
									<button
										class="button is-small"
										on:click={() => removeJoint(joint.id)}
									>
										<span class="icon">
											<Icon
												path={mdiDeleteOutline}
												color="black"
											/>
										</span>
									</button>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
				<button class="button" on:click={addJoint}>Add a joint</button>
			</div>
		</div>
		<div class="column is-third-desktop">
			<div class="box">
				<h3 class="is-size-3">Structural Members</h3>
				<table class="table is-striped is-fullwidth">
					<thead>
						<tr>
							<th>Connected Joints</th>
							<th>Delete</th>
						</tr>
					</thead>
					<tbody>
						{#each state.members as member (member.id)}
							<tr>
								<td class="space-members">
									{#each member.jointIds as jointId}
										<div class="select is-small">
											<select bind:value={jointId}>
												{#each state.joints as joint (joint.id)}
													<option value={joint.id}>
														Joint {joint.name}
													</option>
												{/each}
											</select>
										</div>
									{/each}
								</td>
								<td>
									<button
										class="button is-small"
										on:click={() => removeMember(member.id)}
									>
										<span class="icon">
											<Icon
												path={mdiDeleteOutline}
												color="black"
											/>
										</span>
									</button>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
				{#if state.joints.length < 2}
					<button class="button" disabled>
						Create at least 2 joints first
					</button>
				{:else}
					<button class="button" on:click={addMember}>
						Add a member
					</button>
				{/if}
			</div>
		</div>
	</div>
	<div class="box">
		<h3 class="is-size-3">Solution</h3>
		<pre>{JSON.stringify(solution, null, 3)}</pre>
	</div>
</main>

<style>
	#canvas {
		padding: 8px;
	}

	#canvas > div.select {
		position: absolute;
		top: 16px;
		left: 16px;
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

	input[type="number"],
	input[type="input"] {
		width: 4em;
	}

	.space-members {
		display: flex;
		gap: 16px;
	}
</style>
