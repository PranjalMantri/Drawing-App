import { useLayoutEffect, useRef, useState } from "react";

function createElement(x1, y1, x2, y2, type, id) {
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

function pointToLineSegmentDistance(x, y, x1, y1, x2, y2) {
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

function nearPoint(x, y, x1, y1, name) {
  return Math.abs(x - x1) < 5 && Math.abs(y - y1) < 5 ? name : null;
}

function positionWithinElement(x, y, element) {
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
      return distance < tolerance ? "onLine" : null;
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

      if (Math.abs(value - 1) < borderTolerance) {
        // On an edge (but not a vertex)
        if (x > centerX && y < centerY) return "tr";
        if (x > centerX && y > centerY) return "br";
        if (x < centerX && y > centerY) return "bl";
        if (x < centerX && y < centerY) return "tl";
        return "onBorder"; // Fallback
      }

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

      // Extra precision — near the main axis points of the circle
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
    default:
      return false;
  }
}

function getElementAtPosition(x, y, elements) {
  return elements
    .map((element) => ({
      ...element,
      position: positionWithinElement(x, y, element),
    }))
    .find((element) => element.position !== null);
}

function adjustElementCoordinates(element) {
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

function getCursorForPosition(position) {
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
    case "onLine":
      return "grab";

    default:
      return "auto";
  }
}

function App() {
  const [tool, setTool] = useState("line");
  const [elements, setElements] = useState([]);
  const [selectedElement, setSelectedElement] = useState(null);
  const [action, setAction] = useState("none");

  const canvasRef = useRef(null);

  useLayoutEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    elements.forEach((element) => {
      element.draw(ctx);
    });
  }, [elements]);

  const updateElement = (id, x1, y1, x2, y2, type) => {
    const updatedElement = createElement(x1, y1, x2, y2, type, id);

    const elementsCopy = [...elements];
    const oldElementId = elementsCopy.findIndex(
      (element) => element.elementId === id
    );

    if (oldElementId !== -1) {
      elementsCopy[oldElementId] = updatedElement;
      setElements(elementsCopy);
    }
  };

  const handleMouseDown = (event) => {
    const { clientX, clientY } = event;
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();

    const x = clientX - rect.left;
    const y = clientY - rect.top;

    if (tool === "selection") {
      const element = getElementAtPosition(x, y, elements);
      if (!element) return;

      const offsetX = clientX - element.x1;
      const offsetY = clientY - element.y1;

      setSelectedElement({ ...element, offsetX, offsetY });
      setAction("moving");
    } else {
      // we create an element at the initial mouse position
      const element = createElement(x, y, x, y, tool);

      setElements((prevElements) => [...prevElements, element]);
      setAction("drawing");
    }
  };

  const handleMouseMove = (event) => {
    const { clientX, clientY } = event;
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();

    const x = clientX - rect.left;
    const y = clientY - rect.top;

    if (action === "none") {
      event.target.style.cursor = "default";
    }

    if (tool === "selection") {
      const element = getElementAtPosition(x, y, elements);

      if (element) {
        event.target.style.cursor = getCursorForPosition(element.position);
      }
    }

    if (action === "drawing") {
      // when the mouse moves, we update the last created element
      // the starting position will remain what it was but its x2, y2 is the position where the client stops moving their mouse

      // getting the starting position of last element
      const lastIndex = elements.length - 1;
      const { x1, y1, elementId } = elements[lastIndex];

      updateElement(elementId, x1, y1, x, y, tool);
    } else if (action === "moving" && selectedElement) {
      const {
        elementId: id,
        type,
        x1,
        y1,
        x2,
        y2,
        offsetX,
        offsetY,
      } = selectedElement;

      const width = x2 - x1;
      const height = y2 - y1;

      const newX = clientX - offsetX;
      const newY = clientY - offsetY;

      updateElement(id, newX, newY, newX + width, newY + height, type);
    }
  };

  const handleMouseUp = () => {
    if (action === "drawing") {
      const lastIndex = elements.length - 1;
      const { elementId, type } = elements[lastIndex];

      const { x1, y1, x2, y2 } = adjustElementCoordinates(elements[lastIndex]);
      updateElement(elementId, x1, y1, x2, y2, type);
    }

    setAction("none");
    setSelectedElement(null);
  };

  return (
    <div>
      <div>
        <input
          type="radio"
          name="actionType"
          value={"line"}
          checked={tool === "line"}
          onChange={() => setTool("line")}
        />
        <label htmlFor="line">Line</label>
        <input
          type="radio"
          name="actionType"
          value={"rectangle"}
          checked={tool === "rectangle"}
          onChange={() => setTool("rectangle")}
        />
        <label htmlFor="rectangle">Rectangle</label>
        <input
          type="radio"
          name="actionType"
          value={"diamond"}
          checked={tool === "diamond"}
          onChange={() => setTool("diamond")}
        />
        <label htmlFor="diamond">Diamond</label>
        <input
          type="radio"
          name="actionType"
          value={"circle"}
          checked={tool === "circle"}
          onChange={() => setTool("circle")}
        />
        <label htmlFor="circle">Circle</label>
        <input
          type="radio"
          name="actionType"
          value={"selection"}
          checked={tool === "selection"}
          onChange={() => setTool("selection")}
        />
        <label htmlFor="selection">Selection</label>
      </div>
      <canvas
        ref={canvasRef}
        id="canvas"
        width={window.innerWidth}
        height={window.innerHeight}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
      ></canvas>
    </div>
  );
}

export default App;
