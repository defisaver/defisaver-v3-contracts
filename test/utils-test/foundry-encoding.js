/* eslint-disable one-var-declaration-per-line */
/* eslint-disable one-var */
const { expect } = require('chai');
const hre = require('hardhat');
const sdk = require('@defisaver/sdk');
const {
    WETH_ADDRESS, DAI_ADDR, nullAddress,
} = require('../utils/utils');

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

    describe('EulerV2', () => {
        let foundryContract;
        let vault, account, from, receiver;
        const tokenAddr = WETH_ADDRESS;
        const amount = 10000;
        const enableAsColl = true;
        const indexes = [[1, 2], [3, 4]];

        before(async () => {
            foundryContract = await getFoundryEncodingContract();
            [vault, account, from, receiver] = (await hre.ethers.getSigners())
                .map((s) => s.address);
        });

        it('Test eulerV2SupplyEncode', async () => {
            const EulerV2Supply = await hre.ethers.getContractFactory('EulerV2Supply');
            const sdkEncoded = (
                new sdk.actions.eulerV2.EulerV2SupplyAction(
                    vault,
                    tokenAddr,
                    account,
                    from,
                    amount,
                    enableAsColl,
                )
            ).encodeForDsProxyCall()[1];

            const foundryEncoded = EulerV2Supply.interface.encodeFunctionData('executeActionDirect', [
                await foundryContract.eulerV2SupplyEncode(
                    vault,
                    account,
                    from,
                    amount,
                    enableAsColl,
                ),
            ]);

            expect(sdkEncoded).to.be.eq(foundryEncoded);
        });
        it('Test eulerV2WithdrawEncode', async () => {
            const EulerV2Withdraw = await hre.ethers.getContractFactory('EulerV2Withdraw');
            const sdkEncoded = (
                new sdk.actions.eulerV2.EulerV2WithdrawAction(
                    vault,
                    account,
                    receiver,
                    amount,
                )
            ).encodeForDsProxyCall()[1];

            const foundryEncoded = EulerV2Withdraw.interface.encodeFunctionData('executeActionDirect', [
                await foundryContract.eulerV2WithdrawEncode(
                    vault,
                    account,
                    receiver,
                    amount,
                ),
            ]);

            expect(sdkEncoded).to.be.eq(foundryEncoded);
        });
        it('Test eulerV2BorrowEncode', async () => {
            const EulerV2Borrow = await hre.ethers.getContractFactory('EulerV2Borrow');
            const sdkEncoded = (
                new sdk.actions.eulerV2.EulerV2BorrowAction(
                    vault,
                    account,
                    receiver,
                    amount,
                )
            ).encodeForDsProxyCall()[1];

            const foundryEncoded = EulerV2Borrow.interface.encodeFunctionData('executeActionDirect', [
                await foundryContract.eulerV2BorrowEncode(
                    vault,
                    account,
                    receiver,
                    amount,
                ),
            ]);

            expect(sdkEncoded).to.be.eq(foundryEncoded);
        });
        it('Test eulerV2PaybackEncode', async () => {
            const EulerV2Payback = await hre.ethers.getContractFactory('EulerV2Payback');
            const sdkEncoded = (
                new sdk.actions.eulerV2.EulerV2PaybackAction(
                    vault,
                    tokenAddr,
                    account,
                    from,
                    amount,
                )
            ).encodeForDsProxyCall()[1];

            const foundryEncoded = EulerV2Payback.interface.encodeFunctionData('executeActionDirect', [
                await foundryContract.eulerV2PaybackEncode(
                    vault,
                    account,
                    from,
                    amount,
                ),
            ]);

            expect(sdkEncoded).to.be.eq(foundryEncoded);
        });
        it('Test eulerV2PaybackWithSharesEncode', async () => {
            const EulerV2PaybackWithShares = await hre.ethers.getContractFactory('EulerV2PaybackWithShares');
            const sdkEncoded = (
                new sdk.actions.eulerV2.EulerV2PaybackWithSharesAction(
                    vault,
                    account,
                    from,
                    amount,
                )
            ).encodeForDsProxyCall()[1];

            const foundryEncoded = EulerV2PaybackWithShares.interface.encodeFunctionData('executeActionDirect', [
                await foundryContract.eulerV2PaybackWithSharesEncode(
                    vault,
                    from,
                    account,
                    amount,
                ),
            ]);

            expect(sdkEncoded).to.be.eq(foundryEncoded);
        });
        it('Test eulerV2PullDebtEncode', async () => {
            const EulerV2PullDebt = await hre.ethers.getContractFactory('EulerV2PullDebt');
            const sdkEncoded = (
                new sdk.actions.eulerV2.EulerV2PullDebtAction(
                    vault,
                    account,
                    from,
                    amount,
                )
            ).encodeForDsProxyCall()[1];

            const foundryEncoded = EulerV2PullDebt.interface.encodeFunctionData('executeActionDirect', [
                await foundryContract.eulerV2PullDebtEncode(
                    vault,
                    account,
                    from,
                    amount,
                ),
            ]);

            expect(sdkEncoded).to.be.eq(foundryEncoded);
        });
        it('Test eulerV2ReorderCollateralsEncode', async () => {
            const EulerV2ReorderCollaterals = await hre.ethers.getContractFactory('EulerV2ReorderCollaterals');
            const sdkEncoded = (
                new sdk.actions.eulerV2.EulerV2ReorderCollateralsAction(
                    account,
                    indexes,
                )
            ).encodeForDsProxyCall()[1];

            const foundryEncoded = EulerV2ReorderCollaterals.interface.encodeFunctionData('executeActionDirect', [
                await foundryContract.eulerV2ReorderCollaterals(
                    account,
                    indexes,
                ),
            ]);

            expect(sdkEncoded).to.be.eq(foundryEncoded);
        });
        it('Test eulerV2CollateralSwitchEncode', async () => {
            const EulerV2CollateralSwitch = await hre.ethers.getContractFactory('EulerV2CollateralSwitch');
            const sdkEncoded = (
                new sdk.actions.eulerV2.EulerV2CollateralSwitchAction(
                    vault,
                    account,
                    enableAsColl,
                )
            ).encodeForDsProxyCall()[1];

            const foundryEncoded = EulerV2CollateralSwitch.interface.encodeFunctionData('executeActionDirect', [
                await foundryContract.eulerV2CollateralSwitchEncode(
                    vault,
                    account,
                    enableAsColl,
                ),
            ]);

            expect(sdkEncoded).to.be.eq(foundryEncoded);
        });
    });

    describe('EtherFi', () => {
        let foundryContract;
        let from;
        let to;
        const amount = 10000;
        const shouldWrap = true;

        before(async () => {
            foundryContract = await getFoundryEncodingContract();
            [from, to] = (await hre.ethers.getSigners()).map((s) => s.address);
        });

        it('Test etherFiStakeEncode', async () => {
            const EtherFiStake = await hre.ethers.getContractFactory('EtherFiStake');
            const sdkEncoded = (
                new sdk.actions.etherfi.EtherFiStakeAction(
                    amount,
                    from,
                    to,
                    shouldWrap,
                )
            ).encodeForDsProxyCall()[1];

            const foundryEncoded = EtherFiStake.interface.encodeFunctionData('executeActionDirect', [
                await foundryContract.etherFiStakeEncode(
                    amount,
                    from,
                    to,
                    shouldWrap,
                ),
            ]);

            expect(sdkEncoded).to.be.eq(foundryEncoded);
        });

        it('Test etherFiWrap', async () => {
            const EtherFiWrap = await hre.ethers.getContractFactory('EtherFiWrap');
            const sdkEncoded = (
                new sdk.actions.etherfi.EtherFiWrapAction(
                    amount,
                    from,
                    to,
                )
            ).encodeForDsProxyCall()[1];

            const foundryEncoded = EtherFiWrap.interface.encodeFunctionData('executeActionDirect', [
                await foundryContract.etherFiWrapEncode(
                    amount,
                    from,
                    to,
                ),
            ]);

            expect(sdkEncoded).to.be.eq(foundryEncoded);
        });

        it('Test etherFiUnwrap', async () => {
            const EtherFiUnwrap = await hre.ethers.getContractFactory('EtherFiUnwrap');
            const sdkEncoded = (
                new sdk.actions.etherfi.EtherFiUnwrapAction(
                    amount,
                    from,
                    to,
                )
            ).encodeForDsProxyCall()[1];

            const foundryEncoded = EtherFiUnwrap.interface.encodeFunctionData('executeActionDirect', [
                await foundryContract.etherFiUnwrapEncode(
                    amount,
                    from,
                    to,
                ),
            ]);

            expect(sdkEncoded).to.be.eq(foundryEncoded);
        });
    });

    describe('Renzo', () => {
        let foundryContract;
        let from;
        let to;
        const amount = 10000;
        before(async () => {
            foundryContract = await getFoundryEncodingContract();
            [from, to] = (await hre.ethers.getSigners()).map((s) => s.address);
        });
        it('Test renzoStakeEncode', async () => {
            const RenzoStake = await hre.ethers.getContractFactory('RenzoStake');
            const sdkEncoded = (
                new sdk.actions.renzo.RenzoStakeAction(amount, from, to)
            ).encodeForDsProxyCall()[1];

            const foundryEncoded = RenzoStake.interface.encodeFunctionData('executeActionDirect', [
                await foundryContract.renzoStakeEncode(amount, from, to),
            ]);
            expect(sdkEncoded).to.be.eq(foundryEncoded);
        });
    });

    describe('MorphoBlue', () => {
        let foundryContract;
        let receiver;
        before(async () => {
            foundryContract = await getFoundryEncodingContract();
            [receiver] = (await hre.ethers.getSigners()).map((s) => s.address);
        });

        it('Test morphoTokenWrapEncode', async () => {
            const MorphoTokenWrap = await hre.ethers.getContractFactory('MorphoTokenWrap');
            const sdkEncoded = (new sdk.actions.morphoblue.MorphoTokenWrapAction(receiver, 1000))
                .encodeForDsProxyCall()[1];
            const foundryEncoded = MorphoTokenWrap.interface.encodeFunctionData('executeActionDirect', [
                await foundryContract.morphoTokenWrapEncode(receiver, 1000),
            ]);
            expect(sdkEncoded).to.be.eq(foundryEncoded);
        });
        it('Test morphoTokenWrapEncode maxUint256 amount', async () => {
            const maxAmt = hre.ethers.constants.MaxUint256;
            const MorphoTokenWrap = await hre.ethers.getContractFactory('MorphoTokenWrap');
            const sdkEncoded = (new sdk.actions.morphoblue.MorphoTokenWrapAction(receiver, maxAmt))
                .encodeForDsProxyCall()[1];
            const foundryEncoded = MorphoTokenWrap.interface.encodeFunctionData('executeActionDirect', [
                await foundryContract.morphoTokenWrapEncode(receiver, maxAmt),
            ]);
            expect(sdkEncoded).to.be.eq(foundryEncoded);
        });
    });

    /* //////////////////////////////////////////////////////////////
                           LIQUITY_V2
    ////////////////////////////////////////////////////////////// */
    describe('LiquityV2', () => {
        const market = '0x2f39d218133AFaB8F2B819B1066c7E434Ad94E9e';
        const from = '0x0000000000000000000000000000000000000001';
        const to = '0x0000000000000000000000000000000000000002';
        const boldGainTo = '0x0000000000000000000000000000000000000003';
        const collGainTo = '0x0000000000000000000000000000000000000004';
        const amount = 10000;
        const collAmount = 5000;
        const boldAmount = 6000;
        const upperHint = 1;
        const lowerHint = 2;
        const maxUpfrontFee = 100;
        const troveId = 1;
        const ownerIndex = 0;
        const annualInterestRate = 5;
        const collAction = 0;
        const debtAction = 0;
        const doClaim = false;
        let foundryContract;
        before(async () => {
            foundryContract = await getFoundryEncodingContract();
        });
        it('Test liquityV2OpenEncode', async () => {
            const LiquityV2Open = await hre.ethers.getContractFactory('LiquityV2Open');
            const sdkEncoded = (
                new sdk.actions.liquityV2.LiquityV2OpenAction(
                    market,
                    from,
                    to,
                    nullAddress,
                    nullAddress,
                    ownerIndex,
                    collAmount,
                    boldAmount,
                    upperHint,
                    lowerHint,
                    annualInterestRate,
                    maxUpfrontFee,
                )
            ).encodeForDsProxyCall()[1];
            const foundryEncoded = LiquityV2Open.interface.encodeFunctionData('executeActionDirect', [
                await foundryContract.liquityV2OpenEncode(
                    market,
                    from,
                    to,
                    nullAddress,
                    ownerIndex,
                    collAmount,
                    boldAmount,
                    upperHint,
                    lowerHint,
                    annualInterestRate,
                    maxUpfrontFee,
                ),
            ]);
            expect(sdkEncoded).to.be.eq(foundryEncoded);
        });
        it('Test liquityV2AdjustEncode', async () => {
            const LiquityV2Adjust = await hre.ethers.getContractFactory('LiquityV2Adjust');

            const sdkEncoded = (
                new sdk.actions.liquityV2.LiquityV2AdjustAction(
                    market,
                    from,
                    to,
                    troveId,
                    collAmount,
                    boldAmount,
                    maxUpfrontFee,
                    collAction,
                    debtAction,
                )
            ).encodeForDsProxyCall()[1];

            const foundryEncoded = LiquityV2Adjust.interface.encodeFunctionData('executeActionDirect', [
                await foundryContract.liquityV2AdjustEncode(
                    market,
                    from,
                    to,
                    troveId,
                    collAmount,
                    boldAmount,
                    maxUpfrontFee,
                    collAction,
                    debtAction,
                ),
            ]);
            expect(sdkEncoded).to.be.eq(foundryEncoded);
        });
        it('Test liquityV2AdjustZombieTroveEncode', async () => {
            const LiquityV2Adjust = await hre.ethers.getContractFactory('LiquityV2AdjustZombieTrove');

            const sdkEncoded = (
                new sdk.actions.liquityV2.LiquityV2AdjustZombieTroveAction(
                    market,
                    from,
                    to,
                    troveId,
                    collAmount,
                    boldAmount,
                    upperHint,
                    lowerHint,
                    maxUpfrontFee,
                    collAction,
                    debtAction,
                )
            ).encodeForDsProxyCall()[1];

            const foundryEncoded = LiquityV2Adjust.interface.encodeFunctionData('executeActionDirect', [
                await foundryContract.liquityV2AdjustZombieTroveEncode(
                    market,
                    from,
                    to,
                    troveId,
                    collAmount,
                    boldAmount,
                    upperHint,
                    lowerHint,
                    maxUpfrontFee,
                    collAction,
                    debtAction,
                ),
            ]);
            expect(sdkEncoded).to.be.eq(foundryEncoded);
        });
        it('Test liquityV2AdjustInterestRateEncode', async () => {
            const LiquityV2AdjustInterestRate = await hre.ethers.getContractFactory('LiquityV2AdjustInterestRate');

            const sdkEncoded = (
                new sdk.actions.liquityV2.LiquityV2AdjustInterestRateAction(
                    market,
                    troveId,
                    annualInterestRate,
                    upperHint,
                    lowerHint,
                    maxUpfrontFee,
                )
            ).encodeForDsProxyCall()[1];

            const foundryEncoded = LiquityV2AdjustInterestRate.interface.encodeFunctionData('executeActionDirect', [
                await foundryContract.liquityV2AdjustInterestRateEncode(
                    market,
                    troveId,
                    annualInterestRate,
                    upperHint,
                    lowerHint,
                    maxUpfrontFee,
                ),
            ]);
            expect(sdkEncoded).to.be.eq(foundryEncoded);
        });
        it('Test liquityV2BorrowEncode', async () => {
            const LiquityV2Borrow = await hre.ethers.getContractFactory('LiquityV2Borrow');

            const sdkEncoded = (
                new sdk.actions.liquityV2.LiquityV2BorrowAction(
                    market,
                    to,
                    troveId,
                    amount,
                    maxUpfrontFee,
                )
            ).encodeForDsProxyCall()[1];

            const foundryEncoded = LiquityV2Borrow.interface.encodeFunctionData('executeActionDirect', [
                await foundryContract.liquityV2BorrowEncode(
                    market,
                    to,
                    troveId,
                    amount,
                    maxUpfrontFee,
                ),
            ]);
            expect(sdkEncoded).to.be.eq(foundryEncoded);
        });
        it('Test liquityV2ClaimEncode', async () => {
            const LiquityV2Claim = await hre.ethers.getContractFactory('LiquityV2Claim');

            const sdkEncoded = (
                new sdk.actions.liquityV2.LiquityV2ClaimAction(
                    market,
                    to,
                )
            ).encodeForDsProxyCall()[1];

            const foundryEncoded = LiquityV2Claim.interface.encodeFunctionData('executeActionDirect', [
                await foundryContract.liquityV2ClaimEncode(
                    market,
                    to,
                ),
            ]);
            expect(sdkEncoded).to.be.eq(foundryEncoded);
        });
        it('Test liquityV2CloseEncode', async () => {
            const LiquityV2Close = await hre.ethers.getContractFactory('LiquityV2Close');

            const sdkEncoded = (
                new sdk.actions.liquityV2.LiquityV2CloseAction(
                    market,
                    from,
                    to,
                    troveId,
                )
            ).encodeForDsProxyCall()[1];

            const foundryEncoded = LiquityV2Close.interface.encodeFunctionData('executeActionDirect', [
                await foundryContract.liquityV2CloseEncode(
                    market,
                    from,
                    to,
                    troveId,
                ),
            ]);
            expect(sdkEncoded).to.be.eq(foundryEncoded);
        });
        it('Test liquityV2PaybackEncode', async () => {
            const LiquityV2Payback = await hre.ethers.getContractFactory('LiquityV2Payback');

            const sdkEncoded = (
                new sdk.actions.liquityV2.LiquityV2PaybackAction(
                    market,
                    from,
                    troveId,
                    amount,
                )
            ).encodeForDsProxyCall()[1];

            const foundryEncoded = LiquityV2Payback.interface.encodeFunctionData('executeActionDirect', [
                await foundryContract.liquityV2PaybackEncode(
                    market,
                    from,
                    troveId,
                    amount,
                ),
            ]);
            expect(sdkEncoded).to.be.eq(foundryEncoded);
        });
        it('Test liquityV2SupplyEncode', async () => {
            const LiquityV2Supply = await hre.ethers.getContractFactory('LiquityV2Supply');

            const sdkEncoded = (
                new sdk.actions.liquityV2.LiquityV2SupplyAction(
                    market,
                    from,
                    nullAddress,
                    troveId,
                    amount,
                )
            ).encodeForDsProxyCall()[1];

            const foundryEncoded = LiquityV2Supply.interface.encodeFunctionData('executeActionDirect', [
                await foundryContract.liquityV2SupplyEncode(
                    market,
                    from,
                    troveId,
                    amount,
                ),
            ]);
            expect(sdkEncoded).to.be.eq(foundryEncoded);
        });
        it('Test liquityV2WithdrawEncode', async () => {
            const LiquityV2Withdraw = await hre.ethers.getContractFactory('LiquityV2Withdraw');

            const sdkEncoded = (
                new sdk.actions.liquityV2.LiquityV2WithdrawAction(
                    market,
                    to,
                    troveId,
                    amount,
                )
            ).encodeForDsProxyCall()[1];

            const foundryEncoded = LiquityV2Withdraw.interface.encodeFunctionData('executeActionDirect', [
                await foundryContract.liquityV2WithdrawEncode(
                    market,
                    to,
                    troveId,
                    amount,
                ),
            ]);
            expect(sdkEncoded).to.be.eq(foundryEncoded);
        });
        it('Test liquityV2SPClaimCollEncode', async () => {
            const LiquityV2SPClaimColl = await hre.ethers.getContractFactory('LiquityV2SPClaimColl');

            const sdkEncoded = (
                new sdk.actions.liquityV2.LiquityV2SPClaimCollAction(
                    market,
                    to,
                )
            ).encodeForDsProxyCall()[1];

            const foundryEncoded = LiquityV2SPClaimColl.interface.encodeFunctionData('executeActionDirect', [
                await foundryContract.liquityV2SPClaimCollEncode(
                    market,
                    to,
                ),
            ]);
            expect(sdkEncoded).to.be.eq(foundryEncoded);
        });
        it('Test liquityV2SPDepositEncode', async () => {
            const LiquityV2SPDeposit = await hre.ethers.getContractFactory('LiquityV2SPDeposit');

            const sdkEncoded = (
                new sdk.actions.liquityV2.LiquityV2SPDepositAction(
                    market,
                    from,
                    boldGainTo,
                    collGainTo,
                    amount,
                    doClaim,
                )
            ).encodeForDsProxyCall()[1];

            const foundryEncoded = LiquityV2SPDeposit.interface.encodeFunctionData('executeActionDirect', [
                await foundryContract.liquityV2SPDepositEncode(
                    market,
                    from,
                    boldGainTo,
                    collGainTo,
                    amount,
                    doClaim,
                ),
            ]);
            expect(sdkEncoded).to.be.eq(foundryEncoded);
        });
        it('Test liquityV2SPWithdrawEncode', async () => {
            const LiquityV2SPWithdraw = await hre.ethers.getContractFactory('LiquityV2SPWithdraw');

            const sdkEncoded = (
                new sdk.actions.liquityV2.LiquityV2SPWithdrawAction(
                    market,
                    boldGainTo,
                    collGainTo,
                    amount,
                    doClaim,
                )
            ).encodeForDsProxyCall()[1];

            const foundryEncoded = LiquityV2SPWithdraw.interface.encodeFunctionData('executeActionDirect', [
                await foundryContract.liquityV2SPWithdrawEncode(
                    market,
                    boldGainTo,
                    collGainTo,
                    amount,
                    doClaim,
                ),
            ]);
            expect(sdkEncoded).to.be.eq(foundryEncoded);
        });
    });

    /* //////////////////////////////////////////////////////////////
                           FLUID_VAULT
    ////////////////////////////////////////////////////////////// */
    describe('FluidVaultT1', () => {
        const vault = '0x2f39d218133AFaB8F2B819B1066c7E434Ad94E9e';
        const nftId = 1;
        const from = '0x0000000000000000000000000000000000000002';
        const to = '0x0000000000000000000000000000000000000003';
        const collAmount = 1000;
        const debtAmount = 500;
        const collAction = 0; // 0: SUPPLY, 1: WITHDRAW
        const debtAction = 0; // 0: PAYBACK, 1: BORROW
        const shouldWrap = true;
        let foundryContract;

        before(async () => {
            foundryContract = await getFoundryEncodingContract();
        });
        it('Test fluidVaultT1OpenEncode', async () => {
            const FluidVaultT1Open = await hre.ethers.getContractFactory('FluidVaultT1Open');
            const sdkEncoded = (
                new sdk.actions.fluid.FluidVaultT1OpenAction(
                    vault,
                    collAmount,
                    debtAmount,
                    from,
                    to,
                    shouldWrap,
                )
            ).encodeForDsProxyCall()[1];
            const foundryEncoded = FluidVaultT1Open.interface.encodeFunctionData('executeActionDirect', [
                await foundryContract.fluidVaultT1OpenEncode(
                    vault,
                    collAmount,
                    debtAmount,
                    from,
                    to,
                    shouldWrap,
                ),
            ]);
            expect(sdkEncoded).to.be.eq(foundryEncoded);
        });
        it('Test fluidVaultT1AdjustEncode', async () => {
            const FluidVaultT1Adjust = await hre.ethers.getContractFactory('FluidVaultT1Adjust');
            const sdkEncoded = (
                new sdk.actions.fluid.FluidVaultT1AdjustAction(
                    vault,
                    nftId,
                    collAmount,
                    debtAmount,
                    from,
                    to,
                    shouldWrap,
                    collAction,
                    debtAction,
                )
            ).encodeForDsProxyCall()[1];
            const foundryEncoded = FluidVaultT1Adjust.interface.encodeFunctionData('executeActionDirect', [
                await foundryContract.fluidVaultT1AdjustEncode(
                    vault,
                    nftId,
                    collAmount,
                    debtAmount,
                    from,
                    to,
                    shouldWrap,
                    collAction,
                    debtAction,
                ),
            ]);
            expect(sdkEncoded).to.be.eq(foundryEncoded);
        });
        it('Test fluidVaultT1PaybackEncode', async () => {
            const FluidVaultT1Payback = await hre.ethers.getContractFactory('FluidVaultT1Payback');
            const sdkEncoded = (
                new sdk.actions.fluid.FluidVaultT1PaybackAction(
                    vault,
                    nftId,
                    debtAmount,
                    from,
                )
            ).encodeForDsProxyCall()[1];
            const foundryEncoded = FluidVaultT1Payback.interface.encodeFunctionData('executeActionDirect', [
                await foundryContract.fluidVaultT1PaybackEncode(
                    vault,
                    nftId,
                    debtAmount,
                    from,
                ),
            ]);
            expect(sdkEncoded).to.be.eq(foundryEncoded);
        });
        it('Test fluidVaultT1WithdrawEncode', async () => {
            const FluidVaultT1Withdraw = await hre.ethers.getContractFactory('FluidVaultT1Withdraw');
            const sdkEncoded = (
                new sdk.actions.fluid.FluidVaultT1WithdrawAction(
                    vault,
                    nftId,
                    collAmount,
                    to,
                    shouldWrap,
                )
            ).encodeForDsProxyCall()[1];
            const foundryEncoded = FluidVaultT1Withdraw.interface.encodeFunctionData('executeActionDirect', [
                await foundryContract.fluidVaultT1WithdrawEncode(
                    vault,
                    nftId,
                    collAmount,
                    to,
                    shouldWrap,
                ),
            ]);
            expect(sdkEncoded).to.be.eq(foundryEncoded);
        });

        it('Test fluidVaultT1SupplyEncode', async () => {
            const FluidVaultT1Supply = await hre.ethers.getContractFactory('FluidVaultT1Supply');
            const sdkEncoded = (
                new sdk.actions.fluid.FluidVaultT1SupplyAction(
                    vault,
                    nftId,
                    collAmount,
                    from,
                )
            ).encodeForDsProxyCall()[1];
            const foundryEncoded = FluidVaultT1Supply.interface.encodeFunctionData('executeActionDirect', [
                await foundryContract.fluidVaultT1SupplyEncode(
                    vault,
                    nftId,
                    collAmount,
                    from,
                ),
            ]);
            expect(sdkEncoded).to.be.eq(foundryEncoded);
        });
        it('Test fluidVaultT1BorrowEncode', async () => {
            const FluidVaultT1Borrow = await hre.ethers.getContractFactory('FluidVaultT1Borrow');
            const sdkEncoded = (
                new sdk.actions.fluid.FluidVaultT1BorrowAction(
                    vault,
                    nftId,
                    debtAmount,
                    to,
                    shouldWrap,
                )
            ).encodeForDsProxyCall()[1];
            const foundryEncoded = FluidVaultT1Borrow.interface.encodeFunctionData('executeActionDirect', [
                await foundryContract.fluidVaultT1BorrowEncode(
                    vault,
                    nftId,
                    debtAmount,
                    to,
                    shouldWrap,
                ),
            ]);
            expect(sdkEncoded).to.be.eq(foundryEncoded);
        });
    });
});
