export interface Vector2 {
    x: number;
    y: number;
}

export interface Point {
    pos: Vector2
    load: Vector2
    support: { x: boolean, y: boolean }
}

export const minmax = <T>(points: T[], mapper: (point: T) => number) => {
    const values = points.map(mapper);
    return [
        values.reduce((a, b) => Math.min(a, b)),
        values.reduce((a, b) => Math.max(a, b)),
    ];
};
