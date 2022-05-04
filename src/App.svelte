<script lang="ts">
	import "bulma/css/bulma.min.css";
	import { Canvas, Layer } from "svelte-canvas";
	import Icon from "mdi-svelte";
	import { mdiAlertCircleOutline, mdiArrowDownBold, mdiArrowLeftBold, mdiArrowRightBold, mdiArrowUpBold, mdiDeleteOutline, mdiGithub } from "@mdi/js";
	import { solve, State, Vector2 } from "./math";
	import { COLOR_APPLIED_FORCE, COLOR_COMPRESSION, COLOR_REACTION_FORCE, COLOR_TENSION, loadNotifier, renderers } from "./render";
	import { DEFAULT_TRUSS } from "./defaultTruss";

	export const defaultJointNames = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
	export let canvasWidth = 600;
	export let canvasHeight = 500;
	export let renderMode = "full";

	export let state: State = DEFAULT_TRUSS;

	let nextId = Math.max(...state.joints.map((joint) => joint.id), ...state.members.map((member) => member.id)) + 1;

	export const removeJoint = (id: number) => {
		state.joints = state.joints.filter((joint) => joint.id != id);
		state.members = state.members.filter((joint) => !joint.jointIds.includes(id));
	};

	export const addJoint = () => {
		let name: string;
		for (name of defaultJointNames) {
			if (state.joints.findIndex((joint) => joint.name == name) == -1) {
				break;
			}
		}

		state.joints.push({
			id: nextId++,
			name,
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
	<div class="box" id="info">
		<h1 class="is-size-1">Statics Calculator</h1>
		<h2 class="is-size-2 has-text-weight-light">What is statics?</h2>
		<p>
			Statics is the branch of mechanics that is concerned with the analysis of forces and moments (or "torques") acting on physical systems that are not
			in motion, like a truss bridge. (<a href="https://en.wikipedia.org/wiki/Statics" target="_blank" rel="noopener noreferrer">Wikipedia</a>)
		</p>
		<h2 class="is-size-2 has-text-weight-light">What does it mean for a structure to be "statically determinate"</h2>
		<p>
			A "statically determinate" structure can be solved mathematically using statics. If a structure is not "statically determinate" it cannot be solved
			using this calculator
		</p>
		<h2 class="is-size-2 has-text-weight-light">How do I use this calculator?</h2>
		<ol class="pl-6">
			<img src="/img/step_1.png" alt="" width="472" height="250" />
			<li class="is-size-4">Create joints or "gusset plates"</li>
			<p>
				Enter the X and Y coordinates of all of the joints in your structure in the <em>Position</em> column of the <a href="#joints">joints table</a>.
				<br />
				You can change the names of any joints to match a diagram if you are copying the structure from one.
			</p>
			<div class="is-clearfix" />
			<img src="/img/step_2.png" alt="" width="472" height="250" />
			<li class="is-size-4">Create stuctural members or "beams"</li>
			<p>
				Create all of the stuctural members by adding them to the <a href="#members">structural members table</a>.
				<br />
				Use the
				<a href="#canvas" on:click={() => (renderMode = "structure")}> structure </a> view to preview what the structure will look like.
			</p>
			<div class="is-clearfix" />
			<img src="/img/step_3.png" alt="" width="472" height="250" />
			<li class="is-size-4">Add supports</li>
			<p>
				Define any supports under the "Support" column of the <a href="#joints">joints table</a>.
				<br />
				Most truss bridges have one "roller" support (X: <input type="checkbox" disabled />, Y: <input type="checkbox" disabled checked />) and one
				"pin" support (X: <input type="checkbox" disabled checked />, Y: <input type="checkbox" disabled checked />). All structures must have at lease
				one X support and at least one Y support to be statically determinate.
			</p>
			<div class="is-clearfix" />
			<img src="/img/step_4.png" alt="" width="472" height="250" />
			<li class="is-size-4">Add applied loads</li>
			<p>
				The applied loads are the forces that are acting on your structure. Enter the X and Y components of all of your loads under the <em>Load</em>
				column of the <a href="#joints">joints table</a>. Enter (0, 0) for any joints that are not loaded.
				<br />
				Use the
				<a href="#canvas" on:click={() => (renderMode = "full")}> Full Free Body Diagram </a> view to preview the direction and magnitude of your
				<span style={`color: ${COLOR_APPLIED_FORCE}`}>applied loads</span><Icon path={mdiArrowDownBold} color={COLOR_APPLIED_FORCE} />
				. If your structure is statically determinate, the
				<span style={`color: ${COLOR_REACTION_FORCE}`}>outside reaction forces</span><Icon path={mdiArrowUpBold} color={COLOR_REACTION_FORCE} />
				will also be calculated and displayed, along with the forces acting on each member that is under
				<span class="nobr">
					<Icon path={mdiArrowRightBold} color={COLOR_TENSION} /><span style={`color: ${COLOR_TENSION}`}>tension</span><Icon
						path={mdiArrowLeftBold}
						color={COLOR_TENSION}
					/>
				</span>
				or
				<span class="nobr">
					<Icon path={mdiArrowLeftBold} color={COLOR_COMPRESSION} /><span style={`color: ${COLOR_COMPRESSION}`}>compression</span><Icon
						path={mdiArrowRightBold}
						color={COLOR_COMPRESSION}
					/>
				</span>
			</p>
			<div class="is-clearfix" />
		</ol>
	</div>
	<div class="box" id="canvas" bind:clientWidth={canvasWidth}>
		<Canvas width={canvasWidth - 16} height={canvasHeight}>
			<Layer {render} />
		</Canvas>
		<div class="select is-small">
			<select bind:value={renderMode}>
				<option value="structure">Structure</option>
				<option value="full">Full Free Body Diagram</option>
				<!-- {#each state.joints as joint (joint.id)}
					<option value={`joint${joint.id}`}>
						Free Body Diagram for Joint {joint.name}
					</option>
				{/each} -->
			</select>
		</div>
		{#if solution.problems.length > 0}
			<div class="box" id="problems">
				{#each solution.problems as problem}
					<div>
						<Icon path={mdiAlertCircleOutline} />
						{problem.message}
						{#if problem.fix}
							<button href="#" class="button is-small" on:click={() => (state = problem.fix())}> Delete </button>
						{/if}
					</div>
				{/each}
			</div>
		{/if}
	</div>
	<div class="box" id="joints">
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
							<input type="input" class="input is-small" bind:value={joint.name} />
						</td>
						<td>
							(<input type="number" class="input is-small" bind:value={joint.pos.x} />,
							<input type="number" class="input is-small" bind:value={joint.pos.y} />)
						</td>
						<td>
							(<input type="number" class="input is-small" bind:value={joint.load.x} />,
							<input type="number" class="input is-small" bind:value={joint.load.y} />)
						</td>
						<td>
							(X: <input type="checkbox" bind:checked={joint.support.x} />, Y:
							<input type="checkbox" bind:checked={joint.support.y} />)
						</td>
						<td>
							{#if (joint.support.x || joint.support.y) && solution.orf}
								{solution.orf.get(joint.id)}
							{/if}
						</td>
						<td>
							<button class="button is-small" on:click={() => removeJoint(joint.id)}>
								<span class="icon">
									<Icon path={mdiDeleteOutline} color="black" />
								</span>
							</button>
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
		<button class="button" on:click={addJoint}>Add a joint</button>
	</div>
	<div class="box" id="members">
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
								{Math.abs(solution.memberForces.get(member.id)).toLocaleString()}
							{/if}
						</td>
						<td>
							{#if solution.memberForces}
								{(() => {
									let force = solution.memberForces.get(member.id);
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
							<button class="button is-small" on:click={() => removeMember(member.id)}>
								<span class="icon">
									<Icon path={mdiDeleteOutline} color="black" />
								</span>
							</button>
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
		{#if state.joints.length < 2}
			<button class="button" disabled> Create at least 2 joints first </button>
		{:else}
			<button class="button" on:click={addMember}> Add a member </button>
		{/if}
	</div>
	<footer class="box">
		Created by Jack Gordon, source code is available on <Icon path={mdiGithub} />
		<a href="http://github.com/bmxguy100/statics-calculator" target="_blank" rel="noopener noreferrer"> GitHub </a>
	</footer>
</main>

<style>
	@media screen and (min-width: 769px) {
		#info ol img {
			float: right;
			max-width: 50%;
			margin-left: 1em;
			margin-bottom: 1em;
		}
	}

	#info > .is-size-2 {
		margin-top: 0.5em;
	}

	.nobr {
		white-space: nowrap;
	}

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

	input[type="number"],
	input[type="input"] {
		width: 6em;
	}

	.space-members {
		display: flex;
		gap: 16px;
	}
</style>
