// import React, { Component, ErrorInfo, ReactNode } from 'react';

// interface ErrorBoundaryProps {
//   children: ReactNode;
// }

// interface ErrorBoundaryState {
//   hasError: boolean;
//   error: Error | null;
// }

// export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
//   constructor(props: ErrorBoundaryProps) {
//     super(props);
//     this.state = { hasError: false, error: null };
//   }

//   static getDerivedStateFromError(error: Error): ErrorBoundaryState {
//     return { hasError: true, error };
//   }

//   componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
//     console.error("Error caught by boundary:", error, errorInfo);
//   }

//   render(): ReactNode {
//     if (this.state.hasError) {
//       return (
//         <div className="p-4 bg-red-100 border border-red-400 text-red-700 rounded">
//           <h2 className="text-lg font-bold mb-2">Something went wrong</h2>
//           <p className="mb-2">{this.state.error?.message}</p>
//           <button 
//             onClick={() => window.location.reload()}
//             className="bg-red-500 text-white px-4 py-2 rounded"
//           >
//             Reload Page
//           </button>
//         </div>
//       );
//     }

//     return this.props.children;
//   }
// }

// // Use it in
// ErrorBoundary.tsx - Error boundary component for catching LiveKit errors

import React, { Component, ErrorInfo, ReactNode } from 'react';

// Props and state interfaces for TypeScript
interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode; // Optional custom fallback UI
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * Error Boundary component that catches errors in its child components
 * and displays a fallback UI instead of crashing the entire app
 */
class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Log the error to the console
    console.error('Error caught by ErrorBoundary:', error);
    console.error('Component stack:', errorInfo.componentStack);
    
    this.setState({
      error,
      errorInfo
    });
  }

  // Allow retrying by resetting the error state
  handleRetry = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      // If a custom fallback was provided, use it
      if (this.props.fallback) {
        return this.props.fallback;
      }
      
      // Otherwise, use default error UI
      return (
        <div className="error-boundary-container" style={{
          padding: '20px',
          margin: '20px',
          borderRadius: '8px',
          backgroundColor: '#ffebee',
          color: '#c62828',
          textAlign: 'center'
        }}>
          <h2 style={{ marginBottom: '10px' }}>Something went wrong</h2>
          
          <p style={{ marginBottom: '15px' }}>
            {this.state.error?.message || 'An unexpected error occurred'}
          </p>
          
          <div>
            <button
              onClick={this.handleRetry}
              style={{
                backgroundColor: '#c62828',
                color: 'white',
                border: 'none',
                padding: '8px 16px',
                borderRadius: '4px',
                cursor: 'pointer',
                marginRight: '10px'
              }}
            >
              Try Again
            </button>
            
            <button
              onClick={() => window.location.reload()}
              style={{
                backgroundColor: '#263238',
                color: 'white',
                border: 'none',
                padding: '8px 16px',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }

    // If there's no error, render the children
    return this.props.children;
  }
}

export default ErrorBoundary;