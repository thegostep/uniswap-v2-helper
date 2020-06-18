require("dotenv").config();

const ethers = require("ethers");
const { swapTokens } = require("../src/index.js");

describe("Swap", function() {
  this.timeout(10000);
  it("Should swap with exact output", async function(done) {
    const privateKey = process.env.METAMASK_PRIV_KEY;
    const provider = ethers.getDefaultProvider("goerli");
    const signer = new ethers.Wallet(privateKey, provider);

    const inputTokenAddress = "0xc1C0472c0C80bCcDC7F5D01A376Bd97a734B8815";
    const outputTokenAddress = "0x754a5735b40922906ffbb15801b31f81a6417256";

    const receipt = await swapTokens({
      ethersSigner: signer,
      recipientAddress: signer.address,
      outputAmount: "1",
      inputTokenAddress,
      outputTokenAddress
    });

    setTimeout(done, 300);
  });
  it("Should swap with exact input", async function(done) {
    const privateKey = process.env.METAMASK_PRIV_KEY;
    const provider = ethers.getDefaultProvider("goerli");
    const signer = new ethers.Wallet(privateKey, provider);

    const inputTokenAddress = "0xc1C0472c0C80bCcDC7F5D01A376Bd97a734B8815";
    const outputTokenAddress = "0x754a5735b40922906ffbb15801b31f81a6417256";

    const receipt = await swapTokens({
      ethersSigner: signer,
      recipientAddress: signer.address,
      inputAmount: "1",
      inputTokenDecimals: 6,
      inputTokenAddress,
      outputTokenAddress
    });

    setTimeout(done, 300);
  });
});
