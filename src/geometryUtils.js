export function pointToLineSegmentDistance(x, y, x1, y1, x2, y2) {
  const A = x - x1;
  const B = y - y1;
  const C = x2 - x1;
  const D = y2 - y1;

  const dot = A * C + B * D;
  const line_sq = C * C + D * D;

  let param = -1;
  if (line_sq !== 0) {
    param = dot / line_sq;
  }

  let xx, yy;

  if (param < 0) {
    xx = x1;
    yy = y1;
  } else if (param > 1) {
    xx = x2;
    yy = y2;
  } else {
    xx = x1 + param * C;
    yy = y1 + param * D;
  }

  const dx = x - xx;
  const dy = y - yy;

  return Math.sqrt(dx * dx + dy * dy);
}

export function nearPoint(x, y, x1, y1, name) {
  return Math.abs(x - x1) < 5 && Math.abs(y - y1) < 5 ? name : null;
}

export function positionWithinElement(x, y, element) {
  const tolerance = 5;
  const borderTolerance = 0.1;

  const { type, x1, y1, x2, y2 } = element;

  switch (type) {
    case "line":
      const startPoint = nearPoint(x, y, x1, y1, "start");
      if (startPoint) return startPoint;

      const endPoint = nearPoint(x, y, x2, y2, "end");
      if (endPoint) return endPoint;

      const distance = pointToLineSegmentDistance(x, y, x1, y1, x2, y2);
      return distance < tolerance ? "inside" : null;
    case "text":
    case "rectangle":
      const topLeft = nearPoint(x, y, x1, y1, "tl");
      const topRight = nearPoint(x, y, x2, y1, "tr");
      const bottomLeft = nearPoint(x, y, x1, y2, "bl");
      const bottomRight = nearPoint(x, y, x2, y2, "br");
      const inside = x >= x1 && x <= x2 && y >= y1 && y <= y2 ? "inside" : null;

      return topLeft || topRight || bottomLeft || bottomRight || inside;
    case "diamond":
      const centerX = (x1 + x2) / 2;
      const centerY = (y1 + y2) / 2;

      const top = nearPoint(x, y, centerX, y1, "top");
      if (top) return top;
      const right = nearPoint(x, y, x2, centerY, "right");
      if (right) return right;
      const bottom = nearPoint(x, y, centerX, y2, "bottom");
      if (bottom) return bottom;
      const left = nearPoint(x, y, x1, centerY, "left");
      if (left) return left;

      const halfWidth = Math.abs(x2 - x1) / 2;
      const halfHeight = Math.abs(y2 - y1) / 2;

      if (halfWidth === 0 || halfHeight === 0) return null;

      const value =
        Math.abs(x - centerX) / halfWidth + Math.abs(y - centerY) / halfHeight;

      if (value < 1 - borderTolerance) {
        return "inside";
      }

      return null;

    case "circle":
      const cX = (x1 + x2) / 2;
      const cY = (y1 + y2) / 2;

      const radius = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2) / 2;
      const dist = Math.sqrt((x - cX) ** 2 + (y - cY) ** 2);

      // Detect near the border
      if (Math.abs(dist - radius) <= tolerance) {
        const angle = Math.atan2(y - cY, x - cX);
        const piOverEight = Math.PI / 8;

        // Check for diagonal quadrants
        if (angle > -piOverEight && angle <= piOverEight) return "right";
        if (angle > piOverEight && angle <= 3 * piOverEight) return "br";
        if (angle > 3 * piOverEight && angle <= 5 * piOverEight)
          return "bottom";
        if (angle > 5 * piOverEight && angle <= 7 * piOverEight) return "bl";
        if (angle > 7 * piOverEight || angle <= -7 * piOverEight) return "left";
        if (angle > -7 * piOverEight && angle <= -5 * piOverEight) return "tl";
        if (angle > -5 * piOverEight && angle <= -3 * piOverEight) return "top";
        if (angle > -3 * piOverEight && angle <= -piOverEight) return "tr";
      }

      // Check if inside the circle
      if (dist < radius - tolerance) {
        return "inside";
      }

      const pointTolerance = radius;
      const points = [
        { name: "top", x: cX, y: cY - pointTolerance },
        { name: "bottom", x: cX, y: cY + pointTolerance },
        { name: "left", x: cX - pointTolerance, y: cY },
        { name: "right", x: cX + pointTolerance, y: cY },
        {
          name: "tl",
          x: cX - pointTolerance / Math.SQRT2,
          y: cY - pointTolerance / Math.SQRT2,
        },
        {
          name: "tr",
          x: cX + pointTolerance / Math.SQRT2,
          y: cY - pointTolerance / Math.SQRT2,
        },
        {
          name: "bl",
          x: cX - pointTolerance / Math.SQRT2,
          y: cY + pointTolerance / Math.SQRT2,
        },
        {
          name: "br",
          x: cX + pointTolerance / Math.SQRT2,
          y: cY + pointTolerance / Math.SQRT2,
        },
      ];

      for (const p of points) {
        const near = nearPoint(x, y, p.x, p.y, p.name);
        if (near) return near;
      }

      return null;

    case "pencil":
      const betweenAnyPoint = element.points.some((point, index) => {
        const nextPoint = element.points[index + 1];
        if (!nextPoint) return;

        return (
          pointToLineSegmentDistance(
            x,
            y,
            point.x,
            point.y,
            nextPoint.x,
            nextPoint.y
          ) < tolerance
        );
      });

      return betweenAnyPoint ? "inside" : null;
    default:
      return false;
  }
}
