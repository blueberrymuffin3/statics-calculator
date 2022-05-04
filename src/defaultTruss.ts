import { State, Vector2 } from "./math";

export const DEFAULT_TRUSS: State = {
  joints: [
    {
      id: 6,
      name: "A",
      pos: new Vector2(0, 0),
      load: new Vector2(0, 0),
      support: {
        x: true,
        y: true,
      },
    },
    {
      id: 7,
      name: "B",
      pos: new Vector2(5, 0),
      load: new Vector2(0, -250),
      support: {
        x: false,
        y: false,
      },
    },
    {
      id: 8,
      name: "C",
      pos: new Vector2(10, 0),
      load: new Vector2(0, 0),
      support: {
        x: false,
        y: true,
      },
    },
    {
      id: 11,
      name: "D",
      pos: new Vector2(3, 3),
      load: new Vector2(0, -1000),
      support: {
        x: false,
        y: false,
      },
    },
    {
      id: 14,
      name: "E",
      pos: new Vector2(7, 3),
      load: new Vector2(0, -500),
      support: {
        x: false,
        y: false,
      },
    },
  ],
  members: [
    {
      id: 18,
      jointIds: [6, 7],
    },
    {
      id: 19,
      jointIds: [6, 11],
    },
    {
      id: 20,
      jointIds: [7, 8],
    },
    {
      id: 21,
      jointIds: [7, 11],
    },
    {
      id: 22,
      jointIds: [7, 14],
    },
    {
      id: 23,
      jointIds: [8, 14],
    },
    {
      id: 24,
      jointIds: [11, 14],
    },
  ],
};
