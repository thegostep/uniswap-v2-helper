const { ethers } = require("ethers");
const IUniswapV2ERC20 = require("@uniswap/v2-core/build/IUniswapV2ERC20.json");
const IUniswapV2Router01 = require("@uniswap/v2-periphery/build/IUniswapV2Router01.json");

const UniswapRouterAddress = "0xf164fC0Ec4E93095b804a4795bBe1e041497b92a";

/**
 * Get parameters to perform a direct swap between two tokens.
 *
 * Calculates price based on current price on the contracts.
 * Only supports direct erc20 token pairs with a decimals getters.
 *
 * @param {Object} args
 * @param {String} args.networkName    Name of the ethereum network to target.
 * @param {String} args.inputToken     Address of the token to sell.
 * @param {String} [args.inputAmount]  String representation of the exact amount of tokens to sell. Blank if specifying outputAmount.
 * @param {String} args.outputToken    Address of the token to buy.
 * @param {String} [args.outputAmount] String representation of the exact amount of tokens to buy. Blank if specifying inputAmount.
 * @param {Number} args.maxSlippage    Maximum number of basis points of price slippage to be tolerated.
 * @param {Number} args.maxDelay       Maximum number of seconds swap can sit in mempool.
 *
 * @return {Object} Returns object with `amountIn`, `amountOut`, `path`, and `deadline` parameters to use on swap.
 */
async function getSwapParams({
  networkName,
  inputToken,
  inputAmount,
  outputToken,
  outputAmount,
  maxSlippage = 100,
  maxDelay = 60 * 2,
}) {
  // make sure only one exact amount
  if (inputAmount && outputAmount) {
    throw new Error("must only specify inputAmount or outputAmount");
  }

  // get provider
  const provider = ethers.getDefaultProvider(networkName);

  // format addresses
  inputToken = ethers.utils.getAddress(inputToken);
  outputToken = ethers.utils.getAddress(outputToken);

  // create contract instances
  const InputToken = new ethers.Contract(
    inputToken,
    IUniswapV2ERC20.abi,
    provider
  );
  const OutputToken = new ethers.Contract(
    outputToken,
    IUniswapV2ERC20.abi,
    provider
  );
  const UniswapRouter = new ethers.Contract(
    UniswapRouterAddress,
    IUniswapV2Router01.abi,
    provider
  );

  // format input amounts
  inputAmount = inputAmount
    ? ethers.utils.parseUnits(inputAmount, await InputToken.decimals())
    : null;
  outputAmount = outputAmount
    ? ethers.utils.parseUnits(outputAmount, await OutputToken.decimals())
    : null;

  // set path
  const path = [inputToken, outputToken];

  // set deadline
  const currentTimestamp = (await provider.getBlock()).timestamp;
  const deadline = currentTimestamp + maxDelay;

  // set safety amount
  const expectedAmount = inputAmount
    ? (await UniswapRouter.getAmountsOut(inputAmount, path))[1]
    : (await UniswapRouter.getAmountsIn(outputAmount, path))[0];

  const safetyAmount = inputAmount
    ? expectedAmount.mul(
        ethers.BigNumber.from(1).sub(
          ethers.BigNumber.from(maxSlippage).div(10000)
        )
      )
    : expectedAmount.mul(
        ethers.BigNumber.from(1).add(
          ethers.BigNumber.from(maxSlippage).div(10000)
        )
      );

  const params = {
    amountIn: inputAmount ? inputAmount : safetyAmount,
    amountOut: inputAmount ? safetyAmount : outputAmount,
    path,
    deadline,
  };

  // return swap params
  return params;
}

/**
 * Perform a direct swap between two tokens.
 *
 * Calculates price based on current price on the contracts.
 * Only supports direct erc20 token pairs with a decimals getters.
 *
 * @param {Object} args
 * @param {String} args.ethersSigner   Ethers.js signer to use for performing transactions.
 * @param {String} args.recipient      Address of the account to receive the tokens.
 * @param {String} args.inputToken     Address of the token to sell.
 * @param {String} [args.inputAmount]  String representation of the exact amount of tokens to sell. Blank if specifying outputAmount.
 * @param {String} args.outputToken    Address of the token to buy.
 * @param {String} [args.outputAmount] String representation of the exact amount of tokens to buy. Blank if specifying inputAmount.
 * @param {Number} args.maxSlippage    Maximum number of basis points of price slippage to be tolerated.
 * @param {Number} args.maxDelay       Maximum number of seconds swap can sit in mempool.
 *
 * @return {Object} Returns object with `amountIn`, `amountOut`, `path`, and `deadline` parameters to use on swap.
 */
async function swapTokens({
  ethersSigner,
  recipient,
  inputToken,
  inputAmount,
  outputToken,
  outputAmount,
  maxSlippage = 100,
  maxDelay = 60 * 2,
}) {
  // make sure only one exact amount
  if (inputAmount && outputAmount) {
    throw new Error("must only specify inputAmount or outputAmount");
  }

  // get network object
  const network = await ethersSigner.provider.getNetwork();

  // get swap params
  const { amountIn, amountOut, path, deadline } = await getSwapParams({
    networkName: network.name,
    inputToken,
    inputAmount,
    outputToken,
    outputAmount,
    maxSlippage,
    maxDelay,
  });

  // format addresses
  inputToken = ethers.utils.getAddress(inputToken);

  // create contract instances
  const InputToken = new ethers.Contract(
    inputToken,
    IUniswapV2ERC20.abi,
    ethersSigner
  );
  const UniswapRouter = new ethers.Contract(
    UniswapRouterAddress,
    IUniswapV2Router01.abi,
    ethersSigner
  );

  // check sufficient balance
  const balance = await InputToken.balanceOf(await ethersSigner.getAddress());
  if (balance.lt(amountIn)) {
    throw new Error("insufficient balance");
  }

  // check sufficient allowance
  const allowance = await InputToken.allowance(
    await ethersSigner.getAddress(),
    UniswapRouter.address
  );
  if (allowance.lt(amountIn)) {
    await (await InputToken.approve(UniswapRouter.address, amountIn)).wait();
  }

  // perform swap
  const swapTx = await (inputAmount
    ? await UniswapRouter.swapExactTokensForTokens(
        amountIn,
        amountOut,
        path,
        recipient,
        deadline
      )
    : await UniswapRouter.swapTokensForExactTokens(
        amountOut,
        amountIn,
        path,
        recipient,
        deadline
      )
  ).wait();

  // return transaction receipt
  return swapTx;
}

module.exports = {
  UniswapRouterAddress,
  getSwapParams,
  swapTokens,
};
