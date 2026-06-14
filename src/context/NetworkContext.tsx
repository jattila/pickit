import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import NetInfo, { NetInfoState } from "@react-native-community/netinfo";
import { spacing } from "../theme";

/** Offline sáv magassága a safe area teteje alatt (px). */
export const OFFLINE_BANNER_BODY_HEIGHT = 72;

interface NetworkContextValue {
  /** Igaz, ha nincs hálózati kapcsolat vagy az internet nem elérhető. */
  isOffline: boolean;
}

const NetworkContext = createContext<NetworkContextValue | undefined>(undefined);

function isOfflineState(state: NetInfoState): boolean {
  if (state.isConnected === false) return true;
  // null = még ismeretlen; csak explicit false esetén jelezzünk offline-ot.
  if (state.isInternetReachable === false) return true;
  return false;
}

export function NetworkProvider({ children }: { children: React.ReactNode }) {
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    const unsub = NetInfo.addEventListener((state) => {
      setIsOffline(isOfflineState(state));
    });
    void NetInfo.fetch().then((state) => setIsOffline(isOfflineState(state)));
    return unsub;
  }, []);

  const value = useMemo(() => ({ isOffline }), [isOffline]);

  return (
    <NetworkContext.Provider value={value}>{children}</NetworkContext.Provider>
  );
}

export function useNetwork() {
  const ctx = useContext(NetworkContext);
  if (!ctx) {
    throw new Error("useNetwork csak NetworkProvider alatt használható");
  }
  return ctx;
}

/** Extra felső padding, ha az overlay offline sáv látható. */
export function useOfflineBannerInset(): number {
  const { isOffline } = useNetwork();
  const insets = useSafeAreaInsets();
  if (!isOffline) return 0;
  return insets.top + spacing.xs + OFFLINE_BANNER_BODY_HEIGHT;
}
