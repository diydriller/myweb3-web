"use client";

import { useEffect, useRef, useState } from "react";
import { Contract, ethers } from "ethers";
import { Provider, JsonRpcSigner } from "@ethersproject/providers";

import { MYGOVERNOR } from "@/abis/MyGovernor";
import { MYERC721 } from "@/abis/MyERC721";
import { MYERC1155 } from "@/abis/MyERC1155";
import {
  ERC1155_ADDRESS,
  ERC721_ADDRESS,
  GOVERNOR_ADDRESS,
} from "@/abis/constant";
import { checkGovernorOwner, connectNetwork } from "@/libs/web3";

export default function DaoPage() {
  const providerRef = useRef<Provider>(null);
  const signerRef = useRef<JsonRpcSigner>(null);
  const governorContractRef = useRef<Contract>(null);
  const erc721ContractRef = useRef<Contract>(null);
  const erc1155ContractRef = useRef<Contract>(null);
  const [account, setAccount] = useState<string>("");
  const [proposalInput, setProposalInput] = useState("");
  const [tokenURI, setTokenURI] = useState("11");
  const [delegateAddress, setDelegateAddress] = useState("");
  const [voteWeight, setVoteWeight] = useState<string>("");

  useEffect(() => {
    (async () => {
      if (!window.ethereum) return;

      await connectNetwork();
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      providerRef.current = provider;
      const signer = provider.getSigner();
      signerRef.current = signer;
      const governor = new ethers.Contract(
        GOVERNOR_ADDRESS,
        MYGOVERNOR.abi,
        signer
      );
      const erc721 = new ethers.Contract(ERC721_ADDRESS, MYERC721.abi, signer);
      const erc1155 = new ethers.Contract(
        ERC1155_ADDRESS,
        MYERC1155.abi,
        signer
      );
      governorContractRef.current = governor;
      erc721ContractRef.current = erc721;
      erc1155ContractRef.current = erc1155;

      const result = await checkGovernorOwner(governor);
      if (!result) return;
      const { accounts } = result;
      setAccount(accounts[0]);
      setDelegateAddress(accounts[0]);
    })();
  }, []);

  const handleCheckVote = async () => {
    if (!window.ethereum) return;
    if (!erc721ContractRef.current) return;

    const weight = await erc721ContractRef.current.getVotes(account);
    setVoteWeight(weight.toString());
  };

  const handleProposal = async () => {
    if (!window.ethereum) return;
    if (!governorContractRef.current || !erc1155ContractRef.current) return;

    const setURICalldata =
      erc1155ContractRef.current.interface.encodeFunctionData("setURI", [
        0,
        tokenURI,
      ]);
    const governorCalldata =
      governorContractRef.current.interface.encodeFunctionData("propose", [
        [ERC1155_ADDRESS],
        [0],
        [setURICalldata],
        proposalInput,
      ]);
    try {
      await window.ethereum.request({
        method: "eth_sendTransaction",
        params: [
          {
            from: account,
            to: GOVERNOR_ADDRESS,
            value: "0",
            data: governorCalldata,
          },
        ],
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelegate = async () => {
    if (!window.ethereum) return;
    if (!erc721ContractRef.current) return;

    const delegatingCall =
      erc721ContractRef.current.interface.encodeFunctionData("delegate", [
        delegateAddress,
      ]);
    try {
      await window.ethereum.request({
        method: "eth_sendTransaction",
        params: [
          {
            from: account,
            to: ERC721_ADDRESS,
            value: "0",
            data: delegatingCall,
          },
        ],
      });
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <>
      <main className="container mx-auto mt-10 px-4">
        <div className="max-w-2xl mx-auto bg-white shadow-md rounded-lg p-6">
          <h1 className="text-2xl font-bold text-center mb-4">
            DAO 안건 제안하기
          </h1>
          <p className="text-center mb-6">원하는 정책을 등록해 주세요!</p>

          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">지갑주소</label>
            <input
              type="text"
              value={account}
              readOnly
              className="w-full border rounded-md px-3 py-2 bg-gray-100"
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">
              제안할 사안
            </label>
            <div className="flex space-x-2">
              <input
                type="text"
                value={proposalInput}
                onChange={(e) => setProposalInput(e.target.value)}
                placeholder="DAO에 제안할 안건을 추가해주세요"
                className="flex-1 border rounded-md px-3 py-2"
              />
              <button
                onClick={handleProposal}
                className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                +
              </button>
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">
              NFT 데이터 확인
            </label>
            <input
              type="text"
              value={tokenURI}
              onChange={(e) => setTokenURI(e.target.value)}
              className="w-full border rounded-md px-3 py-2"
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">
              투표권을 위임할 주소
            </label>
            <div className="flex space-x-2">
              <input
                type="text"
                value={delegateAddress}
                onChange={(e) => setDelegateAddress(e.target.value)}
                className="flex-1 border rounded-md px-3 py-2"
              />
              <button
                onClick={handleDelegate}
                className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                보내기
              </button>
            </div>
          </div>

          <div className="mb-4">
            <button
              onClick={handleCheckVote}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
            >
              나의 투표 가능 수 체크
            </button>
            {voteWeight && (
              <div className="mt-2">투표 가능 수: {voteWeight}</div>
            )}
          </div>
        </div>
      </main>
    </>
  );
}
