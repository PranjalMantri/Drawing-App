import { useLayoutEffect, useEffect, useRef, useState } from "react";
import { createElement } from "./elementFactory";
import {
  adjustElementCoordinates,
  getCursorForPosition,
  getElementAtPosition,
  resizedCoordinates,
} from "./elementUtils";
import useHistory from "./hooks/useHistory";

function App() {
  const [tool, setTool] = useState("line");
  const [elements, setElements, undo, redo] = useHistory([]);
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

  const updateElement = (id, x1, y1, x2, y2, type) => {
    const updatedElement = createElement(x1, y1, x2, y2, type, id);

    const elementsCopy = [...elements];
    const oldElementId = elementsCopy.findIndex(
      (element) => element.elementId === id
    );

    if (oldElementId !== -1) {
      elementsCopy[oldElementId] = updatedElement;
      setElements(elementsCopy, true);
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

  const handleMouseUp = () => {
    if (!selectedElement) {
      setAction("none");
      return;
    }

    const { elementId, type } = selectedElement;

    if (action === "drawing" || action === "resizing") {
      const element = elements.find((el) => el.elementId === elementId);

      const { x1, y1, x2, y2 } = adjustElementCoordinates(element);
      updateElement(elementId, x1, y1, x2, y2, type);
    }

    setAction("none");
    setSelectedElement(null);
  };

  return (
    <div>
      <div>
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
