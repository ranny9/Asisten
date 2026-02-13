import { ethers } from "ethers";
import dotenv from "dotenv";

dotenv.config();

/*
  =========================
  BASIC BASE BOT - SAFE STEP 1
  =========================
  Hanya:
  - connect wallet
  - cek saldo
  - cek koneksi RPC
*/

const RPC_URL = process.env.RPC_URL;
const PRIVATE_KEY = process.env.PRIVATE_KEY;

const provider = new ethers.JsonRpcProvider(RPC_URL);
const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

// Base chain id
const BASE_CHAIN_ID = 8453;

async function main() {

  const network = await provider.getNetwork();

  console.log("Connected chain id :", Number(network.chainId));

  if (Number(network.chainId) !== BASE_CHAIN_ID) {
    console.log("⚠️ WARNING: Bukan Base network");
  }

  const address = await wallet.getAddress();
  console.log("Wallet:", address);

  const balance = await provider.getBalance(address);
  console.log("Balance ETH:", ethers.formatEther(balance));

  console.log("Bot ready. (belum trading)");
}

main().catch((e) => {
  console.error("Error:", e);
});
