import { ethers } from "ethers";

/* ================== CONFIG ================== */

// Base RPC
const RPC = "https://mainnet.base.org";

// private key dari .env
const PRIVATE_KEY = process.env.PRIVATE_KEY;

// cbBTC (Base)
const CB_BTC = "0xcbb7c0000ab88b473b1f5afd9ef808440eed33bf";

// WETH (Base canonical)
const WETH = "0x4200000000000000000000000000000000000006";

// Uniswap V3 SwapRouter02 (Base)
const ROUTER = "0x2626664c2603336E57B271c5C0b26F421741e481";

// pool fee (cbBTC/WETH biasa 0.3%)
const FEE = 3000;

// jumlah cbBTC yang mau dijual (TEST kecil)
const SELL_AMOUNT = ethers.parseUnits("0.000001", 8); // cbBTC = 8 decimals

/* ============================================ */

const erc20Abi = [
  "function approve(address spender,uint256 amount) external returns (bool)",
  "function allowance(address owner,address spender) external view returns (uint256)",
  "function balanceOf(address owner) external view returns (uint256)",
  "function decimals() external view returns (uint8)"
];

const routerAbi = [
  "function exactInputSingle((address tokenIn,address tokenOut,uint24 fee,address recipient,uint256 deadline,uint256 amountIn,uint256 amountOutMinimum,uint160 sqrtPriceLimitX96)) payable returns (uint256 amountOut)"
];

async function main() {
  const provider = new ethers.JsonRpcProvider(RPC);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

  console.log("Wallet :", wallet.address);
  console.log("Chain  :", (await provider.getNetwork()).chainId);

  const cbbtc = new ethers.Contract(CB_BTC, erc20Abi, wallet);
  const router = new ethers.Contract(ROUTER, routerAbi, wallet);

  const bal = await cbbtc.balanceOf(wallet.address);
  console.log("cbBTC balance :", bal.toString());

  if (bal < SELL_AMOUNT) {
    console.log("Saldo cbBTC tidak cukup untuk test sell");
    return;
  }

  const allowance = await cbbtc.allowance(wallet.address, ROUTER);

  if (allowance < SELL_AMOUNT) {
    console.log("Approve cbBTC...");
    const txApprove = await cbbtc.approve(ROUTER, ethers.MaxUint256);
    await txApprove.wait();
    console.log("Approve done");
  }

  const params = {
    tokenIn: CB_BTC,
    tokenOut: WETH,
    fee: FEE,
    recipient: wallet.address,
    deadline: Math.floor(Date.now() / 1000) + 60 * 5,
    amountIn: SELL_AMOUNT,
    amountOutMinimum: 0n,     // test mode
    sqrtPriceLimitX96: 0
  };

  console.log("Swap cbBTC -> WETH ...");

  const tx = await router.exactInputSingle(params, {
    gasLimit: 600000
  });

  console.log("TX :", tx.hash);

  const rc = await tx.wait();
  console.log("Done in block", rc.blockNumber);
}

main().catch(console.error);
