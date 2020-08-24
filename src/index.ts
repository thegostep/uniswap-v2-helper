import { Signer, ethers } from 'ethers'
import * as IUniswapV2ERC20 from '@uniswap/v2-core/build/IUniswapV2ERC20.json'
import * as IUniswapV2Router01 from '@uniswap/v2-periphery/build/IUniswapV2Router01.json'

export const UniswapRouterAddress = '0xf164fC0Ec4E93095b804a4795bBe1e041497b92a'

/**
 * Get parameters to perform a direct swap between two tokens.
 *
 * Calculates price based on current price on the contracts.
 * Only supports direct erc20 token pairs with a decimals getters.
 *
 * @param networkName    Name of the ethereum network to target.
 * @param inputToken     Address of the token to sell.
 * @param outputToken    Address of the token to buy.
 * @param amount  String representation of the amount of tokens to buy or sell.
 * @param exactInput Boolean true if sell order, false if buy order.
 * @param number maxSlippage    Maximum number of basis points of price slippage to be tolerated.
 * @param number maxDelay       Maximum number of seconds swap can sit in mempool.
 *
 * @return  Returns object with `amountIn`, `amountOut`, `path`, and `deadline` parameters to use on swap.
 */
export async function getSwapParams(
  networkName: string,
  inputToken: string,
  outputToken: string,
  amount: string,
  exactInput: boolean,
  maxSlippage = 100,
  maxDelay = 60 * 2,
): Promise<{
  amountIn: string
  amountOut: string
  path: string[]
  deadline: number
}> {
  // get provider
  const provider = ethers.getDefaultProvider(networkName)

  // format addresses
  inputToken = ethers.utils.getAddress(inputToken)
  outputToken = ethers.utils.getAddress(outputToken)

  // create contract instances
  const InputToken = new ethers.Contract(
    inputToken,
    IUniswapV2ERC20.abi,
    provider,
  )
  const OutputToken = new ethers.Contract(
    outputToken,
    IUniswapV2ERC20.abi,
    provider,
  )
  const UniswapRouter = new ethers.Contract(
    UniswapRouterAddress,
    IUniswapV2Router01.abi,
    provider,
  )

  // format amount
  let inputAmount, outputAmount
  if (exactInput) {
    inputAmount = ethers.utils.parseUnits(amount, await InputToken.decimals())
  } else {
    outputAmount = ethers.utils.parseUnits(amount, await OutputToken.decimals())
  }

  // set path
  const path = [inputToken, outputToken]

  // set deadline
  const currentTimestamp = (await provider.getBlock('latest')).timestamp
  const deadline = currentTimestamp + maxDelay

  // set safety amount
  const expectedAmount = exactInput
    ? (await UniswapRouter.getAmountsOut(inputAmount, path))[1]
    : (await UniswapRouter.getAmountsIn(outputAmount, path))[0]

  const safetyAmount = exactInput
    ? expectedAmount.mul(
        ethers.BigNumber.from(1).sub(
          ethers.BigNumber.from(maxSlippage).div(10000),
        ),
      )
    : expectedAmount.mul(
        ethers.BigNumber.from(1).add(
          ethers.BigNumber.from(maxSlippage).div(10000),
        ),
      )

  const params = {
    amountIn: exactInput ? inputAmount : safetyAmount,
    amountOut: exactInput ? safetyAmount : outputAmount,
    path,
    deadline,
  }

  // return swap params
  return params
}

/**
 * Perform a direct swap between two tokens.
 *
 * Calculates price based on current price on the contracts.
 * Only supports direct erc20 token pairs with a decimals getters.
 *
 * @param ethersSigner   Ethers.js signer to use for performing transactions.
 * @param recipient      Address of the account to receive the tokens.
 * @param inputToken     Address of the token to sell.
 * @param outputToken    Address of the token to buy.
 * @param amount  String representation of the amount of tokens to buy or sell.
 * @param exactInput Boolean true if sell order, false if buy order.
 * @param maxSlippage    Maximum number of basis points of price slippage to be tolerated.
 * @param maxDelay       Maximum number of seconds swap can sit in mempool.
 *
 * @return Returns object with `amountIn`, `amountOut`, `path`, and `deadline` parameters to use on swap.
 */
export async function swapTokens(
  ethersSigner: Signer,
  recipient: string,
  inputToken: string,
  outputToken: string,
  amount: string,
  exactInput: boolean,
  maxSlippage = 100,
  maxDelay = 60 * 2,
) {
  // get network object
  const network = await ethersSigner.provider?.getNetwork()

  // get swap params
  const { amountIn, amountOut, path, deadline } = await getSwapParams(
    network?.name || '',
    inputToken,
    outputToken,
    amount,
    exactInput,
    maxSlippage,
    maxDelay,
  )

  // format addresses
  inputToken = ethers.utils.getAddress(inputToken)

  // create contract instances
  const InputToken = new ethers.Contract(
    inputToken,
    IUniswapV2ERC20.abi,
    ethersSigner,
  )
  const UniswapRouter = new ethers.Contract(
    UniswapRouterAddress,
    IUniswapV2Router01.abi,
    ethersSigner,
  )

  // check sufficient balance
  const balance = await InputToken.balanceOf(await ethersSigner.getAddress())
  if (balance.lt(amountIn)) {
    throw new Error('insufficient balance')
  }

  // check sufficient allowance
  const allowance = await InputToken.allowance(
    await ethersSigner.getAddress(),
    UniswapRouter.address,
  )
  if (allowance.lt(amountIn)) {
    await (await InputToken.approve(UniswapRouter.address, amountIn)).wait()
  }

  // perform swap
  const swapTx = await (exactInput
    ? await UniswapRouter.swapExactTokensForTokens(
        amountIn,
        amountOut,
        path,
        recipient,
        deadline,
      )
    : await UniswapRouter.swapTokensForExactTokens(
        amountOut,
        amountIn,
        path,
        recipient,
        deadline,
      )
  ).wait()

  // return transaction receipt
  return swapTx
}
