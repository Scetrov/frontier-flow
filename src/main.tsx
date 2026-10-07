import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import App from "./App";
import { FrontierWalletProvider } from "./components/FrontierWalletProvider";
import "./index.css";

const queryClient = new QueryClient();

const root = document.getElementById("root");
if (root === null) {
  throw new Error("Root element not found");
}

createRoot(root).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <FrontierWalletProvider>
        <App />
      </FrontierWalletProvider>
    </QueryClientProvider>
  </StrictMode>,
);
