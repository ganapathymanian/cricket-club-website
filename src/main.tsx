
  import { createRoot } from "react-dom/client";
  import { GoogleOAuthProvider } from "@react-oauth/google";
  import App from "./app/App.tsx";
  import "./styles/index.css";
  import { googleClientId } from "../utils/config";

  createRoot(document.getElementById("root")!).render(
    <GoogleOAuthProvider clientId={googleClientId}>
      <App />
    </GoogleOAuthProvider>
  );
  