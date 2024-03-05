const { expect } = require('chai');
const hre = require('hardhat');
const sdk = require('@defisaver/sdk');
const {
    WETH_ADDRESS, DAI_ADDR, nullAddress,
} = require('../utils');

describe('Test direct actions encoding for sdk and foundry', () => {
    const getFoundryEncodingContract = async () => {
        const FoundryHelper = await hre.ethers.getContractFactory('FoundryHelper');
        const foundryHelper = await FoundryHelper.deploy();
        await foundryHelper.deployed();
        return foundryHelper;
    };

    describe('CompoundV3', () => {
        const market = '0xc3d688B66703497DAA19211EEdff47f25384cdc3';
        const tokenAddr = WETH_ADDRESS;
        const amount = 10000;

        let foundryContract;

        before(async () => {
            foundryContract = await getFoundryEncodingContract();
        });

        it('Test compV3SupplyEncode', async () => {
            const [from] = await hre.ethers.getSigners();
            const CompV3Supply = await hre.ethers.getContractFactory('CompV3Supply');

            const sdkEncoded = (
                new sdk.actions.compoundV3.CompoundV3SupplyAction(
                    market,
                    tokenAddr,
                    amount,
                    from.address,
                    hre.ethers.constants.AddressZero,
                )
            ).encodeForDsProxyCall()[1];

            const foundryEncoded = CompV3Supply.interface.encodeFunctionData('executeActionDirect', [
                await foundryContract.compV3SupplyEncode(
                    market,
                    tokenAddr,
                    amount,
                    from.address,
                ),
            ]);
            expect(sdkEncoded).to.be.eq(foundryEncoded);
        });
        it('Test compV3WithdrawEncode', async () => {
            const [to] = await hre.ethers.getSigners();
            const CompV3Withdraw = await hre.ethers.getContractFactory('CompV3Withdraw');

            const sdkEncoded = (
                new sdk.actions.compoundV3.CompoundV3WithdrawAction(
                    market,
                    to.address,
                    tokenAddr,
                    amount,
                    hre.ethers.constants.AddressZero,
                )
            ).encodeForDsProxyCall()[1];

            const foundryEncoded = CompV3Withdraw.interface.encodeFunctionData('executeActionDirect', [
                await foundryContract.compV3WithdrawEncode(
                    market,
                    to.address,
                    tokenAddr,
                    amount,
                ),
            ]);
            expect(sdkEncoded).to.be.eq(foundryEncoded);
        });
        it('Test compV3BorrowEncode', async () => {
            const [to] = await hre.ethers.getSigners();
            const CompV3Borrow = await hre.ethers.getContractFactory('CompV3Borrow');

            const sdkEncoded = (
                new sdk.actions.compoundV3.CompoundV3BorrowAction(
                    market,
                    amount,
                    to.address,
                    hre.ethers.constants.AddressZero,
                )
            ).encodeForDsProxyCall()[1];

            const foundryEncoded = CompV3Borrow.interface.encodeFunctionData('executeActionDirect', [
                await foundryContract.compV3BorrowEncode(
                    market,
                    amount,
                    to.address,
                ),
            ]);
            expect(sdkEncoded).to.be.eq(foundryEncoded);
        });
        it('Test compV3RatioCheckEncode', async () => {
            const user = nullAddress;
            const ratioState = 1;
            const targetRatio = 250;
            const CompV3RatioCheck = await hre.ethers.getContractFactory('CompV3RatioCheck');

            const sdkEncoded = (
                new sdk.actions.checkers.CompoundV3RatioCheckAction(
                    ratioState,
                    targetRatio,
                    market,
                    user,
                )
            ).encodeForDsProxyCall()[1];

            const foundryEncoded = CompV3RatioCheck.interface.encodeFunctionData('executeActionDirect', [
                await foundryContract.compV3RatioCheckEncode(
                    ratioState,
                    targetRatio,
                    market,
                ),
            ]);
            expect(sdkEncoded).to.be.eq(foundryEncoded);
        });
    });

    describe('AaveV3', () => {
        const market = '0x2f39d218133AFaB8F2B819B1066c7E434Ad94E9e';
        const onBehalf = nullAddress;
        const tokenAddr = WETH_ADDRESS;
        const assetId = 1;
        const useDefaultMarket = false;
        const useOnBehalf = false;
        const amount = 10000;
        const enableAsColl = true;
        const rateMode = 1;

        let foundryContract;

        before(async () => {
            foundryContract = await getFoundryEncodingContract();
        });

        it('Test aaveV3SupplyEncode', async () => {
            const [from] = await hre.ethers.getSigners();
            const AaveV3Supply = await hre.ethers.getContractFactory('AaveV3Supply');
            const sdkEncoded = (
                new sdk.actions.aaveV3.AaveV3SupplyAction(
                    useDefaultMarket,
                    market,
                    amount,
                    from.address,
                    tokenAddr,
                    assetId,
                    enableAsColl,
                    useOnBehalf,
                    onBehalf,
                )
            ).encodeForDsProxyCall()[1];

            const foundryEncoded = AaveV3Supply.interface.encodeFunctionData('executeActionDirect', [
                await foundryContract.aaveV3SupplyEncode(
                    amount,
                    from.address,
                    assetId,
                    useDefaultMarket,
                    useOnBehalf,
                    market,
                    onBehalf,
                ),
            ]);
            expect(sdkEncoded).to.be.eq(foundryEncoded);
        });
        it('Test aaveV3BorrowEncode', async () => {
            const [to] = await hre.ethers.getSigners();
            const AaveV3Borrow = await hre.ethers.getContractFactory('AaveV3Borrow');
            const sdkEncoded = (
                new sdk.actions.aaveV3.AaveV3BorrowAction(
                    useDefaultMarket,
                    market,
                    amount,
                    to.address,
                    rateMode,
                    assetId,
                    useOnBehalf,
                    onBehalf,
                )
            ).encodeForDsProxyCall()[1];

            const foundryEncoded = AaveV3Borrow.interface.encodeFunctionData('executeActionDirect', [
                await foundryContract.aaveV3BorrowEncode(
                    amount,
                    to.address,
                    rateMode,
                    assetId,
                    useDefaultMarket,
                    useOnBehalf,
                    market,
                    onBehalf,
                ),
            ]);
            expect(sdkEncoded).to.be.eq(foundryEncoded);
        });
        it('Test aaveV3WithdrawEncode', async () => {
            const [to] = await hre.ethers.getSigners();
            const AaveV3Withdraw = await hre.ethers.getContractFactory('AaveV3Withdraw');
            const sdkEncoded = (
                new sdk.actions.aaveV3.AaveV3WithdrawAction(
                    useDefaultMarket,
                    market,
                    amount,
                    to.address,
                    assetId,
                )
            ).encodeForDsProxyCall()[1];

            const foundryEncoded = AaveV3Withdraw.interface.encodeFunctionData('executeActionDirect', [
                await foundryContract.aaveV3WithdrawEncode(
                    assetId,
                    useDefaultMarket,
                    amount,
                    to.address,
                    market,
                ),
            ]);
            expect(sdkEncoded).to.be.eq(foundryEncoded);
        });
        it('Test aaveV3SwapBorrowRateModeEncode', async () => {
            const AaveV3SwapBorrowRateMode = await hre.ethers.getContractFactory('AaveV3SwapBorrowRateMode');
            const sdkEncoded = (
                new sdk.actions.aaveV3.AaveV3SwapBorrowRateModeAction(
                    useDefaultMarket,
                    market,
                    rateMode,
                    assetId,
                )
            ).encodeForDsProxyCall()[1];

            const foundryEncoded = AaveV3SwapBorrowRateMode.interface.encodeFunctionData('executeActionDirect', [
                await foundryContract.aaveV3SwapBorrowRateModeEncode(
                    rateMode,
                    assetId,
                    useDefaultMarket,
                    market,
                ),
            ]);
            expect(sdkEncoded).to.be.eq(foundryEncoded);
        });
        it('Test aaveV3SetEModeEncode', async () => {
            const categoryId = 1;
            const AaveV3SetEMode = await hre.ethers.getContractFactory('AaveV3SetEMode');
            const sdkEncoded = (
                new sdk.actions.aaveV3.AaveV3SetEModeAction(
                    useDefaultMarket,
                    market,
                    categoryId,
                )
            ).encodeForDsProxyCall()[1];

            const foundryEncoded = AaveV3SetEMode.interface.encodeFunctionData('executeActionDirect', [
                await foundryContract.aaveV3SetEModeEncode(
                    categoryId,
                    useDefaultMarket,
                    market,
                ),
            ]);
            expect(sdkEncoded).to.be.eq(foundryEncoded);
        });
        it('Test aaveV3DelegateCreditEncode', async () => {
            const [delegatee] = await hre.ethers.getSigners();
            const AaveV3DelegateCredit = await hre.ethers.getContractFactory('AaveV3DelegateCredit');
            const sdkEncoded = (
                new sdk.actions.aaveV3.AaveV3DelegateCredit(
                    useDefaultMarket,
                    market,
                    amount,
                    rateMode,
                    assetId,
                    delegatee.address,
                )
            ).encodeForDsProxyCall()[1];

            const foundryEncoded = AaveV3DelegateCredit.interface.encodeFunctionData('executeActionDirect', [
                await foundryContract.aaveV3DelegateCreditEncode(
                    amount,
                    delegatee.address,
                    assetId,
                    rateMode,
                    useDefaultMarket,
                    market,
                ),
            ]);
            expect(sdkEncoded).to.be.eq(foundryEncoded);
        });
        it('Test aaveV3CollateralSwitchEncode', async () => {
            const arrayLength = 2;
            const assetIds = [1, 2];
            const useAsCollateral = [true, false];
            const AaveV3CollateralSwitch = await hre.ethers.getContractFactory('AaveV3CollateralSwitch');
            const sdkEncoded = (
                new sdk.actions.aaveV3.AaveV3CollateralSwitchAction(
                    useDefaultMarket,
                    market,
                    arrayLength,
                    assetIds,
                    useAsCollateral,
                )
            ).encodeForDsProxyCall()[1];

            const foundryEncoded = AaveV3CollateralSwitch.interface.encodeFunctionData('executeActionDirect', [
                await foundryContract.aaveV3CollateralSwitchEncode(
                    arrayLength,
                    assetIds,
                    useAsCollateral,
                    useDefaultMarket,
                    market,
                ),
            ]);
            expect(sdkEncoded).to.be.eq(foundryEncoded);
        });
        it('Test aaveV3ClaimRewardsEncode', async () => {
            const [to, reward] = await hre.ethers.getSigners();
            const assets = [WETH_ADDRESS, DAI_ADDR];
            const AaveV3ClaimRewards = await hre.ethers.getContractFactory('AaveV3ClaimRewards');
            const sdkEncoded = (
                new sdk.actions.aaveV3.AaveV3ClaimRewardsAction(
                    assets.length,
                    amount,
                    to.address,
                    reward.address,
                    assets,
                )
            ).encodeForDsProxyCall()[1];

            const foundryEncoded = AaveV3ClaimRewards.interface.encodeFunctionData('executeActionDirect', [
                await foundryContract.aaveV3ClaimRewardsEncode(
                    amount,
                    to.address,
                    reward.address,
                    assets,
                ),
            ]);
            expect(sdkEncoded).to.be.eq(foundryEncoded);
        });
        it('Test aaveV3PaybackEncode', async () => {
            const [from] = await hre.ethers.getSigners();
            const AaveV3Payback = await hre.ethers.getContractFactory('AaveV3Payback');
            const sdkEncoded = (
                new sdk.actions.aaveV3.AaveV3PaybackAction(
                    useDefaultMarket,
                    market,
                    amount,
                    from.address,
                    rateMode,
                    tokenAddr,
                    assetId,
                    useOnBehalf,
                    onBehalf,
                )
            ).encodeForDsProxyCall()[1];

            const foundryEncoded = AaveV3Payback.interface.encodeFunctionData('executeActionDirect', [
                await foundryContract.aaveV3PaybackEncode(
                    amount,
                    from.address,
                    rateMode,
                    assetId,
                    useDefaultMarket,
                    useOnBehalf,
                    market,
                    onBehalf,
                ),
            ]);
            expect(sdkEncoded).to.be.eq(foundryEncoded);
        });
        it('Test aaveV3ATokenPaybackEncode', async () => {
            const [from, aTokenAddr] = await hre.ethers.getSigners();
            const AaveV3ATokenPayback = await hre.ethers.getContractFactory('AaveV3ATokenPayback');
            const sdkEncoded = (
                new sdk.actions.aaveV3.AaveV3ATokenPaybackAction(
                    useDefaultMarket,
                    market,
                    amount,
                    from.address,
                    rateMode,
                    aTokenAddr.address,
                    assetId,
                )
            ).encodeForDsProxyCall()[1];

            const foundryEncoded = AaveV3ATokenPayback.interface.encodeFunctionData('executeActionDirect', [
                await foundryContract.aaveV3ATokenPaybackEncode(
                    amount,
                    from.address,
                    rateMode,
                    assetId,
                    useDefaultMarket,
                    market,
                ),
            ]);
            expect(sdkEncoded).to.be.eq(foundryEncoded);
        });
    });

    describe('Exchange', () => {
        let foundryContract;
        before(async () => {
            foundryContract = await getFoundryEncodingContract();
        });
        it('Test sellEncode', async () => {
            const [from, to, wrapper] = await hre.ethers.getSigners();
            const sourceToken = WETH_ADDRESS;
            const destToken = DAI_ADDR;
            const amount = 1000;
            const destAmount = 0;
            const minPrice = 0;
            const dfsFeeDivider = 0;
            const user = from.address;
            const DFSSell = await hre.ethers.getContractFactory('DFSSell');
            const abiCoder = new hre.ethers.utils.AbiCoder();

            const sdkEncoded = (
                new sdk.actions.basic.SellAction(
                    [
                        sourceToken,
                        destToken,
                        amount,
                        destAmount,
                        minPrice,
                        dfsFeeDivider,
                        user,
                        wrapper.address,
                        abiCoder.encode(['address[]'], [[sourceToken, destToken]]),
                        [nullAddress, nullAddress, nullAddress, 0, 0, hre.ethers.utils.toUtf8Bytes('')],
                    ],
                    from.address,
                    to.address,
                )
            ).encodeForDsProxyCall()[1];

            const foundryEncoded = DFSSell.interface.encodeFunctionData('executeActionDirect', [
                await foundryContract.connect(from).sellEncode(
                    sourceToken,
                    destToken,
                    amount,
                    from.address,
                    to.address,
                    wrapper.address,
                ),
            ]);

            expect(sdkEncoded).to.be.eq(foundryEncoded);
        });
    });

    describe('Misc', () => {
        let foundryContract;
        before(async () => {
            foundryContract = await getFoundryEncodingContract();
        });
        it('Test gasFeeTaker encode', async () => {
            const gasStart = 100;
            const feeToken = WETH_ADDRESS;
            const availableAmount = 0;
            const dfsFeeDivider = 0;
            const GasFeeTaker = await hre.ethers.getContractFactory('GasFeeTaker');

            const sdkEncoded = (
                new sdk.actions.basic.GasFeeAction(
                    gasStart,
                    feeToken,
                    availableAmount,
                    dfsFeeDivider,
                )
            ).encodeForDsProxyCall()[1];

            const foundryEncoded = GasFeeTaker.interface.encodeFunctionData('executeActionDirect', [
                await foundryContract.gasFeeEncode(
                    gasStart,
                    feeToken,
                ),
            ]);
            expect(sdkEncoded).to.be.eq(foundryEncoded);
        });
    });

    describe('FLAction', () => {
        let foundryContract;
        let FLAction;

        const tokenAddr = WETH_ADDRESS;
        const amount = 1000;

        const mapFLSources = {
            AAVE_V2: 1,
            BALANCER: 2,
            GHO: 3,
            MAKER: 4,
            AAVE_V3: 5,
            UNI_V3: 6,
            SPARK: 7,
            MORPHO_BLUE: 8,
        };

        before(async () => {
            foundryContract = await getFoundryEncodingContract();
            FLAction = await hre.ethers.getContractFactory('FLAction');
        });
        it('Test AaveV2 fl', async () => {
            const modes = [0];
            const loanPayer = nullAddress;

            const sdkEncoded = (
                new sdk.actions.flashloan.FLAction(
                    new sdk.actions.flashloan.AaveV2FlashLoanAction(
                        [tokenAddr],
                        [amount],
                        modes,
                        loanPayer,
                    ),
                )
            ).encodeForDsProxyCall()[1];

            const foundryEncoded = FLAction.interface.encodeFunctionData('executeActionDirect', [
                await foundryContract.flActionEncode(
                    tokenAddr,
                    amount,
                    mapFLSources.AAVE_V2,
                ),
            ]);
            expect(sdkEncoded).to.be.eq(foundryEncoded);
        });
        it('Test Balancer fl', async () => {
            const sdkEncoded = (
                new sdk.actions.flashloan.FLAction(
                    new sdk.actions.flashloan.BalancerFlashLoanAction(
                        [tokenAddr],
                        [amount],
                        nullAddress,
                    ),
                )
            ).encodeForDsProxyCall()[1];

            const foundryEncoded = FLAction.interface.encodeFunctionData('executeActionDirect', [
                await foundryContract.flActionEncode(
                    tokenAddr,
                    amount,
                    mapFLSources.BALANCER,
                ),
            ]);
            expect(sdkEncoded).to.be.eq(foundryEncoded);
        });
        it('Test Gho fl', async () => {
            const sdkEncoded = (
                new sdk.actions.flashloan.FLAction(
                    new sdk.actions.flashloan.GhoFlashLoanAction(
                        amount,
                    ),
                )
            ).encodeForDsProxyCall()[1];

            const foundryEncoded = FLAction.interface.encodeFunctionData('executeActionDirect', [
                await foundryContract.flActionEncode(
                    nullAddress, // ignored, when FLAction is parsed, gho addr will be used
                    amount,
                    mapFLSources.GHO,
                ),
            ]);
            expect(sdkEncoded).to.be.eq(foundryEncoded);
        });
        it('Test Maker fl', async () => {
            const sdkEncoded = (
                new sdk.actions.flashloan.FLAction(
                    new sdk.actions.flashloan.MakerFlashLoanAction(
                        amount,
                    ),
                )
            ).encodeForDsProxyCall()[1];

            const foundryEncoded = FLAction.interface.encodeFunctionData('executeActionDirect', [
                await foundryContract.flActionEncode(
                    nullAddress, // ignored, when FLAction is parsed, dai addr will be used
                    amount,
                    mapFLSources.MAKER,
                ),
            ]);
            expect(sdkEncoded).to.be.eq(foundryEncoded);
        });
        it('Test AaveV3 fl', async () => {
            const modes = [0];
            const loanPayer = nullAddress;

            const sdkEncoded = (
                new sdk.actions.flashloan.FLAction(
                    new sdk.actions.flashloan.AaveV3FlashLoanAction(
                        [tokenAddr],
                        [amount],
                        modes,
                        loanPayer,
                    ),
                )
            ).encodeForDsProxyCall()[1];

            const foundryEncoded = FLAction.interface.encodeFunctionData('executeActionDirect', [
                await foundryContract.flActionEncode(
                    tokenAddr,
                    amount,
                    mapFLSources.AAVE_V3,
                ),
            ]);
            expect(sdkEncoded).to.be.eq(foundryEncoded);
        });
        it('Test UniV3 fl', async () => {
            // test values
            const token0 = WETH_ADDRESS;
            const token1 = DAI_ADDR;
            const pool = '0x1F98431c8aD98523631AE4a59f267346ea31F984';
            const amount0 = 1000;
            const amount1 = 100;

            const sdkEncoded = (
                new sdk.actions.flashloan.FLAction(
                    new sdk.actions.flashloan.UniV3FlashLoanAction(
                        token0,
                        token1,
                        pool,
                        amount0,
                        amount1,
                    ),
                )
            ).encodeForDsProxyCall()[1];

            const foundryEncoded = FLAction.interface.encodeFunctionData('executeActionDirect', [
                await foundryContract.flUniswapEncode(
                    token0,
                    token1,
                    pool,
                    amount0,
                    amount1,
                ),
            ]);
            expect(sdkEncoded).to.be.eq(foundryEncoded);
        });
        it('Test Spark fl', async () => {
            const modes = [0];
            const loanPayer = nullAddress;

            const sdkEncoded = (
                new sdk.actions.flashloan.FLAction(
                    new sdk.actions.flashloan.SparkFlashLoanAction(
                        [tokenAddr],
                        [amount],
                        modes,
                        loanPayer,
                    ),
                )
            ).encodeForDsProxyCall()[1];

            const foundryEncoded = FLAction.interface.encodeFunctionData('executeActionDirect', [
                await foundryContract.flActionEncode(
                    tokenAddr,
                    amount,
                    mapFLSources.SPARK,
                ),
            ]);
            expect(sdkEncoded).to.be.eq(foundryEncoded);
        });
        it('Test Morpho blue fl', async () => {
            const sdkEncoded = (
                new sdk.actions.flashloan.FLAction(
                    new sdk.actions.flashloan.MorphoBlueFlashLoanAction(
                        tokenAddr,
                        amount,
                    ),
                )
            ).encodeForDsProxyCall()[1];

            const foundryEncoded = FLAction.interface.encodeFunctionData('executeActionDirect', [
                await foundryContract.flActionEncode(
                    tokenAddr,
                    amount,
                    mapFLSources.MORPHO_BLUE,
                ),
            ]);
            expect(sdkEncoded).to.be.eq(foundryEncoded);
        });
    });
});
