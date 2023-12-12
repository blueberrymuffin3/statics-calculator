import Matrix, { inverse, IToStringOptions } from "ml-matrix";

const matrixToStringOpts: IToStringOptions = {
  maxColumns: 25,
  maxRows: 25,
  maxNumSize: 10,
};

const subscript = { x: "ₓ", y: "ᵧ" };

export class Vector2 {
  public x: number;
  public y: number;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
  }

  public plus(other: Vector2): Vector2 {
    return new Vector2(this.x + other.x, this.y + other.y);
  }

  public minus(other: Vector2): Vector2 {
    return new Vector2(this.x - other.x, this.y - other.y);
  }

  public dot(other: Vector2): number {
    return this.x * other.x + this.y * other.y;
  }

  public cross(other: Vector2): number {
    return this.x * other.y - this.y * other.x;
  }

  public len(): number {
    return Math.sqrt(this.x * this.x + this.y * this.y);
  }

  public withMag(mag: number): Vector2 {
    const factor = mag / this.len();
    if (isNaN(factor)) {
      return new Vector2(0, 0);
    }
    return this.scale(factor);
  }

  public scale(factor: number): Vector2 {
    return new Vector2(this.x * factor, this.y * factor);
  }

  public perp(): Vector2 {
    return new Vector2(-this.y, this.x);
  }

  public asArr(): [number, number] {
    return [this.x, this.y];
  }

  public toString(): string {
    return `(${this.x.toLocaleString()}, ${this.y.toLocaleString()})`;
  }
}

export interface State {
  joints: Joint[];
  members: Member[];
}

export interface Joint {
  id: number;
  name: string;
  pos: Vector2;
  load: Vector2;
  support: { x: boolean; y: boolean };
}

export interface Member {
  id: number;
  jointIds: [number, number];
}

export function parseState(json: string): State | null {
  let stateObject;
  try {
    stateObject = JSON.parse(json);
  } catch (error) {
    return null;
  }

  const { joints: jointsObject, members: membersObject } = stateObject;

  if (!Array.isArray(jointsObject) || !Array.isArray(membersObject)) {
    return null;
  }

  const joints = jointsObject.map(parseJoint);
  const members = membersObject.map(parseMember);
  if (joints.includes(null) || members.includes(null)) {
    return null;
  }

  const jointIds = new Set();
  for (const joint of joints) {
    if (jointIds.has(joint.id)) {
      return null;
    } else {
      jointIds.add(joint.id);
    }
  }

  const memberIds = new Set();
  for (const member of members) {
    if (
      jointIds.has(member.id) ||
      memberIds.has(member.id) ||
      !(jointIds.has(member.jointIds[0]) && jointIds.has(member.jointIds[1]))
    ) {
      return null;
    } else {
      memberIds.add(member.id);
    }
  }

  return { joints, members };
}

function parseJoint(jointObject: any): Joint | null {
  const { id, name, pos, load, support } = jointObject;
  const posVec = parseVector2(pos);
  const loadVec = parseVector2(load);
  if (
    typeof id != "number" ||
    typeof name != "string" ||
    !posVec ||
    !loadVec ||
    typeof support != "object"
  ) {
    return null;
  }

  const { x, y } = support;
  if (typeof x != "boolean" || typeof y != "boolean") {
    return null;
  }

  return {
    id,
    name,
    pos: posVec,
    load: loadVec,
    support: { x, y },
  };
}

function parseMember(jointObject: any): Member | null {
  const { id, jointIds } = jointObject;

  if (
    typeof id != "number" ||
    !Array.isArray(jointIds) ||
    jointIds.length != 2
  ) {
    return null;
  }

  const [jointA, jointB] = jointIds;
  if (typeof jointA != "number" || typeof jointB != "number") {
    return null;
  }

  return { id, jointIds: [jointA, jointB] };
}

function parseVector2(jointObject: any): Vector2 | null {
  const { x, y } = jointObject;
  if (typeof x != "number" || typeof y != "number") {
    return null;
  }

  return new Vector2(x, y);
}

export interface Problem {
  message: string;
  critical: boolean;
  fix?: () => State;
}

export interface Solution {
  problems: Problem[];
  orf?: Map<number, Vector2>;
  memberForces?: Map<number, number>;
  debug: string;
}

export const minmax = <T>(items: T[], mapper: (item: T) => number) => {
  const values = items.map(mapper);
  if (values.length > 0) {
    return [
      values.reduce((a, b) => Math.min(a, b)),
      values.reduce((a, b) => Math.max(a, b)),
    ];
  } else {
    return [0, 0];
  }
};

