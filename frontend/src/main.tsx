import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./App";
import { MotionProvider } from "./experience/MotionEffects";
import "./index.css";
import "./experience/experience.css";
import "./experience/motion-effects.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <MotionProvider><App /></MotionProvider>
  </React.StrictMode>,
);
