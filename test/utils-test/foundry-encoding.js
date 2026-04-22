const { expect } = require('chai');
const hre = require('hardhat');
const sdk = require('@defisaver/sdk');
const { WETH_ADDRESS, DAI_ADDR, nullAddress } = require('../utils/utils');

describe('Test direct actions encoding for sdk and foundry', () => {
    const deploy = async (name) => {
        const factory = await hre.ethers.getContractFactory(name);
        const instance = await factory.deploy();
        return await instance.deployed();
    };

    describe('CompoundV3', () => {
        const market = '0xc3d688B66703497DAA19211EEdff47f25384cdc3';
        const tokenAddr = WETH_ADDRESS;
        const amount = 10000;

        let compV3Encode;

        before(async () => {
            compV3Encode = await deploy('CompV3Encode');
        });

        it('Test compV3SupplyEncode', async () => {
            const [from] = await hre.ethers.getSigners();
            const CompV3Supply = await hre.ethers.getContractFactory('CompV3Supply');

            const sdkEncoded = new sdk.actions.compoundV3.CompoundV3SupplyAction(
                market,
                tokenAddr,
                amount,
                from.address,
                hre.ethers.constants.AddressZero,
            ).encodeForDsProxyCall()[1];

            const foundryEncoded = CompV3Supply.interface.encodeFunctionData(
                'executeActionDirect',
                [await compV3Encode.supply(market, tokenAddr, amount, from.address)],
            );
            expect(sdkEncoded).to.be.eq(foundryEncoded);
        });
        it('Test compV3WithdrawEncode', async () => {
            const [to] = await hre.ethers.getSigners();
            const CompV3Withdraw = await hre.ethers.getContractFactory('CompV3Withdraw');

            const sdkEncoded = new sdk.actions.compoundV3.CompoundV3WithdrawAction(
                market,
                to.address,
                tokenAddr,
                amount,
                hre.ethers.constants.AddressZero,
            ).encodeForDsProxyCall()[1];

            const foundryEncoded = CompV3Withdraw.interface.encodeFunctionData(
                'executeActionDirect',
                [await compV3Encode.withdraw(market, to.address, tokenAddr, amount)],
            );
            expect(sdkEncoded).to.be.eq(foundryEncoded);
        });
        it('Test compV3BorrowEncode', async () => {
            const [to] = await hre.ethers.getSigners();
            const CompV3Borrow = await hre.ethers.getContractFactory('CompV3Borrow');

            const sdkEncoded = new sdk.actions.compoundV3.CompoundV3BorrowAction(
                market,
                amount,
                to.address,
                hre.ethers.constants.AddressZero,
            ).encodeForDsProxyCall()[1];

            const foundryEncoded = CompV3Borrow.interface.encodeFunctionData(
                'executeActionDirect',
                [await compV3Encode.borrow(market, amount, to.address)],
            );
            expect(sdkEncoded).to.be.eq(foundryEncoded);
        });
        it('Test compV3RatioCheckEncode', async () => {
            const user = nullAddress;
            const ratioState = 1;
            const targetRatio = 250;
            const CompV3RatioCheck = await hre.ethers.getContractFactory('CompV3RatioCheck');

            const sdkEncoded = new sdk.actions.checkers.CompoundV3RatioCheckAction(
                ratioState,
                targetRatio,
                market,
                user,
            ).encodeForDsProxyCall()[1];

            const foundryEncoded = CompV3RatioCheck.interface.encodeFunctionData(
                'executeActionDirect',
                [await compV3Encode.ratioCheck(ratioState, targetRatio, market)],
            );
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

        let aaveV3Encode;

        before(async () => {
            aaveV3Encode = await deploy('AaveV3Encode');
        });

        it('Test aaveV3SupplyEncode', async () => {
            const [from] = await hre.ethers.getSigners();
            const AaveV3Supply = await hre.ethers.getContractFactory('AaveV3Supply');
            const sdkEncoded = new sdk.actions.aaveV3.AaveV3SupplyAction(
                useDefaultMarket,
                market,
                amount,
                from.address,
                tokenAddr,
                assetId,
                enableAsColl,
                useOnBehalf,
                onBehalf,
            ).encodeForDsProxyCall()[1];

            const foundryEncoded = AaveV3Supply.interface.encodeFunctionData(
                'executeActionDirect',
                [
                    await aaveV3Encode.supply(
                        amount,
                        from.address,
                        assetId,
                        useDefaultMarket,
                        useOnBehalf,
                        market,
                        onBehalf,
                    ),
                ],
            );
            expect(sdkEncoded).to.be.eq(foundryEncoded);
        });
        it('Test aaveV3BorrowEncode', async () => {
            const [to] = await hre.ethers.getSigners();
            const AaveV3Borrow = await hre.ethers.getContractFactory('AaveV3Borrow');
            const sdkEncoded = new sdk.actions.aaveV3.AaveV3BorrowAction(
                useDefaultMarket,
                market,
                amount,
                to.address,
                rateMode,
                assetId,
                useOnBehalf,
                onBehalf,
            ).encodeForDsProxyCall()[1];

            const foundryEncoded = AaveV3Borrow.interface.encodeFunctionData(
                'executeActionDirect',
                [
                    await aaveV3Encode.borrow(
                        amount,
                        to.address,
                        rateMode,
                        assetId,
                        useDefaultMarket,
                        useOnBehalf,
                        market,
                        onBehalf,
                    ),
                ],
            );
            expect(sdkEncoded).to.be.eq(foundryEncoded);
        });
        it('Test aaveV3WithdrawEncode', async () => {
            const [to] = await hre.ethers.getSigners();
            const AaveV3Withdraw = await hre.ethers.getContractFactory('AaveV3Withdraw');
            const sdkEncoded = new sdk.actions.aaveV3.AaveV3WithdrawAction(
                useDefaultMarket,
                market,
                amount,
                to.address,
                assetId,
            ).encodeForDsProxyCall()[1];

            const foundryEncoded = AaveV3Withdraw.interface.encodeFunctionData(
                'executeActionDirect',
                [
                    await aaveV3Encode.withdraw(
                        assetId,
                        useDefaultMarket,
                        amount,
                        to.address,
                        market,
                    ),
                ],
            );
            expect(sdkEncoded).to.be.eq(foundryEncoded);
        });
        it('Test aaveV3SetEModeEncode', async () => {
            const categoryId = 1;
            const AaveV3SetEMode = await hre.ethers.getContractFactory('AaveV3SetEMode');
            const sdkEncoded = new sdk.actions.aaveV3.AaveV3SetEModeAction(
                useDefaultMarket,
                market,
                categoryId,
            ).encodeForDsProxyCall()[1];

            const foundryEncoded = AaveV3SetEMode.interface.encodeFunctionData(
                'executeActionDirect',
                [await aaveV3Encode.setEMode(categoryId, useDefaultMarket, market)],
            );
            expect(sdkEncoded).to.be.eq(foundryEncoded);
        });
        it('Test aaveV3DelegateCreditEncode', async () => {
            const [delegatee] = await hre.ethers.getSigners();
            const AaveV3DelegateCredit =
                await hre.ethers.getContractFactory('AaveV3DelegateCredit');
            const sdkEncoded = new sdk.actions.aaveV3.AaveV3DelegateCredit(
                useDefaultMarket,
                market,
                amount,
                rateMode,
                assetId,
                delegatee.address,
            ).encodeForDsProxyCall()[1];

            const foundryEncoded = AaveV3DelegateCredit.interface.encodeFunctionData(
                'executeActionDirect',
                [
                    await aaveV3Encode.delegateCredit(
                        amount,
                        delegatee.address,
                        assetId,
                        rateMode,
                        useDefaultMarket,
                        market,
                    ),
                ],
            );
            expect(sdkEncoded).to.be.eq(foundryEncoded);
        });
        it('Test aaveV3CollateralSwitchEncode', async () => {
            const arrayLength = 2;
            const assetIds = [1, 2];
            const useAsCollateral = [true, false];
            const AaveV3CollateralSwitch =
                await hre.ethers.getContractFactory('AaveV3CollateralSwitch');
            const sdkEncoded = new sdk.actions.aaveV3.AaveV3CollateralSwitchAction(
                useDefaultMarket,
                market,
                arrayLength,
                assetIds,
                useAsCollateral,
            ).encodeForDsProxyCall()[1];

            const foundryEncoded = AaveV3CollateralSwitch.interface.encodeFunctionData(
                'executeActionDirect',
                [
                    await aaveV3Encode.collateralSwitch(
                        arrayLength,
                        assetIds,
                        useAsCollateral,
                        useDefaultMarket,
                        market,
                    ),
                ],
            );
            expect(sdkEncoded).to.be.eq(foundryEncoded);
        });
        it('Test aaveV3ClaimRewardsEncode', async () => {
            const [to, reward] = await hre.ethers.getSigners();
            const assets = [WETH_ADDRESS, DAI_ADDR];
            const AaveV3ClaimRewards = await hre.ethers.getContractFactory('AaveV3ClaimRewards');
            const sdkEncoded = new sdk.actions.aaveV3.AaveV3ClaimRewardsAction(
                assets.length,
                amount,
                to.address,
                reward.address,
                assets,
            ).encodeForDsProxyCall()[1];

            const foundryEncoded = AaveV3ClaimRewards.interface.encodeFunctionData(
                'executeActionDirect',
                [await aaveV3Encode.claimRewards(amount, to.address, reward.address, assets)],
            );
            expect(sdkEncoded).to.be.eq(foundryEncoded);
        });
        it('Test aaveV3PaybackEncode', async () => {
            const [from] = await hre.ethers.getSigners();
            const AaveV3Payback = await hre.ethers.getContractFactory('AaveV3Payback');
            const sdkEncoded = new sdk.actions.aaveV3.AaveV3PaybackAction(
                useDefaultMarket,
                market,
                amount,
                from.address,
                rateMode,
                tokenAddr,
                assetId,
                useOnBehalf,
                onBehalf,
            ).encodeForDsProxyCall()[1];

            const foundryEncoded = AaveV3Payback.interface.encodeFunctionData(
                'executeActionDirect',
                [
                    await aaveV3Encode.payback(
                        amount,
                        from.address,
                        rateMode,
                        assetId,
                        useDefaultMarket,
                        useOnBehalf,
                        market,
                        onBehalf,
                    ),
                ],
            );
            expect(sdkEncoded).to.be.eq(foundryEncoded);
        });
        it('Test aaveV3ATokenPaybackEncode', async () => {
            const [from, aTokenAddr] = await hre.ethers.getSigners();
            const AaveV3ATokenPayback = await hre.ethers.getContractFactory('AaveV3ATokenPayback');
            const sdkEncoded = new sdk.actions.aaveV3.AaveV3ATokenPaybackAction(
                useDefaultMarket,
                market,
                amount,
                from.address,
                rateMode,
                aTokenAddr.address,
                assetId,
            ).encodeForDsProxyCall()[1];

            const foundryEncoded = AaveV3ATokenPayback.interface.encodeFunctionData(
                'executeActionDirect',
                [
                    await aaveV3Encode.aTokenPayback(
                        amount,
                        from.address,
                        rateMode,
                        assetId,
                        useDefaultMarket,
                        market,
                    ),
                ],
            );
            expect(sdkEncoded).to.be.eq(foundryEncoded);
        });
    });

    describe('Exchange', () => {
        let actionsUtils;
        before(async () => {
            actionsUtils = await deploy('ActionsUtils');
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

            const sdkEncoded = new sdk.actions.basic.SellAction(
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
            ).encodeForDsProxyCall()[1];

            const foundryEncoded = DFSSell.interface.encodeFunctionData('executeActionDirect', [
                await actionsUtils
                    .connect(from)
                    .sellEncode(
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
        let actionsUtils;
        before(async () => {
            actionsUtils = await deploy('ActionsUtils');
        });
        it('Test gasFeeTaker encode', async () => {
            const gasStart = 100;
            const feeToken = WETH_ADDRESS;
            const availableAmount = 0;
            const dfsFeeDivider = 0;
            const GasFeeTaker = await hre.ethers.getContractFactory('GasFeeTaker');

            const sdkEncoded = new sdk.actions.basic.GasFeeAction(
                gasStart,
                feeToken,
                availableAmount,
                dfsFeeDivider,
            ).encodeForDsProxyCall()[1];

            const foundryEncoded = GasFeeTaker.interface.encodeFunctionData('executeActionDirect', [
                await actionsUtils.gasFeeEncode(gasStart, feeToken),
            ]);
            expect(sdkEncoded).to.be.eq(foundryEncoded);
        });
    });

    describe('FLAction', () => {
        let actionsUtils;
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
            actionsUtils = await deploy('ActionsUtils');
            FLAction = await hre.ethers.getContractFactory('FLAction');
        });
        it('Test AaveV2 fl', async () => {
            const modes = [0];
            const loanPayer = nullAddress;

            const sdkEncoded = new sdk.actions.flashloan.FLAction(
                new sdk.actions.flashloan.AaveV2FlashLoanAction(
                    [tokenAddr],
                    [amount],
                    modes,
                    loanPayer,
                ),
            ).encodeForDsProxyCall()[1];

            const foundryEncoded = FLAction.interface.encodeFunctionData('executeActionDirect', [
                await actionsUtils.flActionEncode(tokenAddr, amount, mapFLSources.AAVE_V2),
            ]);
            expect(sdkEncoded).to.be.eq(foundryEncoded);
        });
        it('Test Balancer fl', async () => {
            const sdkEncoded = new sdk.actions.flashloan.FLAction(
                new sdk.actions.flashloan.BalancerFlashLoanAction(
                    [tokenAddr],
                    [amount],
                    nullAddress,
                ),
            ).encodeForDsProxyCall()[1];

            const foundryEncoded = FLAction.interface.encodeFunctionData('executeActionDirect', [
                await actionsUtils.flActionEncode(tokenAddr, amount, mapFLSources.BALANCER),
            ]);
            expect(sdkEncoded).to.be.eq(foundryEncoded);
        });
        it('Test Gho fl', async () => {
            const sdkEncoded = new sdk.actions.flashloan.FLAction(
                new sdk.actions.flashloan.GhoFlashLoanAction(amount),
            ).encodeForDsProxyCall()[1];

            const foundryEncoded = FLAction.interface.encodeFunctionData('executeActionDirect', [
                await actionsUtils.flActionEncode(
                    nullAddress, // ignored, when FLAction is parsed, gho addr will be used
                    amount,
                    mapFLSources.GHO,
                ),
            ]);
            expect(sdkEncoded).to.be.eq(foundryEncoded);
        });
        it('Test Maker fl', async () => {
            const sdkEncoded = new sdk.actions.flashloan.FLAction(
                new sdk.actions.flashloan.MakerFlashLoanAction(amount),
            ).encodeForDsProxyCall()[1];

            const foundryEncoded = FLAction.interface.encodeFunctionData('executeActionDirect', [
                await actionsUtils.flActionEncode(
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

            const sdkEncoded = new sdk.actions.flashloan.FLAction(
                new sdk.actions.flashloan.AaveV3FlashLoanAction(
                    [tokenAddr],
                    [amount],
                    modes,
                    loanPayer,
                ),
            ).encodeForDsProxyCall()[1];

            const foundryEncoded = FLAction.interface.encodeFunctionData('executeActionDirect', [
                await actionsUtils.flActionEncode(tokenAddr, amount, mapFLSources.AAVE_V3),
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

            const sdkEncoded = new sdk.actions.flashloan.FLAction(
                new sdk.actions.flashloan.UniV3FlashLoanAction(
                    token0,
                    token1,
                    pool,
                    amount0,
                    amount1,
                ),
            ).encodeForDsProxyCall()[1];

            const foundryEncoded = FLAction.interface.encodeFunctionData('executeActionDirect', [
                await actionsUtils.flUniswapEncode(token0, token1, pool, amount0, amount1),
            ]);
            expect(sdkEncoded).to.be.eq(foundryEncoded);
        });
        it('Test Spark fl', async () => {
            const modes = [0];
            const loanPayer = nullAddress;

            const sdkEncoded = new sdk.actions.flashloan.FLAction(
                new sdk.actions.flashloan.SparkFlashLoanAction(
                    [tokenAddr],
                    [amount],
                    modes,
                    loanPayer,
                ),
            ).encodeForDsProxyCall()[1];

            const foundryEncoded = FLAction.interface.encodeFunctionData('executeActionDirect', [
                await actionsUtils.flActionEncode(tokenAddr, amount, mapFLSources.SPARK),
            ]);
            expect(sdkEncoded).to.be.eq(foundryEncoded);
        });
        it('Test Morpho blue fl', async () => {
            const sdkEncoded = new sdk.actions.flashloan.FLAction(
                new sdk.actions.flashloan.MorphoBlueFlashLoanAction(tokenAddr, amount),
            ).encodeForDsProxyCall()[1];

            const foundryEncoded = FLAction.interface.encodeFunctionData('executeActionDirect', [
                await actionsUtils.flActionEncode(tokenAddr, amount, mapFLSources.MORPHO_BLUE),
            ]);
            expect(sdkEncoded).to.be.eq(foundryEncoded);
        });
    });

    describe('EulerV2', () => {
        let eulerV2Encode;
        let vault, account, from, receiver;
        const tokenAddr = WETH_ADDRESS;
        const amount = 10000;
        const enableAsColl = true;
        const indexes = [
            [1, 2],
            [3, 4],
        ];

        before(async () => {
            eulerV2Encode = await deploy('EulerV2Encode');
            [vault, account, from, receiver] = (await hre.ethers.getSigners()).map(
                (s) => s.address,
            );
        });

        it('Test eulerV2SupplyEncode', async () => {
            const EulerV2Supply = await hre.ethers.getContractFactory('EulerV2Supply');
            const sdkEncoded = new sdk.actions.eulerV2.EulerV2SupplyAction(
                vault,
                tokenAddr,
                account,
                from,
                amount,
                enableAsColl,
            ).encodeForDsProxyCall()[1];

            const foundryEncoded = EulerV2Supply.interface.encodeFunctionData(
                'executeActionDirect',
                [await eulerV2Encode.supply(vault, account, from, amount, enableAsColl)],
            );

            expect(sdkEncoded).to.be.eq(foundryEncoded);
        });
        it('Test eulerV2WithdrawEncode', async () => {
            const EulerV2Withdraw = await hre.ethers.getContractFactory('EulerV2Withdraw');
            const sdkEncoded = new sdk.actions.eulerV2.EulerV2WithdrawAction(
                vault,
                account,
                receiver,
                amount,
            ).encodeForDsProxyCall()[1];

            const foundryEncoded = EulerV2Withdraw.interface.encodeFunctionData(
                'executeActionDirect',
                [await eulerV2Encode.withdraw(vault, account, receiver, amount)],
            );

            expect(sdkEncoded).to.be.eq(foundryEncoded);
        });
        it('Test eulerV2BorrowEncode', async () => {
            const EulerV2Borrow = await hre.ethers.getContractFactory('EulerV2Borrow');
            const sdkEncoded = new sdk.actions.eulerV2.EulerV2BorrowAction(
                vault,
                account,
                receiver,
                amount,
            ).encodeForDsProxyCall()[1];

            const foundryEncoded = EulerV2Borrow.interface.encodeFunctionData(
                'executeActionDirect',
                [await eulerV2Encode.borrow(vault, account, receiver, amount)],
            );

            expect(sdkEncoded).to.be.eq(foundryEncoded);
        });
        it('Test eulerV2PaybackEncode', async () => {
            const EulerV2Payback = await hre.ethers.getContractFactory('EulerV2Payback');
            const sdkEncoded = new sdk.actions.eulerV2.EulerV2PaybackAction(
                vault,
                tokenAddr,
                account,
                from,
                amount,
            ).encodeForDsProxyCall()[1];

            const foundryEncoded = EulerV2Payback.interface.encodeFunctionData(
                'executeActionDirect',
                [await eulerV2Encode.payback(vault, account, from, amount)],
            );

            expect(sdkEncoded).to.be.eq(foundryEncoded);
        });
        it('Test eulerV2PaybackWithSharesEncode', async () => {
            const EulerV2PaybackWithShares = await hre.ethers.getContractFactory(
                'EulerV2PaybackWithShares',
            );
            const sdkEncoded = new sdk.actions.eulerV2.EulerV2PaybackWithSharesAction(
                vault,
                account,
                from,
                amount,
            ).encodeForDsProxyCall()[1];

            const foundryEncoded = EulerV2PaybackWithShares.interface.encodeFunctionData(
                'executeActionDirect',
                [await eulerV2Encode.paybackWithShares(vault, from, account, amount)],
            );

            expect(sdkEncoded).to.be.eq(foundryEncoded);
        });
        it('Test eulerV2PullDebtEncode', async () => {
            const EulerV2PullDebt = await hre.ethers.getContractFactory('EulerV2PullDebt');
            const sdkEncoded = new sdk.actions.eulerV2.EulerV2PullDebtAction(
                vault,
                account,
                from,
                amount,
            ).encodeForDsProxyCall()[1];

            const foundryEncoded = EulerV2PullDebt.interface.encodeFunctionData(
                'executeActionDirect',
                [await eulerV2Encode.pullDebt(vault, account, from, amount)],
            );

            expect(sdkEncoded).to.be.eq(foundryEncoded);
        });
        it('Test eulerV2ReorderCollateralsEncode', async () => {
            const EulerV2ReorderCollaterals = await hre.ethers.getContractFactory(
                'EulerV2ReorderCollaterals',
            );
            const sdkEncoded = new sdk.actions.eulerV2.EulerV2ReorderCollateralsAction(
                account,
                indexes,
            ).encodeForDsProxyCall()[1];

            const foundryEncoded = EulerV2ReorderCollaterals.interface.encodeFunctionData(
                'executeActionDirect',
                [await eulerV2Encode.reorderCollaterals(account, indexes)],
            );

            expect(sdkEncoded).to.be.eq(foundryEncoded);
        });
        it('Test eulerV2CollateralSwitchEncode', async () => {
            const EulerV2CollateralSwitch =
                await hre.ethers.getContractFactory('EulerV2CollateralSwitch');
            const sdkEncoded = new sdk.actions.eulerV2.EulerV2CollateralSwitchAction(
                vault,
                account,
                enableAsColl,
            ).encodeForDsProxyCall()[1];

            const foundryEncoded = EulerV2CollateralSwitch.interface.encodeFunctionData(
                'executeActionDirect',
                [await eulerV2Encode.collateralSwitch(vault, account, enableAsColl)],
            );

            expect(sdkEncoded).to.be.eq(foundryEncoded);
        });
    });

    describe('EtherFi', () => {
        let etherFiEncode;
        let from;
        let to;
        const amount = 10000;
        const shouldWrap = true;

        before(async () => {
            etherFiEncode = await deploy('EtherFiEncode');
            [from, to] = (await hre.ethers.getSigners()).map((s) => s.address);
        });

        it('Test etherFiStakeEncode', async () => {
            const EtherFiStake = await hre.ethers.getContractFactory('EtherFiStake');
            const sdkEncoded = new sdk.actions.etherfi.EtherFiStakeAction(
                amount,
                from,
                to,
                shouldWrap,
            ).encodeForDsProxyCall()[1];

            const foundryEncoded = EtherFiStake.interface.encodeFunctionData(
                'executeActionDirect',
                [await etherFiEncode.stake(amount, from, to, shouldWrap)],
            );

            expect(sdkEncoded).to.be.eq(foundryEncoded);
        });

        it('Test etherFiWrap', async () => {
            const EtherFiWrap = await hre.ethers.getContractFactory('EtherFiWrap');
            const sdkEncoded = new sdk.actions.etherfi.EtherFiWrapAction(
                amount,
                from,
                to,
            ).encodeForDsProxyCall()[1];

            const foundryEncoded = EtherFiWrap.interface.encodeFunctionData('executeActionDirect', [
                await etherFiEncode.wrap(amount, from, to),
            ]);

            expect(sdkEncoded).to.be.eq(foundryEncoded);
        });

        it('Test etherFiUnwrap', async () => {
            const EtherFiUnwrap = await hre.ethers.getContractFactory('EtherFiUnwrap');
            const sdkEncoded = new sdk.actions.etherfi.EtherFiUnwrapAction(
                amount,
                from,
                to,
            ).encodeForDsProxyCall()[1];

            const foundryEncoded = EtherFiUnwrap.interface.encodeFunctionData(
                'executeActionDirect',
                [await etherFiEncode.unwrap(amount, from, to)],
            );

            expect(sdkEncoded).to.be.eq(foundryEncoded);
        });
    });

    describe('Renzo', () => {
        let actionsUtils;
        let from;
        let to;
        const amount = 10000;
        before(async () => {
            actionsUtils = await deploy('ActionsUtils');
            [from, to] = (await hre.ethers.getSigners()).map((s) => s.address);
        });
        it('Test renzoStakeEncode', async () => {
            const RenzoStake = await hre.ethers.getContractFactory('RenzoStake');
            const sdkEncoded = new sdk.actions.renzo.RenzoStakeAction(
                amount,
                from,
                to,
            ).encodeForDsProxyCall()[1];

            const foundryEncoded = RenzoStake.interface.encodeFunctionData('executeActionDirect', [
                await actionsUtils.renzoStakeEncode(amount, from, to),
            ]);
            expect(sdkEncoded).to.be.eq(foundryEncoded);
        });
    });

    describe('MorphoBlue', () => {
        let actionsUtils;
        let receiver;
        before(async () => {
            actionsUtils = await deploy('ActionsUtils');
            [receiver] = (await hre.ethers.getSigners()).map((s) => s.address);
        });

        it('Test morphoTokenWrapEncode', async () => {
            const MorphoTokenWrap = await hre.ethers.getContractFactory('MorphoTokenWrap');
            const sdkEncoded = new sdk.actions.morphoblue.MorphoTokenWrapAction(
                receiver,
                1000,
            ).encodeForDsProxyCall()[1];
            const foundryEncoded = MorphoTokenWrap.interface.encodeFunctionData(
                'executeActionDirect',
                [await actionsUtils.morphoTokenWrapEncode(receiver, 1000)],
            );
            expect(sdkEncoded).to.be.eq(foundryEncoded);
        });
        it('Test morphoTokenWrapEncode maxUint256 amount', async () => {
            const maxAmt = hre.ethers.constants.MaxUint256;
            const MorphoTokenWrap = await hre.ethers.getContractFactory('MorphoTokenWrap');
            const sdkEncoded = new sdk.actions.morphoblue.MorphoTokenWrapAction(
                receiver,
                maxAmt,
            ).encodeForDsProxyCall()[1];
            const foundryEncoded = MorphoTokenWrap.interface.encodeFunctionData(
                'executeActionDirect',
                [await actionsUtils.morphoTokenWrapEncode(receiver, maxAmt)],
            );
            expect(sdkEncoded).to.be.eq(foundryEncoded);
        });
    });

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
        let liquityV2Encode;
        before(async () => {
            liquityV2Encode = await deploy('LiquityV2Encode');
        });
        it('Test liquityV2OpenEncode', async () => {
            const LiquityV2Open = await hre.ethers.getContractFactory('LiquityV2Open');
            const sdkEncoded = new sdk.actions.liquityV2.LiquityV2OpenAction(
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
            ).encodeForDsProxyCall()[1];
            const foundryEncoded = LiquityV2Open.interface.encodeFunctionData(
                'executeActionDirect',
                [
                    await liquityV2Encode.open(
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
                ],
            );
            expect(sdkEncoded).to.be.eq(foundryEncoded);
        });
        it('Test liquityV2AdjustEncode', async () => {
            const LiquityV2Adjust = await hre.ethers.getContractFactory('LiquityV2Adjust');

            const sdkEncoded = new sdk.actions.liquityV2.LiquityV2AdjustAction(
                market,
                from,
                to,
                troveId,
                collAmount,
                boldAmount,
                maxUpfrontFee,
                collAction,
                debtAction,
            ).encodeForDsProxyCall()[1];

            const foundryEncoded = LiquityV2Adjust.interface.encodeFunctionData(
                'executeActionDirect',
                [
                    await liquityV2Encode.adjust(
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
                ],
            );
            expect(sdkEncoded).to.be.eq(foundryEncoded);
        });
        it('Test liquityV2AdjustZombieTroveEncode', async () => {
            const LiquityV2Adjust = await hre.ethers.getContractFactory(
                'LiquityV2AdjustZombieTrove',
            );

            const sdkEncoded = new sdk.actions.liquityV2.LiquityV2AdjustZombieTroveAction(
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
            ).encodeForDsProxyCall()[1];

            const foundryEncoded = LiquityV2Adjust.interface.encodeFunctionData(
                'executeActionDirect',
                [
                    await liquityV2Encode.adjustZombieTrove(
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
                ],
            );
            expect(sdkEncoded).to.be.eq(foundryEncoded);
        });
        it('Test liquityV2AdjustInterestRateEncode', async () => {
            const LiquityV2AdjustInterestRate = await hre.ethers.getContractFactory(
                'LiquityV2AdjustInterestRate',
            );

            const sdkEncoded = new sdk.actions.liquityV2.LiquityV2AdjustInterestRateAction(
                market,
                troveId,
                annualInterestRate,
                upperHint,
                lowerHint,
                maxUpfrontFee,
            ).encodeForDsProxyCall()[1];

            const foundryEncoded = LiquityV2AdjustInterestRate.interface.encodeFunctionData(
                'executeActionDirect',
                [
                    await liquityV2Encode.adjustInterestRate(
                        market,
                        troveId,
                        annualInterestRate,
                        upperHint,
                        lowerHint,
                        maxUpfrontFee,
                    ),
                ],
            );
            expect(sdkEncoded).to.be.eq(foundryEncoded);
        });
        it('Test liquityV2BorrowEncode', async () => {
            const LiquityV2Borrow = await hre.ethers.getContractFactory('LiquityV2Borrow');

            const sdkEncoded = new sdk.actions.liquityV2.LiquityV2BorrowAction(
                market,
                to,
                troveId,
                amount,
                maxUpfrontFee,
            ).encodeForDsProxyCall()[1];

            const foundryEncoded = LiquityV2Borrow.interface.encodeFunctionData(
                'executeActionDirect',
                [await liquityV2Encode.borrow(market, to, troveId, amount, maxUpfrontFee)],
            );
            expect(sdkEncoded).to.be.eq(foundryEncoded);
        });
        it('Test liquityV2ClaimEncode', async () => {
            const LiquityV2Claim = await hre.ethers.getContractFactory('LiquityV2Claim');

            const sdkEncoded = new sdk.actions.liquityV2.LiquityV2ClaimAction(
                market,
                to,
            ).encodeForDsProxyCall()[1];

            const foundryEncoded = LiquityV2Claim.interface.encodeFunctionData(
                'executeActionDirect',
                [await liquityV2Encode.claim(market, to)],
            );
            expect(sdkEncoded).to.be.eq(foundryEncoded);
        });
        it('Test liquityV2CloseEncode', async () => {
            const LiquityV2Close = await hre.ethers.getContractFactory('LiquityV2Close');

            const sdkEncoded = new sdk.actions.liquityV2.LiquityV2CloseAction(
                market,
                from,
                to,
                troveId,
            ).encodeForDsProxyCall()[1];

            const foundryEncoded = LiquityV2Close.interface.encodeFunctionData(
                'executeActionDirect',
                [await liquityV2Encode.close(market, from, to, troveId)],
            );
            expect(sdkEncoded).to.be.eq(foundryEncoded);
        });
        it('Test liquityV2PaybackEncode', async () => {
            const LiquityV2Payback = await hre.ethers.getContractFactory('LiquityV2Payback');

            const sdkEncoded = new sdk.actions.liquityV2.LiquityV2PaybackAction(
                market,
                from,
                troveId,
                amount,
            ).encodeForDsProxyCall()[1];

            const foundryEncoded = LiquityV2Payback.interface.encodeFunctionData(
                'executeActionDirect',
                [await liquityV2Encode.payback(market, from, troveId, amount)],
            );
            expect(sdkEncoded).to.be.eq(foundryEncoded);
        });
        it('Test liquityV2SupplyEncode', async () => {
            const LiquityV2Supply = await hre.ethers.getContractFactory('LiquityV2Supply');

            const sdkEncoded = new sdk.actions.liquityV2.LiquityV2SupplyAction(
                market,
                from,
                nullAddress,
                troveId,
                amount,
            ).encodeForDsProxyCall()[1];

            const foundryEncoded = LiquityV2Supply.interface.encodeFunctionData(
                'executeActionDirect',
                [await liquityV2Encode.supply(market, from, troveId, amount)],
            );
            expect(sdkEncoded).to.be.eq(foundryEncoded);
        });
        it('Test liquityV2WithdrawEncode', async () => {
            const LiquityV2Withdraw = await hre.ethers.getContractFactory('LiquityV2Withdraw');

            const sdkEncoded = new sdk.actions.liquityV2.LiquityV2WithdrawAction(
                market,
                to,
                troveId,
                amount,
            ).encodeForDsProxyCall()[1];

            const foundryEncoded = LiquityV2Withdraw.interface.encodeFunctionData(
                'executeActionDirect',
                [await liquityV2Encode.withdraw(market, to, troveId, amount)],
            );
            expect(sdkEncoded).to.be.eq(foundryEncoded);
        });
        it('Test liquityV2SPClaimCollEncode', async () => {
            const LiquityV2SPClaimColl =
                await hre.ethers.getContractFactory('LiquityV2SPClaimColl');

            const sdkEncoded = new sdk.actions.liquityV2.LiquityV2SPClaimCollAction(
                market,
                to,
            ).encodeForDsProxyCall()[1];

            const foundryEncoded = LiquityV2SPClaimColl.interface.encodeFunctionData(
                'executeActionDirect',
                [await liquityV2Encode.spClaimColl(market, to)],
            );
            expect(sdkEncoded).to.be.eq(foundryEncoded);
        });
        it('Test liquityV2SPDepositEncode', async () => {
            const LiquityV2SPDeposit = await hre.ethers.getContractFactory('LiquityV2SPDeposit');

            const sdkEncoded = new sdk.actions.liquityV2.LiquityV2SPDepositAction(
                market,
                from,
                boldGainTo,
                collGainTo,
                amount,
                doClaim,
            ).encodeForDsProxyCall()[1];

            const foundryEncoded = LiquityV2SPDeposit.interface.encodeFunctionData(
                'executeActionDirect',
                [
                    await liquityV2Encode.spDeposit(
                        market,
                        from,
                        boldGainTo,
                        collGainTo,
                        amount,
                        doClaim,
                    ),
                ],
            );
            expect(sdkEncoded).to.be.eq(foundryEncoded);
        });
        it('Test liquityV2SPWithdrawEncode', async () => {
            const LiquityV2SPWithdraw = await hre.ethers.getContractFactory('LiquityV2SPWithdraw');

            const sdkEncoded = new sdk.actions.liquityV2.LiquityV2SPWithdrawAction(
                market,
                boldGainTo,
                collGainTo,
                amount,
                doClaim,
            ).encodeForDsProxyCall()[1];

            const foundryEncoded = LiquityV2SPWithdraw.interface.encodeFunctionData(
                'executeActionDirect',
                [await liquityV2Encode.spWithdraw(market, boldGainTo, collGainTo, amount, doClaim)],
            );
            expect(sdkEncoded).to.be.eq(foundryEncoded);
        });
    });

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
        let fluidEncode;

        before(async () => {
            fluidEncode = await deploy('FluidEncode');
        });
        it('Test fluidVaultT1OpenEncode', async () => {
            const FluidVaultT1Open = await hre.ethers.getContractFactory('FluidVaultT1Open');
            const sdkEncoded = new sdk.actions.fluid.FluidVaultT1OpenAction(
                vault,
                collAmount,
                debtAmount,
                from,
                to,
                shouldWrap,
            ).encodeForDsProxyCall()[1];
            const foundryEncoded = FluidVaultT1Open.interface.encodeFunctionData(
                'executeActionDirect',
                [
                    await fluidEncode.vaultT1Open(
                        vault,
                        collAmount,
                        debtAmount,
                        from,
                        to,
                        shouldWrap,
                    ),
                ],
            );
            expect(sdkEncoded).to.be.eq(foundryEncoded);
        });
        it('Test fluidVaultT1AdjustEncode', async () => {
            const FluidVaultT1Adjust = await hre.ethers.getContractFactory('FluidVaultT1Adjust');
            const sdkEncoded = new sdk.actions.fluid.FluidVaultT1AdjustAction(
                vault,
                nftId,
                collAmount,
                debtAmount,
                from,
                to,
                shouldWrap,
                collAction,
                debtAction,
            ).encodeForDsProxyCall()[1];
            const foundryEncoded = FluidVaultT1Adjust.interface.encodeFunctionData(
                'executeActionDirect',
                [
                    await fluidEncode.vaultT1Adjust(
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
                ],
            );
            expect(sdkEncoded).to.be.eq(foundryEncoded);
        });
        it('Test fluidVaultT1PaybackEncode', async () => {
            const FluidVaultT1Payback = await hre.ethers.getContractFactory('FluidVaultT1Payback');
            const sdkEncoded = new sdk.actions.fluid.FluidVaultT1PaybackAction(
                vault,
                nftId,
                debtAmount,
                from,
            ).encodeForDsProxyCall()[1];
            const foundryEncoded = FluidVaultT1Payback.interface.encodeFunctionData(
                'executeActionDirect',
                [await fluidEncode.vaultT1Payback(vault, nftId, debtAmount, from)],
            );
            expect(sdkEncoded).to.be.eq(foundryEncoded);
        });
        it('Test fluidVaultT1WithdrawEncode', async () => {
            const FluidVaultT1Withdraw =
                await hre.ethers.getContractFactory('FluidVaultT1Withdraw');
            const sdkEncoded = new sdk.actions.fluid.FluidVaultT1WithdrawAction(
                vault,
                nftId,
                collAmount,
                to,
                shouldWrap,
            ).encodeForDsProxyCall()[1];
            const foundryEncoded = FluidVaultT1Withdraw.interface.encodeFunctionData(
                'executeActionDirect',
                [await fluidEncode.vaultT1Withdraw(vault, nftId, collAmount, to, shouldWrap)],
            );
            expect(sdkEncoded).to.be.eq(foundryEncoded);
        });
        it('Test fluidVaultT1SupplyEncode', async () => {
            const FluidVaultT1Supply = await hre.ethers.getContractFactory('FluidVaultT1Supply');
            const sdkEncoded = new sdk.actions.fluid.FluidVaultT1SupplyAction(
                vault,
                nftId,
                collAmount,
                from,
            ).encodeForDsProxyCall()[1];
            const foundryEncoded = FluidVaultT1Supply.interface.encodeFunctionData(
                'executeActionDirect',
                [await fluidEncode.vaultT1Supply(vault, nftId, collAmount, from)],
            );
            expect(sdkEncoded).to.be.eq(foundryEncoded);
        });
        it('Test fluidVaultT1BorrowEncode', async () => {
            const FluidVaultT1Borrow = await hre.ethers.getContractFactory('FluidVaultT1Borrow');
            const sdkEncoded = new sdk.actions.fluid.FluidVaultT1BorrowAction(
                vault,
                nftId,
                debtAmount,
                to,
                shouldWrap,
            ).encodeForDsProxyCall()[1];
            const foundryEncoded = FluidVaultT1Borrow.interface.encodeFunctionData(
                'executeActionDirect',
                [await fluidEncode.vaultT1Borrow(vault, nftId, debtAmount, to, shouldWrap)],
            );
            expect(sdkEncoded).to.be.eq(foundryEncoded);
        });
    });

    describe('Umbrella', () => {
        const stkToken = '0xaAFD07D53A7365D3e9fb6F3a3B09EC19676B73Ce';
        const amount = 10000;
        const useATokens = true;
        const minSharesOut = 10000;

        let aaveV3Encode;

        before(async () => {
            aaveV3Encode = await deploy('AaveV3Encode');
        });

        it('Test umbrellaStakeEncode', async () => {
            const [from, to] = await hre.ethers.getSigners();
            const UmbrellaStake = await hre.ethers.getContractFactory('UmbrellaStake');
            const sdkEncoded = new sdk.actions.umbrella.UmbrellaStakeAction(
                stkToken,
                from.address,
                to.address,
                amount,
                useATokens,
                minSharesOut,
            ).encodeForDsProxyCall()[1];

            const foundryEncoded = UmbrellaStake.interface.encodeFunctionData(
                'executeActionDirect',
                [
                    await aaveV3Encode.umbrellaStake(
                        stkToken,
                        from.address,
                        to.address,
                        amount,
                        useATokens,
                        minSharesOut,
                    ),
                ],
            );
            expect(sdkEncoded).to.be.eq(foundryEncoded);
        });
        it('Test umbrellaUnstakeEncode', async () => {
            const [to] = await hre.ethers.getSigners();
            const UmbrellaUnstake = await hre.ethers.getContractFactory('UmbrellaUnstake');
            const sdkEncoded = new sdk.actions.umbrella.UmbrellaFinalizeUnstakeAction(
                stkToken,
                to.address,
                amount,
                useATokens,
                minSharesOut,
            ).encodeForDsProxyCall()[1];

            const foundryEncoded = UmbrellaUnstake.interface.encodeFunctionData(
                'executeActionDirect',
                [
                    await aaveV3Encode.umbrellaUnstake(
                        stkToken,
                        to.address,
                        amount,
                        useATokens,
                        minSharesOut,
                    ),
                ],
            );
            expect(sdkEncoded).to.be.eq(foundryEncoded);
        });
        it('Test umbrellaStartCooldownEncode', async () => {
            const UmbrellaUnstake = await hre.ethers.getContractFactory('UmbrellaUnstake');
            const sdkEncoded = new sdk.actions.umbrella.UmbrellaStartUnstakeAction(
                stkToken,
            ).encodeForDsProxyCall()[1];

            const foundryEncoded = UmbrellaUnstake.interface.encodeFunctionData(
                'executeActionDirect',
                [
                    await aaveV3Encode.umbrellaUnstake(
                        stkToken,
                        hre.ethers.constants.AddressZero,
                        0,
                        false,
                        0,
                    ),
                ],
            );
            expect(sdkEncoded).to.be.eq(foundryEncoded);
        });
    });

    describe('AaveV4', () => {
        let aaveV4Encode;
        const spoke = '0x0000000000000000000000000000000000000001';
        const onBehalf = '0x0000000000000000000000000000000000000002';
        const from = '0x0000000000000000000000000000000000000003';
        const to = '0x0000000000000000000000000000000000000004';
        const tokenAddress = '0x0000000000000000000000000000000000000005';
        const reserveId = 1;
        const amount = 10000;
        const useAsCollateral = true;

        before(async () => {
            aaveV4Encode = await deploy('AaveV4Encode');
        });

        it('Test aaveV4SupplyEncode', async () => {
            const AaveV4Supply = await hre.ethers.getContractFactory('AaveV4Supply');
            const sdkEncoded = new sdk.actions.aaveV4.AaveV4SupplyAction(
                spoke,
                onBehalf,
                from,
                reserveId,
                amount,
                useAsCollateral,
                tokenAddress,
            ).encodeForDsProxyCall()[1];

            const foundryEncoded = AaveV4Supply.interface.encodeFunctionData(
                'executeActionDirect',
                [
                    await aaveV4Encode.supply(
                        spoke,
                        onBehalf,
                        from,
                        reserveId,
                        amount,
                        useAsCollateral,
                    ),
                ],
            );
            expect(sdkEncoded).to.be.eq(foundryEncoded);
        });

        it('Test aaveV4WithdrawEncode', async () => {
            const AaveV4Withdraw = await hre.ethers.getContractFactory('AaveV4Withdraw');
            const sdkEncoded = new sdk.actions.aaveV4.AaveV4WithdrawAction(
                spoke,
                onBehalf,
                to,
                reserveId,
                amount,
            ).encodeForDsProxyCall()[1];

            const foundryEncoded = AaveV4Withdraw.interface.encodeFunctionData(
                'executeActionDirect',
                [await aaveV4Encode.withdraw(spoke, onBehalf, to, reserveId, amount)],
            );
            expect(sdkEncoded).to.be.eq(foundryEncoded);
        });

        it('Test aaveV4BorrowEncode', async () => {
            const AaveV4Borrow = await hre.ethers.getContractFactory('AaveV4Borrow');
            const sdkEncoded = new sdk.actions.aaveV4.AaveV4BorrowAction(
                spoke,
                onBehalf,
                to,
                reserveId,
                amount,
            ).encodeForDsProxyCall()[1];

            const foundryEncoded = AaveV4Borrow.interface.encodeFunctionData(
                'executeActionDirect',
                [await aaveV4Encode.borrow(spoke, onBehalf, to, reserveId, amount)],
            );
            expect(sdkEncoded).to.be.eq(foundryEncoded);
        });

        it('Test aaveV4PaybackEncode', async () => {
            const AaveV4Payback = await hre.ethers.getContractFactory('AaveV4Payback');
            const sdkEncoded = new sdk.actions.aaveV4.AaveV4PaybackAction(
                spoke,
                onBehalf,
                from,
                reserveId,
                amount,
                tokenAddress,
            ).encodeForDsProxyCall()[1];

            const foundryEncoded = AaveV4Payback.interface.encodeFunctionData(
                'executeActionDirect',
                [await aaveV4Encode.payback(spoke, onBehalf, from, reserveId, amount)],
            );
            expect(sdkEncoded).to.be.eq(foundryEncoded);
        });

        it('Test aaveV4CollateralSwitchEncode', async () => {
            const AaveV4CollateralSwitch =
                await hre.ethers.getContractFactory('AaveV4CollateralSwitch');
            const sdkEncoded = new sdk.actions.aaveV4.AaveV4CollateralSwitchAction(
                spoke,
                onBehalf,
                reserveId,
                useAsCollateral,
            ).encodeForDsProxyCall()[1];

            const foundryEncoded = AaveV4CollateralSwitch.interface.encodeFunctionData(
                'executeActionDirect',
                [await aaveV4Encode.collateralSwitch(spoke, onBehalf, reserveId, useAsCollateral)],
            );
            expect(sdkEncoded).to.be.eq(foundryEncoded);
        });

        it('Test aaveV4StoreRatioEncode', async () => {
            const user = '0x0000000000000000000000000000000000000006';
            const AaveV4StoreRatio = await hre.ethers.getContractFactory('AaveV4StoreRatio');
            const sdkEncoded = new sdk.actions.aaveV4.AaveV4StoreRatioAction(
                spoke,
                user,
            ).encodeForDsProxyCall()[1];

            const foundryEncoded = AaveV4StoreRatio.interface.encodeFunctionData(
                'executeActionDirect',
                [await aaveV4Encode.storeRatio(spoke, user)],
            );
            expect(sdkEncoded).to.be.eq(foundryEncoded);
        });

        it('Test aaveV4RefreshPremiumEncode', async () => {
            const refreshDynamicReserveConfig = true;
            const AaveV4RefreshPremium =
                await hre.ethers.getContractFactory('AaveV4RefreshPremium');
            const sdkEncoded = new sdk.actions.aaveV4.AaveV4RefreshPremiumAction(
                spoke,
                onBehalf,
                refreshDynamicReserveConfig,
            ).encodeForDsProxyCall()[1];

            const foundryEncoded = AaveV4RefreshPremium.interface.encodeFunctionData(
                'executeActionDirect',
                [await aaveV4Encode.refreshPremium(spoke, onBehalf, refreshDynamicReserveConfig)],
            );
            expect(sdkEncoded).to.be.eq(foundryEncoded);
        });

        it('Test aaveV4SetUserManagersWithSigEncode', async () => {
            const nonce = 7;
            const deadline = 1234567890;
            const signature = '0xdeadbeef';
            const updates = [
                ['0x0000000000000000000000000000000000000011', true],
                ['0x0000000000000000000000000000000000000012', false],
            ];
            const AaveV4SetUserManagersWithSig = await hre.ethers.getContractFactory(
                'AaveV4SetUserManagersWithSig',
            );
            const sdkEncoded = new sdk.actions.aaveV4.AaveV4SetUserManagersWithSigAction(
                spoke,
                onBehalf,
                nonce,
                deadline,
                signature,
                updates,
            ).encodeForDsProxyCall()[1];
            const abiCoder = new hre.ethers.utils.AbiCoder();
            const encodedParams = abiCoder.encode(
                [
                    'tuple(address spoke,address onBehalf,uint256 nonce,uint256 deadline,bytes signature,tuple(address positionManager,bool approve)[] updates)',
                ],
                [
                    {
                        spoke,
                        onBehalf,
                        nonce,
                        deadline,
                        signature,
                        updates: updates.map(([positionManager, approve]) => ({
                            positionManager,
                            approve,
                        })),
                    },
                ],
            );

            const foundryEncoded = AaveV4SetUserManagersWithSig.interface.encodeFunctionData(
                'executeActionDirect',
                [encodedParams],
            );
            expect(sdkEncoded).to.be.eq(foundryEncoded);
        });

        it('Test aaveV4DelegateBorrowWithSigEncode', async () => {
            const owner = '0x0000000000000000000000000000000000000021';
            const spender = '0x0000000000000000000000000000000000000022';
            const nonce = 3;
            const deadline = 999999;
            const signature = '0xdeadbeef';
            const permit = [spoke, reserveId, owner, spender, amount, nonce, deadline];

            const AaveV4DelegateBorrowWithSig = await hre.ethers.getContractFactory(
                'AaveV4DelegateBorrowWithSig',
            );
            const sdkEncoded = new sdk.actions.aaveV4.AaveV4DelegateBorrowWithSigAction(
                permit,
                signature,
            ).encodeForDsProxyCall()[1];
            const abiCoder = new hre.ethers.utils.AbiCoder();
            const encodedParams = abiCoder.encode(
                [
                    'tuple(tuple(address spoke,uint256 reserveId,address owner,address spender,uint256 amount,uint256 nonce,uint256 deadline) permit,bytes signature)',
                ],
                [
                    {
                        permit: {
                            spoke,
                            reserveId,
                            owner,
                            spender,
                            amount,
                            nonce,
                            deadline,
                        },
                        signature,
                    },
                ],
            );

            const foundryEncoded = AaveV4DelegateBorrowWithSig.interface.encodeFunctionData(
                'executeActionDirect',
                [encodedParams],
            );
            expect(sdkEncoded).to.be.eq(foundryEncoded);
        });

        it('Test aaveV4DelegateWithdrawWithSigEncode', async () => {
            const owner = '0x0000000000000000000000000000000000000031';
            const spender = '0x0000000000000000000000000000000000000032';
            const nonce = 5;
            const deadline = 1111111;
            const signature = '0xbeefdead';
            const permit = [spoke, reserveId, owner, spender, amount, nonce, deadline];

            const AaveV4DelegateWithdrawWithSig = await hre.ethers.getContractFactory(
                'AaveV4DelegateWithdrawWithSig',
            );
            const sdkEncoded = new sdk.actions.aaveV4.AaveV4DelegateWithdrawWithSigAction(
                permit,
                signature,
            ).encodeForDsProxyCall()[1];
            const abiCoder = new hre.ethers.utils.AbiCoder();
            const encodedParams = abiCoder.encode(
                [
                    'tuple(tuple(address spoke,uint256 reserveId,address owner,address spender,uint256 amount,uint256 nonce,uint256 deadline) permit,bytes signature)',
                ],
                [
                    {
                        permit: {
                            spoke,
                            reserveId,
                            owner,
                            spender,
                            amount,
                            nonce,
                            deadline,
                        },
                        signature,
                    },
                ],
            );

            const foundryEncoded = AaveV4DelegateWithdrawWithSig.interface.encodeFunctionData(
                'executeActionDirect',
                [encodedParams],
            );
            expect(sdkEncoded).to.be.eq(foundryEncoded);
        });

        it('Test aaveV4DelegateSetUsingAsCollateralWithSigEncode', async () => {
            const delegator = '0x0000000000000000000000000000000000000041';
            const delegatee = '0x0000000000000000000000000000000000000042';
            const permission = true;
            const nonce = 9;
            const deadline = 2222222;
            const signature = '0xcafebabe';
            const permit = [spoke, delegator, delegatee, permission, nonce, deadline];

            const AaveV4DelegateSetUsingAsCollateralWithSig = await hre.ethers.getContractFactory(
                'AaveV4DelegateSetUsingAsCollateralWithSig',
            );
            const sdkEncoded =
                new sdk.actions.aaveV4.AaveV4DelegateSetUsingAsCollateralWithSigAction(
                    permit,
                    signature,
                ).encodeForDsProxyCall()[1];
            const abiCoder = new hre.ethers.utils.AbiCoder();
            const encodedParams = abiCoder.encode(
                [
                    'tuple(tuple(address spoke,address delegator,address delegatee,bool permission,uint256 nonce,uint256 deadline) permit,bytes signature)',
                ],
                [
                    {
                        permit: {
                            spoke,
                            delegator,
                            delegatee,
                            permission,
                            nonce,
                            deadline,
                        },
                        signature,
                    },
                ],
            );

            const foundryEncoded =
                AaveV4DelegateSetUsingAsCollateralWithSig.interface.encodeFunctionData(
                    'executeActionDirect',
                    [encodedParams],
                );
            expect(sdkEncoded).to.be.eq(foundryEncoded);
        });
    });
});
