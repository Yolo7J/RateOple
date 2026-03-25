/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { authService } from "../features/auth/services/authService";
import { useAuthSessionQuery } from "../features/auth/queries/useAuthSessionQuery";
import { startNotificationHub, stopNotificationHub } from "../shared/signalr/signalrClient";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const queryClient = useQueryClient();
    const { data: sessionData, loading: isLoading } = useAuthSessionQuery();

    const user = useMemo(() => {
        if (!sessionData) return null;
        return {
            id: sessionData.id,
            username: sessionData.userName,
            roles: Array.isArray(sessionData.roles) ? sessionData.roles : [],
        };
    }, [sessionData]);

    useEffect(() => {
        if (!user?.id) {
            stopNotificationHub();
            return;
        }

        startNotificationHub().catch((error) => {
            console.error("SignalR connection failed:", error);
        });
    }, [user?.id]);

    const login = async (email, password) => {
        const session = await authService.login(email, password);
        queryClient.setQueryData(["auth", "session"], session);
        return session;
    };

    const register = async ({ email, username, password }) => {
        await authService.register({ email, username, password });
    };

    const logout = async () => {
        await authService.logout();
        queryClient.setQueryData(["auth", "session"], null);
    };

    if (isLoading) return null;

    return (
        <AuthContext.Provider value={{ user, isLoading, login, register, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
