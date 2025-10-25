import { useLayoutEffect, useEffect, useRef, useState } from "react";
import rough from "roughjs/bundled/rough.esm";
import { createElement } from "./elementFactory";
import {
  adjustElementCoordinates,
  getCursorForPosition,
  getElementAtPosition,
  resizedCoordinates,
} from "./elementUtils";
import useHistory from "./hooks/useHistory";
import usePressedKeys from "./hooks/usePressedKeys";
import getStroke from "perfect-freehand";

const average = (a, b) => (a + b) / 2;

const adjustmentRequired = (type) =>
  ["line", "rectangle", "circle", "diamond"].includes(type);

function getSvgPathFromStroke(points, closed = true) {
  const len = points.length;

  if (len < 4) {
    return ``;
  }

  let a = points[0];
  let b = points[1];
  const c = points[2];

  let result = `M${a[0].toFixed(2)},${a[1].toFixed(2)} Q${b[0].toFixed(
    2
  )},${b[1].toFixed(2)} ${average(b[0], c[0]).toFixed(2)},${average(
    b[1],
    c[1]
  ).toFixed(2)} T`;

  for (let i = 2, max = len - 1; i < max; i++) {
    a = points[i];
    b = points[i + 1];
    result += `${average(a[0], b[0]).toFixed(2)},${average(a[1], b[1]).toFixed(
      2
    )} `;
  }

  if (closed) {
    result += "Z";
  }

  return result;
}

const drawElement = (roughCanvas, context, element) => {
  switch (element.type) {
    case "line":
    case "rectangle":
    case "diamond":
    case "circle":
      roughCanvas.draw(element.roughElement);
      break;
    case "pencil":
      const stroke = getSvgPathFromStroke(
        getStroke(element.points, { size: 8 })
      );
      context.fill(new Path2D(stroke));
      break;
    case "text":
      context.textBaseline = "top";
      context.font = "24px sans-serif";
      context.fillText(element.text, element.x1, element.y1);
      break;
    default:
      throw new Error(`Type not recognised: ${element.type}`);
  }
};

