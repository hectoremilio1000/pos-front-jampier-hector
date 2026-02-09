// src/components/TecladoVirtual.tsx
import React from "react";

type Props = {
  onKeyPress: (val: string) => void;
  onBackspace: () => void;
  onSpace: () => void;
  onClear: () => void;
  text: string;
  setTexto: React.Dispatch<React.SetStateAction<string>>;
};

const keys = [
  "QWERTYUIOP".split(""),
  "ASDFGHJKLÑ".split(""),
  "ZXCVBNM".split(""),
  "1234567890".split(""),
  ["@", ".", ",", "-", "_", "/", "*", "+", ":", ";"],
];

const TecladoVirtual: React.FC<Props> = ({
  onKeyPress,
  onBackspace,
  onSpace,
  onClear,
  text,
  setTexto,
}) => {
  const keyStyle = {
    minHeight: "clamp(52px, 5.2vw, 92px)",
    fontSize: "clamp(16px, 1.35vw, 28px)",
  } as const;

  const actionKeyStyle = {
    minHeight: "clamp(52px, 5.4vw, 96px)",
    fontSize: "clamp(16px, 1.35vw, 28px)",
  } as const;

  return (
    <div className="w-full mx-auto max-w-[980px]">
      <textarea
        value={text}
        rows={2}
        onChange={(e) => setTexto(e.target.value)}
        className="mb-4 w-full rounded border-2 border-gray-300 px-3 py-3"
        style={{
          minHeight: "clamp(92px, 10vh, 152px)",
          fontSize: "clamp(18px, 1.5vw, 30px)",
        }}
      />
      <div className="mb-4 flex flex-col gap-2 md:gap-3">
        {keys.map((row, rowIndex) => (
          <div
            key={rowIndex}
            className="grid gap-2 md:gap-2.5"
            style={{ gridTemplateColumns: `repeat(${row.length}, minmax(0, 1fr))` }}
          >
            {row.map((k, keyIndex) => (
              <button
                type="button"
                key={`${rowIndex}-${keyIndex}-${k}`}
                onClick={() => onKeyPress(k)}
                style={keyStyle}
                className="rounded-md bg-gray-200 px-1 text-center font-bold touch-manipulation select-none hover:bg-blue-300"
              >
                {k}
              </button>
            ))}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-3 gap-2 md:gap-3">
        <button
          type="button"
          onClick={onSpace}
          style={actionKeyStyle}
          className="rounded-md bg-blue-600 px-2 font-semibold text-white touch-manipulation select-none"
        >
          ESPACIO
        </button>
        <button
          type="button"
          onClick={onBackspace}
          style={actionKeyStyle}
          className="rounded-md bg-red-400 px-2 font-semibold touch-manipulation select-none"
        >
          BORRAR
        </button>
        <button
          type="button"
          onClick={onClear}
          style={actionKeyStyle}
          className="rounded-md bg-gray-300 px-2 font-semibold touch-manipulation select-none"
        >
          LIMPIAR
        </button>
      </div>
    </div>
  );
};

export default TecladoVirtual;
