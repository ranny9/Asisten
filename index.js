import { ethers } from "ethers";

const RPC = process.env.RPC_URL;
const PRIVATE_KEY = process.env.PRIVATE_KEY;

const provider = new ethers.JsonRpcProvider(RPC);
const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

// Base WETH
const WETH = "0x4200000000000000000000000000000000000006";

// target token (punya kamu)
const TOKEN_OUT = "0xcbb7c0000ab88b473b1f5afd9ef808440eed33bf";

// Uniswap V3 SwapRouter02 (Base)
const ROUTER = "0x2626664c2603336E57B271c5C0b26F421741e481";

// fee tiers yang akan dicoba
const FEES = [500, 3000, 10000];

const wethAbi = [
  "function deposit() payable",
  "function balanceOf(address) view returns (uint256)",
  "function approve(address,uint256) returns (bool)"
];

const routerAbi = [
  "function exactInputSingle(tuple(address tokenIn,address tokenOut,uint24 fee,address recipient,uint256 amountIn,uint256 amountOutMinimum,uint160 sqrtPriceLimitX96)) payable returns (uint256 amountOut)"
];

async function main() {
  console.log("Chain:", (await provider.getNetwork()).chainId);
  console.log("Wallet:", wallet.address);

  const ethBal = await provider.getBalance(wallet.address);
  console.log("ETH balance:", ethers.formatEther(ethBal));

  const weth = new ethers.Contract(WETH, wethAbi, wallet);
  const router = new ethers.Contract(ROUTER, routerAbi, wallet);

  // ====== 1. WRAP dulu (kecil saja, test)
  const wrapAmount = ethers.parseEther("0.0003"); // ~ $1

  console.log("Wrapping ETH -> WETH ...");

  const txWrap = await weth.deposit({ value: wrapAmount });
  await txWrap.wait();

  const wethBal = await weth.balanceOf(wallet.address);
  console.log("WETH balance:", ethers.formatEther(wethBal));

  // ====== 2. approve router
  console.log("Approve router...");

  const txApprove = await weth.approve(ROUTER, wethBal);
  await txApprove.wait();

  // ====== 3. coba swap dengan beberapa fee tier
  for (const fee of FEES) {
    console.log("Trying swap with fee:", fee);

    try {
      const params = {
        tokenIn: WETH,
        tokenOut: TOKEN_OUT,
        fee: fee,
        recipient: wallet.address,
        amountIn: wethBal,
        amountOutMinimum: 0n,
        sqrtPriceLimitX96: 0n
      };

      const tx = await router.exactInputSingle(params);
      const rc = await tx.wait();

      console.log("✅ Swap success, fee tier:", fee);
      console.log("Tx:", rc.hash);
      return;

    } catch (e) {
      console.log("❌ failed fee", fee);
      // console.log(e.shortMessage || e.message);
    }
  }

  console.log("All fee tiers failed.");

}

main().catch(console.error);
