import React from "react";
import { createRoot } from "react-dom/client";
import { App } from "./components/App";
import "./styles/index.css";

// Ensure the DOM is loaded
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initializeApp);
} else {
  initializeApp();
}

function initializeApp() {
  console.log("OpenHands webview initializing...");

  const container = document.getElementById("root");
  if (!container) {
    console.error("Root element not found");
    return;
  }

  console.log("Root element found, creating React app...");

  const root = createRoot(container);
  root.render(<App />);

  console.log("React app rendered successfully");
}

// Handle hot module replacement in development
if (import.meta.hot) {
  import.meta.hot.accept();
}
