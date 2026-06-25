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

      drawing.current =
        true;

      previousPoint.current = {
        x:
          e.nativeEvent.offsetX,

        y:
          e.nativeEvent.offsetY,
      };

    };

  const stopDrawing =
    () => {

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

      const currentPoint = {
        x:
          e.nativeEvent.offsetX,

        y:
          e.nativeEvent.offsetY,
      };

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
      />

    </div>

  );

}

export default DrawingCanvas;