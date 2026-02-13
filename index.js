import { CONFIG } from "./config.js";
import { ABIS } from "./abis.js";
import { ethers } from "ethers";

const provider = new ethers.JsonRpcProvider("https://mainnet.base.org"); // Ganti RPC Base
const wallet = new ethers.Wallet(CONFIG.WALLET_PRIVATE_KEY, provider);

const erc20Contract = (address) => new ethers.Contract(address, ABIS.ERC20, wallet);
const routerContract = new ethers.Contract(CONFIG.TOKENS.ROUTER, ABIS.ROUTER, wallet);

async function swapToken(fromToken, toToken, amount) {
  const fromERC20 = erc20Contract(fromToken);

  // Cek saldo
  const balance = await fromERC20.balanceOf(wallet.address);
  if (balance < amount) {
    console.log(`Saldo ${fromToken} tidak cukup`);
    return;
  }

  // Approve router
  const allowance = await fromERC20.allowance(wallet.address, CONFIG.TOKENS.ROUTER);
  if (allowance < amount) {
    console.log(`Approve ${fromToken} ke router...`);
    const tx = await fromERC20.approve(CONFIG.TOKENS.ROUTER, amount);
    await tx.wait();
    console.log("Approve done");
  }

  // Dapatkan path optimal (auto detect)
  let path = [fromToken, CONFIG.TOKENS.WETH];
  if (fromToken !== CONFIG.TOKENS.USDC && toToken === CONFIG.TOKENS.WETH) {
    path = [fromToken, CONFIG.TOKENS.USDC, CONFIG.TOKENS.WETH];
  }

  const amountsOut = await routerContract.getAmountsOut(amount, path);
  const minAmountOut = amountsOut[amountsOut.length - 1] * (1 - CONFIG.MAX_SLIPPAGE);

  // Swap
  try {
    const tx = await routerContract.swapExactTokensForTokens(
      amount,
      minAmountOut,
      path,
      CONFIG.TARGET_WALLET,
      Math.floor(Date.now() / 1000) + 60 * 10, // deadline 10 menit
      { gasLimit: CONFIG.GAS_LIMIT }
    );
    const receipt = await tx.wait();
    console.log(`Swap sukses: ${tx.hash}`);
  } catch (err) {
    console.error("Swap gagal:", err.reason || err.message);
  }
}

// Contoh swap cbBTC -> WETH
(async () => {
  const cbBTC = CONFIG.TOKENS.CB_BTC;
  const WETH = CONFIG.TOKENS.WETH;

  const cbBTCContract = erc20Contract(cbBTC);
  const decimals = await cbBTCContract.decimals();
  const balance = await cbBTCContract.balanceOf(wallet.address);

  // Swap seluruh saldo
  await swapToken(cbBTC, WETH, balance);
})();
