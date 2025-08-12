// src/shared/ErrorBoundary.jsx
import React from "react";
export default class ErrorBoundary extends React.Component {
  state = { error: null };
  static getDerivedStateFromError(error){ return { error }; }
  render(){
    if (this.state.error) return <div style={{padding:16}}>
      <h3>Uups – ein Fehler in der UI</h3>
      <pre style={{whiteSpace:"pre-wrap"}}>{String(this.state.error)}</pre>
    </div>;
    return this.props.children;
  }
}

// in src/app.jsx (oder main.jsx) um <App/> legen:
import ErrorBoundary from "./shared/ErrorBoundary.jsx";
// ...
<ErrorBoundary><App/></ErrorBoundary>
