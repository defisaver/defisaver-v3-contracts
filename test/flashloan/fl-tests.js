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
    Float2BN,
    addrs,
} = require('../utils');

const { sell, executeAction } = require('../actions');

const AAVE_NO_DEBT_MODE = 0;
const aaveFlTest = async (generalisedFLFlag) => {
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
                if (generalisedFLFlag) {
                    const flActionAddr = await getAddrFromRegistry('FLAction');
                    console.log(flActionAddr);
                    aaveFl = await hre.ethers.getContractAt('FLAction', flActionAddr);
                }
                const assetInfo = getAssetInfo(tokenSymbol);

                if (assetInfo.symbol === 'ETH') {
                    assetInfo.address = WETH_ADDRESS;
                }

                // test if balance will brick fl action
                await setBalance(assetInfo.address, aaveFl.address, Float2BN('1', 0));

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
                let flAction = new dfs.actions.flashloan.AaveV2FlashLoanAction(
                    [loanAmount],
                    [assetInfo.address],
                    [AAVE_NO_DEBT_MODE],
                    nullAddress,
                    nullAddress,
                    [],
                );
                if (generalisedFLFlag) {
                    flAction = new dfs.actions.flashloan.FLAction(
                        flAction,
                    );
                }
                const basicFLRecipe = new dfs.Recipe('BasicFLRecipe', [
                    flAction,
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
                await executeAction('RecipeExecutor', functionData[1], proxy);
            });
        }
    });
};
const balancerFLTest = async (generalisedFLFlag) => {
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
        const network = hre.network.config.name;
        const amountUSDC = hre.ethers.utils.parseUnits(
            '100',
            6,
        );
        const amountWeth = hre.ethers.utils.parseUnits(
            '1',
            18,
        );
        const amountDai = hre.ethers.utils.parseUnits(
            '100',
            18,
        );
        const wethAddr = addrs[network].WETH_ADDRESS;
        const usdcAddr = addrs[network].USDC_ADDR;
        const daiAddr = addrs[network].DAI_ADDRESS;

        // This must be sorted for FL to work
        const tokenAddrs = [
            wethAddr,
            usdcAddr,
            daiAddr,
        ].sort();

        const map = new Map(
            [
                [wethAddr, amountWeth],
                [usdcAddr, amountUSDC],
                [daiAddr, amountDai],
            ],
        );
        const amounts = [map.get(tokenAddrs[0]), map.get(tokenAddrs[1]), map.get(tokenAddrs[2])];

        console.log(tokenAddrs);
        console.log(amounts);
        it('... should get a WETH and DAI Balancer flash loan', async () => {
            if (generalisedFLFlag) {
                const flActionAddr = await getAddrFromRegistry('FLAction');
                console.log(flActionAddr);
                flBalancer = await hre.ethers.getContractAt('FLAction', flActionAddr);
            }
            // test if balance will brick fl action
            await setBalance(tokenAddrs[0], flBalancer.address, Float2BN('1', 0));
            await setBalance(tokenAddrs[1], flBalancer.address, Float2BN('1', 0));
            await setBalance(tokenAddrs[2], flBalancer.address, Float2BN('1', 0));

            let flAction = new dfs.actions.flashloan.BalancerFlashLoanAction(
                tokenAddrs,
                amounts,
                nullAddress,
                [],
            );

            if (generalisedFLFlag) {
                flAction = new dfs.actions.flashloan.FLAction(
                    flAction,
                );
            }

            const basicFLRecipe = new dfs.Recipe('BasicFLRecipe', [
                flAction,
                new dfs.actions.basic.SendTokenAction(
                    tokenAddrs[0],
                    flBalancer.address,
                    amounts[0],
                ),
                new dfs.actions.basic.SendTokenAction(
                    tokenAddrs[1],
                    flBalancer.address,
                    amounts[1],
                ),
                new dfs.actions.basic.SendTokenAction(
                    tokenAddrs[2],
                    flBalancer.address,
                    amounts[2],
                ),
            ]);

            const functionData = basicFLRecipe.encodeForDsProxyCall();

            await executeAction('RecipeExecutor', functionData[1], proxy);
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

                // test if balance will brick fl action
                await setBalance(assetInfo.address, dydxFl.address, Float2BN('1', 0));

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

                await executeAction('RecipeExecutor', functionData[1], proxy);
            });
        }
    });
};
const makerFLTest = async (generalisedFLFlag) => {
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
            if (generalisedFLFlag) {
                const flActionAddr = await getAddrFromRegistry('FLAction');
                console.log(flActionAddr);
                flMaker = await hre.ethers.getContractAt('FLAction', flActionAddr);
            }
            const assetInfo = getAssetInfo(tokenSymbol);

            // test if balance will brick fl action
            await setBalance(assetInfo.address, flMaker.address, Float2BN('1', 0));

            const amount = fetchAmountinUSDPrice(tokenSymbol, '1000');
            const loanAmount = hre.ethers.utils.parseUnits(
                amount,
                assetInfo.decimals,
            );
            const feeAmount = '0';
            let flAction = new dfs.actions.flashloan.MakerFlashLoanAction(
                loanAmount,
                nullAddress,
                [],
            );
            console.log(flAction.args);
            if (generalisedFLFlag) {
                flAction = new dfs.actions.flashloan.FLAction(
                    flAction,
                );
            }

            const basicFLRecipe = new dfs.Recipe('BasicFLRecipe', [
                flAction,
                new dfs.actions.basic.SendTokenAction(
                    assetInfo.address,
                    flMaker.address,
                    loanAmount,
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

            await executeAction('RecipeExecutor', functionData[1], proxy);
        });
    });
};

