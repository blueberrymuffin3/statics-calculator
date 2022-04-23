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

    public toString(): string {
        return `(${this.x}, ${this.y})`
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

interface Problem {
    message: string,
    critical: boolean,
    fix?: () => State
}

const isSane = (state: State): Problem[] => {
    if (state.members.length == 0) {
        return [{
            message: "No strucural members exist",
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
        const key = joint.pos.toString()
        if (reusedPoints.has(key)) {
            problems.push({
                message: `Joints ${reusedPoints.get(key).name} and ${joint.name} overlap`,
                critical: true,
            })
        } else {
            reusedPoints.set(key, joint);
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
    // Static Determicity (heuristic)
    const J = state.joints.length
    const M = state.members.length
    const R = state.joints.flatMap(joint => [joint.support.x, joint.support.y]).filter(x => x).length
    if (2 * J != M + R) {
        problems.push({
            message: `Structure is not statically determinent (J=${J}, M=${M}, R=${R})`,
            critical: true,
        })
    }

    return problems
}

export const solve = (state: State) => {
    const problems = isSane(state);
    if (problems.length > 0) return { problems };

    return {};
}
