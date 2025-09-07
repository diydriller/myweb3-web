"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { ethers, Signer } from "ethers";
import { Web3Provider } from "@ethersproject/providers";
import { connectNetwork } from "@/libs/web3";

interface WalletContextType {
  account: string | null;
  provider: ethers.providers.Web3Provider | null;
  signer: ethers.Signer | null;
}

const WalletContext = createContext<WalletContextType>({
  account: null,
  provider: null,
  signer: null,
});

export const WalletProvider = ({ children }: { children: React.ReactNode }) => {
  const [account, setAccount] = useState<string | null>(null);
  const [provider, setProvider] = useState<Web3Provider | null>(null);
  const [signer, setSigner] = useState<Signer | null>(null);

  useEffect(() => {
    (async () => {
      const { ethereum } = window as any;
      if (!ethereum) return;

      await connectNetwork();

      const _provider = new ethers.providers.Web3Provider(ethereum);
      setProvider(_provider);

      const _signer = _provider.getSigner();
      setSigner(_signer);

      const accounts = await _provider.listAccounts();

      if (accounts.length > 0) {
        setAccount(accounts[0]);
      }

      ethereum.on("accountsChanged", async (accounts: string[]) => {
        if (accounts.length === 0) {
          setAccount(null);
          setSigner(null);
        } else {
          setAccount(accounts[0]);
          setSigner(_provider.getSigner());
        }
      });
    })();
  }, []);

  return (
    <WalletContext.Provider value={{ account, provider, signer }}>
      {children}
    </WalletContext.Provider>
  );
};

export const useWallet = () => useContext(WalletContext);
