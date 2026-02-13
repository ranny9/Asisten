import { ethers } from "ethers";
import { CONFIG } from "./config.js";
import { ERC20_ABI, ROUTER_ABI, WETH_ABI } from "./abis.js";

const provider = new ethers.JsonRpcProvider(CONFIG.RPC_URL);
const wallet = new ethers.Wallet(CONFIG.WALLET_PRIVATE_KEY, provider);

// Token contracts
const WETH = new ethers.Contract(CONFIG.TOKENS.WETH, ERC20_ABI, wallet);
const USDC = new ethers.Contract(CONFIG.TOKENS.USDC, ERC20_ABI, wallet);
const CB_BTC = new ethers.Contract(CONFIG.TOKENS.CB_BTC, ERC20_ABI, wallet);
const ROUTER = new ethers.Contract(CONFIG.TOKENS.ROUTER, ROUTER_ABI, wallet);

async function getBalance(tokenContract, address) {
  const bal = await tokenContract.balanceOf(address);
  return Number(ethers.formatUnits(bal, 18));
}

async function swapTokens(amountIn, path, to) {
  const deadline = Math.floor(Date.now() / 1000) + 60 * 10; // 10 menit
  const amountOutMin = 0; // biar fleksibel, slippage dibatasi di config saat approve

  try {
    const tx = await ROUTER.swapExactTokensForTokens(
      ethers.parseUnits(amountIn.toString(), 18),
      amountOutMin,
      path,
      to,
      deadline,
      { gasLimit: CONFIG.GAS_LIMIT }
    );
    console.log("Swap TX:", tx.hash);
    await tx.wait();
    console.log("Swap sukses ✅");
  } catch (err) {
    console.error("Swap gagal ❌", err.reason || err.message);
  }
}

async function main() {
  const ethBalance = Number(ethers.formatEther(await wallet.getBalance()));
  if (ethBalance < 0.001) {
    console.error("ETH base tidak cukup untuk gas fee! ❌");
    return;
  }

  const cbBtcBal = await getBalance(CB_BTC, wallet.address);
  console.log("Saldo CB_BTC:", cbBtcBal);

  if (cbBtcBal > 0) {
    // Approve router untuk spend CB_BTC
    const allowance = await CB_BTC.allowance(wallet.address, CONFIG.TOKENS.ROUTER);
    if (Number(allowance) < cbBtcBal) {
      const approveTx = await CB_BTC.approve(
        CONFIG.TOKENS.ROUTER,
        ethers.parseUnits(cbBtcBal.toString(), 18)
      );
      await approveTx.wait();
      console.log("Approve CB_BTC done ✅");
    }

    // Swap CB_BTC → USDC → WETH (path)
    await swapTokens(cbBtcBal, [CONFIG.TOKENS.CB_BTC, CONFIG.TOKENS.USDC, CONFIG.TOKENS.WETH], CONFIG.TARGET_WALLET);
  } else {
    console.log("Saldo CB_BTC kosong, tidak ada yang diswap ❌");
  }
}

main();
