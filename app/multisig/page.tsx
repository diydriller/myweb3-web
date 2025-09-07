"use client";

import { ERC20_ADDRESS, MULTISIG_WALLET_ADDRESS } from "@/abis/constant";
import { MYERC20 } from "@/abis/MyERC20";
import { MYMULTISIGWALLET } from "@/abis/MyMultisigWallet";
import { DataTable } from "@/components/DataTable";
import { useWallet } from "@/context/WalletContext";
import { checkMultisigWalletOwner } from "@/libs/web3";
import { ColumnDef } from "@tanstack/react-table";
import { Contract, ethers } from "ethers";
import { useEffect, useRef, useState } from "react";

export default function MultisigPage() {
  const erc20ContractRef = useRef<Contract>(null);
  const multisigWalletContractRef = useRef<Contract>(null);
  const [data, setData] = useState<ShowTransactionLog[]>([]);
  const [columns, setColumns] = useState<ColumnDef<ShowTransactionLog, any>[]>(
    []
  );
  const [quorum, setQuorum] = useState<number | null>(null);
  const [txCount, setTxCount] = useState<number | null>(null);
  const [owners, setOwners] = useState<string[]>([]);
  const [newOwner, setNewOwner] = useState<string>("");
  const [txId, setTxId] = useState<string>("");
  const [isOwner, setIsOwner] = useState(false);

  const { account, signer } = useWallet();

  useEffect(() => {
    (async () => {
      const { ethereum } = window as any;
      if (!ethereum || !signer) return;

      const erc20Token = new ethers.Contract(
        ERC20_ADDRESS,
        MYERC20.abi,
        signer
      );
      erc20ContractRef.current = erc20Token;
      const multisigWallet = new ethers.Contract(
        MULTISIG_WALLET_ADDRESS,
        MYMULTISIGWALLET.abi,
        signer
      );
      multisigWalletContractRef.current = multisigWallet;

      const result = await checkMultisigWalletOwner(multisigWallet);
      if (!result) return;
      const { owners, isOwner } = result;
      setIsOwner(isOwner);
      setOwners(owners);

      const required = await multisigWallet.required();
      const transactionCount = await multisigWallet.transactionCount();
      setQuorum(required.toString());
      setTxCount(transactionCount.toString());
    })();
  }, [signer]);

  const handleAddOwner = () => {
    const { ethereum } = window as any;
    if (!ethereum) return;
    if (!multisigWalletContractRef.current) return;
    if (!newOwner) return;

    const ownerToAddChecksum = ethers.utils.getAddress(newOwner);
    const ownerToAddCallData =
      multisigWalletContractRef.current.interface.encodeFunctionData(
        "addOwner",
        [ownerToAddChecksum]
      );
    const sumbmitCallData =
      multisigWalletContractRef.current.interface.encodeFunctionData(
        "submitTransaction",
        [MULTISIG_WALLET_ADDRESS, 0, ownerToAddCallData]
      );
    ethereum
      .request({
        method: "eth_sendTransaction",
        params: [
          {
            from: account,
            to: MULTISIG_WALLET_ADDRESS,
            value: "0",
            data: sumbmitCallData,
            gas: "0x30d40",
          },
        ],
      })
      .then((txHash: any) => console.log(txHash))
      .catch((error: any) => console.error(error));
  };

  const handleSubmitERC20 = () => {
    const { ethereum } = window as any;
    if (!ethereum) return;
    if (!multisigWalletContractRef.current || !erc20ContractRef.current) return;

    const withdrawCallData =
      erc20ContractRef.current.interface.encodeFunctionData("withdrawAll");
    const submitTransactionCallData =
      multisigWalletContractRef.current.interface.encodeFunctionData(
        "submitTransaction",
        [ERC20_ADDRESS, 0, withdrawCallData]
      );
    ethereum
      .request({
        method: "eth_sendTransaction",
        params: [
          {
            from: account,
            to: MULTISIG_WALLET_ADDRESS,
            value: "0",
            data: submitTransactionCallData,
            gas: "0x30d40",
          },
        ],
      })
      .then((txHash: any) => console.log(txHash))
      .catch((error: any) => console.error(error));
  };

  const handleCheckTx = async () => {
    const { ethereum } = window as any;
    if (!ethereum) return;
    if (!multisigWalletContractRef.current || !erc20ContractRef.current) return;

    const tx_count = await multisigWalletContractRef.current.transactionCount();
    const txids = await multisigWalletContractRef.current.getTransactionIds(
      0,
      tx_count,
      true,
      false
    );
    const data: ShowTransactionLog[] = [];
    for (const i of txids) {
      const txid_ = i.toString();
      const isConfirmed = await multisigWalletContractRef.current.isConfirmed(
        txid_
      );
      const getConfirmations =
        await multisigWalletContractRef.current.getConfirmations(txid_);
      const getConfirmationCount =
        await multisigWalletContractRef.current.getConfirmationCount(txid_);
      data.push({
        transactionId: txid_,
        isConfirmed: isConfirmed,
        getConfirmations: getConfirmations,
        getConfirmationCount: getConfirmationCount,
      });
    }

    setColumns([
      { accessorKey: "transactionId", header: "transactionId" },
      { accessorKey: "isConfirmed", header: "isConfirmed" },
      { accessorKey: "getConfirmations", header: "getConfirmations" },
      { accessorKey: "getConfirmationCount", header: "getConfirmationCount" },
    ]);
    setData(data);
  };

  const handleConfirmTx = () => {
    const { ethereum } = window as any;
    if (!ethereum) return;
    if (!multisigWalletContractRef.current || !erc20ContractRef.current) return;

    const coinfirmTransactionCallData =
      multisigWalletContractRef.current.interface.encodeFunctionData(
        "confirmTransaction",
        [txId]
      );
    ethereum
      .request({
        method: "eth_sendTransaction",
        params: [
          {
            from: account,
            to: MULTISIG_WALLET_ADDRESS,
            value: "0",
            data: coinfirmTransactionCallData,
            gas: "0x30d40",
          },
        ],
      })
      .then((txHash: any) => console.log(txHash))
      .catch((error: any) => console.error(error));
  };

  return (
    <main className="container mx-auto px-4 py-6">
      <section className="max-w-3xl mx-auto">
        <h1 className="text-center text-2xl font-bold mb-6">
          Multisig 관리하기
        </h1>

        <div className="mb-6 rounded border-2 border-blue-500 p-4">
          <p>
            요구되는 서명 수 : <span className="text-blue-600">{quorum}</span>
          </p>
          <p>
            총 트랜잭션 개수 : <span className="text-blue-600">{txCount}</span>
          </p>
          <p>
            owner 리스트 :{" "}
            <span className="text-blue-600">
              {owners.length > 0 ? owners.join(", ") : "-"}
            </span>
          </p>
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium mb-1">지갑주소</label>
          <input
            type="text"
            className="w-full rounded border px-3 py-2 bg-gray-100"
            placeholder="Wallet Address"
            value={account || ""}
            readOnly
          />
        </div>

        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-2">제출가능한 트랜잭션들</h2>

          <label className="block text-sm font-medium mb-1">
            추가할 지갑주소
          </label>
          <input
            type="text"
            className="w-full rounded border px-3 py-2 mb-3"
            placeholder="New Owner Address"
            value={newOwner}
            onChange={(e) => setNewOwner(e.target.value)}
          />

          <button
            className="btn btn-primary px-4 py-2 bg-blue-500 text-white rounded"
            type="button"
            onClick={handleAddOwner}
          >
            owner 추가하기
          </button>

          <button
            className="btn btn-primary px-4 py-2 bg-blue-500 text-white rounded ml-3"
            type="button"
            onClick={handleSubmitERC20}
          >
            erc20 인출하기
          </button>
        </div>

        <div className="mb-6">
          <button
            className="btn btn-primary px-4 py-2 bg-blue-500 text-white rounded"
            type="button"
            onClick={handleCheckTx}
          >
            트랜잭션 내역들 불러오기
          </button>
        </div>

        <div className="mb-6">
          <label
            htmlFor="txid-Input"
            className="block text-sm font-medium mb-1"
          >
            실행할 트랜잭션 아이디
          </label>
          <input
            id="txid-Input"
            type="text"
            className="w-full rounded border px-3 py-2"
            value={txId}
            onChange={(e) => setTxId(e.target.value)}
          />

          <button
            className="btn btn-primary px-4 py-2 bg-blue-500 text-white rounded mt-3"
            type="button"
            onClick={handleConfirmTx}
          >
            트랜잭션 확정하기
          </button>
        </div>
      </section>
      <div className="mt-5 mb-3">
        <DataTable data={data} columns={columns} />
      </div>
    </main>
  );
}
