import { BrowserRouter } from "react-router-dom";
import App from "./App";
import "./index.css";

export default function MainSiteEntry() {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <App />
    </BrowserRouter>
  );
}
