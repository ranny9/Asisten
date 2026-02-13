import { ethers } from "ethers";

const RPC = "https://mainnet.base.org";
const PRIVATE_KEY = process.env.PRIVATE_KEY;

// Base addresses (fix & valid)
const CB_BTC = "0xcbb7c0000ab88b473b1f5afd9ef808440eed33bf";
const USDC   = "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913";
const WETH   = "0x4200000000000000000000000000000000000006";

// Uniswap V3 SwapRouter02 (Base)
const ROUTER = "0x2626664c2603336E57B271c5C0b26F421741e481";

// fee tiers yang masuk akal
const FEES = [
  [500, 500],
  [500, 3000],
  [3000, 3000],
];

const erc20Abi = [
  "function balanceOf(address) view returns(uint256)",
  "function decimals() view returns(uint8)",
  "function allowance(address,address) view returns(uint256)",
  "function approve(address,uint256) returns(bool)"
];

const routerAbi = [
  "function exactInput((bytes path,uint256 amountIn,uint256 amountOutMinimum,address recipient,uint256 deadline)) payable returns (uint256)"
];

function encodePath(tokens, fees) {
  let out = "0x";
  for (let i = 0; i < fees.length; i++) {
    out += tokens[i].slice(2);
    out += fees[i].toString(16).padStart(6, "0");
  }
  out += tokens[tokens.length - 1].slice(2);
  return out.toLowerCase();
}

async function main() {
  const provider = new ethers.JsonRpcProvider(RPC);
  const wallet   = new ethers.Wallet(PRIVATE_KEY, provider);

  console.log("Wallet :", wallet.address);
  console.log("Chain  :", (await provider.getNetwork()).chainId.toString());

  const cbbtc = new ethers.Contract(CB_BTC, erc20Abi, wallet);
  const router = new ethers.Contract(ROUTER, routerAbi, wallet);

  const decimals = await cbbtc.decimals();
  const balance  = await cbbtc.balanceOf(wallet.address);

  console.log("cbBTC balance :", ethers.formatUnits(balance, decimals));

  if (balance === 0n) {
    console.log("Saldo cbBTC kosong.");
    return;
  }

  // pakai 98% biar aman rounding / fee
  const amountIn = balance * 98n / 100n;

  const ethBal = await provider.getBalance(wallet.address);
  console.log("ETH balance :", ethers.formatEther(ethBal));

  if (ethBal < ethers.parseEther("0.00005")) {
    console.log("ETH tidak cukup untuk gas.");
    return;
  }

  const allowance = await cbbtc.allowance(wallet.address, ROUTER);
  if (allowance < amountIn) {
    console.log("Approve cbBTC ...");
    const tx = await cbbtc.approve(ROUTER, ethers.MaxUint256);
    await tx.wait();
    console.log("Approve done");
  }

  const tokens = [CB_BTC, USDC, WETH];

  let success = false;

  for (const feePath of FEES) {

    console.log("-----------------------");
    console.log("Coba path cbBTC → USDC → WETH | fee =", feePath.join(","));

    const path = encodePath(tokens, feePath);

    const params = {
      path,
      amountIn,
      amountOutMinimum: 0n,
      recipient: wallet.address,
      deadline: Math.floor(Date.now() / 1000) + 300
    };

    try {

      const tx = await router.exactInput(params, {
        gasLimit: 500000
      });

      console.log("TX :", tx.hash);

      const rc = await tx.wait();

      if (rc.status === 1) {
        console.log("SWAP BERHASIL");
        success = true;
        break;
      } else {
        console.log("TX gagal");
      }

    } catch (e) {
      console.log("Gagal:");
      console.log(e.shortMessage || e.message);
    }
  }

  if (!success) {
    console.log("Semua route cbBTC → USDC → WETH gagal.");
  }
}

main().catch(console.error);
