import { minmax, State, Vector2 } from "./math";

export interface RenderContext {
    context: CanvasRenderingContext2D;
    width: number;
    height: number;
}

export interface Renderable {
    getBoundingPoints(): Vector2[];
    render(context: RenderContext, viewport: Viewport): void;
}

const COLOR_BG = "#274C77";
const COLOR_GRID = "#6096BA";
const COLOR_DRAW = "#E7ECEF";
const padding = 60;

type GridGenerator = () => Generator<number, void, undefined>;

class Viewport {
    public pointToScreen: (coord: Vector2) => Vector2;
    gridGenerators: { x: GridGenerator; y: GridGenerator; };

    constructor(points: Vector2[], size: Vector2) {
        const screenRange = {
            x: size.x - padding * 2,
            y: size.y - padding * 2,
        }

        const [minx, maxx] = minmax(points, (p) => p.x);
        const [miny, maxy] = minmax(points, (p) => -p.y);
        const centerx = (minx + maxx) / 2;
        const centery = (miny + maxy) / 2;
        const xPixelRange = (maxx - minx) / screenRange.x
        const yPixelRange = (maxy - miny) / screenRange.y
        const pixelRange = Math.max(0.01, Math.max(xPixelRange, yPixelRange))

        const transform = (value: number, center: number, range: number) =>
            ((value - center) / pixelRange) + (range / 2) + padding

        this.pointToScreen = (coord: Vector2): Vector2 => new Vector2(
            transform(coord.x, centerx, screenRange.x),
            transform(-coord.y, centery, screenRange.y),
        )


        const createGridGenerator = (center: number, range: number): GridGenerator => {
            const centerDist = (range / 2 + padding) * pixelRange;
            return function* () {
                for (let n = Math.ceil(center - centerDist); n < center + centerDist; n++) {
                    if (n != 0)
                        yield transform(n, center, range);
                }
            }
        }

        this.gridGenerators = {
            x: createGridGenerator(centerx, screenRange.x),
            y: createGridGenerator(centery, screenRange.y),
        }
    }
}

const Grid: Renderable = {
    getBoundingPoints: () => [],
    render: ({ context, width, height }, { gridGenerators, pointToScreen }) => {
        context.fillStyle = COLOR_BG;
        context.fillRect(0, 0, width, height);

        context.strokeStyle = COLOR_GRID;
        context.lineWidth = 0.4;
        context.beginPath();
        for (const x of gridGenerators.x()) {
            context.moveTo(x, 0);
            context.lineTo(x, height);
        }
        for (const y of gridGenerators.y()) {
            context.moveTo(0, y);
            context.lineTo(width, y);
        }
        context.stroke();
        context.lineWidth = 1;
        context.beginPath();
        const origin = pointToScreen(new Vector2(0, 0))
        context.moveTo(origin.x, 0);
        context.lineTo(origin.x, height);
        context.moveTo(0, origin.y);
        context.lineTo(width, origin.y);
        context.stroke();
    }
}

class LabeledPoint implements Renderable {
    public label: string;
    public pos: Vector2;

    constructor(label: string, pos: Vector2) {
        this.label = label;
        this.pos = pos;
    }

    getBoundingPoints(): Vector2[] {
        return [this.pos]
    }

    render({ context }: RenderContext, { pointToScreen }: Viewport): void {
        context.fillStyle = COLOR_DRAW;
        context.beginPath();
        const { x, y } = pointToScreen(this.pos);
        context.arc(x, y, 10, 0, Math.PI * 2);
        context.fill();

        context.fillStyle = COLOR_BG;
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.font = '16px sans-serif';
        context.fillText(this.label, x, y, 16)
    }
}

class LineSegment implements Renderable {
    public points: [Vector2, Vector2];

    constructor(points: [Vector2, Vector2]) {
        this.points = points;
    }

    getBoundingPoints(): Vector2[] {
        return this.points;
    }

    render({ context }: RenderContext, { pointToScreen }: Viewport): void {
        const screenPoints = this.points.map(pointToScreen)

        context.strokeStyle = COLOR_DRAW;
        context.lineWidth = 3;
        context.beginPath();
        context.moveTo(screenPoints[0].x, screenPoints[0].y);
        context.lineTo(screenPoints[1].x, screenPoints[1].y);
        context.stroke();
    }
}

const render = (context: RenderContext, objects: Renderable[]) => {
    const points = objects.flatMap(o => o.getBoundingPoints())
    const viewport = new Viewport(points, new Vector2(context.width, context.height))
    objects.forEach(o => o.render(context, viewport))
}

export const renderers = {
    structure: (context: RenderContext, state: State) => render(context, [
        Grid,
        ...state.members
            .map(member => new LineSegment(
                member.jointIds
                    .map(id => state.joints.find(j => j.id == id))
                    .map(j => j.pos) as [Vector2, Vector2]
            )),
        ...state.joints
            .map(joint => new LabeledPoint(joint.name, joint.pos)),
    ])
}
