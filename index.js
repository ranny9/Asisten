import { ethers } from "ethers";

// --- CONFIG ---
const WALLET_PRIVATE_KEY = "0x57cd58ed88cf76874ed34d167fdd44d1d89c9dffe01ec637bc46255ab707b33a";
const RPC_URL = "https://base-mainnet.rpc.url";
const ROUTER_ADDRESS = "0x2626664c2603336E57B271c5C0b26F421741e481"; // Uniswap V3 Router Base
const TOKEN_LIST = [
  { symbol: "cbBTC", address: "0xcbb7c0000ab88b473b1f5afd9ef808440eed33bf" },
  { symbol: "USDC", address: "0x...USDC_BASE_ADDRESS..." },
  { symbol: "WETH", address: "0x...WETH_BASE_ADDRESS..." }
];

// --- PROVIDER & WALLET ---
const provider = new ethers.JsonRpcProvider(RPC_URL);
const wallet = new ethers.Wallet(WALLET_PRIVATE_KEY, provider);
const router = new ethers.Contract(
  ROUTER_ADDRESS,
  [
    "function getAmountsOut(uint amountIn, address[] memory path) view returns (uint[] memory amounts)",
    "function swapExactTokensForTokens(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) returns (uint[] memory amounts)"
  ],
  wallet
);

// --- HELPER: Check pool available ---
async function checkPool(path, amountIn = "1000") {
  try {
    const amounts = await router.getAmountsOut(amountIn, path);
    return amounts && amounts.length === path.length;
  } catch (err) {
    return false; // pool does not exist
  }
}

// --- MAIN SWAP FUNCTION ---
async function swapToken(amountIn, path) {
  const hasPool = await checkPool(path, amountIn);
  if (!hasPool) {
    console.log(`Pool not available for path: ${path.map(t => t).join(" → ")}`);
    return;
  }

  try {
    // Approve token if needed (simplified, add ERC20 approve logic)
    const tx = await router.swapExactTokensForTokens(
      amountIn,
      0, // accept any slippage for test
      path,
      wallet.address,
      Math.floor(Date.now() / 1000) + 60 * 10 // 10 min deadline
    );
    console.log(`Swap TX sent: ${tx.hash}`);
    const receipt = await tx.wait();
    console.log("Swap success:", receipt.transactionHash);
  } catch (err) {
    console.error("Swap failed:", err.reason || err);
  }
}

// --- EXECUTION ---
async function main() {
  // Contoh cbBTC → USDC → WETH
  const path = [
    TOKEN_LIST[0].address, // cbBTC
    TOKEN_LIST[1].address, // USDC
    TOKEN_LIST[2].address  // WETH
  ];

  const amountIn = ethers.parseUnits("0.001", 18); // contoh swap kecil
  await swapToken(amountIn, path);
}

main();
