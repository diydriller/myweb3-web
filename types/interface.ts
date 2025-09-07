interface TransferLog {
  amount: string;
  buyer: string;
  txhash: string;
}

interface WithdrawLog {
  amount: string;
  withdrawer: string;
  txhash: string;
}

interface ShowNftLog {
  from: string;
  to: string;
  tokenId: number;
  txhash: string;
}

interface ShowProposalLog {
  proposalId: string;
  startBlock: number;
  endBlock: number;
  description: string;
  targets: string;
  calldatas: string;
  txhash: string;
}

interface ShowTransactionLog {
  transactionId: string;
  isConfirmed: string;
  getConfirmations: string;
  getConfirmationCount: string;
}
