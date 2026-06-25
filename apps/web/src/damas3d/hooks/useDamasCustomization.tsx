import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  DEFAULT_CUSTOMIZATION,
  getBoardTheme,
  getPieceSet,
  resolvePieceSetTheme,
} from "../themes";
import { clearPieceMaterialCache } from "../models/pieceMaterials";
import type { ChessCustomization } from "../types";

const STORAGE_KEY = "sol-ttt-customization";

function loadCustomization(): ChessCustomization {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_CUSTOMIZATION };
    const parsed = JSON.parse(raw) as Partial<ChessCustomization>;
    return {
      boardThemeId: parsed.boardThemeId ?? DEFAULT_CUSTOMIZATION.boardThemeId,
      pieceSetId: parsed.pieceSetId ?? DEFAULT_CUSTOMIZATION.pieceSetId,
    };
  } catch {
    return { ...DEFAULT_CUSTOMIZATION };
  }
}

interface ChessCustomizationContextValue {
  customization: ChessCustomization;
  boardTheme: ReturnType<typeof getBoardTheme>;
  pieceSet: ReturnType<typeof getPieceSet>;
  setBoardThemeId: (id: string) => void;
  setPieceSetId: (id: string) => void;
}

const ChessCustomizationContext =
  createContext<ChessCustomizationContextValue | null>(null);

export function DamasCustomizationProvider({ children }: { children: ReactNode }) {
  const [customization, setCustomization] = useState(loadCustomization);

  const persist = useCallback((next: ChessCustomization) => {
    clearPieceMaterialCache();
    setCustomization(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }, []);

  const setBoardThemeId = useCallback(
    (boardThemeId: string) => {
      setCustomization((prev) => {
        const next = { ...prev, boardThemeId };
        clearPieceMaterialCache();
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        return next;
      });
    },
    [],
  );

  const setPieceSetId = useCallback(
    (pieceSetId: string) => {
      setCustomization((prev) => {
        const next = { ...prev, pieceSetId };
        clearPieceMaterialCache();
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        return next;
      });
    },
    [],
  );

  const value = useMemo(() => {
    const boardTheme = getBoardTheme(customization.boardThemeId);
    const basePieceSet = getPieceSet(customization.pieceSetId);
    return {
      customization,
      boardTheme,
      pieceSet: resolvePieceSetTheme(basePieceSet, boardTheme),
      setBoardThemeId,
      setPieceSetId,
    };
  }, [customization, setBoardThemeId, setPieceSetId]);

  return (
    <ChessCustomizationContext.Provider value={value}>
      {children}
    </ChessCustomizationContext.Provider>
  );
}

export function useDamasCustomization() {
  const ctx = useContext(ChessCustomizationContext);
  if (!ctx) {
    throw new Error("useDamasCustomization must be used within provider");
  }
  return ctx;
}
