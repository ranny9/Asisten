import { ethers } from "ethers";

/* ==============================
   CONFIG
============================== */

const RPC = "https://mainnet.base.org";

// ganti dengan private key wallet kamu
const PRIVATE_KEY = process.env.PRIVATE_KEY;

// ====== TOKEN (WAJIB BENAR) ======
// cbBTC di Base
const CB_BTC = "PASTE_cbBTC_ADDRESS_HERE";

// WETH di Base
const WETH   = "PASTE_WETH_ADDRESS_HERE";

// Uniswap V3 SwapRouter02 (Base)
const SWAP_ROUTER = "0x2626664c2603336E57B271c5C0b26F4217416481";

// fee tier pool (0.05% / 0.3% / 1%)
// biasanya BTC pair pakai 3000
const POOL_FEE = 3000;


/* ==============================
   ABI MINIMAL
============================== */

const ERC20_ABI = [
  "function decimals() view returns(uint8)",
  "function balanceOf(address) view returns(uint256)",
  "function approve(address,uint256) returns(bool)",
  "function allowance(address,address) view returns(uint256)"
];

const SWAP_ROUTER_ABI = [
  "function exactInputSingle((address tokenIn,address tokenOut,uint24 fee,address recipient,uint256 deadline,uint256 amountIn,uint256 amountOutMinimum,uint160 sqrtPriceLimitX96)) payable returns (uint256 amountOut)"
];


/* ==============================
   MAIN
============================== */

async function main() {

  const provider = new ethers.JsonRpcProvider(RPC);
  const wallet   = new ethers.Wallet(PRIVATE_KEY, provider);

  console.log("Wallet :", wallet.address);
  console.log("Chain  :", (await provider.getNetwork()).chainId);

  const cbBTC = new ethers.Contract(CB_BTC, ERC20_ABI, wallet);
  const weth  = new ethers.Contract(WETH, ERC20_ABI, wallet);

  const router = new ethers.Contract(
    SWAP_ROUTER,
    SWAP_ROUTER_ABI,
    wallet
  );

  const decimals = await cbBTC.decimals();
  console.log("cbBTC decimals:", decimals.toString());

  const balance = await cbBTC.balanceOf(wallet.address);
  console.log("cbBTC balance:", ethers.formatUnits(balance, decimals));

  if (balance === 0n) {
    console.log("No cbBTC balance.");
    return;
  }

  // =============================
  // TEST SELL AMOUNT
  // =============================
  // 0.0001 cbBTC (aman untuk test)
  const sellAmountHuman = "0.0001";
  const amountIn = ethers.parseUnits(sellAmountHuman, decimals);

  if (amountIn > balance) {
    console.log("Balance not enough for test sell.");
    return;
  }

  // =============================
  // APPROVE
  // =============================
  const allowance = await cbBTC.allowance(wallet.address, SWAP_ROUTER);

  if (allowance < amountIn) {
    console.log("Approving router...");
    const tx = await cbBTC.approve(SWAP_ROUTER, amountIn);
    await tx.wait();
    console.log("Approve done");
  }

  console.log("Sending TEST SELL cbBTC → WETH");

  const params = {
    tokenIn: CB_BTC,
    tokenOut: WETH,
    fee: POOL_FEE,
    recipient: wallet.address,
    deadline: Math.floor(Date.now() / 1000) + 60 * 5,
    amountIn: amountIn,
    amountOutMinimum: 0n,      // TEST ONLY
    sqrtPriceLimitX96: 0
  };

  try {
    const tx = await router.exactInputSingle(params);
    console.log("TX:", tx.hash);

    const receipt = await tx.wait();
    console.log("Confirmed in block", receipt.blockNumber);

  } catch (e) {
    console.error("SWAP FAILED:");
    console.error(e.shortMessage || e.message);
  }
}

main();