const isSane = (state: State): Problem[] => {
  if (state.members.length == 0) {
    return [
      {
        message: "No structural members exist",
        critical: true,
      },
    ];
  }

  const problems = new Array<Problem>();
  const reusedName = new Set<string>();
  for (const joint of state.joints) {
    if (joint.name.trim() == "") {
      problems.push({
        message: `Joint name missing`,
        critical: false,
      });
    } else if (reusedName.has(joint.name)) {
      problems.push({
        message: `Multiple joint exist with name ${joint.name}`,
        critical: false,
      });
    } else {
      reusedName.add(joint.name);
    }
  }

  const reusedPoints = new Map<string, Joint>();
  for (const joint of state.joints) {
    const key = joint.pos.x + "_" + joint.pos.y;
    if (reusedPoints.has(key)) {
      problems.push({
        message: `Joints ${reusedPoints.get(key).name} and ${
          joint.name
        } overlap`,
        critical: true,
      });
    } else {
      reusedPoints.set(key, joint);
    }
  }

  for (const member of state.members) {
    if (member.jointIds[0] === member.jointIds[1]) {
      const name = state.joints.find((j) => j.id == member.jointIds[0]).name;
      problems.push({
        message: `Invalid member exists on joint ${name}`,
        critical: true,
        fix: () => ({
          joints: state.joints,
          members: state.members.filter((m) => m.id != member.id),
        }),
      });
    }
  }

  const duplicateMembers = new Set<string>();
  for (const member of state.members) {
    const key = [...member.jointIds].sort().join("_");
    if (duplicateMembers.has(key)) {
      const names = member.jointIds
        .map((id) => state.joints.find((j) => j.id == id))
        .map((j) => j.name);
      problems.push({
        message: `Duplicate members exist between joints ${names[0]} and ${names[1]}`,
        critical: true,
        fix: () => ({
          joints: state.joints,
          members: state.members.filter((m) => m.id != member.id),
        }),
      });
    } else {
      duplicateMembers.add(key);
    }
  }

  if (problems.length > 0) return problems;
  // Stage 2
  // Static Determinism (heuristic)
  const J = state.joints.length;
  const M = state.members.length;
  const R = state.joints
    .flatMap((joint) => [joint.support.x, joint.support.y])
    .filter((x) => x).length;
  if (2 * J != M + R) {
    problems.push({
      message: `Structure is not statically determinate (J=${J}, M=${M}, R=${R})`,
      critical: true,
    });
  }

  return problems;
};

type TermMap = Map<string, { coeff: number; debug: string }>;

interface Equation {
  terms: TermMap;
  constant: number;
}

const solveSystemOfEquations = (
  equations: Equation[]
): { solution: Map<string, number> | null; debug: string } => {
  let debug = equations.map((equation) => {
    let str = [...equation.terms.values()]
      .filter((x) => x.coeff != 0)
      .map(({ coeff, debug }) => {
        return coeff.toLocaleString() + "*" + debug;
      })
      .join(" + ");

    if (equation.constant != 0) {
      str += ` + ${equation.constant.toLocaleString()}`;
    }

    return `${str} = 0`;
  });

  const variableNames = Array.from(
    new Set(equations.flatMap((equation) => [...equation.terms.keys()]))
  );

  // A*X=B
  let A = new Matrix(
    equations.map((equation) => {
      let values = new Array(variableNames.length).fill(0);

      for (const [variable, { coeff }] of equation.terms) {
        values[variableNames.indexOf(variable)] = coeff;
      }

      return values;
    })
  );
  let B = new Matrix(equations.map((equation) => [-equation.constant]));
  debug.push("A = " + A.toString(matrixToStringOpts));
  debug.push("B = " + B.toString(matrixToStringOpts));

  let A1: Matrix;

  try {
    A1 = inverse(A);
    debug.push("A⁻¹ = " + A1.toString(matrixToStringOpts));
  } catch (error) {
    return {
      solution: null,
      debug: `${A.toString(matrixToStringOpts)}\n${B.toString(
        matrixToStringOpts
      )}`,
    }; // Matrix is singular
  }

  let X = A1.mmul(B);
  debug.push("X = " + X.toString(matrixToStringOpts));
  const solution = new Map(
    X.to1DArray().map((value, i) => [variableNames[i], value])
  );
  return {
    solution,
    debug: debug.join("\n"),
  };
};

