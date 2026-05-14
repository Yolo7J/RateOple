/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { authService, loadAuthSession } from "../features/auth/services/authService";
import { useAuthSessionQuery } from "../features/auth/queries/useAuthSessionQuery";
import { startNotificationHub, stopNotificationHub } from "../shared/signalr/signalrClient";
import { useNotificationRealtime } from "../features/notifications/realtime/useNotificationRealtime";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const queryClient = useQueryClient();
    const { data: sessionData, loading: isLoading } = useAuthSessionQuery();

    const user = useMemo(() => {
        if (!sessionData) return null;
        const emailConfirmed = sessionData.emailConfirmed !== false;
        return {
            id: sessionData.id,
            username: sessionData.userName,
            email: sessionData.email,
            emailConfirmed,
            isSuspended: Boolean(sessionData.isSuspended),
            isReadOnly: Boolean(sessionData.isReadOnly) || !emailConfirmed || Boolean(sessionData.isSuspended),
            accountState: sessionData.accountState ?? (emailConfirmed ? "confirmed" : "unconfirmed"),
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

    useNotificationRealtime(Boolean(user?.id));

    const login = async (email, password, captchaToken) => {
        const session = await authService.login(email, password, captchaToken);
        queryClient.setQueryData(["auth", "session"], session);
        return session;
    };

    const register = async ({ email, username, password, captchaToken }) => {
        await authService.register({ email, username, password, captchaToken });
    };

    const refreshSession = async () => {
        const session = await loadAuthSession();
        queryClient.setQueryData(["auth", "session"], session);
        return session;
    };

    const logout = async () => {
        await authService.logout();
        queryClient.setQueryData(["auth", "session"], null);
    };

    if (isLoading) return null;

    return (
        <AuthContext.Provider value={{ user, isLoading, login, register, logout, refreshSession }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
