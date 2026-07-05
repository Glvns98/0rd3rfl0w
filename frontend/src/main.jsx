import React, { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

import { DataProvider } from './context/DataContext.jsx'

class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { hasError: false, error: null }; }
  static getDerivedStateFromError(error) { return { hasError: true, error }; }
  render() { 
    if (this.state.hasError) return <div style={{color:'red', padding:'20px'}}><h1>Error!</h1><pre>{this.state.error.stack}</pre></div>; 
    return this.props.children; 
  }
}

createRoot(document.getElementById('root')).render(
  <ErrorBoundary>
    <DataProvider>
      <App />
    </DataProvider>
  </ErrorBoundary>,
)
