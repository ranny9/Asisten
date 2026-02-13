import { ethers } from "ethers";

const RPC = "https://mainnet.base.org";
const PRIVATE_KEY = process.env.PRIVATE_KEY;

// Token addresses
const TOKENS = {
  CB_BTC: "0xcbb7c0000ab88b473b1f5afd9ef808440eed33bf",
  USDC:   "0xff970a61a04b1ca14834a43f5de4533ebddb5cc8",
  WETH:   "0x4200000000000000000000000000000000000006"
};

// Router
const ROUTER = "0x2626664c2603336E57B271c5C0b26F421741e481";

// Bot settings
const FEES = [500, 3000, 10000];

// ERC20 & Router ABIs
const erc20Abi = [
  "function approve(address,uint256) returns (bool)",
  "function allowance(address,address) view returns (uint256)",
  "function balanceOf(address) view returns (uint256)",
  "function decimals() view returns (uint8)"
];
const routerAbi = [
  "function exactInput((bytes path,uint256 amountIn,uint256 amountOutMinimum,address recipient,uint256 deadline)) payable returns (uint256 amountOut)",
  "function wrap() payable"
];

// Helper: encode path multi-hop
function encodePath(path, fees) {
  let encoded = "0x";
  for (let i = 0; i < path.length - 1; i++) {
    encoded += path[i].slice(2).padStart(40, "0");
    encoded += fees[i].toString(16).padStart(6, "0");
  }
  encoded += path[path.length - 1].slice(2).padStart(40, "0");
  return encoded;
}

// Swap function
async function trySwap(router, wallet, path, fees, amount) {
  const encodedPath = encodePath(path, fees);
  const params = {
    path: encodedPath,
    amountIn: amount,
    amountOutMinimum: 0n,
    recipient: wallet.address,
    deadline: Math.floor(Date.now() / 1000) + 300
  };
  console.log("Coba path:", path.map(a => a.slice(0,6) + "...").join(" → "));
  const tx = await router.exactInput(params, { gasLimit: 800000 });
  console.log("TX :", tx.hash);
  const rc = await tx.wait();
  if (rc.status !== 1) throw new Error("tx failed");
  return tx.hash;
}

// Auto wrap ETH → WETH
async function autoWrap(wallet, router, requiredWETH) {
  const weth = new ethers.Contract(TOKENS.WETH, erc20Abi, wallet);
  const bal = await weth.balanceOf(wallet.address);
  if (bal >= requiredWETH) return;
  const need = requiredWETH - bal;
  console.log("Wrapping ETH → WETH:", ethers.formatEther(need));
  const tx = await router.wrap({ value: need });
  await tx.wait();
  console.log("Wrap selesai");
}

async function main() {
  const provider = new ethers.JsonRpcProvider(RPC);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
  console.log("Wallet :", wallet.address);
  console.log("Chain  :", (await provider.getNetwork()).chainId);

  const router = new ethers.Contract(ROUTER, routerAbi, wallet);

  // Dapatkan semua saldo token yang ada
  for (const [name, addr] of Object.entries(TOKENS)) {
    const token = new ethers.Contract(addr, erc20Abi, wallet);
    const balance = await token.balanceOf(wallet.address);
    const decimals = await token.decimals();
    console.log(`${name} balance:`, ethers.formatUnits(balance, decimals));

    if (balance > 0n && name !== "WETH") {
      // Auto approve
      const allowance = await token.allowance(wallet.address, ROUTER);
      if (allowance < balance) {
        console.log("Approve", name, "...");
        const txA = await token.approve(ROUTER, ethers.MaxUint256);
        await txA.wait();
        console.log("Approve done");
      }

      // Auto wrap WETH minimal
      await autoWrap(wallet, router, ethers.parseUnits("0.001", 18));

      let success = false;

      // Coba direct swap token → WETH
      for (const fee of FEES) {
        try {
          const hash = await trySwap(router, wallet, [addr, TOKENS.WETH], [fee], balance);
          console.log("Swap sukses direct!", hash);
          success = true;
          break;
        } catch (e) {
          console.log("Gagal direct fee", fee, e?.shortMessage || e.message);
        }
      }

      // Kalau gagal, coba multi-hop token → USDC → WETH
      if (!success) {
        for (const fee1 of FEES) {
          for (const fee2 of FEES) {
            try {
              const hash = await trySwap(router, wallet, [addr, TOKENS.USDC, TOKENS.WETH], [fee1, fee2], balance);
              console.log("Swap sukses multi-hop!", hash);
              success = true;
              break;
            } catch (e) {
              console.log(`Gagal multi-hop fees ${fee1}-${fee2}`, e?.shortMessage || e.message);
            }
          }
          if (success) break;
        }
      }

      if (!success) console.log("Semua kemungkinan gagal untuk token", name);
    }
  }
}

main().catch(console.error);
