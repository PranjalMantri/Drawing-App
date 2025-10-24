import { positionWithinElement } from "./geometryUtils";

export function getElementAtPosition(x, y, elements) {
  return elements
    .map((element) => ({
      ...element,
      position: positionWithinElement(x, y, element),
    }))
    .find((element) => element.position !== null);
}

export function adjustElementCoordinates(element) {
  const { type, x1, y1, x2, y2 } = element;

  switch (type) {
    case "line":
      if (x1 < x2 || (x1 == x2 && y1 < y2)) {
        return { x1, y1, x2, y2 };
      } else {
        return { x1: x2, y1: y2, x2: x1, y2: y1 };
      }
    case "rectangle":
    case "circle":
    case "diamond":
      const minX = Math.min(x1, x2);
      const minY = Math.min(y1, y2);
      const maxX = Math.max(x1, x2);
      const maxY = Math.max(y1, y2);

      return { x1: minX, y1: minY, x2: maxX, y2: maxY };
  }
}

export function getCursorForPosition(position) {
  switch (position) {
    // Diagonal resize (Top-Left <=> Bottom-Right)
    case "tl":
    case "br":
    case "start":
    case "end":
      return "nwse-resize";

    // Diagonal resize (Top-Right <=> Bottom-Left)
    case "tr":
    case "bl":
      return "nesw-resize";

    // Vertical resize (Top <=> Bottom)
    case "top":
    case "bottom":
      return "ns-resize";

    // Horizontal resize (Left <=> Right)
    case "left":
    case "right":
      return "ew-resize";

    case "inside":
      return "grab";

    default:
      return "auto";
  }
}

export function resizedCoordinates(
  clientX,
  clientY,
  position,
  coordinates,
  type
) {
  const { x1, y1, x2, y2 } = coordinates;

  switch (type) {
    case "line":
    case "rectangle":
      switch (position) {
        case "tl":
        case "start":
          return { x1: clientX, y1: clientY, x2, y2 };
        case "tr":
          return { x1, y1: clientY, x2: clientX, y2 };
        case "bl":
          return { x1: clientX, y1, x2, y2: clientY };
        case "br":
        case "end":
          return { x1, y1, x2: clientX, y2: clientY };
        default:
          console.log("invalid position");
          return null;
      }

    case "circle":
      switch (position) {
        case "tl":
          return { x1: clientX, y1: clientY, x2, y2 };
        case "tr":
          return { x1, y1: clientY, x2: clientX, y2 };
        case "bl":
          return { x1: clientX, y1, x2, y2: clientY };
        case "br":
          return { x1, y1, x2: clientX, y2: clientY };
        case "top":
          return { x1, y1: clientY, x2, y2: y1 + y2 - clientY };
        case "bottom":
          return { x1, y1: y1 + y2 - clientY, x2, y2: clientY };
        case "left":
          return { x1: clientX, y1, x2, y2 };
        case "right":
          return { x1, y1, x2: clientX, y2 };
        default:
          return null;
      }
      return;

    case "diamond":
      switch (position) {
        case "top":
          return { x1, y1: clientY, x2, y2: y1 + y2 - clientY };
        case "bottom":
          return { x1, y1: y1 + y2 - clientY, x2, y2: clientY };
        case "left":
          return { x1: clientX, y1, x2: x1 + x2 - clientX, y2 };
        case "right":
          return { x1: x1 + x2 - clientX, y1, x2: clientX, y2 };
        default:
          console.log("invalid position");
          return null;
      }

    default:
      console.log("unknown type", type);
      return null;
  }
}
