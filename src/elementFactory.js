import rough from "roughjs/bundled/rough.esm";

const generator = rough.generator();

export function createElement(x1, y1, x2, y2, type, id) {
  const elementId = id ?? Date.now();
  switch (type) {
    case "line":
      return {
        elementId,
        type,
        x1,
        y1,
        x2,
        y2,
        draw: (ctx) => {
          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
          ctx.stroke();
        },
        roughElement: generator.line(x1, y1, x2, y2),
      };

    case "rectangle":
      return {
        elementId,
        type,
        x1,
        y1,
        x2,
        y2,
        draw: (ctx) => {
          ctx.strokeRect(x1, y1, x2 - x1, y2 - y1);
        },
        roughElement: generator.rectangle(x1, y1, x2 - x1, y2 - y1),
      };

    case "diamond":
      const midX = (x1 + x2) / 2;
      const midY = (y1 + y2) / 2;
      const vertices = [
        [midX, y1],
        [x2, midY],
        [midX, y2],
        [x1, midY],
      ];

      return {
        elementId,
        type,
        x1,
        y1,
        x2,
        y2,
        draw: (ctx) => {
          ctx.beginPath();
          ctx.moveTo(midX, y1);
          ctx.lineTo(x2, midY);
          ctx.lineTo(midX, y2);
          ctx.lineTo(x1, midY);
          ctx.closePath();
          ctx.stroke();
        },
        roughElement: generator.polygon(vertices),
      };

    case "circle":
      const centerX = (x1 + x2) / 2;
      const centerY = (y1 + y2) / 2;
      const diameter = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));

      return {
        elementId,
        type,
        x1,
        y1,
        x2,
        y2,
        draw: (ctx) => {
          ctx.beginPath();
          ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
          ctx.stroke();
        },
        roughElement: generator.circle(centerX, centerY, diameter),
      };

    case "pencil":
      return { elementId, type, points: [{ x: x1, y: y1 }] };
    case "text":
      return {
        elementId,
        type,
        x1,
        y1,
        x2,
        y2,
        text: "",
      };
    default:
      throw new Error("Unknown element type: " + type);
  }
}