function App() {
  const [tool, setTool] = useState("text");
  const [elements, setElements, undo, redo] = useHistory([]);
  const [selectedElement, setSelectedElement] = useState(null);
  const [action, setAction] = useState("none");
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [startPanMousePosition, setStartPanMousePosition] = useState({
    x: 0,
    y: 0,
  });
  const pressedKeys = usePressedKeys();

  const canvasRef = useRef(null);
  const textAreaRef = useRef(null);

  useLayoutEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const roughCanvas = rough.canvas(canvas);

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();

    ctx.translate(panOffset.x, panOffset.y);

    elements.forEach((element) => {
      if (
        action === "writing" &&
        selectedElement.elementId === element.elementId
      )
        return;

      drawElement(roughCanvas, ctx, element);
    });

    ctx.restore();
  }, [elements, action, selectedElement, panOffset]);

  useEffect(() => {
    if (action === "writing") {
      const textArea = textAreaRef.current;
      setTimeout(() => textArea.focus(), 0);
      textArea.value = selectedElement.text;
    }
  }, [action, selectedElement]);

  useEffect(() => {
    const undoRedoFunction = (event) => {
      if (event.metaKey || event.ctrlKey) {
        if (event.key.toLowerCase() === "z") {
          undo();
        } else if (event.key.toLowerCase() === "y") {
          redo();
        }
      }
    };

    document.addEventListener("keydown", undoRedoFunction);
    return () => document.removeEventListener("keydown", undoRedoFunction);
  }, [undo, redo]);

  useEffect(() => {
    const panFunction = (event) => {
      setPanOffset((prevState) => ({
        x: prevState.x - event.deltaX,
        y: prevState.y - event.deltaY,
      }));
    };

    document.addEventListener("wheel", panFunction);
    return () => {
      document.removeEventListener("wheel", panFunction);
    };
  }, []);

  const updateElement = (id, x1, y1, x2, y2, type, options) => {
    const elementsCopy = [...elements];
    const oldElementId = elementsCopy.findIndex(
      (element) => element.elementId === id
    );

    switch (type) {
      case "line":
      case "rectangle":
      case "diamond":
      case "circle":
        elementsCopy[oldElementId] = createElement(x1, y1, x2, y2, type, id);
        break;
      case "pencil":
        elementsCopy[oldElementId].points = [
          ...elementsCopy[oldElementId].points,
          { x: x2, y: y2 },
        ];
        break;
      case "text":
        const textWidth = canvasRef.current
          .getContext("2d")
          .measureText(options.text).width;
        const textHeight = 24;
        elementsCopy[oldElementId] = {
          ...createElement(x1, y1, x1 + textWidth, y1 + textHeight, type, id),
          text: options.text,
        };
        break;
      default:
        throw new Error("Invalid type: ", type);
    }

    setElements(elementsCopy, true);
  };

  const getMouseCoordinates = (event) => {
    const clientX = event.clientX - panOffset.x;
    const clientY = event.clientY - panOffset.y;
    return { clientX, clientY };
  };

  const handleMouseDown = (event) => {
    if (action === "writing") return;

    const { clientX, clientY } = getMouseCoordinates(event);
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();

    const x = clientX - rect.left;
    const y = clientY - rect.top;

    if (event.button === 1 || pressedKeys.has(" ")) {
      setAction("panning");
      setStartPanMousePosition({ x: clientX, y: clientY });
      return;
    }

    if (tool === "selection") {
      const element = getElementAtPosition(x, y, elements);
      if (!element) return;

      if (element.type === "pencil") {
        const xOffsets = element.points.map((point) => clientX - point.x);
        const yOffsets = element.points.map((point) => clientY - point.y);

        setSelectedElement({ ...element, xOffsets, yOffsets });
      } else {
        const offsetX = clientX - element.x1;
        const offsetY = clientY - element.y1;

        setSelectedElement({ ...element, offsetX, offsetY });
      }
      setElements((prev) => prev);

      if (element.position === "inside") {
        setAction("moving");
      } else {
        setAction("resizing");
      }
    } else {
      // we create an element at the initial mouse position
      const element = createElement(x, y, x, y, tool);

      setElements((prevElements) => [...prevElements, element]);
      setSelectedElement(element);
      setAction(tool === "text" ? "writing" : "drawing");
    }
  };

  const handleMouseMove = (event) => {
    const { clientX, clientY } = getMouseCoordinates(event);
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();

    const x = clientX - rect.left;
    const y = clientY - rect.top;

    if (action === "panning") {
      const deltaX = clientX - startPanMousePosition.x;
      const deltaY = clientY - startPanMousePosition.y;
      setPanOffset((prevState) => ({
        x: prevState.x + deltaX,
        y: prevState.y + deltaY,
      }));
      return;
    }

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

      if (selectedElement.type === "pencil") {
        const newPoints = selectedElement.points.map((_, index) => ({
          x: clientX - selectedElement.xOffsets[index],
          y: clientY - selectedElement.yOffsets[index],
        }));

        const newElement = { ...selectedElement, points: newPoints };

        const index = elements.findIndex((element) => element.elementId === id);
        const elementsCopy = [...elements];
        elementsCopy[index] = newElement;
        setElements(elementsCopy, true);
      } else {
        const {
          id: elementId,
          x1,
          x2,
          y1,
          y2,
          type,
          offsetX,
          offsetY,
        } = selectedElement;

        const width = x2 - x1;
        const height = y2 - y1;
        const newX1 = clientX - offsetX;
        const newY1 = clientY - offsetY;
        const options = type === "text" ? { text: selectedElement.text } : {};

        updateElement(
          id,
          newX1,
          newY1,
          newX1 + width,
          newY1 + height,
          type,
          options
        );
      }
    } else if (action === "resizing") {
      const { elementId, type, position, ...coordinates } = selectedElement;
      const { x1, y1, x2, y2 } = resizedCoordinates(
        clientX,
        clientY,
        position,
        coordinates,
        type
      );

      updateElement(elementId, x1, y1, x2, y2, type);
    }
  };

  const handleMouseUp = (event) => {
    const { clientX, clientY } = getMouseCoordinates(event);

    if (!selectedElement) {
      setAction("none");
      return;
    }

    const { elementId, type } = selectedElement;

    if (
      (action === "drawing" || action === "resizing") &&
      adjustmentRequired(type)
    ) {
      const element = elements.find((el) => el.elementId === elementId);

      const { x1, y1, x2, y2 } = adjustElementCoordinates(element);
      updateElement(elementId, x1, y1, x2, y2, type);
    }

    if (
      selectedElement.type === "text" &&
      selectedElement.x1 === clientX - selectedElement.offsetX &&
      selectedElement.y1 === clientY - selectedElement.offsetY
    ) {
      setAction("writing");
      return;
    } else {
      setSelectedElement(null);
    }

    setAction("none");
  };

  const handleBlur = (event) => {
    const { elementId, x1, y1, type } = selectedElement;

    setSelectedElement(null);
    setAction("none");

    updateElement(elementId, x1, y1, null, null, type, {
      text: event.target.value,
    });
  };

  return (
    <div>
      <div style={{ zIndex: 2 }}>
        <div style={{ position: "absolute", bottom: "0px", padding: "4px" }}>
          <button onClick={undo}>Undo</button>
          <button onClick={redo}>Redo</button>
        </div>
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
          value={"pencil"}
          checked={tool === "pencil"}
          onChange={() => setTool("pencil")}
        />
        <label htmlFor="pencil">Pencil</label>
        <input
          type="radio"
          name="actionType"
          value={"text"}
          checked={tool === "text"}
          onChange={() => setTool("text")}
        />
        <label htmlFor="text">Text</label>
        <input
          type="radio"
          name="actionType"
          value={"selection"}
          checked={tool === "selection"}
          onChange={() => setTool("selection")}
        />
        <label htmlFor="selection">Selection</label>
      </div>
      {action === "writing" ? (
        <textarea
          ref={textAreaRef}
          onBlur={handleBlur}
          style={{
            position: "fixed",
            top: selectedElement.y1 + 15 + panOffset.y,
            left: selectedElement.x1 + panOffset.x,
            font: "24px sans-serif",
            margin: 0,
            padding: 0,
            border: 0,
            outline: 0,
            resize: "auto",
            overflow: "hidden",
            whiteSpace: "pre",
            background: "transparent",
            zIndex: 2,
          }}
        />
      ) : null}
      <canvas
        ref={canvasRef}
        id="canvas"
        width={window.innerWidth}
        height={window.innerHeight}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        style={{ position: "absolute", zIndex: 1 }}
      ></canvas>
    </div>
  );
}

export default App;
