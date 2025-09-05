"use client";

import { useEffect, useRef, useState } from "react";
import { ethers, Contract } from "ethers";
import { JsonRpcSigner, Provider } from "@ethersproject/providers";
import { MYERC721 } from "@/abis/MyERC721";
import { MYERC20 } from "@/abis/MyERC20";
import { ERC721_ADDRESS, ERC20_ADDRESS } from "@/abis/constant";
import Image from "next/image";
import { DataTable } from "@/components/DataTable";
import { ColumnDef } from "@tanstack/react-table";
import { checkERC721Owner, connectNetwork } from "@/libs/web3";

type Attribute = {
  trait_type: string;
  value: string;
};

type NftMetadata = {
  image: string;
  name: string;
  attributes: Attribute[];
};

export default function NFTPage() {
  const providerRef = useRef<Provider>(null);
  const signerRef = useRef<JsonRpcSigner>(null);
  const erc20ContractRef = useRef<Contract>(null);
  const erc721ContractRef = useRef<Contract>(null);
  const [data, setData] = useState<ShowNftLog[]>([]);
  const [columns, setColumns] = useState<ColumnDef<ShowNftLog, any>[]>([]);
  const [isOwner, setIsOwner] = useState(false);
  const [owner, setOwner] = useState<string>("");
  const [price, setPrice] = useState<string>("");
  const [tokenId, setTokenId] = useState<string>("");
  const [account, setAccount] = useState<string[]>([]);
  const [metadata, setMetadata] = useState<NftMetadata | null>(null);
  const [tokenIdInput, setTokenIdInput] = useState<string>("");
  const [priceInput, setPriceInput] = useState<string>("");

  const startBlock = 71545565;

  useEffect(() => {
    (async () => {
      const { ethereum } = window as any;
      if (!ethereum) return;

      await connectNetwork();
      const provider = new ethers.providers.Web3Provider(ethereum);
      providerRef.current = provider;
      const signer = provider.getSigner();
      signerRef.current = signer;
      const erc721Token = new ethers.Contract(
        ERC721_ADDRESS,
        MYERC721.abi,
        signer
      );
      erc721ContractRef.current = erc721Token;
      const erc20Token = new ethers.Contract(
        ERC20_ADDRESS,
        MYERC20.abi,
        signer
      );
      erc20ContractRef.current = erc20Token;

      const result = await checkERC721Owner(erc721Token);
      if (!result) return;
      const { accounts, owner, isOwner, tokenId } = result;
      setTokenId(tokenId.toNumber());
      getTokenMetaData(tokenId.toNumber());
      setIsOwner(isOwner);
      setAccount(accounts);
      setOwner(owner);
      const nftPrice = await erc721Token.getNftPrice();
      const displayNftPrice = (nftPrice / 10 ** 18).toString();
      setPrice(displayNftPrice);
    })();
  }, []);

  const getTokenMetaData = async (tokenId: number) => {
    if (tokenId < 1 || tokenId > 100) {
      return;
    }
    const res = await fetch(`/api/nft/${tokenId}`, {
      method: "GET",
    });
    const json: NftMetadata = await res.json();
    setMetadata(json);
  };

  const approveToken = () => {
    const { ethereum } = window as any;
    if (!ethereum) return;
    if (!erc20ContractRef.current) return;

    const infinite = ethers.utils.parseUnits(
      "115792089237316195423570985008687907853269984665640564039457584007913129639935",
      0
    );

    const approveCalldata =
      erc20ContractRef.current.interface.encodeFunctionData("approve", [
        ERC721_ADDRESS,
        infinite,
      ]);
    ethereum
      .request({
        method: "eth_sendTransaction",
        params: [
          {
            from: account[0],
            to: ERC20_ADDRESS,
            value: "0",
            data: approveCalldata,
          },
        ],
      })
      .then((txHash: any) => console.log(txHash))
      .catch((error: any) => console.error(error));
  };

  const buyNft = async () => {
    const { ethereum } = window as any;
    if (!ethereum) return;
    if (!erc721ContractRef.current) return;

    await erc721ContractRef.current.estimateGas.mintWithToken();
    const mintCalldata =
      erc721ContractRef.current.interface.encodeFunctionData("mintWithToken");
    ethereum
      .request({
        method: "eth_sendTransaction",
        params: [
          {
            from: account[0],
            to: ERC721_ADDRESS,
            value: "0",
            data: mintCalldata,
          },
        ],
      })
      .then((txHash: any) => console.log(txHash))
      .catch((error: any) => console.error(error));

    const result = await checkERC721Owner(erc721ContractRef.current);
    if (!result) return;
    const { owner, isOwner } = result;
    setOwner(owner);
    setIsOwner(isOwner);
  };

  const showEvent = async () => {
    if (!providerRef.current || !erc721ContractRef.current) return;

    const clientsNFT: ShowNftLog[] = [];
    const topic = [
      erc721ContractRef.current.filters.Transfer().topics,
    ].toString();
    const filter = {
      address: ERC721_ADDRESS,
      fromBlock: startBlock,
      topics: [topic],
    };
    const getlogs = await providerRef.current.getLogs(filter);
    for (const logs of getlogs) {
      const receipt = await providerRef.current.getTransactionReceipt(
        logs.transactionHash
      );
      receipt.logs.forEach((log) => {
        if (log.topics[0] == topic && log.address == ERC721_ADDRESS) {
          const resObj = {
            from: "0x" + log.topics[1].slice(26),
            to: "0x" + log.topics[2].slice(26),
            tokenId: parseInt(log.topics[3], 16),
            txhash: logs.transactionHash,
          };
          clientsNFT.push({
            from: resObj.from,
            to: resObj.to,
            tokenId: resObj.tokenId,
            txhash: resObj.txhash,
          });
        }
      });
    }

    setColumns([
      { accessorKey: "from", header: "from" },
      { accessorKey: "to", header: "to" },
      { accessorKey: "tokenId", header: "tokenId" },
      { accessorKey: "txhash", header: "txhash" },
    ]);
    setData(clientsNFT);
  };

  const setNftPrice = async () => {
    const { ethereum } = window as any;
    if (!ethereum) return;
    if (!providerRef.current || !erc721ContractRef.current) return;

    const setNftPriceCalldata =
      erc721ContractRef.current.interface.encodeFunctionData("setNftPrice", [
        (Number(priceInput) * 10 ** 18).toString(),
      ]);
    await ethereum
      .request({
        method: "eth_sendTransaction",
        params: [
          {
            from: account[0],
            to: ERC721_ADDRESS,
            value: "0",
            data: setNftPriceCalldata,
          },
        ],
      })
      .catch((error: any) => console.error(error));
  };

  const withdrawERC20 = async () => {
    const { ethereum } = window as any;
    if (!ethereum) return;
    if (!providerRef.current || !erc721ContractRef.current) return;

    const withdrawCalldata =
      erc721ContractRef.current.interface.encodeFunctionData("withdrawERC20");
    await ethereum
      .request({
        method: "eth_sendTransaction",
        params: [
          {
            from: account[0],
            to: ERC721_ADDRESS,
            value: "0",
            data: withdrawCalldata,
          },
        ],
      })
      .catch((error: any) => console.error(error));
  };

  const searchToken = async () => {
    if (!providerRef.current || !erc721ContractRef.current) return;

    try {
      const owner = await erc721ContractRef.current.ownerOf(
        ethers.BigNumber.from(tokenIdInput)
      );
      setOwner(owner);
      setTokenId(tokenIdInput);
      getTokenMetaData(Number(tokenIdInput));
    } catch (error) {
      console.error(error);
      setMetadata(null);
    }
  };

  return (
    <main className="min-h-screen bg-gray-50 p-6">
      <div className="container mx-auto grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          {metadata && (
            <div className="relative w-full h-150">
              <Image
                src={metadata.image}
                alt={metadata.name}
                fill
                className="object-cover rounded-lg"
                sizes="(max-width: 768px) 100vw, 400px"
                priority
              />
            </div>
          )}
          <div className="mt-4 border rounded-lg">
            <button
              className="w-full px-4 py-2 text-left font-medium bg-gray-100 rounded-t-lg"
              type="button"
            >
              Description
            </button>
            <div className="p-4 space-y-2">
              {metadata &&
                metadata.attributes.map((attr, index) => (
                  <p
                    key={index}
                    className="text-sm text-gray-700 border-b pb-1 last:border-none"
                  >
                    <span className="font-semibold">{attr.trait_type}:</span>{" "}
                    {attr.value}
                  </p>
                ))}
            </div>
          </div>
        </div>

        <div>
          <p className="text-xl font-medium mt-2 mb-0">NFT</p>
          <h1 className="text-3xl font-bold">
            {(metadata && metadata.name) || ""}
          </h1>

          <div className="mt-2 text-gray-700">
            <span className="mr-1">Owned by</span>
            <span className="text-blue-600">{owner || ""}</span>
          </div>

          <div className="mt-4 space-y-3">
            <div>
              <p className="text-lg font-semibold">Current Price</p>
              <h2 className="text-2xl font-bold">{price || ""}</h2>
            </div>
            <div>
              <p className="text-lg font-semibold">Current Token ID</p>
              <h2 className="text-2xl font-bold">{tokenId || ""}</h2>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              className="btn btn-primary px-4 py-2 bg-blue-500 text-white rounded"
              onClick={approveToken}
            >
              Approve ERC20 Token
            </button>
            <button
              className="btn btn-primary px-4 py-2 bg-blue-500 text-white rounded"
              onClick={buyNft}
            >
              BUY NOW !!!
            </button>
            <button
              className="btn btn-primary px-4 py-2 bg-blue-500 text-white rounded"
              onClick={showEvent}
            >
              Show Event
            </button>
          </div>

          <div className="mt-4">
            <label htmlFor="nft-price" className="block text-sm font-medium">
              바꿀 NFT 가격
            </label>
            <input
              id="nft-price"
              type="text"
              placeholder="NFT PRICE"
              className="py-2 mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              onChange={(e) => setPriceInput(e.target.value)}
            />
          </div>
          {isOwner && (
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                className="btn btn-primary px-4 py-2 bg-blue-500 text-white rounded"
                onClick={setNftPrice}
              >
                Set Price
              </button>
              <button
                className="btn btn-primary px-4 py-2 bg-blue-500 text-white rounded"
                onClick={withdrawERC20}
              >
                Withdraw ERC20
              </button>
            </div>
          )}

          <div className="mt-4">
            <form
              onSubmit={(e) => {
                e.preventDefault();
              }}
              className="flex gap-2"
            >
              <input
                id="token-id"
                name="tokenId"
                type="text"
                placeholder="Enter other NFT ID"
                className="flex-1 rounded-lg border-gray-300 shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                value={tokenIdInput}
                onChange={(e) => setTokenIdInput(e.target.value)}
              />
              <button
                type="submit"
                className="btn btn-primary px-4 py-2 bg-blue-500 text-white rounded"
                onClick={searchToken}
              >
                검색
              </button>
            </form>
          </div>
        </div>
      </div>
      <div className="mt-5 mb-3">
        <DataTable data={data} columns={columns} />
      </div>
    </main>
  );
}
