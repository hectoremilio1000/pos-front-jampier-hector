import { FaTable } from "react-icons/fa";

type Props = {
  mesa: {
    id: number;
    nombre: string;
  };
};

const MesaCard: React.FC<Props> = ({ mesa }) => {
  return (
    <div className="bg-blue-800 p-4 rounded shadow text-center">
      <FaTable className="text-3xl text-white mx-auto mb-2" />
      <h3 className="text-lg font-semibold">{mesa.nombre}</h3>
    </div>
  );
};

export default MesaCard;
