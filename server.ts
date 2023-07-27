import { ethers } from "ethers";
import Safe, {
  EthersAdapter,
  SafeAccountConfig,
} from "@safe-global/protocol-kit";
import dotenv from "dotenv";
import { SafeFactory } from "@safe-global/protocol-kit";
import { SafeTransactionDataPartial } from "@safe-global/safe-core-sdk-types";

dotenv.config();

const RPC_URL = process.env.RPC_URL;
const provider = new ethers.providers.JsonRpcProvider(RPC_URL);

const owner1Signer = new ethers.Wallet(
  process.env.OWNER_1_PRIVATE_KEY!,
  provider
);
const owner2Signer = new ethers.Wallet(
  process.env.OWNER_2_PRIVATE_KEY!,
  provider
);
const owner3Signer = new ethers.Wallet(
  process.env.OWNER_3_PRIVATE_KEY!,
  provider
);

const ethAdapterOwner1 = new EthersAdapter({
  ethers,
  signerOrProvider: owner1Signer,
});

const safeFactory = await SafeFactory.create({ ethAdapter: ethAdapterOwner1 });

//listing the owners
const owners = [
  await owner1Signer.getAddress(),
  await owner2Signer.getAddress(),
  await owner3Signer.getAddress(),
];

// declaring the decorum
const threshold = 2;
const safeAccountConfig: SafeAccountConfig = {
  owners,
  threshold,
};

//deploying safe
const safeSdk: Safe = await safeFactory.deploySafe({ safeAccountConfig });

const newSafeAddress = await safeSdk.getAddress();
console.log(`deployed at address ${newSafeAddress}`);

// fundraising in safe

const safeAmount = ethers.utils.parseUnits("0.01", "ether").toHexString();

const transactionParameters = {
  to: newSafeAddress,
  value: safeAmount,
};

const tx = await owner1Signer.sendTransaction(transactionParameters);

console.log(`Fundraising txhash : ${tx.hash}`);
await tx.wait();

const currentbalance = await safeSdk.getBalance();

console.log(
  `Current balance of the Safe: ${ethers.utils.formatUnits(
    currentbalance,
    "ether"
  )} ETH`
);

// proposing contract

// owner1 signs transaction off-chain

const safeTransactionData: SafeTransactionDataPartial = {
  // this is address where I want to send 0.005 ether
  to: "0x71BDcdAe93aC79486e00b84114A536473873fC3B",
  value: ethers.utils.parseUnits("0.005", "ether").toString(),
  data: "0x",
};
const safeTransaction = await safeSdk.createTransaction({
  safeTransactionData,
});

const signedSafeTransaction = await safeSdk.signTransaction(safeTransaction);

//confirming contract
//owner2 signs transaction on chain

const ethAdapterOwner2 = new EthersAdapter({
  ethers,
  signerOrProvider: owner2Signer,
});
const safeSdk2 = await safeSdk.connect({
  ethAdapter: ethAdapterOwner2,
  safeAddress: newSafeAddress,
});
const txHash = await safeSdk2.getTransactionHash(safeTransaction);
const approveTxResponse = await safeSdk2.approveTransactionHash(txHash);
await approveTxResponse.transactionResponse?.wait();

// executing final one by owner3
const ethAdapterOwner3 = new EthersAdapter({
  ethers,
  signerOrProvider: owner3Signer,
});
const safeSdk3 = await safeSdk.connect({
  ethAdapter: ethAdapterOwner3,
  safeAddress: newSafeAddress,
});
const executeTxResponse = await safeSdk3.executeTransaction(safeTransaction);
await executeTxResponse.transactionResponse?.wait();

console.log("transaction executed");

const afterBalance = await safeSdk.getBalance();

console.log(
  `The final balance of the Safe: ${ethers.utils.formatUnits(
    afterBalance,
    "ether"
  )} ETH`
);
