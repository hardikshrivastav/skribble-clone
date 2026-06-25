import {
  useState,
  useEffect,
  useRef,
  useContext,
} from "react";

import {
  GameContext,
} from "../context/GameContext";

import {
  socket,
} from "../services/socket";

function DrawingCanvas() {

  const {
    drawerId,
    roomId,
  } = useContext(GameContext);

  const canvasRef =
    useRef(null);

  const drawing =
    useRef(false);

  const [color, setColor] =
  useState("#111827");

  const previousPoint =
    useRef(null);

  const [brushSize,
  setBrushSize] =
  useState(4);
  
  const [eraser,
  setEraser] =
  useState(false);

  const isDrawer =
    socket.id === drawerId;

  const drawLine = (
    context,
    startX,
    startY,
    endX,
    endY,
    color = "#111827",
  ) => {

    context.strokeStyle =
    color;

    context.beginPath();

    context.moveTo(
      startX,
      startY
    );

    context.lineTo(
      endX,
      endY
    );

    context.stroke();

  };

  // MOBILE FIX: this is the key helper that makes touch drawing work.
  //
  // Mouse events give you e.nativeEvent.offsetX / offsetY for free — that's
  // the position already measured relative to the canvas element itself.
  // Touch events don't give you that at all; they only give clientX/clientY,
  // which is the position relative to the whole browser window/viewport.
  //
  // On top of that, the canvas is drawn internally at a FIXED size
  // (width={800} height={500} below), but on a phone screen it's visually
  // shrunk down by the "w-full max-w-full" CSS classes. So a finger at
  // pixel (160, 100) on a phone screen that's displaying an 800-wide
  // canvas at, say, 360px wide on screen, actually corresponds to roughly
  // (160 / 360) * 800 = ~355 in the canvas's real internal coordinate
  // space — NOT 160. Skipping this scaling step is the most common reason
  // mobile drawing "sort of works" but draws in the wrong place.
  //
  // This function does both corrections at once, and works for BOTH mouse
  // and touch events, so startDrawing/draw/stopDrawing don't need two
  // separate code paths — they just call this and get back the right
  // {x, y} either way.
  const getCanvasCoords = (e) => {

    const canvas =
      canvasRef.current;

    const rect =
      canvas.getBoundingClientRect();

    // Touch events store their coordinates inside e.touches[0] (for an
    // in-progress touch) or e.changedTouches[0] (fired on touchend, by
    // which point e.touches is already empty). Mouse events have neither
    // of these, so we fall back to the event itself, which has
    // clientX/clientY directly on it.
    const point =
      e.touches && e.touches.length > 0
        ? e.touches[0]
        : e.changedTouches && e.changedTouches.length > 0
        ? e.changedTouches[0]
        : e;

    // Step 1: make the coordinate relative to the canvas's top-left
    // corner instead of the whole page.
    const xRelativeToCanvas =
      point.clientX - rect.left;

    const yRelativeToCanvas =
      point.clientY - rect.top;

    // Step 2: scale from "however big the canvas is currently displayed
    // on screen" up to "the canvas's real internal 800x500 coordinate
    // space", since canvas.width/height (800/500) and the CSS-rendered
    // size (rect.width/rect.height) are different on small screens.
    const scaleX =
      canvas.width / rect.width;

    const scaleY =
      canvas.height / rect.height;

    return {
      x: xRelativeToCanvas * scaleX,
      y: yRelativeToCanvas * scaleY,
    };

  };

  useEffect(() => {

    const canvas =
      canvasRef.current;

    const context =
      canvas.getContext("2d");

    context.lineWidth = 4;
    context.lineCap = "round";
    context.strokeStyle = "#111827";

    socket.on(
      "draw_line",
      (data) => {
        context.strokeStyle =
        data.color;
        context.lineWidth =
        data.brushSize;
        drawLine(
          context,
          data.startX,
          data.startY,
          data.endX,
          data.endY,
          data.color
        );
      }
    );

    socket.on(
      "clear_canvas",
      () => {

        context.clearRect(
          0,
          0,
          canvas.width,
          canvas.height
        );

      }
    );

    return () => {

      socket.off(
        "draw_line"
      );

      socket.off(
        "clear_canvas"
      );

    };

  }, []);

  const startDrawing =
    (e) => {

      if (!isDrawer)
        return;

      // MOBILE FIX: stops the browser's default touch behavior (page
      // scroll / pull-to-refresh / pinch-zoom) from hijacking the touch
      // before our drawing logic gets to use it. Calling this on every
      // handler (start/move/end) is what makes the canvas feel like a
      // real drawing surface on a touchscreen instead of a scrollable page.
      e.preventDefault();

      drawing.current =
        true;

      previousPoint.current =
        getCanvasCoords(e);

    };

  const stopDrawing =
    (e) => {

      if (e) e.preventDefault();

      drawing.current =
        false;

      previousPoint.current =
        null;

    };

  const draw =
    (e) => {

      if (!isDrawer)
        return;

      if (
        !drawing.current
      )
        return;

      // MOBILE FIX: same reason as in startDrawing — without this, moving
      // your finger across the canvas scrolls the whole page on most
      // mobile browsers instead of drawing.
      e.preventDefault();

      const currentPoint =
        getCanvasCoords(e);

      const canvas =
        canvasRef.current;

      const context =
        canvas.getContext("2d");

      const currentColor =
      eraser
      ? "#FFFFFF"
      : color;
      context.strokeStyle =
      currentColor;
      context.lineWidth =
      brushSize;
      drawLine(
        context,
        previousPoint.current.x,
        previousPoint.current.y,
        currentPoint.x,
        currentPoint.y,
        color
      );

      socket.emit(
        "draw_line",
        {
          roomId,
          startX:
          previousPoint.current.x,
          startY:
          previousPoint.current.y,
          endX:
          currentPoint.x,
          endY:
          currentPoint.y,
          color:
          eraser
          ? "#FFFFFF"
          : color,
          brushSize,
        }
      );

      previousPoint.current =
        currentPoint;

    };

  return (

    <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-3xl p-4 shadow-2xl">

      <div className="flex justify-between items-center mb-4">

        <h2 className="text-xl font-bold text-white">
          🎨 Drawing Board
        </h2>

        <div
          className={`px-4 py-2 rounded-xl text-sm font-bold ${
            isDrawer
              ? "bg-green-500"
              : "bg-slate-600"
          }`}
        >
          {
            isDrawer
              ? "✏️ You are Drawing"
              : "👀 Guessing"
          }
        </div>

      </div>
      {isDrawer && (
        <div className="flex items-center gap-3 mb-4">
          <span className="text-white font-semibold">
            Color
            </span>
            <input
            type="color"
            value={color}
            onChange={(e) =>
              setColor(
                e.target.value
              )
            }
            className="w-12 h-12 rounded-lg cursor-pointer"
            />
            </div>
          )}
      {
      isDrawer && (
      <div className="flex flex-wrap gap-4 mb-4">
        <input
        type="color"
        value={color}
        onChange={(e) =>
          setColor(
            e.target.value
          )
        }
        />
        <input
        type="range"
        min="1"
        max="20"
        value={brushSize}
        onChange={(e) =>
          setBrushSize(
            Number(
              e.target.value
            )
          )
        }
        />
        <button
        onClick={() =>
          setEraser(
            !eraser
          )
        }
        className="
        px-4 py-2
        bg-yellow-500
        text-white
        rounded-xl
        "
        >
          {eraser
          ? "✏️ Pen"
          : "🧽 Eraser"}
          </button>
          <button
          onClick={() =>
            socket.emit(
              "clear_canvas",
              {
                roomId,
              }
            )
          }
          className="
          px-4 py-2
          bg-red-500
          text-white
          rounded-xl
          "
          >
            🗑 Clear
            </button>
            </div>
          )
          }

      <canvas
        ref={canvasRef}
        width={800}
        height={500}
        className="
          bg-white
          rounded-2xl
          border-4
          border-slate-200
          shadow-lg
          w-full
          max-w-full
        "
        // MOBILE FIX: touch-none (Tailwind) sets the CSS touch-action:none
        // property on the canvas. This tells the browser "don't try to
        // scroll, zoom, or do anything else with touches on this element —
        // I'm handling them myself." Without this, even with
        // preventDefault() in the handlers, some mobile browsers can still
        // briefly try to scroll before our JS runs, causing jittery or
        // interrupted strokes.
        style={{ touchAction: "none" }}
        onMouseDown={
          startDrawing
        }
        onMouseMove={
          draw
        }
        onMouseUp={
          stopDrawing
        }
        onMouseLeave={
          stopDrawing
        }
        onTouchStart={
          startDrawing
        }
        onTouchMove={
          draw
        }
        onTouchEnd={
          stopDrawing
        }
        onTouchCancel={
          stopDrawing
        }
      />

    </div>

  );

}

export default DrawingCanvas;
