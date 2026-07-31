const hre = require('hardhat');

const TEST_MARKET_ID = '0xe6002bdde91ee7263ba4d22755ae7ff01799a6e4320ec71d5a79b0f960b44fec';

const MARKET_TYPE =
    'tuple(uint256 chainId,address midnight,address loanToken,' +
    'tuple(address token,uint256 lltv,uint256 liquidationCursor,address oracle)[] collateralParams,' +
    'uint256 maturity,uint256 rcfThreshold,address enterGate,address liquidatorGate)';

function marketIdToAddress(marketId) {
    if (!hre.ethers.utils.isHexString(marketId, 32)) {
        throw new Error(`Invalid market ID (expected bytes32): ${marketId}`);
    }

    return hre.ethers.utils.getAddress(`0x${marketId.slice(-40)}`);
}

async function main() {
    const marketId = process.env.MARKET_ID || TEST_MARKET_ID;
    const marketAddress = marketIdToAddress(marketId);
    const code = await hre.ethers.provider.getCode(marketAddress);

    if (code === '0x') {
        throw new Error(`No code found at ${marketAddress} on the "${hre.network.name}" network`);
    }

    const [market] = hre.ethers.utils.defaultAbiCoder.decode([MARKET_TYPE], code);

    console.log('Market ID:', marketId);
    console.log('Market address:', marketAddress);
    console.log({
        chainId: market.chainId.toString(),
        midnight: market.midnight,
        loanToken: market.loanToken,
        collateralParams: market.collateralParams.map((collateral) => ({
            token: collateral.token,
            lltv: collateral.lltv.toString(),
            liquidationCursor: collateral.liquidationCursor.toString(),
            oracle: collateral.oracle,
        })),
        maturity: market.maturity.toString(),
        rcfThreshold: market.rcfThreshold.toString(),
        enterGate: market.enterGate,
        liquidatorGate: market.liquidatorGate,
    });
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
