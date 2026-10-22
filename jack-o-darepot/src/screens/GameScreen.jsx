import { AppHeader, SlotMachineHandler } from "@/components";

export default function GameScreen() {
  return (
    <div className="game-screen-container">
      <AppHeader />
      <SlotMachineHandler />
    </div>
  );
}
