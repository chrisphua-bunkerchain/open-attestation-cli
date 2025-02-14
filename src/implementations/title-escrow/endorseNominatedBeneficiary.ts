import signale from "signale";
import { getLogger } from "../../logger";
import { getWalletOrSigner } from "../utils/wallet";
import { connectToTitleEscrow, validateNominateBeneficiary } from "./helpers";
import { TitleEscrowNominateBeneficiaryCommand } from "../../commands/title-escrow/title-escrow-command.type";

import { dryRunMode } from "../utils/dryRun";
import { TransactionReceipt } from "@ethersproject/providers";

const { trace } = getLogger("title-escrow:endorseTransferOfOwner");

export const endorseNominatedBeneficiary = async ({
  tokenRegistry: address,
  tokenId,
  newBeneficiary,
  network,
  dryRun,
  ...rest
}: TitleEscrowNominateBeneficiaryCommand): Promise<{
  transactionReceipt: TransactionReceipt;
  nominatedBeneficiary: string;
}> => {
  const wallet = await getWalletOrSigner({ network, ...rest });
  const titleEscrow = await connectToTitleEscrow({ tokenId, address, wallet });
  const nominatedBeneficiary = newBeneficiary;
  await validateNominateBeneficiary({ beneficiaryNominee: nominatedBeneficiary, titleEscrow });
  if (dryRun) {
    await dryRunMode({
      estimatedGas: await titleEscrow.estimateGas.transferBeneficiary(nominatedBeneficiary),
      network,
    });
    process.exit(0);
  }

  signale.await(`Sending transaction to pool`);
  await titleEscrow.callStatic.transferBeneficiary(nominatedBeneficiary);
  const transaction = await titleEscrow.transferBeneficiary(nominatedBeneficiary);
  trace(`Tx hash: ${transaction.hash}`);
  trace(`Block Number: ${transaction.blockNumber}`);
  signale.await(`Waiting for transaction ${transaction.hash} to be mined`);
  const transactionReceipt = await transaction.wait();
  return {
    transactionReceipt,
    nominatedBeneficiary: nominatedBeneficiary,
  };
};
