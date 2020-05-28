# Uniswap V2 Helper

Uniswap trades in a single function call. Currently only supports direct erc20 token pairs with a decimals getter. Single outside dependency on ethers.js.

## Usage

```js
import { getSwapParams, swapTokens } from "uniswap-v2-helper";
import { ethers } from "ethers";

const privateKey = "0x...";
const provider = ethers.getDefaultProvider();
const signer = new ethers.Wallet(privateKey, provider);

// get swap params

const { amountIn, amountOut, path, deadline } = await swapTokens({
  networkName: 'mainnet,
  inputToken: "0x...",
  inputAmount: "1", // specify input amount to make an exact sell
  outputToken: "0x...",
  maxSlippage: 100, // optional default to 100 basis points
  maxDelay: 60 * 2 // optional default to 2 minutes
});

// perform swap with exact output

const receipt = await swapTokens({
  ethersSigner: signer,
  recipient: "0x...",
  inputToken: "0x...",
  outputToken: "0x...",
  outputAmount: "1", // specify input amount to make an exact buy
  maxSlippage: 100, // optional default to 100 basis points
  maxDelay: 60 * 2 // optional default to 2 minutes
});
```
