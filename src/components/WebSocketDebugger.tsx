/* eslint-disable @typescript-eslint/no-explicit-any */
// components/WebSocketDebugger.tsx
import { useEffect, useState } from 'react';
import { useTenantContext } from '../hooks';

interface WebSocketEvent {
  event: string;
  data: any;
  timestamp: Date;
}

export const WebSocketDebugger = () => {
  const { websocket } = useTenantContext();
  const [events, setEvents] = useState<WebSocketEvent[]>([]);
  const [isMinimized, setIsMinimized] = useState(false);

  useEffect(() => {
    if (!websocket) return;

    // Listen to all possible events
    const eventTypes = [
      'participantJoined',
      'participantLeft',
      'guestRequestsUpdate',
      'timeSync',
      'initialSync',
      'authResponse',
      'receiveReaction',
      'inviteGuest',
      'returnToGuest',
      'actionExecutedSync',
      'addonStateUpdate',
      'newToken',
      'ping',
      'pong'
    ];

    const handlers: { [key: string]: (data: any) => void } = {};

    // Create handlers for each event type
    eventTypes.forEach(eventType => {
      handlers[eventType] = (data: any) => {
        console.log(`[WebSocketDebugger] Received ${eventType}:`, data);
        setEvents(prev => [...prev.slice(-19), {
          event: eventType,
          data,
          timestamp: new Date()
        }]);
      };

      websocket.addEventListener(eventType, handlers[eventType]);
    });

    // Also intercept the raw WebSocket to see ALL messages
    const originalWebSocket = (websocket as any).ws?.current;
    if (originalWebSocket && originalWebSocket.addEventListener) {
      const rawHandler = (event: MessageEvent) => {
        try {
          const parsed = JSON.parse(event.data);
          console.log('[WebSocketDebugger] RAW WebSocket message:', parsed);
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        } catch (e) {
          console.log('[WebSocketDebugger] RAW WebSocket message (non-JSON):', event.data);
        }
      };
      originalWebSocket.addEventListener('message', rawHandler);
    }

    return () => {
      // Clean up all event listeners
      eventTypes.forEach(eventType => {
        websocket.removeEventListener(eventType, handlers[eventType]);
      });
    };
  }, [websocket]);

  if (isMinimized) {
    return (
      <div
        style={{
          position: 'fixed',
          bottom: 20,
          right: 20,
          backgroundColor: '#1a1a1a',
          color: '#fff',
          padding: '10px',
          borderRadius: '5px',
          cursor: 'pointer',
          zIndex: 9999,
          boxShadow: '0 2px 10px rgba(0,0,0,0.5)'
        }}
        onClick={() => setIsMinimized(false)}
      >
        WS Debug (Click to expand)
      </div>
    );
  }

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 20,
        right: 20,
        width: '400px',
        maxHeight: '500px',
        backgroundColor: '#1a1a1a',
        color: '#fff',
        borderRadius: '5px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.5)',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      <div
        style={{
          padding: '10px',
          borderBottom: '1px solid #333',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}
      >
        <span style={{ fontWeight: 'bold' }}>WebSocket Events</span>
        <button
          onClick={() => setIsMinimized(true)}
          style={{
            background: 'none',
            border: 'none',
            color: '#fff',
            cursor: 'pointer',
            fontSize: '18px'
          }}
        >
          —
        </button>
      </div>
      <div
        style={{
          flex: 1,
          overflow: 'auto',
          padding: '10px'
        }}
      >
        {events.length === 0 ? (
          <div style={{ color: '#888' }}>No events yet...</div>
        ) : (
          events.map((event, index) => (
            <div
              key={index}
              style={{
                marginBottom: '10px',
                padding: '5px',
                backgroundColor: '#333',
                borderRadius: '3px',
                fontSize: '12px'
              }}
            >
              <div style={{ color: '#4CAF50', fontWeight: 'bold' }}>
                {event.event} - {event.timestamp.toLocaleTimeString()}
              </div>
              <pre style={{ margin: 0, fontSize: '10px', color: '#ccc' }}>
                {JSON.stringify(event.data, null, 2)}
              </pre>
            </div>
          ))
        )}
      </div>
      <div
        style={{
          padding: '10px',
          borderTop: '1px solid #333',
          fontSize: '11px',
          color: '#888'
        }}
      >
        Connected: {websocket?.isConnected ? 'Yes' : 'No'}
      </div>
    </div>
  );
};