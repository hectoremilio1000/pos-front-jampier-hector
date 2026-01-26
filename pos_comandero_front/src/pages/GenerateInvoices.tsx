import { useParams } from "react-router-dom";

export default function GenerateInvoices() {
  const { restaurantId } = useParams();

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center px-4">
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm max-w-3xl w-full p-8 text-center">
        <h1 className="text-2xl font-bold mb-3">Bienvenido a Generate Facturas</h1>
        <p className="text-sm text-gray-600">
          Restaurante: {restaurantId ?? "—"}
        </p>
        <p className="mt-4 text-gray-700">
          Aquí estará la pantalla para generar facturas. Por ahora es solo una bienvenida, avísame cuando quieras que agreguemos la siguiente parte.
        </p>
      </div>
    </div>
  );
}
