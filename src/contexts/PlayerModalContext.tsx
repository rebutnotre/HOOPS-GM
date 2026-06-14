import { createContext, useContext, useState } from 'react';
import type React from 'react';

interface PlayerModalCtx {
  openPlayerId: string | null;
  openPlayer: (id: string) => void;
  closePlayer: () => void;
}

const Ctx = createContext<PlayerModalCtx>({ openPlayerId: null, openPlayer: () => {}, closePlayer: () => {} });

export function PlayerModalProvider({ children }: { children: React.ReactNode }) {
  const [openPlayerId, setOpenPlayerId] = useState<string | null>(null);
  return (
    <Ctx.Provider value={{ openPlayerId, openPlayer: setOpenPlayerId, closePlayer: () => setOpenPlayerId(null) }}>
      {children}
    </Ctx.Provider>
  );
}

export function usePlayerModal() { return useContext(Ctx); }
