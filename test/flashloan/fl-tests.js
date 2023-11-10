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
    AAVE_V3_FL_FEE,
    chainIds,
    getNetwork,
    getSparkFLFee,
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

                await approve(assetInfo.address, proxy.address);
                let flAction = new dfs.actions.flashloan.AaveV2FlashLoanAction(
                    [assetInfo.address],
                    [loanAmount],
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
                        '$1',
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

const aaveV3FlTest = async (generalisedFLFlag) => {
    describe('FL-AaveV3', function () {
        this.timeout(60000);

        let senderAcc; let proxy; let
            aaveFl;

        const FLASHLOAN_TOKENS = ['WETH', 'DAI', 'USDC', 'USDT'];

        before(async () => {
            const flAaveAddr = await getAddrFromRegistry('FLAaveV3WithFee');
            aaveFl = await hre.ethers.getContractAt('FLAaveV3', flAaveAddr);

            senderAcc = (await hre.ethers.getSigners())[0];
            proxy = await getProxy(senderAcc.address);
        });

        for (let i = 0; i < FLASHLOAN_TOKENS.length; ++i) {
            const tokenSymbol = FLASHLOAN_TOKENS[i];

            it(`... should get an ${tokenSymbol} AaveV3 flash loan`, async () => {
                if (generalisedFLFlag) {
                    const flActionAddr = await getAddrFromRegistry('FLAction');
                    aaveFl = await hre.ethers.getContractAt('FLAction', flActionAddr);
                }
                const network = hre.network.config.name;
                const assetInfo = getAssetInfo(tokenSymbol, chainIds[network]);

                // test if balance will brick fl action
                await setBalance(assetInfo.address, aaveFl.address, Float2BN('1', 0));

                const amount = fetchAmountinUSDPrice(tokenSymbol, '5000');
                const loanAmount = hre.ethers.utils.parseUnits(
                    amount,
                    assetInfo.decimals,
                );
                const feeAmount = new Dec(amount)
                    .mul(AAVE_V3_FL_FEE)
                    .mul(10 ** assetInfo.decimals)
                    .div(100)
                    .toFixed(0, 7)
                    .toString();

                await approve(assetInfo.address, proxy.address);
                let flAction = new dfs.actions.flashloan.AaveV3FlashLoanAction(
                    [assetInfo.address],
                    [loanAmount],
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
                            hre.ethers.utils.parseUnits(feeAmount, 0),
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

let SPARK_FL_FEE;
const sparkFlTest = async (generalisedFLFlag) => {
    describe('FL-Spark', function () {
        this.timeout(60000);

        let senderAcc; let proxy; let sparkFl;

        const FLASHLOAN_TOKENS = ['WETH', 'wstETH', 'rETH', 'DAI', 'sDAI'];

        before(async () => {
            const flSparkAddr = await getAddrFromRegistry('FLSpark');
            sparkFl = await hre.ethers.getContractAt('FLSpark', flSparkAddr);

            senderAcc = (await hre.ethers.getSigners())[0];
            proxy = await getProxy(senderAcc.address);

            SPARK_FL_FEE = await getSparkFLFee().then((f) => f.toString());
        });

        for (let i = 0; i < FLASHLOAN_TOKENS.length; ++i) {
            const tokenSymbol = FLASHLOAN_TOKENS[i];

            it(`... should get an ${tokenSymbol} Spark flash loan`, async () => {
                if (generalisedFLFlag) {
                    const flActionAddr = await getAddrFromRegistry('FLAction');
                    sparkFl = await hre.ethers.getContractAt('FLAction', flActionAddr);
                }

                const assetInfo = getAssetInfo(tokenSymbol, chainIds[getNetwork()]);

                // test if balance will brick fl action
                await setBalance(assetInfo.address, sparkFl.address, Float2BN('1', 0));

                let amount;
                if (tokenSymbol !== 'sDAI') {
                    amount = fetchAmountinUSDPrice(tokenSymbol, '2000'); // avoid no liquidity reverts
                } else {
                    const sdaiPrice = await hre.ethers
                        .getContractAt('IAggregatorV3', '0xb9E6DBFa4De19CCed908BcbFe1d015190678AB5f')
                        .then((c) => c.latestAnswer())
                        .then((price) => hre.ethers.utils.formatUnits(price, 8));
                        // chainlink price feed 8 decimals
                    amount = (5000 / sdaiPrice).toFixed();
                }

                const loanAmount = hre.ethers.utils.parseUnits(
                    amount,
                    assetInfo.decimals,
                );

                const feeAmount = new Dec(amount)
                    .mul(SPARK_FL_FEE)
                    .mul(10 ** assetInfo.decimals)
                    .div(100)
                    .toFixed(0, 7)
                    .toString();

                await approve(assetInfo.address, proxy.address);
                let flAction = new dfs.actions.flashloan.SparkFlashLoanAction(
                    [assetInfo.address],
                    [loanAmount],
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
                        sparkFl.address,
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
                            hre.ethers.utils.parseUnits(feeAmount, 0),
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

        it('... should get a WETH and DAI Balancer flash loan', async () => {
            if (generalisedFLFlag) {
                const flActionAddr = await getAddrFromRegistry('FLAction');
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
    describe.skip('FL-DyDx', function () {
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
    describe.skip('FL-Euler', function () {
        this.timeout(60000);

        let senderAcc; let proxy;
        let flEuler;

        before(async () => {
            const flEulerAddr = await getAddrFromRegistry('FLEuler');
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

const uniswapV3FlashloanTest = async (generalisedFLFlag) => {
    describe('FL-UniV3', function () {
        this.timeout(60000);

        let senderAcc; let proxy; let flUni;

        before(async () => {
            const flUniAddr = await getAddrFromRegistry('FLUniV3');
            flUni = await hre.ethers.getContractAt('FLUniV3', flUniAddr);

            senderAcc = (await hre.ethers.getSigners())[0];
            proxy = await getProxy(senderAcc.address);
        });

        const uniPoolInfo = [
            {
                token0: 'DAI', token1: 'USDC', pool: '0x5777d92f208679DB4b9778590Fa3CAB3aC9e2168',
            },
            {
                token0: 'WBTC', token1: 'WETH', pool: '0x4585FE77225b41b697C938B018E2Ac67Ac5a20c0',
            },
            {
                token0: 'USDC', token1: 'WETH', pool: '0x88e6A0c2dDD26FEEb64F039a2c41296FcB3f5640',
            },
        ];

        for (let i = 0; i < uniPoolInfo.length; i++) {
            it(`... should get a ${uniPoolInfo[i].token0} and ${uniPoolInfo[i].token1} UniV3 flash loan`, async () => {
                let flContract = flUni;

                if (generalisedFLFlag) {
                    const flActionAddr = await getAddrFromRegistry('FLAction');
                    flContract = await hre.ethers.getContractAt('FLAction', flActionAddr);
                }

                const assetInfo0 = getAssetInfo(uniPoolInfo[i].token0);
                const assetInfo1 = getAssetInfo(uniPoolInfo[i].token1);

                const amount0 = hre.ethers.utils.parseUnits('10', assetInfo0.decimals);
                const amount1 = hre.ethers.utils.parseUnits('10', assetInfo1.decimals);

                let flAction = new dfs.actions.flashloan.UniV3FlashLoanAction(
                    assetInfo0.address,
                    assetInfo1.address,
                    uniPoolInfo[i].pool,
                    amount0,
                    amount1,
                );
                if (generalisedFLFlag) {
                    flAction = new dfs.actions.flashloan.FLAction(
                        flAction,
                    );
                }

                const fees = await flUni.calculateFee(uniPoolInfo[i].pool, amount0, amount1);

                await setBalance(assetInfo0.address, proxy.address, fees.fee0);
                await setBalance(assetInfo1.address, proxy.address, fees.fee1);

                const basicFLRecipe = new dfs.Recipe('BasicFLRecipe', [
                    flAction,
                    new dfs.actions.basic.SendTokensAction(
                        [assetInfo0.address, assetInfo1.address],
                        [flContract.address, flContract.address],
                        [hre.ethers.constants.MaxUint256, hre.ethers.constants.MaxUint256],
                    ),
                ]);

                const functionData = basicFLRecipe.encodeForDsProxyCall();
                await executeAction('RecipeExecutor', functionData[1], proxy);
            });
            it(`... should get a ${uniPoolInfo[i].token0} only token (token0) from UniV3 flash loan`, async () => {
                let flContract = flUni;

                if (generalisedFLFlag) {
                    const flActionAddr = await getAddrFromRegistry('FLAction');
                    flContract = await hre.ethers.getContractAt('FLAction', flActionAddr);
                }

                const assetInfo0 = getAssetInfo(uniPoolInfo[i].token0);
                const assetInfo1 = getAssetInfo(uniPoolInfo[i].token1);

                const amount0 = hre.ethers.utils.parseUnits('10', assetInfo0.decimals);
                const amount1 = hre.ethers.utils.parseUnits('0', assetInfo1.decimals);

                let flAction = new dfs.actions.flashloan.UniV3FlashLoanAction(
                    assetInfo0.address,
                    assetInfo1.address,
                    uniPoolInfo[i].pool,
                    amount0,
                    amount1,
                );
                if (generalisedFLFlag) {
                    flAction = new dfs.actions.flashloan.FLAction(
                        flAction,
                    );
                }

                const fees = await flUni.calculateFee(uniPoolInfo[i].pool, amount0, amount1);

                await setBalance(assetInfo0.address, proxy.address, fees.fee0);

                const basicFLRecipe = new dfs.Recipe('BasicFLRecipe', [
                    flAction,
                    new dfs.actions.basic.SendTokensAction(
                        [assetInfo0.address, assetInfo1.address],
                        [flContract.address, flContract.address],
                        [hre.ethers.constants.MaxUint256, hre.ethers.constants.MaxUint256],
                    ),
                ]);

                const functionData = basicFLRecipe.encodeForDsProxyCall();
                await executeAction('RecipeExecutor', functionData[1], proxy);
            });
            it(`... should get a ${uniPoolInfo[i].token1} only token (token1) from UniV3 flash loan`, async () => {
                let flContract = flUni;

                if (generalisedFLFlag) {
                    const flActionAddr = await getAddrFromRegistry('FLAction');
                    flContract = await hre.ethers.getContractAt('FLAction', flActionAddr);
                }

                const assetInfo0 = getAssetInfo(uniPoolInfo[i].token0);
                const assetInfo1 = getAssetInfo(uniPoolInfo[i].token1);

                const amount0 = hre.ethers.utils.parseUnits('0', assetInfo0.decimals);
                const amount1 = hre.ethers.utils.parseUnits('10', assetInfo1.decimals);

                let flAction = new dfs.actions.flashloan.UniV3FlashLoanAction(
                    assetInfo0.address,
                    assetInfo1.address,
                    uniPoolInfo[i].pool,
                    amount0,
                    amount1,
                );
                if (generalisedFLFlag) {
                    flAction = new dfs.actions.flashloan.FLAction(
                        flAction,
                    );
                }

                const fees = await flUni.calculateFee(uniPoolInfo[i].pool, amount0, amount1);

                await setBalance(assetInfo1.address, proxy.address, fees.fee1);

                const basicFLRecipe = new dfs.Recipe('BasicFLRecipe', [
                    flAction,
                    new dfs.actions.basic.SendTokensAction(
                        [assetInfo0.address, assetInfo1.address],
                        [flContract.address, flContract.address],
                        [hre.ethers.constants.MaxUint256, hre.ethers.constants.MaxUint256],
                    ),
                ]);

                const functionData = basicFLRecipe.encodeForDsProxyCall();
                await executeAction('RecipeExecutor', functionData[1], proxy);
            });
        }
    });
};

const ghoFLTest = async (generalisedFLFlag) => {
    describe('FL-Gho', function () {
        this.timeout(60000);

        let senderAcc; let proxy;
        let flGho;

        before(async () => {
            const flGhoAddress = await getAddrFromRegistry('FLGho');
            flGho = await hre.ethers.getContractAt('FLGho', flGhoAddress);

            senderAcc = (await hre.ethers.getSigners())[0];
            proxy = await getProxy(senderAcc.address);
        });

        const tokenSymbol = 'GHO';

        it(`... should get a ${tokenSymbol} flash loan`, async () => {
            if (generalisedFLFlag) {
                const flActionAddr = await getAddrFromRegistry('FLAction');
                flGho = await hre.ethers.getContractAt('FLAction', flActionAddr);
            }
            const assetInfo = getAssetInfo(tokenSymbol);

            // test if balance will brick fl action
            await setBalance(assetInfo.address, flGho.address, Float2BN('1', 0));

            const amount = '10000';
            const loanAmount = hre.ethers.utils.parseUnits(
                amount,
                assetInfo.decimals,
            );
            let flAction = new dfs.actions.flashloan.GhoFlashLoanAction(
                loanAmount,
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
                    flGho.address,
                    loanAmount,
                ),
            ]);

            const functionData = basicFLRecipe.encodeForDsProxyCall();
            await executeAction('RecipeExecutor', functionData[1], proxy);
        });
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
    await redeploy('FLSpark');
    await redeploy('FLUniV3');
    await redeploy('FLGho');
};

const fullFLTest = async () => {
    await aaveFlTest();
    await aaveV3FlTest();
    await balancerFLTest();
    await makerFLTest();
    await sparkFlTest();
    await uniswapV3FlashloanTest();
    await ghoFLTest();

    await aaveFlTest(true);
    await aaveV3FlTest(true);
    await balancerFLTest(true);
    await makerFLTest(true);
    await sparkFlTest(true);
    await uniswapV3FlashloanTest(true);
    await ghoFLTest(true);
};

module.exports = {
    fullFLTest,
    aaveFlTest,
    balancerFLTest,
    dydxFLTest,
    makerFLTest,
    eulerFLTest,
    aaveV3FlTest,
    uniswapV3FlashloanTest,
    ghoFLTest,
    sparkFlTest,
    deployFLContracts,
};
