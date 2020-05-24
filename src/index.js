const {
  ChainId,
  Token,
  TokenAmount,
  Pair,
  Percent,
  TradeType,
  Route,
  Trade
} = require("@uniswap/sdk");

const { ethers } = require("ethers");
const IUniswapV2ERC20 = require("@uniswap/v2-core/build/IUniswapV2ERC20.json");
const IUniswapV2Pair = require("@uniswap/v2-core/build/IUniswapV2Pair.json");
const IUniswapV2Factory = require("@uniswap/v2-core/build/IUniswapV2Factory.json");
const IUniswapV2Router01 = require("@uniswap/v2-periphery/build/IUniswapV2Router01.json");

async function swapTokens({
  ethersSigner,
  recipientAddress,
  outputAmount,
  inputAmount,
  inputTokenAddress,
  outputTokenAddress,
  inputTokenDecimals = 18,
  outputTokenDecimals = 18,
  maxSlippage = 5,
  maxDelay = 60 * 2
}) {
  const provider = ethersSigner.provider;

  recipientAddress = ethers.utils.getAddress(recipientAddress);
  inputTokenAddress = ethers.utils.getAddress(inputTokenAddress);
  outputTokenAddress = ethers.utils.getAddress(outputTokenAddress);

  maxSlippage = new Percent(maxSlippage);

  const isExactOutput = !!outputAmount;
  amount = isExactOutput
    ? ethers.utils.parseUnits(outputAmount, outputTokenDecimals)
    : ethers.utils.parseUnits(inputAmount, inputTokenDecimals);

  const UniswapRouterContract = new ethers.Contract(
    "0xf164fC0Ec4E93095b804a4795bBe1e041497b92a",
    IUniswapV2Router01.abi,
    ethersSigner
  );

  const uniswapFactoryAddress = ethers.utils.getAddress(
    await UniswapRouterContract.factory()
  );

  const UniswapFactoryContract = new ethers.Contract(
    uniswapFactoryAddress,
    IUniswapV2Factory.abi,
    ethersSigner
  );

  const uniswapPairAddress = ethers.utils.getAddress(
    await UniswapFactoryContract.getPair(inputTokenAddress, outputTokenAddress)
  );

  const UniswapPairContract = new ethers.Contract(
    uniswapPairAddress,
    IUniswapV2Pair.abi,
    ethersSigner
  );

  const token0 = ethers.utils.getAddress(await UniswapPairContract.token0());
  const token0IsOutput = token0 === outputTokenAddress;
  const { reserve0, reserve1 } = await UniswapPairContract.getReserves();
  const inputReserve = token0IsOutput ? reserve1 : reserve0;
  const outputReserve = token0IsOutput ? reserve0 : reserve1;

  const UniswapInputToken = new Token(
    ChainId.GOERLI,
    inputTokenAddress,
    inputTokenDecimals
  );
  const UniswapOutputToken = new Token(
    ChainId.GOERLI,
    outputTokenAddress,
    outputTokenDecimals
  );

  const UniswapPair = new Pair(
    new TokenAmount(UniswapInputToken, inputReserve),
    new TokenAmount(UniswapOutputToken, outputReserve)
  );

  const UniswapRoute = new Route([UniswapPair], UniswapInputToken);

  if (isExactOutput) {
    const ExactOutputAmount = new TokenAmount(UniswapOutputToken, amount);
    const ExactOutputAmountFormatted = ethers.utils.parseUnits(
      ExactOutputAmount.toFixed(),
      outputTokenDecimals
    );

    const UniswapTrade = new Trade(
      UniswapRoute,
      ExactOutputAmount,
      TradeType.EXACT_OUTPUT
    );

    const MaxInputAmount = await UniswapTrade.maximumAmountIn(maxSlippage);
    const MaxInputAmountFormatted = ethers.utils.parseUnits(
      MaxInputAmount.toFixed(),
      inputTokenDecimals
    );
    const currentTimestamp = (await provider.getBlock()).timestamp;
    const deadline = currentTimestamp + maxDelay;

    const InputTokenContract = new ethers.Contract(
      inputTokenAddress,
      IUniswapV2ERC20.abi,
      ethersSigner
    );

    const InputTokenBalance = await InputTokenContract.balanceOf(
      ethersSigner.getAddress()
    );

    if (InputTokenBalance.lt(MaxInputAmountFormatted)) {
      throw new Error("insufficient balance");
    }

    const allowance = await InputTokenContract.allowance(
      ethersSigner.getAddress(),
      UniswapRouterContract.address
    );

    if (allowance.lt(MaxInputAmountFormatted)) {
      const approveTx = await (
        await InputTokenContract.approve(
          UniswapRouterContract.address,
          MaxInputAmountFormatted
        )
      ).wait();
    }

    const RouteArray = UniswapRoute.path.map(token => token.address);

    const swapTx = await (
      await UniswapRouterContract.swapTokensForExactTokens(
        ExactOutputAmountFormatted,
        MaxInputAmountFormatted,
        RouteArray,
        recipientAddress,
        deadline
      )
    ).wait();

    return swapTx;
  } else {
    const ExactInputAmount = new TokenAmount(UniswapInputToken, amount);
    const ExactInputAmountFormatted = ethers.utils.parseUnits(
      ExactInputAmount.toFixed(),
      outputTokenDecimals
    );

    const UniswapTrade = new Trade(
      UniswapRoute,
      ExactInputAmount,
      TradeType.EXACT_INPUT
    );

    const MinOutputAmount = await UniswapTrade.minimumAmountOut(maxSlippage);
    const MinOutputAmountFormatted = ethers.utils.parseUnits(
      MinOutputAmount.toFixed(),
      inputTokenDecimals
    );
    const currentTimestamp = (await provider.getBlock()).timestamp;
    const deadline = currentTimestamp + maxDelay;

    const InputTokenContract = new ethers.Contract(
      inputTokenAddress,
      IUniswapV2ERC20.abi,
      ethersSigner
    );

    const InputTokenBalance = await InputTokenContract.balanceOf(
      ethersSigner.getAddress()
    );

    if (InputTokenBalance.lt(ExactInputAmountFormatted)) {
      throw new Error("insufficient balance");
    }

    const allowance = await InputTokenContract.allowance(
      ethersSigner.getAddress(),
      UniswapRouterContract.address
    );

    if (allowance.lt(ExactInputAmountFormatted)) {
      const approveTx = await (
        await InputTokenContract.approve(
          UniswapRouterContract.address,
          ExactInputAmountFormatted
        )
      ).wait();
    }

    const RouteArray = UniswapRoute.path.map(token => token.address);

    const swapTx = await (
      await UniswapRouterContract.swapExactTokensForTokens(
        ExactInputAmountFormatted,
        MinOutputAmountFormatted,
        RouteArray,
        recipientAddress,
        deadline
      )
    ).wait();

    return swapTx;
  }
}

module.exports = {
  swapTokens
};
