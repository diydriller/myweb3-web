"use client";

import { useEffect, useRef, useState } from "react";
import { MYERC20 } from "@/abis/MyERC20";
import { ethers, Contract } from "ethers";
import { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/DataTable";
import { Provider } from "@ethersproject/providers";
import { noExponents } from "@/utils/noExponent";
import { ERC20_ADDRESS } from "@/abis/constant";
import { checkERC20Owner, connectNetwork } from "@/libs/web3";

const TokenPage = () => {
  const providerRef = useRef<Provider>(null);
  const contractRef = useRef<Contract>(null);
  const [isOwner, setIsOwner] = useState(false);
  const [account, setAccount] = useState<string[]>([]);
  const [ethAmount, setEthAmount] = useState("");
  const [tokenAmount, setTokenAmount] = useState("");
  const [data, setData] = useState<any>([]);
  const [columns, setColumns] = useState<ColumnDef<any, any>[]>([]);

  const startBlock = 71545565;

  useEffect(() => {
    (async () => {
      const { ethereum } = window as any;
      if (!ethereum) return;

      await connectNetwork();
      const provider = new ethers.providers.Web3Provider(ethereum);
      const signer = provider.getSigner();
      const erc20Token = new ethers.Contract(
        ERC20_ADDRESS,
        MYERC20.abi,
        signer
      );
      providerRef.current = provider;
      contractRef.current = erc20Token;

      const result = await checkERC20Owner(contractRef.current);
      if (!result) return;
      const { accounts, isOwner } = result;
      setAccount(accounts);
      setIsOwner(isOwner);
    })();
  }, []);

  const handleViewHistory = async () => {
    if (!contractRef.current || !providerRef.current) return;

    const clientsERC20: TransferLog[] = [];
    const topic = [contractRef.current.filters.TokenBuy().topics].toString();
    const filter = {
      address: ERC20_ADDRESS,
      fromBlock: startBlock,
      topics: [topic],
    };

    const getlogs = await providerRef.current.getLogs(filter);
    const iface = new ethers.utils.Interface(MYERC20.abi);
    for (const logs of getlogs) {
      const receipt = await providerRef.current.getTransactionReceipt(
        logs.transactionHash
      );
      receipt!.logs.forEach((log) => {
        const parsedLog = iface.parseLog(log);
        if (parsedLog.topic == topic) {
          const resObj = {
            amount: parsedLog.args.amount.toString(),
            buyer: parsedLog.args.buyer,
            txhash: logs.transactionHash,
          };

          clientsERC20.push({
            amount: (resObj.amount / 10 ** 18).toString(),
            buyer: resObj.buyer,
            txhash: resObj.txhash,
          });
        }
      });
    }

    setColumns([
      { accessorKey: "amount", header: "amount" },
      { accessorKey: "buyer", header: "buyer" },
      { accessorKey: "txhash", header: "txhash" },
    ]);
    setData(clientsERC20);
  };

  const handleViewWithdrawHistory = async () => {
    if (!contractRef.current || !providerRef.current) return;

    const clientsETH: WithdrawLog[] = [];
    const topic = [contractRef.current.filters.WithdrawETH().topics].toString();
    const filter = {
      address: ERC20_ADDRESS,
      fromBlock: startBlock,
      topics: [topic],
    };
    const getlogs = await providerRef.current.getLogs(filter);
    const iface = new ethers.utils.Interface(MYERC20.abi);
    for (const logs of getlogs) {
      const receipt = await providerRef.current.getTransactionReceipt(
        logs.transactionHash
      );
      receipt!.logs.forEach((log) => {
        const parsedLog = iface.parseLog(log);
        if (parsedLog.topic == topic) {
          const resObj = {
            withdrawer: parsedLog.args.withdrawer,
            amount: parsedLog.args.amount,
            txhash: logs.transactionHash,
          };
          clientsETH.push({
            amount: (resObj.amount / 10 ** 18).toString(),
            withdrawer: resObj.withdrawer,
            txhash: resObj.txhash,
          });
        }
      });
    }
    setColumns([
      { accessorKey: "amount", header: "amount" },
      { accessorKey: "withdrawer", header: "withdrawer" },
      { accessorKey: "txhash", header: "txhash" },
    ]);
    setData(clientsETH);
  };

  const handleCheckTokenAmount = async () => {
    if (!contractRef.current || !providerRef.current) return;

    const ether_amount = noExponents((Number(ethAmount) * 10 ** 18).toString());
    const exchangeAmount = await contractRef.current.getExchangeRate(
      ether_amount
    );
    setTokenAmount(
      exchangeAmount.div(noExponents((10 ** 18).toString())).toString()
    );
  };

  const handleSendTransaction = async () => {
    const { ethereum } = window as any;
    if (!ethereum) return;
    if (!contractRef.current) return;

    const ether_amount = noExponents((Number(ethAmount) * 10 ** 18).toString());
    const hex_value = (Number(ethAmount) * 10 ** 18).toString(16);
    const exchangeAmount = await contractRef.current.getExchangeRate(
      ether_amount
    );
    setTokenAmount(
      exchangeAmount.div(noExponents((10 ** 18).toString())).toString()
    );
    await contractRef.current.estimateGas.buyToken({
      value: ether_amount,
    });
    const transferCalldata =
      contractRef.current.interface.encodeFunctionData("buyToken");
    ethereum
      .request({
        method: "eth_sendTransaction",
        params: [
          {
            from: account[0],
            to: ERC20_ADDRESS,
            value: hex_value,
            data: transferCalldata,
          },
        ],
      })
      .then((txHash: any) => console.log(txHash))
      .catch((error: any) => console.error(error));
  };

  const handleWithdraw = async () => {
    const { ethereum } = window as any;
    if (!ethereum) return;
    if (!contractRef.current) return;

    const withdrawCalldata =
      contractRef.current.interface.encodeFunctionData("withdrawAll");
    ethereum
      .request({
        method: "eth_sendTransaction",
        params: [
          {
            from: account[0],
            to: ERC20_ADDRESS,
            value: "0",
            data: withdrawCalldata,
          },
        ],
      })
      .then((txHash: any) => console.log(txHash))
      .catch((error: any) => console.error(error));
  };

  const reset = () => {
    setTokenAmount("");
    setEthAmount("");
  };

  return (
    <div className="container mx-auto mt-4">
      <div className="flex justify-center">
        <div className="w-full max-w-lg">
          <h1 className="text-center text-2xl font-bold mb-4">
            토큰 판매 페이지
          </h1>
          <p className="text-center mb-4">
            아래의 양식에 필요한 정보를 입력해주세요.
          </p>

          <form id="tokenForm">
            <div className="mb-4">
              <label
                htmlFor="addressFromWallet"
                className="block text-sm font-medium text-gray-700"
              >
                지갑주소
              </label>
              <input
                type="text"
                id="addressFromWallet"
                className="mt-1 p-2 w-full border border-gray-300 rounded-md"
                value={(account && account[0]) || ""}
                readOnly
              />
            </div>

            <div className="mb-4">
              <label
                htmlFor="inputEthAmount"
                className="block text-sm font-medium text-gray-700"
              >
                보내는 이더리움 개수
              </label>
              <input
                type="number"
                id="inputEthAmount"
                className="mt-1 p-2 w-full border border-gray-300 rounded-md"
                placeholder="ENTER TOKEN PRICE(ETH)"
                value={ethAmount}
                onChange={(e) => setEthAmount(e.target.value)}
              />
            </div>

            <div className="mb-4">
              <label
                htmlFor="inputTokenAmount"
                className="block text-sm font-medium text-gray-700"
              >
                받는 토큰의 양
              </label>
              <input
                type="number"
                id="inputTokenAmount"
                className="mt-1 p-2 w-full border border-gray-300 rounded-md"
                placeholder="NUMBER OF TOKEN"
                value={tokenAmount}
                onChange={(e) => setTokenAmount(e.target.value)}
              />
            </div>

            <div className="flex space-x-2 mb-4">
              <button
                type="button"
                className="btn btn-primary px-4 py-2 bg-blue-500 text-white rounded"
                onClick={handleCheckTokenAmount}
              >
                받을 토큰 양 조회
              </button>
              <button
                type="button"
                className="btn btn-primary px-4 py-2 bg-blue-500 text-white rounded"
                onClick={handleViewHistory}
              >
                내역 조회
              </button>
              <button
                type="button"
                className="btn btn-primary px-4 py-2 bg-blue-500 text-white rounded"
                onClick={handleSendTransaction}
              >
                토큰 구매
              </button>
              <button
                type="reset"
                className="btn btn-secondary px-4 py-2 bg-gray-500 text-white rounded"
                onClick={reset}
              >
                초기화
              </button>
            </div>
            {isOwner && (
              <div className="flex space-x-2">
                <button
                  type="button"
                  className="btn btn-primary px-4 py-2 bg-blue-500 text-white rounded"
                  onClick={handleWithdraw}
                >
                  인출하기
                </button>
                <button
                  type="button"
                  className="btn btn-primary px-4 py-2 bg-blue-500 text-white rounded"
                  onClick={handleViewWithdrawHistory}
                >
                  인출 내역 조회
                </button>
              </div>
            )}
          </form>
        </div>
      </div>
      <div className="mt-5 mb-3">
        <DataTable data={data} columns={columns} />
      </div>
    </div>
  );
};

export default TokenPage;
