<script lang="ts">
	import "bulma/css/bulma.min.css";
	import { Canvas, Layer } from "svelte-canvas";
	import Icon from "mdi-svelte";
	import { mdiAlertCircleOutline, mdiDeleteOutline } from "@mdi/js";
	import { solve, State, Vector2 } from "./math";
	import { loadNotifier, renderers } from "./render";
	import { DEFAULT_TRUSS } from "./defaultTruss";

	export const defaultJointNames = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
	export let canvasWidth = 600;
	export let canvasHeight = 500;
	export let renderMode = "full";

	let nextId = 0;

	export let state: State = DEFAULT_TRUSS;

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
	$: render = (context: any) => {
		$loadNotifier;
		if (renderMode == "structure") {
			renderers.structure(context, state);
		} else if (renderMode == "full") {
			renderers.full(context, state, solution);
		} else if (renderMode.startsWith("joint")) {
			const jointId = parseInt(renderMode.substring(5));
			console.log(jointId);
			renderers.joint(context, state, solution, jointId);
		} else {
			renderers.blank(context);
		}
	};
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
					<option value={`joint${joint.id}`}>
						Free Body Diagram for Joint {joint.name}
					</option>
				{/each}
			</select>
		</div>
		{#if solution.problems.length > 0}
			<div class="box" id="problems">
				{#each solution.problems as problem}
					<div>
						<Icon path={mdiAlertCircleOutline} />
						{problem.message}
						{#if problem.fix}
							<button
								href="#"
								class="button is-small"
								on:click={() => (state = problem.fix())}
							>
								Delete
							</button>
						{/if}
					</div>
				{/each}
			</div>
		{/if}
	</div>
	<div class="box">
		<h3 class="is-size-3">Joints</h3>
		<table class="table is-striped is-fullwidth">
			<thead>
				<tr>
					<th>Name</th>
					<th>Position</th>
					<th>Load</th>
					<th>Support</th>
					<th>Reaction Forces</th>
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
							{#if (joint.support.x || joint.support.y) && solution.orf}
								{solution.orf.get(joint.id)}
							{/if}
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
	<div class="box">
		<h3 class="is-size-3">Structural Members</h3>
		<table class="table is-striped is-fullwidth">
			<thead>
				<tr>
					<th>Connected Joints</th>
					<th>Forces</th>
					<th />
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
							{#if solution.memberForces}
								{Math.abs(
									solution.memberForces.get(member.id)
								).toLocaleString()}
							{/if}
						</td>
						<td>
							{#if solution.memberForces}
								{(() => {
									let force = solution.memberForces.get(
										member.id
									);
									if (force < 0) {
										return "(compression)";
									} else if (force > 0) {
										return "(tension)";
									} else {
										return "";
									}
								})()}
							{/if}
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
			<button class="button" on:click={addMember}> Add a member </button>
		{/if}
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

	#problems {
		position: absolute;
		top: 16px;
		right: 16px;
		padding: 8px;
		background-color: #ffffffaa;
	}

	#problems > * {
		display: flex;
		align-items: center;
		gap: 16px;
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
		width: 6em;
	}

	.space-members {
		display: flex;
		gap: 16px;
	}
</style>
