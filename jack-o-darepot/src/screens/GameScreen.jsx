import React from "react";
import AppHeader from "../components/layout/AppHeader";
import SlotMachineHandler from "../components/SlotMachineHandler";

export default function GameScreen() {
  return (
    <div className="game-screen-container">
      <AppHeader />
      <SlotMachineHandler />
    </div>
  );
}