const solveORF = (state: State) => {
  // Moment about (0, 0)
  let moment: Equation = {
    terms: new Map(),
    constant: 0,
  };
  let forcesX: Equation = {
    terms: new Map(),
    constant: 0,
  };
  let forcesY: Equation = {
    terms: new Map(),
    constant: 0,
  };
  for (const joint of state.joints) {
    moment.constant += joint.pos.cross(joint.load);
    forcesX.constant += joint.load.x;
    forcesY.constant += joint.load.y;
    if (joint.support.x) {
      const debug = joint.name + subscript["x"];
      moment.terms.set(joint.id + "_x", {
        coeff: joint.pos.cross(new Vector2(1, 0)),
        debug,
      });
      forcesX.terms.set(joint.id + "_x", { coeff: 1, debug });
    }
    if (joint.support.y) {
      const debug = joint.name + subscript["y"];
      moment.terms.set(joint.id + "_y", {
        coeff: joint.pos.cross(new Vector2(0, 1)),
        debug,
      });
      forcesY.terms.set(joint.id + "_y", { coeff: 1, debug });
    }
  }

  const { solution, debug } = solveSystemOfEquations([
    moment,
    forcesX,
    forcesY,
  ]);
  if (solution === null) {
    return { orf: null, debug: "" };
  }

  const orf = new Map<number, Vector2>();

  for (const joint of state.joints) {
    orf.set(joint.id, new Vector2(0, 0));
  }

  for (const [name, value] of solution.entries()) {
    const [id, axis] = name.split("_");
    const vec = orf.get(parseInt(id));
    vec[axis] = value;
  }

  return { orf, debug };
};

const solveMembers = (
  state: State,
  orf: Map<number, Vector2>
): { solution: Map<number, number> | null; debug: string } => {
  let jointLUT = new Map(state.joints.map((joint) => [joint.id, joint]));
  let membersForJoint = new Map<number, Member[]>(
    state.joints.map((joint) => [joint.id, []])
  );
  for (const member of state.members) {
    for (const jointId of member.jointIds) {
      membersForJoint.get(jointId).push(member);
    }
  }

  const equations = new Array<Equation>();
  for (const joint of state.joints) {
    for (const axis of ["x", "y"]) {
      let terms: TermMap = new Map();
      let constant = 0;
      constant += joint.load[axis];
      if (orf.has(joint.id)) {
        constant += orf.get(joint.id)[axis];
      }
      for (const member of membersForJoint.get(joint.id)) {
        const other = jointLUT.get(member.jointIds.find((j) => j != joint.id));
        const coeff = other.pos.minus(joint.pos).withMag(1)[axis];
        terms.set(member.id.toString(), {
          coeff,
          debug:
            member.jointIds
              .map((id) => jointLUT.get(id))
              .map((joint) => joint.name)
              .join("") + subscript[axis],
        });
      }
      equations.push({ terms, constant });
    }
  }

  let { solution, debug } = solveSystemOfEquations(equations);

  debug += "\n\nMembers:\n";
  for (const member of state.members) {
    for (const jointIds of [member.jointIds, [...member.jointIds].reverse()]) {
      const name = jointIds
        .map((id) => jointLUT.get(id))
        .map((joint) => joint.name)
        .join("");
      debug += `${name} = ${jointLUT.get(jointIds[1]).pos.minus(jointLUT.get(jointIds[0]).pos)}\n`
      debug += `${name}^ = ${jointLUT.get(jointIds[1]).pos.minus(jointLUT.get(jointIds[0]).pos).withMag(1)}\n`
    }
  }

  if (!solution) {
    return { solution: null, debug };
  }

  return {
    solution: new Map(
      [...solution.entries()].map(([id, val]) => [parseInt(id), val])
    ),
    debug,
  };
};

export const solve = (state: State): Solution => {
  const problems = isSane(state);
  let debug = "";
  if (problems.find((problem) => problem.critical) !== undefined)
    return { problems, debug };

  const { orf, debug: debugORF } = solveORF(state);
  debug += `Outside Reaction Forces:\n${debugORF}\n\n`;
  if (orf === null) {
    problems.push({
      message: `Structure is not statically determinate (could not solve for outside reaction forces)`,
      critical: true,
    });
    return { problems, debug };
  }

  const { solution: memberForces, debug: debugMembers } = solveMembers(
    state,
    orf
  );
  debug += `Member Forces:\n${debugMembers}\n\n`;
  if (memberForces === null) {
    problems.push({
      message: `Structure is not statically determinate (could not solve for member forces)`,
      critical: true,
    });
    return { problems, orf, debug };
  }

  return {
    problems,
    orf,
    memberForces,
    debug,
  };
};
