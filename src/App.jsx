import { useLayoutEffect, useState } from "react";

function createElement(x1, y1, x2, y2, type) {
  switch (type) {
    case "line":
      return {
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
        type,
        x1,
        y1,
        x2,
        y2,
        draw: (ctx) => {
          ctx.strokeRect(x1, y1, x2 - x1, y2 - y1);
        },
      };
    default:
      throw new Error("Unknown element type: " + type);
  }
}

function App() {
  const [elementType, setElementType] = useState("line");
  const [elements, setElements] = useState([]);
  const [isDrawing, setIsDrawing] = useState(false);

  useLayoutEffect(() => {
    const canvas = document.getElementById("canvas");
    const ctx = canvas.getContext("2d");

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    elements.forEach((element) => element.draw(ctx));
  }, [elements]);

  const handleMouseDown = (event) => {
    setIsDrawing(true);

    // we create an element at the initial mouse position
    const { clientX, clientY } = event;
    const element = createElement(
      clientX,
      clientY,
      clientX,
      clientY,
      elementType
    );

    setElements((prevElements) => [...prevElements, element]);
  };

  const handleMouseMove = (event) => {
    if (!isDrawing) return;

    // when the mouse moves, we update the last created element
    // the starting position will remain what it was but its x2, y2 is the position where the client stops moving their mouse
    const { clientX, clientY } = event;

    // getting the starting position of last element
    const lastIndex = elements.length - 1;
    const { x1, y1 } = elements[lastIndex];

    // creating a new element and overwriting it as the last element
    const newElement = createElement(x1, y1, clientX, clientY, elementType);

    const elementCopy = [...elements];
    elementCopy[lastIndex] = newElement;
    setElements(elementCopy);
  };

  const handleMouseUp = () => {
    setIsDrawing(false);
  };

  return (
    <div>
      <div>
        <input
          type="radio"
          name="elementType"
          value={"line"}
          checked={elementType === "line"}
          onChange={() => setElementType("line")}
        />
        <label htmlFor="line">Line</label>
        <input
          type="radio"
          name="elementType"
          value={"rectangle"}
          checked={elementType === "rectangle"}
          onChange={() => setElementType("rectangle")}
        />
        <label htmlFor="rectangle">Rectangle</label>
      </div>
      <canvas
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
