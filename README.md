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

## 3 Selection Tool

Before implementing selection functionality we made a couple of changes:

- We now use the useRef hook to get access to the canvas.
- We updated the createElement function to also return an id for each element.
- This id is used to update the element, using updateElement function.
- We introduced a new tool state to keep track of what tool we are using at the moment.
- If the tool is selection, the action is moving; for a shape, the action is drawing.

### There are 2 steps to implement the selection tool:

1. Actually selecting the element
2. Moving the element to a new position

### Selecting the element:

- This is done by checking whether the mouse click is inside or very close to the elements.
- For rectangles, we check if the clicked point lies inside the rectangle or not.
- For a line segment, we use pointToLineSegmentDistance function to get the distance between the clicked point and the line.
- If the distance is less than the tolerance (5 pixels) we consider it as selected.

### `pointToLineSegmentDistance()` function:

- This function finds the distance between a point and the closest point to it on a line segment.
- If the point is parallel (not literally) to the line, then its closest point on the line segment will be perpendicular to it.
- If the point is before the starting point, its closest point will be the starting point.
- If the point is beyond the ending point, its closest point will be the ending point.

### Moving the element:

- When moving the element, the height and width remain the same to keep the same shape.
- The starting position changes based on mouse move.
- When moving, we get the user's click position.
- If the user clicks in the middle of the rectangle, then there is some offset between the starting position and user's clicked position. We calculate this offset and use it in updating, else moving the element feels too snappy.

## 4. Resizing Elements

Resizing elements involves several steps to ensure smooth and intuitive user interaction:

1. **Consistent Coordinates:**

- No matter how the shape is drawn, `x1`, `y1` are always the smaller values and represent the starting point.
- This keeps the shape's coordinates consistent.

2. **New Shapes:**

- Added support for diamond and circle shapes.

3. **Resizing Logic:**

- Resizing is similar to selection, but only works on the edges of an element.
- If an element is selected by its edge, resizing is allowed.
- The `isWithinElement` function is modified and renamed to `positionWithinElement` to get the exact position of the user's click.
- Getting the exact position (e.g., topLeft, topRight, etc.) is crucial for resizing, as it helps adjust the coordinates of the resized element.

4. **Coordinate Adjustment:**

- The `resizeCoordinates` function returns the updated coordinates for the resized element.
- The `adjustElementCoordinates` function ensures that `x1`, `y1` are always the smaller values, keeping them as the starting point.

5. **Cursor Feedback:**

- Based on the position of the user's mouse, the cursor changes for selecting or resizing.
- This is handled by the `getCursorForPosition` function.

## 5. Undo/Redo Functionality

- For this functionality we need to maintain the history of the state of our entire canvas, for this we use the `useHistory` custom hook.
- It stores the entire history of the canvas and also the index at which the current state of the canvas is.
- It provides undo and redo functions that update this index.

That's the main thing in the part, we just integrate this hook with our app, undo/redo works now.

Also added keybinds:

- **CTRL + Z** for Undo
- **CTRL + Y** for Redo

## 6. Pencil Tool

The Pencil tool allows freehand drawing on the canvas, we implement it using `perfect-freehand` library.

### How It Works

- When the Pencil tool is selected, mouse movements are tracked as a series of points while the user drags on the canvas.
- These points are converted into a smooth stroke using the `perfect-freehand` library, which generates a natural-looking path.
- The stroke is rendered using SVG path data and filled on the canvas for a hand-drawn effect.

### Implementation Details

- Each pencil element stores an array of points representing the user's drawing path.
- The `getSvgPathFromStroke` function converts these points into an SVG path string for rendering.
- The `drawElement` function detects the `pencil` type and fills the path using the canvas context.

# 7. Text Tool

The Text tool allows users to add and edit text directly on the canvas.

### How It Works

- When the Text tool is selected, clicking on the canvas creates a new text element at the clicked position.
- A textarea appears at that location, allowing the user to type their text.
- When the textarea loses focus (blur), the entered text is saved and rendered on the canvas.

### Implementation Details

- The `createElement` function in `elementFactory.js` supports a `"text"` type, initializing a text element with coordinates and an empty string.
- In `App.jsx`, the `drawElement` function detects `"text"` elements and uses the canvas context’s `fillText` method to render the text at the specified position.
- On mouse down, if the tool is `"text"`, a new text element is created at the mouse position and the app enters `"writing"` mode.
- A textarea is rendered at the text element’s coordinates for user input.
- On blur (when the textarea loses focus), the text is saved to the element and the textarea is removed.
- The `updateElement` function updates the text element’s content and recalculates its width and height based on the entered text.

# 8. Panning

Panning allows users to move the entire canvas view by dragging or using the mouse wheel or holding the space bar, making it easier to navigate large drawings.

## How Panning Works

- **Mouse Wheel:**

  - The app listens for the `wheel` event on the document. When the user scrolls, the canvas view shifts by updating the `panOffset` state with the wheel's delta values (`event.deltaX`, `event.deltaY`).
  - This offset is applied to the canvas context using `ctx.translate(panOffset.x, panOffset.y)` so all elements are drawn relative to the current pan position.

- **Mouse Drag:**

  - If the user presses the middle mouse button or holds the spacebar and drags, the app enters `panning` mode.
  - On mouse down, the starting mouse position is stored (`startPanMousePosition`).
  - As the mouse moves, the difference between the current and starting position is calculated, and `panOffset` is updated accordingly.
  - This lets users drag the canvas in any direction for precise control.

  - The `panOffset` state is used throughout the app to adjust mouse coordinates and drawing logic.
  - All drawing operations are wrapped in `ctx.save()` and `ctx.restore()` to ensure panning does not affect other canvas state.
  - Panning works seamlessly with other tools by offsetting all mouse events and rendering logic.
