import { writable } from "svelte/store";
import { minmax, Solution, State, Vector2 } from "./math";

export interface RenderContext {
  context: CanvasRenderingContext2D;
  width: number;
  height: number;
}

export interface Renderable {
  getBoundingPoints(): Vector2[];
  render(context: RenderContext, viewport: Viewport): void;
  getForceVectorLength?: () => number;
}

const loadImage = (url: string) => {
  let image = new Image();
  image.onload = () => loadNotifier.update((x) => x + 1);
  image.src = url;
  return image;
};

export let loadNotifier = writable(0);

export const COLOR_BG = "#274C77";
export const COLOR_GRID = "#6096BA";
export const COLOR_DRAW = "#E7ECEF";
export const COLOR_APPLIED_FORCE = "#FC5130";
export const COLOR_REACTION_FORCE = "#FFA630";
export const COLOR_COMPRESSION = "#49D673";
export const COLOR_TENSION = "#D56049";
const IMAGE_FIXED = loadImage("/img/fixed.png");
const IMAGE_ROLLER = loadImage("/img/roller.png");
const IMAGE_ROLLER_FLIPPED = loadImage("/img/roller_flipped.png");
const padding = 45;
const VECTOR_OFFSET_DIST_TOWARD = 35;
const VECTOR_OFFSET_DIST_AWAY = 25;
const MAX_DYNAMIC_LENGTH = 1.5;
const EPSILON = 1e-6;

type GridGenerator = () => Generator<number, void, undefined>;

class Viewport {
  public pointToScreen: (coord: Vector2) => Vector2;
  public scaleToScreen: (value: number) => number;
  public centerPoint: Vector2;
  gridGenerators: { x: GridGenerator; y: GridGenerator };

  constructor(points: Vector2[], size: Vector2) {
    const screenRange = {
      x: size.x - padding * 2,
      y: size.y - padding * 2,
    };

    const [minx, maxx] = minmax(points, (p) => p.x);
    const [miny, maxy] = minmax(points, (p) => -p.y);
    const centerx = (minx + maxx) / 2;
    const centery = (miny + maxy) / 2;
    const xPixelRange = (maxx - minx) / screenRange.x;
    const yPixelRange = (maxy - miny) / screenRange.y;
    const pixelRange = Math.max(0.01, Math.max(xPixelRange, yPixelRange));

    const transform = (value: number, center: number, range: number) =>
      (value - center) / pixelRange + range / 2 + padding;

    this.scaleToScreen = (value: number) => value / pixelRange;

    this.pointToScreen = (coord: Vector2): Vector2 =>
      new Vector2(
        transform(coord.x, centerx, screenRange.x),
        transform(-coord.y, centery, screenRange.y)
      );

    this.centerPoint = new Vector2(centerx, -centery);

    const createGridGenerator = (
      center: number,
      range: number
    ): GridGenerator => {
      const centerDist = (range / 2 + padding) * pixelRange;
      return function* () {
        for (
          let n = Math.ceil(center - centerDist);
          n < center + centerDist;
          n++
        ) {
          if (n != 0) yield transform(n, center, range);
        }
      };
    };

    this.gridGenerators = {
      x: createGridGenerator(centerx, screenRange.x),
      y: createGridGenerator(centery, screenRange.y),
    };
  }
}

const Grid: Renderable = {
  getBoundingPoints: () => [],
  render: (
    { context, width, height },
    { gridGenerators, pointToScreen, scaleToScreen }
  ) => {
    context.fillStyle = COLOR_BG;
    context.fillRect(0, 0, width, height);

    if (scaleToScreen(1) < 5) return;

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
    const origin = pointToScreen(new Vector2(0, 0));
    context.moveTo(origin.x, 0);
    context.lineTo(origin.x, height);
    context.moveTo(0, origin.y);
    context.lineTo(width, origin.y);
    context.stroke();
  },
};

class Support implements Renderable {
  pos: Vector2;
  x: boolean;
  y: boolean;

  constructor(pos: Vector2, { x, y }: { x: boolean; y: boolean }) {
    this.pos = pos;
    this.x = x;
    this.y = y;
  }

