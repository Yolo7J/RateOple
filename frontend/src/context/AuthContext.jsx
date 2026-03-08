/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect } from "react";
import api from "../shared/api/apiClient";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [isLoading, setIsLoading] = useState(true); // blocks render until session is resolved

    // On every app load: try /me with the existing accessToken cookie.
    // If that 401s (token expired), silently try /refresh.
    // If refresh also fails, the user is genuinely logged out.
    useEffect(() => {
        const restoreSession = async () => {
            try {
                const response = await api.get("/auth/me");
                setUser({
                    id: response.data.id,
                    username: response.data.userName,
                    roles: response.data.roles,
                });
            } catch {
                try {
                    const refreshResponse = await api.post("/auth/refresh");
                    setUser({
                        id: refreshResponse.data.id,
                        username: refreshResponse.data.userName,
                        roles: refreshResponse.data.roles,
                    });
                } catch {
                    setUser(null); // both failed — not logged in
                }
            } finally {
                setIsLoading(false);
            }
        };

        restoreSession();
    }, []);

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

    // Don't render children until session check is done — prevents
    // a flash where the header briefly shows Login/Register for a logged-in user
    if (isLoading) return null;

    return (
        <AuthContext.Provider value={{ user, login, register, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);