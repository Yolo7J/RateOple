import * as signalR from '@microsoft/signalr';
import apiClient from '../api/apiClient';

const apiBaseUrl = apiClient.defaults.baseURL ?? '';
const hubBaseUrl = apiBaseUrl.replace(/\/?api\/?$/, '');
const hubUrl = `${hubBaseUrl}/hubs/notifications`;

const listeners = new Set();
let connection;
let startPromise;

const notify = (state, error = null) => {
  listeners.forEach((listener) => listener(state, error));
};

export const subscribeToNotificationHubStatus = (listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const getNotificationHubConnection = () => {
  if (connection) return connection;

  connection = new signalR.HubConnectionBuilder()
    .withUrl(hubUrl, { withCredentials: true })
    .withAutomaticReconnect([0, 2000, 10000, 30000])
    .build();

  connection.onreconnecting((error) => {
    notify('reconnecting', error ?? null);
  });

  connection.onreconnected(() => {
    notify('connected');
  });

  connection.onclose((error) => {
    notify('disconnected', error ?? null);
  });

  return connection;
};

export const startNotificationHub = async () => {
  const hubConnection = getNotificationHubConnection();

  if (hubConnection.state === signalR.HubConnectionState.Connected) return hubConnection;

  if (!startPromise) {
    startPromise = hubConnection
      .start()
      .then(() => {
        notify('connected');
      })
      .catch((error) => {
        notify('disconnected', error);
        throw error;
      })
      .finally(() => {
        startPromise = null;
      });
  }

  await startPromise;

  return hubConnection;
};

export const stopNotificationHub = async () => {
  if (!connection) return;
  if (connection.state !== signalR.HubConnectionState.Disconnected) {
    await connection.stop();
  }
  notify('disconnected');
};
