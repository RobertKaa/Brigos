import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { initializeTheme } from "./theme";
import "@fontsource-variable/dm-sans";
import "@fontsource-variable/outfit";
import "./styles.css";
import "./accessibility.css";
import "./studio-theme.css";

initializeTheme();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
