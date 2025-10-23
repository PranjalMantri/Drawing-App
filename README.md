# Drawing App: Step-by-Step Notes

These are raw, step-by-step notes to build the drawing app from the ground up. Follow each section in order to build the app point by point.

---

## 1. Setting Up the Drawing Board

- We use the HTML canvas api for drawing.
- See the sample code to understand how we can draw various shapes.
- Example: draw a rectangle and a line on the canvas using `ctx.rect`, `ctx.lineTo`, etc.
- Right now we give static coordinates, soon we will change that to get real coords from user mouse movements.

### Basic Steps

1. Get the canvas element and its context.
2. Use canvas context methods to draw shapes (rectangles, lines, etc).
3. Draw the shapes on the canvas using context methods like `strokeRect`, `beginPath`, `moveTo`, `lineTo`, and `stroke`.

#### Code Example

```jsx
import { useLayoutEffect } from "react";

function App() {
  useLayoutEffect(() => {
    const canvas = document.getElementById("canvas");
    const ctx = canvas.getContext("2d");
    // Draw a rectangle
    ctx.strokeRect(10, 10, 150, 150);
    // Draw a line
    ctx.beginPath();
    ctx.moveTo(10, 10);
    ctx.lineTo(110, 110);
    ctx.stroke();
  }, []);

  return (
    <canvas
      id="canvas"
      width={window.innerWidth}
      height={window.innerHeight}
    ></canvas>
  );
}

export default App;
```

---

## 2. Getting User Mouse Moves

Drawing begins when user clicks with their mouse and drags it, for that we have some listeners attached to canvas.

- It is important to clear the canvas after each render, else it keeps redrawing the elements.
- We have a createElement function that will take the coords from user mouse movements, an object that has the coords and draw function for that element type.

To get coords we use the clientX and clientY fields from the event.

- On mouseDown, the starting position is clientX and clientY and same is the ending position so we create an element using that.
- On mouseMove, we get the last element, we take its starting position and update the ending position based on user's mouse movements.
- We create a new element based on the updated coords and overwrite the last element.
