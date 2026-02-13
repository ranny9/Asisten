import { ethers } from "ethers";
import dotenv from "dotenv";
dotenv.config();

/*
  Base – Uniswap V3
  WETH -> USDC -> cbBTC
  one time test swap
*/

const RPC_URL = process.env.RPC_URL;
const PRIVATE_KEY = process.env.PRIVATE_KEY;

// Uniswap V3 SwapRouter02 (Base)
const SWAP_ROUTER = "0x2626664c2603336E57B271c5C0b26F421741e481";

// Base tokens
const WETH  = "0x4200000000000000000000000000000000000006";
const USDC  = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
const CBBTC = "0xcbb7c0000ab88b473b1f5afd9ef808440eed33bf";

// fee tiers
const FEE_WETH_USDC = 500;
const FEE_USDC_CBBTC = 500;

// test amount
const BUY_AMOUNT_ETH = "0.0005";

const provider = new ethers.JsonRpcProvider(RPC_URL);
const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

const ABI = [
  "function exactInput((bytes path,address recipient,uint256 deadline,uint256 amountIn,uint256 amountOutMinimum)) payable returns (uint256 amountOut)"
];

const router = new ethers.Contract(SWAP_ROUTER, ABI, wallet);

function encodePath(tokens, fees) {
  let path = "0x";
  for (let i = 0; i < fees.length; i++) {
    path += tokens[i].slice(2);
    path += fees[i].toString(16).padStart(6, "0");
  }
  path += tokens[tokens.length - 1].slice(2);
  return path.toLowerCase();
}

async function main() {

  const net = await provider.getNetwork();
  console.log("Chain:", Number(net.chainId));
  console.log("Wallet:", wallet.address);

  const bal = await provider.getBalance(wallet.address);
  console.log("ETH balance:", ethers.formatEther(bal));

  const amountIn = ethers.parseEther(BUY_AMOUNT_ETH);

  const path = encodePath(
    [WETH, USDC, CBBTC],
    [FEE_WETH_USDC, FEE_USDC_CBBTC]
  );

  const params = {
    path: path,
    recipient: wallet.address,
    deadline: Math.floor(Date.now() / 1000) + 300,
    amountIn: amountIn,
    amountOutMinimum: 0
  };

  console.log("Sending swap (WETH -> USDC -> cbBTC)...");

  const tx = await router.exactInput(
    params,
    { value: amountIn }
  );

  console.log("TX:", tx.hash);

  const receipt = await tx.wait();
  console.log("✅ Swap success");
  console.log("Block:", receipt.blockNumber);
}

main().catch(e => {
  console.error("ERROR:", e);
});
