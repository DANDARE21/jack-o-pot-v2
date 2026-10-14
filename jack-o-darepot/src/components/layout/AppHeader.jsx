import React from "react";
import { Icon } from "@iconify/react";

export default function AppHeader() {
  return (
    <header className="app-header">
      <h1 className="app-title flex items-center justify-center gap-3">
        <Icon icon="game-icons:pumpkin-lantern" className="app-title-icon text-ui-accent" />
        <span className="app-title-text">JACK'O POT</span>
      </h1>
      <div className="app-subtitle">
        <span className="subtitle-word">Spin the reels</span>
        <span className="dot" />
        <span className="subtitle-word">Face the dare</span>
      </div>
    </header>
  );
}
