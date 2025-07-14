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
  ..."QWERTYUIOP".split(""),
  ..."ASDFGHJKLÑ".split(""),
  ..."ZXCVBNM".split(""),
  ..."1234567890".split(""),
  "@",
  ".",
  ",",
  "-",
  "_",
  "/",
  "*",
  "+",
  ":",
  ";",
];

const TecladoVirtual: React.FC<Props> = ({
  onKeyPress,
  onBackspace,
  onSpace,
  onClear,
  text,
  setTexto,
}) => {
  return (
    <div className="bg-white p-4 rounded shadow w-full mx-auto">
      <textarea
        value={text}
        onChange={(e) => setTexto(e.target.value)}
        className="w-full px-4 border-2 border-gray-300"
      />
      <div className="grid grid-cols-10 gap-1 mb-2">
        {keys.map((k, i) => (
          <button
            key={i}
            onClick={() => onKeyPress(k)}
            className="bg-gray-200 px-2 py-2 font-bold text-center rounded hover:bg-blue-300"
          >
            {k}
          </button>
        ))}
      </div>
      <div className="flex justify-between mt-2">
        <button
          onClick={onSpace}
          className="bg-blue-600 text-white px-4 py-2 rounded"
        >
          ESPACIO
        </button>
        <button onClick={onBackspace} className="bg-red-400 px-4 py-2 rounded">
          BORRAR
        </button>
        <button onClick={onClear} className="bg-gray-300 px-4 py-2 rounded">
          LIMPIAR
        </button>
      </div>
    </div>
  );
};

export default TecladoVirtual;
