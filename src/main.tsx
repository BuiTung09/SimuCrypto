import { createRoot } from "react-dom/client";
import { GoogleOAuthProvider } from "@react-oauth/google";
import App from "./App.tsx";
import "./index.css";

// TODO: Replace with your actual Google Client ID
const GOOGLE_CLIENT_ID = "295274065026-ba4821vsb3l8mltkmgldf61vdjjq7vat.apps.googleusercontent.com";

createRoot(document.getElementById("root")!).render(
  <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
    <App />
  </GoogleOAuthProvider>
);
  