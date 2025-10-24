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

function isWithinElement(x, y, element) {
  const tolerance = 5;

  const { type, x1, y1, x2, y2 } = element;

  switch (type) {
    case "line":
      const distance = pointToLineSegmentDistance(x, y, x1, y1, x2, y2);
      return distance < tolerance;

    case "rectangle":
      const minX = Math.min(x1, x2);
      const minY = Math.min(y1, y2);
      const maxX = Math.max(x1, x2);
      const maxY = Math.max(y1, y2);

      return x >= minX && x <= maxX && y >= minY && y <= maxY;

    case "diamond":
      const centerX = (x1 + x2) / 2;
      const centerY = (y1 + y2) / 2;
      const halfWidth = Math.abs(x2 - x1) / 2;
      const halfHeight = Math.abs(y2 - y1) / 2;

      const value =
        Math.abs(x - centerX) / halfWidth + Math.abs(y - centerY) / halfHeight;
      return value <= 1;
    default:
      return false;
  }
}

function getElementAtPosition(x, y, elements) {
  return (
    elements
      .slice()
      .reverse()
      .find((element) => isWithinElement(x, y, element)) || null
  );
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
    case "diamond":
      const minX = Math.min(x1, x2);
      const minY = Math.min(y1, y2);
      const maxX = Math.max(x1, x2);
      const maxY = Math.max(y1, y2);

      return { x1: minX, y1: minY, x2: maxX, y2: maxY };
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

    if (tool === "selection") {
      event.target.style.cursor = getElementAtPosition(x, y, elements)
        ? "grab"
        : "default";
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
