"use client";

import Link from "next/link";
import { useState } from "react";
import SettingsModal from "@/components/settings/SettingsModal";

export default function Home() {
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center gap-8">
      <h1 className="text-5xl font-bold tracking-tight text-white">
        Zombie Flick
      </h1>
      <p className="text-lg text-muted-foreground max-w-md text-center">
        Use your webcam and finger-gun gesture to shoot zombies. Flick to fire!
      </p>
      <div className="flex flex-col gap-3 items-center">
        <Link
          href="/game"
          className="rounded-lg bg-game-primary px-8 py-4 text-lg font-semibold text-white transition-colors hover:bg-game-primary/90"
        >
          Start Game
        </Link>
        <Link
          href="/leaderboard"
          className="rounded-lg bg-white px-8 py-3 text-game-primary font-semibold border border-game-primary hover:bg-gray-50 transition-colors"
        >
          Leaderboard
        </Link>
        <button
          onClick={() => setSettingsOpen(true)}
          className="rounded-lg bg-white/60 px-8 py-3 text-game-primary font-semibold border border-game-primary/50 hover:bg-white/80 transition-colors"
        >
          Settings
        </button>
      </div>

      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </main>
  );
}
