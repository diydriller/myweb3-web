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
