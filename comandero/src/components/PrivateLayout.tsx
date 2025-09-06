import { Outlet } from "react-router-dom";
import { Button } from "antd";
import { useAuth } from "./Auth/AuthContext";

const PrivateLayout = () => {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-blue-800 text-white px-4 py-2 flex justify-between items-center">
        <h1 className="font-bold">
          <span className="text-white text-3xl">GrowthSuite</span>
          <span className="text-yellow-500 text-3xl">Comandero</span>
        </h1>
        <div className="flex gap-4 items-center">
          <span className="font-semibold">{user?.restaurant?.name}</span>
          <span className="font-semibold">👨‍🍳 {user?.fullName}</span>
          <Button onClick={logout} className="bg-red-500 text-white">
            Cerrar sesión
          </Button>
        </div>
      </header>

      <main className="flex-grow">
        <Outlet />
      </main>
    </div>
  );
};

export default PrivateLayout;
