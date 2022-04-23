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

export const solve = (state: State) => {
    
}
