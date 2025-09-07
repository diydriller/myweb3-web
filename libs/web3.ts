import { ERC20_ADDRESS } from "@/abis/constant";
import { MYERC20 } from "@/abis/MyERC20";
import { Contract, ethers } from "ethers";

export const createERC20Contract = (
  provider: ethers.providers.Web3Provider
) => {
  const signer = provider.getSigner();
  const abi = MYERC20.abi;
  const contract = new ethers.Contract(ERC20_ADDRESS, abi, signer);
  return { abi, contract };
};

export const connectNetwork = async () => {
  const { ethereum } = window as any;
  if (!ethereum) return;

  await ethereum.request({
    method: "wallet_addEthereumChain",
    params: [
      {
        chainId: "0xc",
        chainName: "Metadium Testnet",
        nativeCurrency: {
          name: "KAL",
          symbol: "KAL",
          decimals: 18,
        },
        rpcUrls: ["https://api.metadium.com/dev"],
      },
    ],
  });
  await ethereum.request({
    method: "wallet_switchEthereumChain",
    params: [{ chainId: "0xc" }],
  });
};

export const checkERC20Owner = async (erc20Token: Contract) => {
  const { ethereum } = window as any;
  if (!ethereum) return;

  const accounts = await ethereum.request({
    method: "eth_requestAccounts",
  });

  const accountChecksum = ethers.utils.getAddress(accounts[0]);
  const owner = await erc20Token.owner();
  const isOwner = owner === accountChecksum;

  return { isOwner };
};

export const checkERC721Owner = async (erc721Token: Contract) => {
  const { ethereum } = window as any;
  if (!ethereum) return;

  const accounts = await ethereum.request({
    method: "eth_requestAccounts",
  });

  const tokenId = await erc721Token.tokenId();

  const accountChecksum = ethers.utils.getAddress(accounts[0]);
  const owner = await erc721Token.ownerOf(tokenId);
  const isOwner = owner === accountChecksum;

  return { owner, isOwner, tokenId };
};

export const checkGovernorOwner = async (governor: Contract) => {
  const { ethereum } = window as any;
  if (!ethereum) return;

  const accounts = await ethereum.request({
    method: "eth_requestAccounts",
  });

  const accountChecksum = ethers.utils.getAddress(accounts[0]);
  const owner = await governor.owner();
  const isOwner = owner === accountChecksum;

  return { owner, isOwner };
};