  getBoundingPoints(): Vector2[] {
    return [this.pos];
  }
  render({ context }: RenderContext, { pointToScreen }: Viewport): void {
    let image = null;
    let flipped = false;
    if (this.x && this.y) {
      image = IMAGE_FIXED;
    } else if (!this.x && this.y) {
      image = IMAGE_ROLLER;
    } else if (this.x && !this.y) {
      image = IMAGE_ROLLER_FLIPPED;
      flipped = true;
    }

    if (image) {
      let screen = pointToScreen(this.pos);
      if (flipped) {
        screen.x -= 35;
        screen.y -= 25;
      } else {
        screen.x -= 25;
        screen.y -= 15;
      }
      context.drawImage(image, screen.x, screen.y);
    }
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
    return [this.pos];
  }

  render({ context }: RenderContext, { pointToScreen }: Viewport): void {
    context.fillStyle = COLOR_DRAW;
    context.beginPath();
    const { x, y } = pointToScreen(this.pos);
    context.arc(x, y, 10, 0, Math.PI * 2);
    context.fill();

    context.fillStyle = COLOR_BG;
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.font = "16px sans-serif";
    context.fillText(this.label, x, y, 16);
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
    const screenPoints = this.points.map(pointToScreen);

    context.strokeStyle = COLOR_DRAW;
    context.lineWidth = 6;
    context.beginPath();
    context.moveTo(screenPoints[0].x, screenPoints[0].y);
    context.lineTo(screenPoints[1].x, screenPoints[1].y);
    context.stroke();
  }
}

const drawArrow = (
  context: CanvasRenderingContext2D,
  start: Vector2,
  end: Vector2,
  color: string
) => {
  const direction = end.minus(start);

  context.strokeStyle = color;
  context.lineWidth = 6;
  context.beginPath();
  context.moveTo(start.x, start.y);
  context.lineTo(end.x, end.y);
  context.stroke();

  context.fillStyle = color;
  context.beginPath();
  context.moveTo(...start.plus(direction.perp().withMag(10)).asArr());
  context.lineTo(...start.minus(direction.withMag(12)).asArr());
  context.lineTo(...start.minus(direction.perp().withMag(10)).asArr());
  context.fill();
};

class DynamicLengthSet {
  maxMag: number;

  constructor() {
    this.maxMag = 0;
  }

  add(mag: number) {
    this.maxMag = Math.max(mag, this.maxMag);
  }

  scale(mag: number): number {
    return (mag / this.maxMag) * MAX_DYNAMIC_LENGTH;
  }
}

class ForceVector implements Renderable {
  color: string;
  pos: Vector2;
  mag: Vector2;
  preferredDirection: Vector2 | undefined = undefined;
  private length: number | undefined = undefined;
  private dynamicLengthSet: DynamicLengthSet | undefined = undefined;

  constructor(color: string, pos: Vector2, mag: Vector2) {
    this.color = color;
    this.pos = pos;
    this.mag = mag;
  }

  preferDirection(preferredDirection: Vector2) {
    this.preferredDirection = preferredDirection;
    return this;
  }

  setLength(length: number) {
    this.length = length;
    return this;
  }

  dynamicLength(dynamicLengthSet: DynamicLengthSet) {
    dynamicLengthSet.add(this.mag.len());
    this.dynamicLengthSet = dynamicLengthSet;
    return this;
  }

  getForceVectorLength(): number {
    return this.mag.len();
  }

  getBoundingPoints(): Vector2[] {
    let length = this.length ?? this.dynamicLengthSet.scale(this.mag.len());
    if (length) {
      let ret = [
        this.pos.plus((this.preferredDirection ?? this.mag).withMag(length)),
        this.pos.minus((this.preferredDirection ?? this.mag).withMag(length)),
      ];
      return ret;
    } else {
      return [this.pos];
    }
  }

  render(
    { context }: RenderContext,
    { pointToScreen, centerPoint, scaleToScreen }: Viewport
  ): void {
    let preferredDirection =
      this.preferredDirection ?? centerPoint.minus(this.pos);
    const flip = preferredDirection.dot(this.mag) < 0;
    const direction = flip
      ? new Vector2(this.mag.x, -this.mag.y)
      : new Vector2(-this.mag.x, this.mag.y);

    let start = pointToScreen(this.pos).plus(
      direction.withMag(
        flip ? VECTOR_OFFSET_DIST_AWAY : VECTOR_OFFSET_DIST_TOWARD
      )
    );
    let end: Vector2;

    if (this.length) {
      end = start.plus(
        direction.withMag(
          scaleToScreen(this.length) -
            VECTOR_OFFSET_DIST_AWAY -
            VECTOR_OFFSET_DIST_TOWARD
        )
      );
    } else if (this.dynamicLengthSet) {
      end = start.plus(
        direction.withMag(
          scaleToScreen(this.dynamicLengthSet.scale(this.mag.len()))
        )
      );
    } else {
      end = start.plus(direction.scale(0.1));
    }

    if (flip) {
      [start, end] = [end, start];
    }

    drawArrow(context, start, end, this.color);
  }
}

