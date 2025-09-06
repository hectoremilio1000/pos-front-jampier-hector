import { useState } from "react";

type Props = {
  onAceptar: (nombre: string) => void;
  onCancelar: () => void;
};

const TecladoModal: React.FC<Props> = ({ onAceptar, onCancelar }) => {
  const [nombre, setNombre] = useState("");

  const teclas = "QWERTYUIOPASDFGHJKLÑZXCVBNM";

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-orange-100 p-4 rounded shadow-lg w-[90%] max-w-xl text-center">
        <h2 className="text-xl font-bold mb-2">ABRIR CUENTA</h2>
        <textarea className="w-full h-20 mb-4 p-2" value={nombre} readOnly />

        <div className="grid grid-cols-10 gap-1 mb-2">
          {teclas.split("").map((key) => (
            <button
              key={key}
              onClick={() => setNombre((prev) => prev + key)}
              className="bg-orange-300 p-2 font-bold rounded"
            >
              {key}
            </button>
          ))}
        </div>
        <button
          onClick={() => setNombre((prev) => prev + " ")}
          className="bg-yellow-400 px-4 py-2 mb-2 rounded"
        >
          ESPACIO
        </button>

        <div className="flex justify-around mt-4">
          <button
            onClick={() => onAceptar(nombre)}
            className="bg-green-500 px-4 py-2 text-white rounded"
          >
            Aceptar
          </button>
          <button
            onClick={onCancelar}
            className="bg-red-600 px-4 py-2 text-white rounded"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
};

export default TecladoModal;
