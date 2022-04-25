import Matrix, { inverse } from "ml-matrix";

export class Vector2 {
    public x: number;
    public y: number;

    constructor(x: number, y: number) {
        this.x = x;
        this.y = y;
    }

    public plus(other: Vector2): Vector2 {
        return new Vector2(this.x + other.x, this.y + other.y)
    }

    public minus(other: Vector2): Vector2 {
        return new Vector2(this.x - other.x, this.y - other.y)
    }

    public dot(other: Vector2): number {
        return this.x * other.x + this.y * other.y
    }

    public cross(other: Vector2): number {
        return this.x * other.y - this.y * other.x
    }

    public len(): number {
        return Math.sqrt(this.x * this.x + this.y * this.y)
    }

    public withMag(mag: number): Vector2 {
        const factor = mag / this.len();
        if (isNaN(factor)) { return new Vector2(0, 0) }
        return this.scale(factor);
    }

    public scale(factor: number): Vector2 {
        return new Vector2(this.x * factor, this.y * factor);
    }

    public perp(): Vector2 {
        return new Vector2(-this.y, this.x);
    }

    public asArr(): [number, number] {
        return [this.x, this.y]
    }

    public toString(): string {
        return `(${this.x.toLocaleString()}, ${this.y.toLocaleString()})`
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
    support: { x: boolean, y: boolean };
}

export interface Member {
    id: number;
    jointIds: [number, number];
}

export interface Problem {
    message: string,
    critical: boolean,
    fix?: () => State
}

export interface Solution {
    problems: Problem[];
    orf?: Map<number, Vector2>;
    memberForces?: Map<number, number>;
}

export const minmax = <T>(items: T[], mapper: (item: T) => number) => {
    const values = items.map(mapper);
    if (values.length > 0) {
        return [
            values.reduce((a, b) => Math.min(a, b)),
            values.reduce((a, b) => Math.max(a, b)),
        ];
    } else {
        return [0, 0]
    }
};

const isSane = (state: State): Problem[] => {
    if (state.members.length == 0) {
        return [{
            message: "No structural members exist",
            critical: true
        }]
    }

    const problems = new Array<Problem>()
    const reusedName = new Set<string>()
    for (const joint of state.joints) {
        if (joint.name.trim() == "") {
            problems.push({
                message: `Joint name missing`,
                critical: false,
            })
        } else if (reusedName.has(joint.name)) {
            problems.push({
                message: `Multiple joint exist with name ${joint.name}`,
                critical: false,
            })
        } else {
            reusedName.add(joint.name);
        }
    }

    const reusedPoints = new Map<string, Joint>()
    for (const joint of state.joints) {
        const key = joint.pos.x + '_' + joint.pos.y
        if (reusedPoints.has(key)) {
            problems.push({
                message: `Joints ${reusedPoints.get(key).name} and ${joint.name} overlap`,
                critical: true,
            })
        } else {
            reusedPoints.set(key, joint);
        }
    }

    for (const member of state.members) {
        if(member.jointIds[0] === member.jointIds[1]){
            const name = state.joints.find(j => j.id == member.jointIds[0]).name
            problems.push({
                message: `Invalid member exists on joint ${name}`,
                critical: true,
                fix: () => ({
                    joints: state.joints,
                    members: state.members.filter(m => m.id != member.id),
                })
            })
        }
    }

    const duplicateMembers = new Set<string>()
    for (const member of state.members) {
        const key = [...member.jointIds].sort().join('_')
        if (duplicateMembers.has(key)) {
            const names = member.jointIds
                .map(id => state.joints.find(j => j.id == id))
                .map(j => j.name)
            problems.push({
                message: `Duplicate members exist between joints ${names[0]} and ${names[1]}`,
                critical: true,
                fix: () => ({
                    joints: state.joints,
                    members: state.members.filter(m => m.id != member.id),
                })
            })
        } else {
            duplicateMembers.add(key)
        }
    }

    if (problems.length > 0) return problems
    // Stage 2
    // Static Determinism (heuristic)
    const J = state.joints.length
    const M = state.members.length
    const R = state.joints.flatMap(joint => [joint.support.x, joint.support.y]).filter(x => x).length
    if (2 * J != M + R) {
        problems.push({
            message: `Structure is not statically determinate (J=${J}, M=${M}, R=${R})`,
            critical: true,
        })
    }

    return problems
}

interface Equation {
    terms: Map<string, number>;
    constant: number
}

const solveSystemOfEquations = (equations: Equation[]): Map<string, number> | null => {
    const variableNames = Array.from(new Set(
        equations.flatMap(equation => [...equation.terms.keys()])
    ))

    // A*X=B
    let A = new Matrix(equations.map(equation => {
        let values = new Array(variableNames.length).fill(0)

        for (const [variable, coeff] of equation.terms) {
            values[variableNames.indexOf(variable)] = coeff
        }

        return values
    }))
    let B = new Matrix(equations.map(equation => [-equation.constant]))

    let A1: Matrix

    try {
        A1 = inverse(A)
    } catch (error) {
        return null // Matrix is singular
    }

    let X = A1.mmul(B)
    return new Map(X.to1DArray()
        .map((value, i) => [variableNames[i], value])
    )
}

const solveORF = (state: State): Map<number, Vector2> | null => {
    // Moment about (0, 0)
    let moment: Equation = {
        terms: new Map(),
        constant: 0
    }
    let forcesX: Equation = {
        terms: new Map(),
        constant: 0
    }
    let forcesY: Equation = {
        terms: new Map(),
        constant: 0
    }
    for (const joint of state.joints) {
        moment.constant += joint.pos.cross(joint.load)
        forcesX.constant += joint.load.x
        forcesY.constant += joint.load.y
        if (joint.support.x) {
            moment.terms.set(joint.id + '_x', joint.pos.cross(new Vector2(1, 0)))
            forcesX.terms.set(joint.id + '_x', 1)
        }
        if (joint.support.y) {
            moment.terms.set(joint.id + '_y', joint.pos.cross(new Vector2(0, 1)))
            forcesY.terms.set(joint.id + '_y', 1)
        }
    }

    const solution = solveSystemOfEquations([moment, forcesX, forcesY])
    if (solution === null) {
        return null
    }

    const ORF = new Map<number, Vector2>()

    for (const joint of state.joints) {
        ORF.set(joint.id, new Vector2(0, 0))
    }

    for (const [name, value] of solution.entries()) {
        const [id, axis] = name.split('_')
        const vec = ORF.get(parseInt(id))
        vec[axis] = value
    }

    return ORF
}


const solveMembers = (state: State, orf: Map<number, Vector2>): Map<number, number> | null => {
    let jointLUT = new Map(
        state.joints.map(joint => [joint.id, joint])
    )
    let membersForJoint = new Map<number, Member[]>(
        state.joints.map(joint => [joint.id, []])
    )
    for (const member of state.members) {
        for (const jointId of member.jointIds) {
            membersForJoint.get(jointId).push(member);
        }
    }

    const equations = new Array<Equation>()
    for (const joint of state.joints) {
        for (const axis of ['x', 'y']) {
            let terms = new Map<string, number>()
            let constant = 0
            constant += joint.load[axis]
            if (orf.has(joint.id)) {
                constant += orf.get(joint.id)[axis]
            }
            for (const member of membersForJoint.get(joint.id)) {
                const other = jointLUT.get(member.jointIds.find(j => j != joint.id))
                const coeff = other.pos.minus(joint.pos).withMag(1)[axis]
                terms.set(member.id.toString(), coeff)
            }
            equations.push({ terms, constant })
        }
    }

    return new Map(
        [...solveSystemOfEquations(equations).entries()]
            .map(([id, val]) => [parseInt(id), val])
    );
}

export const solve = (state: State): Solution => {
    const problems = isSane(state);
    if (problems.find(problem => problem.critical) !== undefined) return { problems };

    const orf = solveORF(state)
    if (orf === null) {
        problems.push({
            message: `Structure is not statically determinate (could not solve for outside reaction forces)`,
            critical: true,
        })
        return { problems }
    }

    const memberForces = solveMembers(state, orf)
    if (memberForces === null) {
        problems.push({
            message: `Structure is not statically determinate (could not solve for member forces)`,
            critical: true,
        })
        return { problems, orf }
    }

    return {
        problems,
        orf,
        memberForces
    };
}