class LineSegmentLoaded implements Renderable {
  public points: [Vector2, Vector2];
  public load: number;
  private children: Renderable[];

  constructor(points: [Vector2, Vector2], load: number) {
    this.points = points;
    this.load = load;

    if (Math.abs(load) < EPSILON) {
      this.children = [new LineSegment(points)];
    } else {
      const midpoint = points[0].plus(points[1]).scale(0.5);
      const color = this.load < 0 ? COLOR_COMPRESSION : COLOR_TENSION;
      this.children = [
        ...points.map((pos) => {
          const direction = pos.minus(midpoint);
          const mag = direction.withMag(-this.load);
          return new ForceVector(color, pos, mag)
            .preferDirection(direction)
            .setLength(direction.len());
        }),
        {
          getBoundingPoints: () => [],
          render: ({ context }, { pointToScreen }) => {
            let { x, y } = pointToScreen(midpoint);
            context.fillStyle = color;
            context.textAlign = "center";
            context.textBaseline = "middle";
            context.font = "16px sans-serif";
            context.fillText(Math.abs(this.load).toLocaleString(), x, y, 48);
          },
        },
      ];
    }
  }

  getBoundingPoints(): Vector2[] {
    return this.points;
  }

  render(context: RenderContext, viewport: Viewport): void {
    this.children.forEach((v) => v.render(context, viewport));
  }
}

const render = (context: RenderContext, objects: Renderable[]) => {
  const points = objects.flatMap((o) => o.getBoundingPoints());
  const viewport = new Viewport(
    points,
    new Vector2(context.width, context.height)
  );
  objects.forEach((o) => o.render(context, viewport));
};

export const renderers = {
  blank: (context: RenderContext) => {
    render(context, [Grid]);
  },
  structure: (context: RenderContext, state: State) => {
    render(context, [
      Grid,
      ...state.members.map(
        (member) =>
          new LineSegment(
            member.jointIds
              .map((id) => state.joints.find((j) => j.id == id))
              .map((j) => j.pos) as [Vector2, Vector2]
          )
      ),
      ...state.joints.map((joint) => new Support(joint.pos, joint.support)),
      ...state.joints.map((joint) => new LabeledPoint(joint.name, joint.pos)),
    ]);
  },
  full: (context: RenderContext, state: State, solution: Solution) => {
    let dynamicLengthSet = new DynamicLengthSet();
    render(context, [
      Grid,
      ...state.members
        .filter(() => solution.memberForces)
        .map(
          (member) =>
            new LineSegmentLoaded(
              member.jointIds
                .map((id) => state.joints.find((j) => j.id == id))
                .map((j) => j.pos) as [Vector2, Vector2],
              solution.memberForces.get(member.id)
            )
        ),
      ...state.joints
        .filter((joint) => joint.load.len() > 0)
        .flatMap((joint) => [
          new ForceVector(
            COLOR_APPLIED_FORCE,
            joint.pos,
            new Vector2(joint.load.x, 0)
          ).dynamicLength(dynamicLengthSet),
          new ForceVector(
            COLOR_APPLIED_FORCE,
            joint.pos,
            new Vector2(0, joint.load.y)
          ).dynamicLength(dynamicLengthSet),
        ]),
      ...state.joints
        .filter((joint) => solution.orf && (joint.support.x || joint.support.y))
        .flatMap((joint) => {
          const orf = solution.orf.get(joint.id);
          return [
            new ForceVector(
              COLOR_REACTION_FORCE,
              joint.pos,
              new Vector2(orf.x, 0)
            ).dynamicLength(dynamicLengthSet),
            new ForceVector(
              COLOR_REACTION_FORCE,
              joint.pos,
              new Vector2(0, orf.y)
            ).dynamicLength(dynamicLengthSet),
          ];
        }),
      ...state.joints.map((joint) => new LabeledPoint(joint.name, joint.pos)),
    ]);
  },
  joint: (
    context: RenderContext,
    state: State,
    solution: Solution,
    jointId: number
  ) => {
    render(context, [
      Grid,
      ...state.joints
        .filter((j) => j.id == jointId)
        .map((joint) => new LabeledPoint(joint.name, joint.pos)),
    ]);
  },
};
