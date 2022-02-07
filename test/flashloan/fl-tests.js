/* eslint-disable no-mixed-operators */
const { getAssetInfo } = require('@defisaver/tokens');
const hre = require('hardhat');
const Dec = require('decimal.js');

const dfs = require('@defisaver/sdk');

const {
    getAddrFromRegistry,
    getProxy,
    redeploy,
    send,
    approve,
    balanceOf,
    depositToWeth,
    nullAddress,
    UNISWAP_WRAPPER,
    AAVE_FL_FEE,
    WETH_ADDRESS,
    fetchAmountinUSDPrice,
    setBalance,
} = require('../utils');

const { sell, executeAction } = require('../actions');

const AAVE_NO_DEBT_MODE = 0;
const aaveFlTest = async () => {
    describe('FL-AaveV2', function () {
        this.timeout(60000);

        let senderAcc; let proxy; let
            aaveFl;

        const FLASHLOAN_TOKENS = ['WETH', 'DAI', 'USDC', 'WBTC', 'USDT', 'YFI', 'LINK', 'MKR'];

        before(async () => {
            const flAaveAddr = await getAddrFromRegistry('FLAaveV2');
            aaveFl = await hre.ethers.getContractAt('FLAaveV2', flAaveAddr);

            senderAcc = (await hre.ethers.getSigners())[0];
            proxy = await getProxy(senderAcc.address);
        });

        for (let i = 0; i < FLASHLOAN_TOKENS.length; ++i) {
            const tokenSymbol = FLASHLOAN_TOKENS[i];

            it(`... should get an ${tokenSymbol} AaveV2 flash loan`, async () => {
                const assetInfo = getAssetInfo(tokenSymbol);

                if (assetInfo.symbol === 'ETH') {
                    assetInfo.address = WETH_ADDRESS;
                }
                const amount = fetchAmountinUSDPrice(tokenSymbol, '5000');
                const loanAmount = hre.ethers.utils.parseUnits(
                    amount,
                    assetInfo.decimals,
                );
                const feeAmount = new Dec(amount)
                    .mul(AAVE_FL_FEE)
                    .mul(10 ** assetInfo.decimals)
                    .div(100)
                    .toFixed(0)
                    .toString();

                console.log(loanAmount.toString(), feeAmount.toString());

                await approve(assetInfo.address, proxy.address);
                const basicFLRecipe = new dfs.Recipe('BasicFLRecipe', [
                    new dfs.actions.flashloan.AaveV2FlashLoanAction(
                        [loanAmount],
                        [assetInfo.address],
                        [AAVE_NO_DEBT_MODE],
                        nullAddress,
                        nullAddress,
                        [],
                    ),
                    new dfs.actions.basic.SendTokenAction(
                        assetInfo.address,
                        aaveFl.address,
                        hre.ethers.constants.MaxUint256,
                    ),
                ]);

                const functionData = basicFLRecipe.encodeForDsProxyCall();

                if (tokenSymbol === 'WETH') {
                    await depositToWeth(feeAmount);
                } else {
                    // buy token so we have it for fee
                    const tokenBalance = await balanceOf(assetInfo.address, senderAcc.address);

                    if (tokenBalance.lt(feeAmount)) {
                        await setBalance(
                            assetInfo.address,
                            senderAcc.address,
                            hre.ethers.utils.parseUnits(feeAmount, 1),
                        );
                    }
                }
                await setBalance(assetInfo.address, proxy.address, hre.ethers.utils.parseUnits('0', 18));
                await send(assetInfo.address, proxy.address, feeAmount);
                await executeAction('TaskExecutor', functionData[1], proxy);
            });
        }
    });
};
const balancerFLTest = async () => {
    describe('FL-Balancer', function () {
        this.timeout(60000);

        let senderAcc; let proxy;
        let flBalancer;

        before(async () => {
            const flBalancerAddr = await getAddrFromRegistry('FLBalancer');
            flBalancer = await hre.ethers.getContractAt('FLBalancer', flBalancerAddr);

            senderAcc = (await hre.ethers.getSigners())[0];
            proxy = await getProxy(senderAcc.address);
        });

        const tokenSymbols = ['WETH', 'WBTC'].sort();

        it(`... should get a ${tokenSymbols} Balancer flash loan`, async () => {
            const assetInfo = tokenSymbols.map((e) => getAssetInfo(e));
            const tokenAddrs = assetInfo.map((e) => e.address);
            const amounts = tokenSymbols.map((e) => fetchAmountinUSDPrice(e, '1000'));
            const loanAmounts = tokenSymbols.map((e, i) => hre.ethers.utils.parseUnits(
                amounts[i],
                assetInfo[i].decimals,
            ));

            const basicFLRecipe = new dfs.Recipe('BasicFLRecipe', [
                new dfs.actions.flashloan.BalancerFlashLoanAction(
                    tokenAddrs,
                    loanAmounts,
                    nullAddress,
                    [],
                ),
                new dfs.actions.basic.SendTokenAction(
                    tokenAddrs[0],
                    flBalancer.address,
                    hre.ethers.constants.MaxUint256,
                ),
                new dfs.actions.basic.SendTokenAction(
                    tokenAddrs[1],
                    flBalancer.address,
                    hre.ethers.constants.MaxUint256,
                ),
            ]);

            const functionData = basicFLRecipe.encodeForDsProxyCall();

            await executeAction('TaskExecutor', functionData[1], proxy);
        });
    });
};
const dydxFLTest = async () => {
    describe('FL-DyDx', function () {
        this.timeout(60000);

        let senderAcc; let proxy; let
            dydxFl;

        const FLASHLOAN_TOKENS = ['WETH', 'DAI', 'USDC'];

        before(async () => {
            const flDydxAddr = await getAddrFromRegistry('FLDyDx');
            dydxFl = await hre.ethers.getContractAt('FLDyDx', flDydxAddr);
            senderAcc = (await hre.ethers.getSigners())[0];
            proxy = await getProxy(senderAcc.address);
        });

        for (let i = 0; i < FLASHLOAN_TOKENS.length; ++i) {
            const tokenSymbol = FLASHLOAN_TOKENS[i];

            it(`... should get an ${tokenSymbol} DyDx flash loan`, async () => {
                const assetInfo = getAssetInfo(tokenSymbol);

                if (assetInfo.symbol === 'ETH') {
                    assetInfo.address = WETH_ADDRESS;
                }

                const amount = fetchAmountinUSDPrice(tokenSymbol, '1000');
                const loanAmount = hre.ethers.utils.parseUnits(
                    amount,
                    assetInfo.decimals,
                );

                const basicFLRecipe = new dfs.Recipe('BasicFLRecipe', [
                    new dfs.actions.flashloan.DyDxFlashLoanAction(
                        loanAmount,
                        assetInfo.address,
                        nullAddress,
                        [],
                    ),
                    new dfs.actions.basic.SendTokenAction(
                        assetInfo.address,
                        dydxFl.address,
                        hre.ethers.constants.MaxUint256,
                    ),
                ]);

                const functionData = basicFLRecipe.encodeForDsProxyCall();

                await executeAction('TaskExecutor', functionData[1], proxy);
            });
        }
    });
};
const makerFLTest = async () => {
    describe('FL-Maker', function () {
        this.timeout(60000);

        let senderAcc; let proxy;
        let flMaker;

        before(async () => {
            const flMakerAddress = await getAddrFromRegistry('FLMaker');
            flMaker = await hre.ethers.getContractAt('FLMaker', flMakerAddress);

            senderAcc = (await hre.ethers.getSigners())[0];
            proxy = await getProxy(senderAcc.address);
        });

        const tokenSymbol = 'DAI';

        it(`... should get a ${tokenSymbol} Maker flash loan`, async () => {
            const assetInfo = getAssetInfo(tokenSymbol);

            const amount = fetchAmountinUSDPrice(tokenSymbol, '1000');
            const loanAmount = hre.ethers.utils.parseUnits(
                amount,
                assetInfo.decimals,
            );
            const feeAmount = '0';

            const basicFLRecipe = new dfs.Recipe('BasicFLRecipe', [
                new dfs.actions.flashloan.MakerFlashLoanAction(
                    loanAmount,
                    nullAddress,
                    [],
                ),
                new dfs.actions.basic.SendTokenAction(
                    assetInfo.address,
                    flMaker.address,
                    hre.ethers.constants.MaxUint256,
                ),
            ]);

            const functionData = basicFLRecipe.encodeForDsProxyCall();

            // buy token so we have it for fee
            const tokenBalance = await balanceOf(assetInfo.address, senderAcc.address);

            if (tokenBalance.lt(feeAmount)) {
                await sell(
                    proxy,
                    WETH_ADDRESS,
                    assetInfo.address,
                    hre.ethers.utils.parseUnits('1', 18),
                    UNISWAP_WRAPPER,
                    senderAcc.address,
                    senderAcc.address,
                );
            }

            await send(assetInfo.address, proxy.address, feeAmount);

            await executeAction('TaskExecutor', functionData[1], proxy);
        });
    });
};
const deployFLContracts = async () => {
    await redeploy('FLMaker');
    await redeploy('SendToken');
    await redeploy('TaskExecutor');
    await redeploy('FLDyDx');
    await redeploy('FLBalancer');
    await redeploy('FLAaveV2');
};

const fullFLTest = async () => {
    await deployFLContracts();
    await aaveFlTest();
    await balancerFLTest();
    await dydxFLTest();
    await makerFLTest();
};
module.exports = {
    fullFLTest,
    aaveFlTest,
    balancerFLTest,
    dydxFLTest,
    makerFLTest,
};
