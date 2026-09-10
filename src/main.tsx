import { createRoot } from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
import { RBACProvider } from "@/contexts/RBACContext";
import App from "./App.tsx";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <HelmetProvider>
    <RBACProvider>
      <App />
    </RBACProvider>
  </HelmetProvider>
);

// Sinal de hidratação/renderização para prerender no build
document.dispatchEvent(new Event("render-event"));


