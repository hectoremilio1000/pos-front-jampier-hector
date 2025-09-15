// src/components/Auth/AuthContext.tsx
import { createContext } from "react";
import type { AuthContextType } from "./types";

export const AuthContext = createContext<AuthContextType>(
  {} as AuthContextType
);