const eulerFLTest = async (generalisedFLFlag) => {
    describe('FL-Euler', function () {
        this.timeout(60000);

        let senderAcc; let proxy;
        let flEuler;

        before(async () => {
            const flEulerAddr = await getAddrFromRegistry('FLEuler');
            console.log(flEulerAddr);
            flEuler = await hre.ethers.getContractAt('FLEuler', flEulerAddr);

            senderAcc = (await hre.ethers.getSigners())[0];
            proxy = await getProxy(senderAcc.address);
        });

        const tokenSymbols = ['DAI', 'USDC', 'WETH', 'WBTC', 'USDT', 'UNI', 'LINK'];

        for (let i = 0; i < tokenSymbols.length; i++) {
            it(`... should get a ${tokenSymbols[i]} Euler flash loan`, async () => {
                const assetInfo = getAssetInfo(tokenSymbols[i]);

                const amount = fetchAmountinUSDPrice(tokenSymbols[i], '1000');
                const loanAmount = hre.ethers.utils.parseUnits(
                    amount,
                    assetInfo.decimals,
                );

                let flAction = new dfs.actions.flashloan.EulerFlashLoanAction(
                    assetInfo.address,
                    loanAmount,
                    nullAddress,
                    [],
                );
                if (generalisedFLFlag) {
                    flAction = new dfs.actions.flashloan.FLAction(
                        flAction,
                    );
                    const flActionAddr = await getAddrFromRegistry('FLAction');
                    console.log(flActionAddr);
                    flEuler = await hre.ethers.getContractAt('FLAction', flActionAddr);
                }

                const basicFLRecipe = new dfs.Recipe('BasicFLRecipe', [
                    flAction,
                    new dfs.actions.basic.SendTokenAction(
                        assetInfo.address,
                        flEuler.address,
                        hre.ethers.constants.MaxUint256,
                    ),
                ]);

                const functionData = basicFLRecipe.encodeForDsProxyCall();
                await executeAction('RecipeExecutor', functionData[1], proxy);
            });
        }
    });
};

const deployFLContracts = async () => {
    await redeploy('FLMaker');
    await redeploy('SendToken');
    await redeploy('RecipeExecutor');
    await redeploy('FLDyDx');
    await redeploy('FLBalancer');
    await redeploy('FLAaveV2');
    await redeploy('FLEuler');
};

const fullFLTest = async () => {
    await deployFLContracts();
    await aaveFlTest();
    await balancerFLTest();
    await dydxFLTest();
    await makerFLTest();
    await eulerFLTest();
};
module.exports = {
    fullFLTest,
    aaveFlTest,
    balancerFLTest,
    dydxFLTest,
    makerFLTest,
    eulerFLTest,
};
