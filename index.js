import { ethers } from "ethers";

const RPC = process.env.RPC_URL;
const PRIVATE_KEY = process.env.PRIVATE_KEY;

const provider = new ethers.JsonRpcProvider(RPC);
const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

// ===== Base addresses =====
const ROUTER = "0x2626664c2603336E57B271c5C0b26F421741e481";
const WETH   = "0x4200000000000000000000000000000000000006";
const USDC   = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
const CBBTC  = "0xcbb7c0000ab88b473b1f5afd9ef808440eed33bf";

// fee tiers (yang umum di Base)
const FEE_CBBTC_USDC = 500;
const FEE_USDC_WETH  = 500;

const erc20Abi = [
  "function balanceOf(address) view returns (uint256)",
  "function approve(address,uint256) returns (bool)",
  "function decimals() view returns (uint8)"
];

const routerAbi = [
  "function exactInput((bytes path,address recipient,uint256 deadline,uint256 amountIn,uint256 amountOutMinimum)) returns (uint256 amountOut)"
];

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

  const cbbtc = new ethers.Contract(CBBTC, erc20Abi, wallet);
  const router = new ethers.Contract(ROUTER, routerAbi, wallet);

  const decimals = await cbbtc.decimals();
  const bal = await cbbtc.balanceOf(wallet.address);

  console.log("cbBTC decimals:", decimals);
  console.log("cbBTC balance:", bal.toString());

  if (bal === 0n) {
    console.log("No cbBTC balance. Stop.");
    return;
  }

  // jual 50% saja
  const sellAmount = bal / 2n;

  console.log("Sell amount (raw):", sellAmount.toString());

  console.log("Approve router...");
  const txApprove = await cbbtc.approve(ROUTER, sellAmount);
  await txApprove.wait();

  const path = encodePath(
    [CBBTC, USDC, WETH],
    [FEE_CBBTC_USDC, FEE_USDC_WETH]
  );

  const params = {
    path: path,
    recipient: wallet.address,
    deadline: Math.floor(Date.now() / 1000) + 300,
    amountIn: sellAmount,
    amountOutMinimum: 0
  };

  console.log("Sending TEST SELL (cbBTC -> USDC -> WETH) ...");

  const tx = await router.exactInput(params);
  console.log("TX:", tx.hash);

  const rc = await tx.wait();
  console.log("✅ SELL SUCCESS. Block:", rc.blockNumber);
}

main().catch(e => {
  console.error("ERROR:", e);
});
