import { useWallet } from "@solana/wallet-adapter-react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { clearPlayerSession } from "../../hooks/playerAuthStorage";
import { usePlayerProfile } from "../../hooks/usePlayerProfile";
import { ProfileEditModal } from "./ProfileEditModal";
import { WalletConnectModal } from "./WalletConnectModal";

interface WalletModalContextValue {
  openWalletModal: () => void;
  closeWalletModal: () => void;
  openProfileEdit: () => void;
  logout: () => void;
}

const WalletModalContext = createContext<WalletModalContextValue | null>(null);

const profileDismissKey = (wallet: string) =>
  `sol-ttt-profile-dismissed:${wallet}`;

export function WalletModalProvider({ children }: { children: ReactNode }) {
  const { publicKey, connected, disconnect } = useWallet();
  const wallet = publicKey?.toBase58() ?? null;
  const profile = usePlayerProfile(wallet);

  const [connectOpen, setConnectOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [onboarding, setOnboarding] = useState(false);
  const onboardedWalletRef = useRef<string | null>(null);

  const openWalletModal = useCallback(() => setConnectOpen(true), []);
  const closeWalletModal = useCallback(() => setConnectOpen(false), []);
  const openProfileEdit = useCallback(() => {
    setOnboarding(false);
    setProfileOpen(true);
  }, []);

  const logout = useCallback(() => {
    clearPlayerSession();
    void disconnect();
    if (wallet) sessionStorage.removeItem(profileDismissKey(wallet));
  }, [disconnect, wallet]);

  useEffect(() => {
    if (profile?.nickname && wallet) {
      sessionStorage.removeItem(profileDismissKey(wallet));
    }
  }, [profile?.nickname, wallet]);

  useEffect(() => {
    if (!connected || !wallet) {
      onboardedWalletRef.current = null;
      return;
    }
    if (profile === null) return;
    if (onboardedWalletRef.current === wallet) return;

    onboardedWalletRef.current = wallet;
    const dismissed = sessionStorage.getItem(profileDismissKey(wallet));
    if (!profile.nickname && !dismissed) {
      setOnboarding(true);
      setProfileOpen(true);
    }
  }, [connected, wallet, profile]);

  const handleProfileOpenChange = useCallback(
    (open: boolean) => {
      setProfileOpen(open);
      if (!open && wallet && onboarding && !profile?.nickname) {
        sessionStorage.setItem(profileDismissKey(wallet), "1");
      }
      if (!open) setOnboarding(false);
    },
    [wallet, onboarding, profile?.nickname],
  );

  return (
    <WalletModalContext.Provider
      value={{
        openWalletModal,
        closeWalletModal,
        openProfileEdit,
        logout,
      }}
    >
      {children}
      <WalletConnectModal open={connectOpen} onOpenChange={setConnectOpen} />
      {wallet && (
        <ProfileEditModal
          open={profileOpen}
          onOpenChange={handleProfileOpenChange}
          wallet={wallet}
          profile={profile}
          onboarding={onboarding}
        />
      )}
    </WalletModalContext.Provider>
  );
}

export function useWalletModal() {
  const ctx = useContext(WalletModalContext);
  if (!ctx) {
    throw new Error("useWalletModal must be used within WalletModalProvider");
  }
  return ctx;
}
