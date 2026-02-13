// config.js
export const CONFIG = {
  WALLET_PRIVATE_KEY: "0x57cd58ed88cf76874ed34d167fdd44d1d89c9dffe01ec637bc46255ab707b33a",  // Masukkan private key wallet kamu
  CHAIN_ID: 8453,                          // Base mainnet
  RPC_URL: "https://mainnet.base.org",     // RPC Base mainnet
  TARGET_WALLET: "0x97bd570809cbb40b96d933f1d6155deb074c7000", // Wallet tujuan profit
  MAX_SLIPPAGE: 0.05,                      // Max 5% slippage
  GAS_LIMIT: 500000,                        // Gas limit default
  TOKENS: {
    WETH: "0x4200000000000000000000000000000000000006",   // WETH Base
    USDC: "0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8",   // USDC Base
    CB_BTC: "0x2626664c2603336E57B271c5C0b26F421741e481", // Contoh CB_BTC Base swap token
    ROUTER: "0x2626664c2603336E57B271c5C0b26F421741e481"   // Router Base swap
  }
};
