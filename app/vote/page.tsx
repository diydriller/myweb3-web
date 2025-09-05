"use client";

import { GOVERNOR_ADDRESS } from "@/abis/constant";
import { MYGOVERNOR } from "@/abis/MyGovernor";
import { DataTable } from "@/components/DataTable";
import { checkGovernorOwner, connectNetwork } from "@/libs/web3";
import { Provider, JsonRpcSigner } from "@ethersproject/providers";
import { ColumnDef } from "@tanstack/react-table";
import { Contract, ethers } from "ethers";
import { useEffect, useRef, useState } from "react";

export default function DaoVotePage() {
  const providerRef = useRef<Provider>(null);
  const signerRef = useRef<JsonRpcSigner>(null);
  const governorContractRef = useRef<Contract>(null);
  const [data, setData] = useState<any[]>([]);
  const [columns, setColumns] = useState<ColumnDef<any, any>[]>([]);
  const [account, setAccount] = useState<string>("");
  const [proposalId, setProposalId] = useState("");
  const [searchProposalId, setSearchProposalId] = useState("");
  const [proposalState, setProposalState] = useState("");
  const [blockNumber, setBlockNumber] = useState("");
  const [quorum, setQuorum] = useState("");
  const [votingDelay, setVotingDelay] = useState("");
  const [votingPeriod, setVotingPeriod] = useState("");
  const [selectedProposal, setSelectedProposal] =
    useState<ShowProposalLog | null>(null);
  const [isExecutable, setIsExecutable] = useState(false);
  const startBlock = 71545565;
  const ProposalState: { [key: string]: ProposalStateValue } = {
    VOTING: { name: "투표 중", code: 0 },
    ACTIVATED: { name: "활성화", code: 1 },
    CANCELED: { name: "취소 됨", code: 2 },
    DECIDED_AGAINST: { name: "반대로 결정", code: 3 },
    DECIDED_TO_EXECUTE: { name: "실행 되도록 결정", code: 4 },
    SCHEDULED_TO_EXECUTE: { name: "실행 예정", code: 5 },
    EXPIRED: { name: "만료 됨", code: 6 },
    EXECUTED: { name: "실행 됨", code: 7 },
  } as const;
  interface ProposalStateValue {
    name: string;
    code: number;
  }

  useEffect(() => {
    (async () => {
      const { ethereum } = window as any;
      if (!ethereum) return;

      await connectNetwork();
      const provider = new ethers.providers.Web3Provider(ethereum);
      providerRef.current = provider;
      const signer = provider.getSigner();
      signerRef.current = signer;
      const governor = new ethers.Contract(
        GOVERNOR_ADDRESS,
        MYGOVERNOR.abi,
        signer
      );
      governorContractRef.current = governor;

      const result = await checkGovernorOwner(governor);
      if (!result) return;
      const { accounts } = result;
      setAccount(accounts[0]);

      const currentBlockNumber = await provider.getBlockNumber();
      setBlockNumber(currentBlockNumber.toString());
      const quorum = await governor.quorum(currentBlockNumber.toString());
      setQuorum(quorum.toString());
      const votingDelay = await governor.votingDelay();
      setVotingDelay(votingDelay.toString());
      const votingPeriod = await governor.votingPeriod();
      setVotingPeriod(votingPeriod.toString());
    })();
  }, []);

  const getEventProposal = async () => {
    if (!governorContractRef.current || !providerRef.current) return;

    const proposalInfo: ShowProposalLog[] = [];
    const topic = [
      governorContractRef.current.filters.ProposalCreated().topics,
    ].toString();
    const filter = {
      address: GOVERNOR_ADDRESS,
      fromBlock: startBlock,
      topics: [topic],
    };
    const getlogs = await providerRef.current.getLogs(filter);
    const iface = new ethers.utils.Interface(MYGOVERNOR.abi);
    for (const logs of getlogs) {
      const receipt = await providerRef.current.getTransactionReceipt(
        logs.transactionHash
      );
      receipt.logs.forEach((log) => {
        const parsedLog = iface.parseLog(log);
        if (parsedLog.topic == topic) {
          const resObj = {
            proposalId: parsedLog.args.proposalId.toString(),
            startBlock: parsedLog.args.startBlock,
            endBlock: parsedLog.args.endBlock,
            description: parsedLog.args.description,
            targets: parsedLog.args.targets,
            calldatas: parsedLog.args.calldatas,
            txhash: logs.transactionHash,
          };
          proposalInfo.push(resObj);
        }
      });
    }

    const newBlockNumber = await providerRef.current.getBlockNumber();
    const filterdProposalInfo = proposalInfo.filter(
      (d) => d.endBlock > newBlockNumber
    );
    setColumns([
      { accessorKey: "proposalId", header: "proposalId" },
      { accessorKey: "startBlock", header: "startBlock" },
      { accessorKey: "endBlock", header: "endBlock" },
      { accessorKey: "description", header: "description" },
    ]);
    setData(filterdProposalInfo);
  };

  const getAllEventProposal = async () => {
    if (!governorContractRef.current || !providerRef.current) return;

    const proposalInfo: ShowProposalLog[] = [];
    const topic = [
      governorContractRef.current.filters.ProposalCreated().topics,
    ].toString();
    const filter = {
      address: GOVERNOR_ADDRESS,
      fromBlock: startBlock,
      topics: [topic],
    };
    const getlogs = await providerRef.current.getLogs(filter);
    const iface = new ethers.utils.Interface(MYGOVERNOR.abi);
    for (const logs of getlogs) {
      const receipt = await providerRef.current.getTransactionReceipt(
        logs.transactionHash
      );
      receipt.logs.forEach((log) => {
        const parsedLog = iface.parseLog(log);
        if (parsedLog.topic == topic) {
          const resObj = {
            proposalId: parsedLog.args.proposalId.toString(),
            startBlock: parsedLog.args.startBlock,
            endBlock: parsedLog.args.endBlock,
            description: parsedLog.args.description,
            targets: parsedLog.args.targets,
            calldatas: parsedLog.args.calldatas,
            txhash: logs.transactionHash,
          };
          proposalInfo.push(resObj);
        }
      });
    }

    setColumns([
      { accessorKey: "proposalId", header: "proposalId" },
      { accessorKey: "startBlock", header: "startBlock" },
      { accessorKey: "endBlock", header: "endBlock" },
      { accessorKey: "description", header: "description" },
    ]);
    setData(proposalInfo);
  };

  const agree = async () => {
    const { ethereum } = window as any;
    if (!ethereum) return;
    if (!governorContractRef.current) return;

    const proposalInputParsed = ethers.utils.parseUnits(proposalId.trim(), 0);
    const castVoteCalldata =
      governorContractRef.current.interface.encodeFunctionData("castVote", [
        proposalInputParsed,
        [1],
      ]);
    ethereum
      .request({
        method: "eth_sendTransaction",
        params: [
          {
            from: account,
            to: GOVERNOR_ADDRESS,
            value: "0",
            data: castVoteCalldata,
          },
        ],
      })
      .then((txHash: any) => console.log(txHash))
      .catch((error: any) => console.error(error));
  };

  const disagree = async () => {
    const { ethereum } = window as any;
    if (!ethereum) return;
    if (!governorContractRef.current) return;

    const proposalInputParsed = ethers.utils.parseUnits(proposalId.trim(), 0);
    const castVoteCalldata =
      governorContractRef.current.interface.encodeFunctionData("castVote", [
        proposalInputParsed,
        [0],
      ]);
    ethereum
      .request({
        method: "eth_sendTransaction",
        params: [
          {
            from: account,
            to: GOVERNOR_ADDRESS,
            value: "0",
            data: castVoteCalldata,
          },
        ],
      })
      .then((txHash: any) => console.log(txHash))
      .catch((error: any) => console.error(error));
  };

  const searchProposal = async () => {
    if (!governorContractRef.current || !providerRef.current) return;

    const code = await governorContractRef.current.state(
      searchProposalId.trim()
    );
    setIsExecutable(code == ProposalState.DECIDED_TO_EXECUTE.code);
    for (const state in ProposalState) {
      if (ProposalState[state].code == code) {
        setProposalState(ProposalState[state].name);
        break;
      }
    }

    const proposalInfo: ShowProposalLog[] = [];
    const topic = [
      governorContractRef.current.filters.ProposalCreated().topics,
    ].toString();
    const filter = {
      address: GOVERNOR_ADDRESS,
      fromBlock: startBlock,
      topics: [topic],
    };
    const getlogs = await providerRef.current.getLogs(filter);
    const iface = new ethers.utils.Interface(MYGOVERNOR.abi);
    for (const logs of getlogs) {
      const receipt = await providerRef.current.getTransactionReceipt(
        logs.transactionHash
      );
      receipt.logs.forEach((log) => {
        const parsedLog = iface.parseLog(log);
        if (parsedLog.topic == topic) {
          const resObj = {
            proposalId: parsedLog.args.proposalId.toString(),
            startBlock: parsedLog.args.startBlock,
            endBlock: parsedLog.args.endBlock,
            description: parsedLog.args.description,
            targets: parsedLog.args.targets,
            calldatas: parsedLog.args.calldatas,
            txhash: logs.transactionHash,
          };
          proposalInfo.push(resObj);
        }
      });
    }
    const find_data = data.find((d) => d.proposalId == searchProposalId);
    setSelectedProposal(find_data);
    setColumns([
      { accessorKey: "proposalId", header: "proposalId" },
      { accessorKey: "startBlock", header: "startBlock" },
      { accessorKey: "endBlock", header: "endBlock" },
      { accessorKey: "description", header: "description" },
    ]);
    setData(find_data ? [find_data] : []);
  };

  const executeProposal = async () => {
    const { ethereum } = window as any;
    if (!ethereum) return;
    if (!governorContractRef.current) return;
    if (!selectedProposal) return;

    const description_raw = selectedProposal.description;
    const targets = selectedProposal.targets;
    const calldatas = selectedProposal.calldatas;
    const descriptionHash = ethers.utils.id(description_raw);

    await governorContractRef.current.estimateGas.execute(
      targets,
      [0],
      calldatas,
      descriptionHash
    );
    const executeCalldata =
      governorContractRef.current.interface.encodeFunctionData("execute", [
        targets,
        [0],
        calldatas,
        descriptionHash,
      ]);
    ethereum
      .request({
        method: "eth_sendTransaction",
        params: [
          {
            from: account,
            to: GOVERNOR_ADDRESS,
            value: "0",
            data: executeCalldata,
          },
        ],
      })
      .then((txHash: any) => console.log(txHash))
      .catch((error: any) => console.error(error));
  };

  return (
    <main className="container mx-auto mt-8 px-4">
      <section className="flex flex-col items-center">
        <div className="w-full max-w-3xl">
          <h1 className="text-2xl font-bold text-center mb-6">DAO 투표하기</h1>

          <div className="mb-4 rounded-lg border-2 border-blue-500 p-4">
            <p>
              <span className="font-medium">Current BlockNumber :</span>{" "}
              <span className="text-blue-600">{blockNumber}</span>
            </p>
            <p>
              <span className="font-medium">통과에 필요한 투표 수 :</span>{" "}
              <span className="text-blue-600">{quorum}</span>
            </p>
            <p>
              <span className="font-medium">스냅 샷 시간 :</span>{" "}
              <span className="text-blue-600">{votingDelay}</span>
            </p>
            <p>
              <span className="font-medium">투표 종료 기준 시간 :</span>{" "}
              <span className="text-blue-600">{votingPeriod}</span>
            </p>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">지갑주소</label>
            <input
              type="text"
              value={account}
              readOnly
              placeholder="ENTER TOKEN NAME"
              className="w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-200"
            />
          </div>

          <div className="flex gap-2 mb-4">
            <button
              className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
              onClick={getEventProposal}
            >
              현재 활성화 안건만 불러오기
            </button>
            <button
              className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
              onClick={getAllEventProposal}
            >
              전체 안건들 불러오기
            </button>
          </div>

          <div className="mb-6">
            <input
              type="text"
              value={proposalId}
              onChange={(e) => setProposalId(e.target.value)}
              placeholder="투표 하고자 하는 Proposal ID를 지정해주세요"
              className="w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-200"
            />
            <div className="flex gap-2 mt-2">
              <button
                className="rounded-lg bg-green-600 px-4 py-2 text-white hover:bg-green-700"
                onClick={agree}
              >
                찬성에 투표하기
              </button>
              <button
                className="rounded-lg bg-red-600 px-4 py-2 text-white hover:bg-red-700"
                onClick={disagree}
              >
                반대에 투표하기
              </button>
            </div>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium mb-1">
              Proposal ID로 투표내역 조회하기
            </label>
            <input
              type="text"
              value={searchProposalId}
              onChange={(e) => setSearchProposalId(e.target.value)}
              placeholder="조회 하는 Proposal ID를 지정해주세요"
              className="w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-200"
            />
            <div className="flex gap-2 mt-2">
              <button
                className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
                onClick={searchProposal}
              >
                조회하기
              </button>
              {isExecutable && (
                <button
                  className="rounded-lg bg-purple-600 px-4 py-2 text-white hover:bg-purple-700"
                  onClick={executeProposal}
                >
                  실행하기
                </button>
              )}
            </div>
          </div>

          <input
            type="text"
            value={proposalState}
            readOnly
            placeholder="현재 상황이 표시됩니다."
            className="w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-200"
          />
        </div>
        <div className="mt-5 mb-3">
          <DataTable data={data} columns={columns} />
        </div>
      </section>
    </main>
  );
}
