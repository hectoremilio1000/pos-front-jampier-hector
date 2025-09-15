// src/components/Auth/types.ts

export interface Restaurant {
  id: number;
  name: string;
  address?: string;
  // agrega más campos si los necesitas (phone, city, etc.)
}

export interface User {
  id: number;
  email: string;
  fullName: string;
  role: {
    code: string;
    name: string;
  };
  restaurant: Restaurant;
}

export interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  loading: boolean;
}
