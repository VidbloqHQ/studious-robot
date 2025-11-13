/* eslint-disable @typescript-eslint/no-explicit-any */
class WebSocketManager {
  private static instance: WebSocketManager;
  private ws: WebSocket | null = null;
  private url: string = '';
  private listeners: Map<string, Set<(data: any) => void>> = new Map();
  private isConnecting: boolean = false;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private callbacks: {
    onOpen?: (event: Event) => void;
    onClose?: (event: CloseEvent) => void;
    onError?: (event: Event) => void;
  } = {};

  private constructor() {}

  static getInstance(): WebSocketManager {
    if (!WebSocketManager.instance) {
      WebSocketManager.instance = new WebSocketManager();
    }
    return WebSocketManager.instance;
  }

  initialize(url: string, callbacks?: {
    onOpen?: (event: Event) => void;
    onClose?: (event: CloseEvent) => void;
    onError?: (event: Event) => void;
  }): Promise<void> {
    return new Promise((resolve) => {
      // Only initialize if URL changes or not yet set
      if (this.url === url && this.ws?.readyState === WebSocket.OPEN) {
        console.log('WebSocket already initialized and connected');
        resolve();
        return;
      }

      this.url = url;
      
      // Store callbacks
      const originalCallbacks = { ...callbacks };
      this.callbacks = callbacks || {};
      
      // Create timeout for connection
      let connectionTimeout: NodeJS.Timeout | null = null;
      
      // Override onOpen to resolve the promise
      this.callbacks.onOpen = (event) => {
        if (connectionTimeout) {
          clearTimeout(connectionTimeout);
          connectionTimeout = null;
        }
        originalCallbacks.onOpen?.(event);
        resolve();
      };
      
      // Override onError to reject the promise
      this.callbacks.onError = (event) => {
        if (connectionTimeout) {
          clearTimeout(connectionTimeout);
          connectionTimeout = null;
        }
        originalCallbacks.onError?.(event);
        // Don't reject here - let it retry
        resolve(); // Resolve anyway to prevent hanging
      };
      
      // Set timeout for initial connection
      connectionTimeout = setTimeout(() => {
        console.warn('WebSocket connection timeout - will retry');
        connectionTimeout = null;
        resolve(); // Resolve instead of reject to prevent error
      }, 10000); // 10 second timeout
      
      this.connect();
    });
  }

  private connect() {
    // Prevent multiple simultaneous connection attempts
    if (this.isConnecting || this.ws?.readyState === WebSocket.OPEN) {
      return;
    }

    if (this.ws?.readyState === WebSocket.CONNECTING) {
      return;
    }

    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      return;
    }

    this.isConnecting = true;
    console.log(`Connecting to WebSocket: ${this.url}`);

    this.ws = new WebSocket(this.url);

    this.ws.onopen = (event) => {
      console.log('WebSocket connected');
      this.isConnecting = false;
      this.reconnectAttempts = 0;
      
      if (this.reconnectTimer) {
        clearTimeout(this.reconnectTimer);
        this.reconnectTimer = null;
      }

      this.callbacks.onOpen?.(event);
      this.notifyListeners('connected', { connected: true });
    };

    this.ws.onclose = (event) => {
      console.log('WebSocket disconnected', {
        code: event.code,
        reason: event.reason,
        wasClean: event.wasClean
      });
      
      this.isConnecting = false;
      this.callbacks.onClose?.(event);
      this.notifyListeners('disconnected', { connected: false });

      // Only reconnect on abnormal closures
      if (!event.wasClean && event.code !== 1000 && event.code !== 1001) {
        this.scheduleReconnect();
      }
    };

    this.ws.onerror = (event) => {
      console.error('WebSocket error');
      this.isConnecting = false;
      this.callbacks.onError?.(event);
    };

    this.ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        const { event: eventName, data } = message;

        // Handle ping/pong
        if (eventName === 'ping') {
          this.send('pong', {});
          return;
        }

        this.notifyListeners(eventName, data);
      } catch (error) {
        console.error('Error parsing message:', error);
      }
    };
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) {
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(10000 * Math.pow(1.5, this.reconnectAttempts - 1), 30000);
    
    console.log(`Scheduling reconnect in ${delay}ms (attempt ${this.reconnectAttempts})`);
    
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, delay);
  }

  private notifyListeners(event: string, data: any) {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.forEach(listener => {
        try {
          listener(data);
        } catch (error) {
          console.error(`Error in listener for ${event}:`, error);
        }
      });
    }
  }

  send(event: string, data: any): boolean {
    if (this.ws?.readyState !== WebSocket.OPEN) {
      console.warn(`Cannot send ${event}: WebSocket not connected`);
      return false;
    }

    try {
      this.ws.send(JSON.stringify({ event, data }));
      return true;
    } catch (error) {
      console.error('Error sending message:', error);
      return false;
    }
  }

  addEventListener(event: string, listener: (data: any) => void) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(listener);
  }

  removeEventListener(event: string, listener: (data: any) => void) {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.delete(listener);
      if (eventListeners.size === 0) {
        this.listeners.delete(event);
      }
    }
  }

  disconnect() {
    console.log('Disconnecting WebSocket');
    
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.ws) {
      this.ws.close(1000, 'Manual disconnect');
      this.ws = null;
    }

    this.reconnectAttempts = 0;
    this.isConnecting = false;
  }

  get isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}

export const wsManager = WebSocketManager.getInstance();