import { minmax, Point, Vector2 } from "./math";

const COLOR_BG = "#4A6DE5";
const COLOR_DRAW = "#CED8F7";
const padding = 60;

const generateTransformers = (points: Point[], size: Vector2) => {
    const screenRange = {
        x: size.x - padding * 2,
        y: size.y - padding * 2,
    }

    const [minx, maxx] = minmax(points, (p) => p.pos.x);
    const [miny, maxy] = minmax(points, (p) => -p.pos.y);
    const centerx = (minx + maxx) / 2;
    const centery = (miny + maxy) / 2;
    const xPixelRange = (maxx - minx) / screenRange.x
    const yPixelRange = (maxy - miny) / screenRange.y
    const pixelRange = Math.max(xPixelRange, yPixelRange)

    const transform = (value: number, center: number, range: number) =>
        ((value - center) / pixelRange) + (range / 2) + padding

    const coordToPoint = (coord: Vector2): Vector2 => {
        const point = {
            x: transform(coord.x, centerx, screenRange.x),
            y: transform(-coord.y, centery, screenRange.y),
        }
        return point;
    }

    const createGridGenerator = (center: number, range: number) => {
        const centerDist = (range / 2 + padding) * pixelRange;
        return function* () {
            for (let n = Math.ceil(center - centerDist); n < center + centerDist; n++) {
                if (n != 0)
                    yield transform(n, center, range);
            }
        }
    }

    return {
        coordToPoint,
        gridGenerators: {
            x: createGridGenerator(centerx, screenRange.x),
            y: createGridGenerator(centery, screenRange.y),
        }
    }
}

export const renderer = (
    points: Point[],
    {
        context,
        width,
        height,
    }: {
        context: CanvasRenderingContext2D;
        width: number;
        height: number;
    }) => {

    const { coordToPoint, gridGenerators } = generateTransformers(points, { x: width, y: height });

    context.fillStyle = COLOR_BG;
    context.fillRect(0, 0, width, height);

    // Draw Grid
    context.strokeStyle = COLOR_DRAW;
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
    const origin = coordToPoint({ x: 0, y: 0 })
    context.moveTo(origin.x, 0);
    context.lineTo(origin.x, height);
    context.moveTo(0, origin.y);
    context.lineTo(width, origin.y);
    context.stroke();

    // Draw Points

    context.fillStyle = COLOR_DRAW;
    for (const { pos } of points) {
        context.beginPath();
        const { x, y } = coordToPoint(pos);
        context.arc(x, y, 5, 0, Math.PI * 2);
        context.fill();
    }
}