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
      };

    case "diamond":
      return {
        elementId,
        type,
        x1,
        y1,
        x2,
        y2,
        draw: (ctx) => {
          const midX = (x1 + x2) / 2;
          const midY = (y1 + y2) / 2;

          ctx.beginPath();
          ctx.moveTo(midX, y1);
          ctx.lineTo(x2, midY);
          ctx.lineTo(midX, y2);
          ctx.lineTo(x1, midY);
          ctx.closePath();
          ctx.stroke();
        },
      };

    case "circle":
      return {
        elementId,
        type,
        x1,
        y1,
        x2,
        y2,
        draw: (ctx) => {
          const centerX = (x1 + x2) / 2;
          const centerY = (y1 + y2) / 2;
          const radius =
            Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2)) / 2;

          ctx.beginPath();
          ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
          ctx.stroke();
        },
      };
    default:
      throw new Error("Unknown element type: " + type);
  }
}
