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
import { ethers } from "ethers";
import dotenv from "dotenv";
dotenv.config();

/*
  Base – Uniswap V3 swap test (ETH -> Token)
  ONE TIME swap only
*/

const RPC_URL = process.env.RPC_URL;
const PRIVATE_KEY = process.env.PRIVATE_KEY;

// ==================
// CONFIG
// ==================

// Uniswap V3 SwapRouter02 on Base
const SWAP_ROUTER = "0x2626664c2603336E57B271c5C0b26F421741e481";

// WETH on Base
const WETH = "0x4200000000000000000000000000000000000006";

// Token test (CA yang kamu berikan)
const TARGET_TOKEN = "0xcbb7c0000ab88b473b1f5afd9ef808440eed33bf";

// fee tier pool (500 = 0.05%, 3000 = 0.3%)
const POOL_FEE = 3000;

// jumlah ETH untuk test buy (sesuaikan, ini ~ $1-an)
const BUY_AMOUNT_ETH = "0.0005";

// untuk test pertama kita set 0 agar tidak gagal karena estimasi
const AMOUNT_OUT_MINIMUM = 0;

// ==================

const provider = new ethers.JsonRpcProvider(RPC_URL);
const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

const ABI = [
  "function exactInputSingle((address tokenIn,address tokenOut,uint24 fee,address recipient,uint256 deadline,uint256 amountIn,uint256 amountOutMinimum,uint160 sqrtPriceLimitX96)) payable returns (uint256 amountOut)"
];

const router = new ethers.Contract(SWAP_ROUTER, ABI, wallet);

async function main() {

  const network = await provider.getNetwork();
  console.log("Chain:", Number(network.chainId));
  console.log("Wallet:", wallet.address);

  const balance = await provider.getBalance(wallet.address);
  console.log("ETH balance:", ethers.formatEther(balance));

  const amountIn = ethers.parseEther(BUY_AMOUNT_ETH);

  const params = {
    tokenIn: WETH,
    tokenOut: TARGET_TOKEN,
    fee: POOL_FEE,
    recipient: wallet.address,
    deadline: Math.floor(Date.now() / 1000) + 60 * 5,
    amountIn: amountIn,
    amountOutMinimum: AMOUNT_OUT_MINIMUM,
    sqrtPriceLimitX96: 0
  };

  console.log("Sending swap tx...");

  const tx = await router.exactInputSingle(
    params,
    { value: amountIn }
  );

  console.log("TX sent:", tx.hash);

  const receipt = await tx.wait();
  console.log("✅ Swap success");
  console.log("Block:", receipt.blockNumber);
}

main().catch((e) => {
  console.error("ERROR:", e);
});
