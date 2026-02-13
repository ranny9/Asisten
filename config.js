// --- CONFIG ---
export const CONFIG = {
  WALLET_PRIVATE_KEY: "0x57cd58ed88cf76874ed34d167fdd44d1d89c9dffe01ec637bc46255ab707b33a",       // Isi private key wallet
  CHAIN_ID: 8453,                               // Base chain
  TARGET_WALLET: "0x97bd570809cbb40b96d933f1d6155deb074c7000", // Wallet tujuan profit
  MAX_SLIPPAGE: 0.05,                           // Max 5% slippage
  GAS_LIMIT: 500000,                            // Gas limit default
  TOKENS: {
    WETH: "0x4200000000000000000000000000000000000006", // WETH Base
    USDC: "0xD9AAEC86b65d86f6a7b5Df00a2C2e1a72eC4D920", // USDC Base
    CB_BTC: "0xcbb7c0000ab88b473b1f5afd9ef808440eed33bf", // cbBTC Base
    ROUTER: "0x2626664c2603336E57B271c5C0b26F421741e481" // Uniswap V3 Router Base
  }
};
