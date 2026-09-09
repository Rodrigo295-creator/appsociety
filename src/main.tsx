import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router";
import App from "./app/App.tsx";
import LandingPage from "./app/LandingPage.tsx";
import { LocaleProvider } from "./i18n";
import "./styles/index.css";

createRoot(document.getElementById("root")!).render(
  <LocaleProvider>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/app" element={<App />} />
      </Routes>
    </BrowserRouter>
  </LocaleProvider>,
);
