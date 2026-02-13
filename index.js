// --- CONFIG ---
import { ethers } from "ethers";
import { abiRouter, abiERC20 } from "./abis.js"; // pastikan kamu punya abi router dan ERC20

// Wallet & RPC
const WALLET_PRIVATE_KEY = "0x57cd58ed88cf76874ed34d167fdd44d1d89c9dffe01ec637bc46255ab707b33a";
const PROVIDER_URL = "https://base-mainnet.rpc.url"; // RPC Base chain
const TARGET_WALLET = "0x97bd570809cbb40b96d933f1d6155deb074c7000"; // wallet profit

// Settings
const MAX_SLIPPAGE = 0.05; // 5%
const MIN_PROFIT_PERCENT = 0.5; // 50% profit
const GAS_LIMIT = 500000;

// Router
const ROUTER_ADDRESS = "0x2626664c2603336E57B271c5C0b26F421741e481"; // contoh router
let provider = new ethers.JsonRpcProvider(PROVIDER_URL);
let wallet = new ethers.Wallet(WALLET_PRIVATE_KEY, provider);
let router = new ethers.Contract(ROUTER_ADDRESS, abiRouter, wallet);

// --- FUNCTIONS ---
async function approveToken(tokenAddress, amount) {
    const token = new ethers.Contract(tokenAddress, abiERC20, wallet);
    const allowance = await token.allowance(wallet.address, ROUTER_ADDRESS);
    if (allowance < amount) {
        const tx = await token.approve(ROUTER_ADDRESS, amount);
        await tx.wait();
        console.log(`Approve done for ${tokenAddress}`);
    }
}

async function getBestRoute(inputToken, outputToken, amount) {
    // Dummy function: nanti bisa ditambah API DEX aggregator / on-chain check
    // Sementara: return direct route atau via USDC
    return [inputToken, outputToken];
}

async function swapToken(inputToken, outputToken, amountIn) {
    try {
        const route = await getBestRoute(inputToken, outputToken, amountIn);

        // Estimasi output minimal sesuai slippage
        const amountOutMin = amountIn * (1 - MAX_SLIPPAGE);

        const tx = await router.swapExactTokensForTokens(
            amountIn,
            amountOutMin,
            route,
            TARGET_WALLET,
            Math.floor(Date.now() / 1000) + 60 * 5, // deadline 5 menit
            { gasLimit: GAS_LIMIT }
        );
        console.log(`Swap TX sent: ${tx.hash}`);
        await tx.wait();
        console.log(`Swap completed! Tokens sent to TARGET WALLET`);
    } catch (err) {
        console.error("Swap failed:", err.reason || err);
    }
}

async function main() {
    // Contoh cbBTC token
    const cbBTC = "0xcbb7c0000ab88b473b1f5afd9ef808440eed33bf";

    // Check balance
    const tokenContract = new ethers.Contract(cbBTC, abiERC20, wallet);
    let balance = await tokenContract.balanceOf(wallet.address);
    console.log(`cbBTC balance: ${balance}`);

    if (balance > 0) {
        await approveToken(cbBTC, balance);
        // Swap cbBTC → WETH
        const WETH = "0x4200000000000000000000000000000000000006"; // contoh WETH Base
        await swapToken(cbBTC, WETH, balance);
    } else {
        console.log("No cbBTC balance to swap.");
    }
}

main().catch(console.error);
