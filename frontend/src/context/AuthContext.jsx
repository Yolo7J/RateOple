import { createContext, useContext, useState } from "react";
import api from "../services/api";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);

  const login = async (email, password) => {
    const response = await api.post("/auth/login", { email, password });
    setUser({
      id: response.data.id,
      username: response.data.userName,
      roles: response.data.roles,
    });
  };

  const register = async ({ email, username, password }) => {
    await api.post("/auth/register", { email, username, password });
  };

  const logout = async () => {
    await api.post("/auth/logout");
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);