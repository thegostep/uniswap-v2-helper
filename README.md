# Uniswap V2 Helper

Uniswap trades in a single function call.

## Usage

```js
import { swapTokens } from "uniswap-v2-helper";
import { ethers } from "ethers";

const privateKey = "0x...";
const provider = ethers.getDefaultProvider();
const signer = new ethers.Wallet(privateKey, provider);

// swap with exact output

const receipt = await swapTokens({
  ethersSigner: signer,
  recipientAddress: "0x...",
  outputAmount: "1",
  inputTokenAddress: "0x...",
  outputTokenAddress: "0x...",
  inputTokenDecimals: 18, // default to 18
  outputTokenDecimals: 18, // default to 18
  maxSlippage: 5, // default to 5
  maxDelay: 60 * 2 // default to 2 minutes
});

// swap with exact input

const receipt = await swapTokens({
  ethersSigner: signer,
  recipientAddress: "0x...",
  inputAmount: "1",
  inputTokenAddress: "0x...",
  outputTokenAddress: "0x...",
  inputTokenDecimals: 18, // default to 18
  outputTokenDecimals: 18, // default to 18
  maxSlippage: 5, // default to 5
  maxDelay: 60 * 2 // default to 2 minutes
});
```
