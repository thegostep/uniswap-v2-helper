![npm](https://img.shields.io/npm/v/uniswap-v2-helper)
![GitHub last commit](https://img.shields.io/github/last-commit/thegostep/uniswap-v2-helper)
![npm](https://img.shields.io/npm/dw/uniswap-v2-helper)
![NPM](https://img.shields.io/npm/l/uniswap-v2-helper)

# Uniswap V2 Helper

Uniswap trades in a single function call. Currently only supports direct erc20 token pairs with a decimals getter. Single outside dependency on ethers.js.

## Usage

```ts
import { getSwapParams, swapTokens } from 'uniswap-v2-helper'
import { ethers } from 'ethers'

const privateKey = '0x...'
const provider = ethers.getDefaultProvider() // use default provider or any other ethers provider
const signer = new ethers.Wallet(privateKey, provider)

// get swap params

const {
  amountIn,
  amountOut,
  expectedAmount,
  expectedSlippage,
  path,
  deadline,
} = await getSwapParams(
  '0x...', // input token address
  '0x...', // output token address
  '1.0', // ammount to buy or sell with decimals
  true, // true if amount is input token, false if amount is output token
  {
    maxSlippage: 100, // optional frontrunning tolerance (default to 100 basis points)
    maxDelay: 60 * 2, // optional max settlement time in seconds (default to 2 minutes)
    ethersProvider: provider, // optional ethers provider (defaults to default mainnet ethers provider)
  },
)

// perform swap with exact output

const receipt = await swapTokens(
  signer, // ethers signer
  '0x...', // input token address
  '0x...', // output token address
  '1.0', // ammount to buy or sell with decimals
  true, // true if amount is input token, false if amount is output token
  {
    recipient: '0x...', // optional recipient address (default to signer)
    maxSlippage: 100, // optional frontrunning tolerance (default to 100 basis points)
    maxDelay: 60 * 2, // optional max settlement time in seconds (default to 2 minutes)
  },
)
```
