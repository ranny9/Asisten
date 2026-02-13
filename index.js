import { ethers } from "ethers";

const RPC = "https://mainnet.base.org";
const PRIVATE_KEY = process.env.PRIVATE_KEY;

// Base
const CB_BTC = "0xcbb7c0000ab88b473b1f5afd9ef808440eed33bf";
const WETH   = "0x4200000000000000000000000000000000000006";
const ROUTER = "0x2626664c2603336E57B271c5C0b26F421741e481";

// urutan kemungkinan pool
const FEES = [500, 3000, 10000];

// cbBTC = 8 decimals
const SELL_AMOUNT = ethers.parseUnits("0.000001", 8);

const erc20Abi = [
  "function approve(address,uint256) returns (bool)",
  "function allowance(address,address) view returns (uint256)",
  "function balanceOf(address) view returns (uint256)"
];

const routerAbi = [
  "function exactInputSingle((address tokenIn,address tokenOut,uint24 fee,address recipient,uint256 deadline,uint256 amountIn,uint256 amountOutMinimum,uint160 sqrtPriceLimitX96)) payable returns (uint256 amountOut)"
];

async function trySwap(router, wallet, fee) {

  const params = {
    tokenIn: CB_BTC,
    tokenOut: WETH,
    fee,
    recipient: wallet.address,
    deadline: Math.floor(Date.now() / 1000) + 300,
    amountIn: SELL_AMOUNT,
    amountOutMinimum: 0n,
    sqrtPriceLimitX96: 0
  };

  console.log("Coba fee =", fee);

  const tx = await router.exactInputSingle(
    params,
    { gasLimit: 600000 }
  );

  console.log("TX :", tx.hash);

  const rc = await tx.wait();

  if (rc.status !== 1) {
    throw new Error("tx failed");
  }

  return tx.hash;
}

async function main() {

  const provider = new ethers.JsonRpcProvider(RPC);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

  console.log("Wallet :", wallet.address);
  console.log("Chain  :", (await provider.getNetwork()).chainId);

  const cbbtc  = new ethers.Contract(CB_BTC, erc20Abi, wallet);
  const router = new ethers.Contract(ROUTER, routerAbi, wallet);

  const bal = await cbbtc.balanceOf(wallet.address);
  console.log("cbBTC balance :", bal.toString());

  if (bal < SELL_AMOUNT) {
    console.log("Saldo cbBTC tidak cukup");
    return;
  }

  const allowance = await cbbtc.allowance(wallet.address, ROUTER);

  if (allowance < SELL_AMOUNT) {
    console.log("Approve cbBTC...");
    const txA = await cbbtc.approve(ROUTER, ethers.MaxUint256);
    await txA.wait();
    console.log("Approve done");
  }

  let success = false;

  for (const fee of FEES) {

    try {
      console.log("-----------------------");
      const hash = await trySwap(router, wallet, fee);
      console.log("Swap sukses di fee", fee);
      console.log("Hash :", hash);
      success = true;
      break;

    } catch (e) {
      console.log("Gagal di fee", fee);
      if (e?.shortMessage) {
        console.log("Reason:", e.shortMessage);
      }
    }
  }

  if (!success) {
    console.log("Semua kemungkinan fee gagal. Stop.");
  }
}

main().catch(console.error);
