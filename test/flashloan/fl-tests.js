/* eslint-disable no-mixed-operators */
const { getAssetInfo } = require('@defisaver/tokens');
const hre = require('hardhat');
const Dec = require('decimal.js');

const dfs = require('@defisaver/sdk');

const {
    getProxy,
    send,
    approve,
    balanceOf,
    depositToWeth,
    redeploy,
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
    WALLETS,
    isWalletNameDsProxy,
} = require('../utils');

const { sell, executeAction } = require('../actions');

const aaveFlTest = async () => {
    describe('FL-AaveV2', function () {
        this.timeout(60000);

        let senderAcc;
        let proxy;
        let safe;
        let wallet;
        let flActionContract;
        const FLASHLOAN_TOKENS = ['WETH', 'DAI', 'USDC', 'WBTC', 'USDT', 'YFI', 'LINK', 'MKR'];

        before(async () => {
            await redeploy('RecipeExecutor');
            await redeploy('SendToken');
            flActionContract = await redeploy('FLAction');
            senderAcc = (await hre.ethers.getSigners())[0];
            proxy = await getProxy(senderAcc.address);
            safe = await getProxy(senderAcc.address, true);
        });

        const determineActiveWallet = (w) => { wallet = isWalletNameDsProxy(w) ? proxy : safe; };

        for (let i = 0; i < WALLETS.length; ++i) {
            for (let j = 0; j < FLASHLOAN_TOKENS.length; ++j) {
                const tokenSymbol = FLASHLOAN_TOKENS[j];

                it(`... should get an ${tokenSymbol} AaveV2 flash loan using ${WALLETS[i]}`, async () => {
                    determineActiveWallet(WALLETS[i]);
                    const assetInfo = getAssetInfo(tokenSymbol);

                    if (assetInfo.symbol === 'ETH') {
                        assetInfo.address = WETH_ADDRESS;
                    }

                    // test if balance will brick fl action
                    await setBalance(assetInfo.address, flActionContract.address, Float2BN('1', 0));

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

                    await approve(assetInfo.address, wallet.address);

                    const flAction = new dfs.actions.flashloan.FLAction(
                        new dfs.actions.flashloan.AaveV2FlashLoanAction(
                            [assetInfo.address],
                            [loanAmount],
                            [0],
                            nullAddress,
                            nullAddress,
                            [],
                        ),
                    );

                    const basicFLRecipe = new dfs.Recipe('BasicFLRecipe', [
                        flAction,
                        new dfs.actions.basic.SendTokenAction(
                            assetInfo.address,
                            flActionContract.address,
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
                    await setBalance(assetInfo.address, wallet.address, hre.ethers.utils.parseUnits('0', 18));
                    await send(assetInfo.address, wallet.address, feeAmount);
                    await executeAction('RecipeExecutor', functionData[1], wallet);
                });
            }
        }
    });
};

const aaveV3FlTest = async () => {
    describe('FL-AaveV3', function () {
        this.timeout(60000);

        let senderAcc;
        let proxy;
        let safe;
        let wallet;
        let flActionContract;
        const FLASHLOAN_TOKENS = ['WETH', 'DAI', 'USDC', 'USDT'];

        before(async () => {
            await redeploy('RecipeExecutor');
            await redeploy('SendToken');
            flActionContract = await redeploy('FLAction');
            senderAcc = (await hre.ethers.getSigners())[0];
            proxy = await getProxy(senderAcc.address);
            safe = await getProxy(senderAcc.address, true);
        });

        const determineActiveWallet = (w) => { wallet = isWalletNameDsProxy(w) ? proxy : safe; };

        for (let i = 0; i < WALLETS.length; ++i) {
            for (let j = 0; j < FLASHLOAN_TOKENS.length; ++j) {
                const tokenSymbol = FLASHLOAN_TOKENS[j];

                it(`... should get an ${tokenSymbol} AaveV3 flash loan using ${WALLETS[i]}`, async () => {
                    determineActiveWallet(WALLETS[i]);
                    const network = hre.network.config.name;
                    const assetInfo = getAssetInfo(tokenSymbol, chainIds[network]);

                    // test if balance will brick fl action
                    await setBalance(assetInfo.address, flActionContract.address, Float2BN('1', 0));

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

                    await approve(assetInfo.address, wallet.address);
                    const flAction = new dfs.actions.flashloan.FLAction(
                        new dfs.actions.flashloan.AaveV3FlashLoanAction(
                            [assetInfo.address],
                            [loanAmount],
                            [0],
                            nullAddress,
                            nullAddress,
                            [],
                        ),
                    );
                    const basicFLRecipe = new dfs.Recipe('BasicFLRecipe', [
                        flAction,
                        new dfs.actions.basic.SendTokenAction(
                            assetInfo.address,
                            flActionContract.address,
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
                    await setBalance(assetInfo.address, wallet.address, hre.ethers.utils.parseUnits('0', 18));
                    await send(assetInfo.address, wallet.address, feeAmount);
                    await executeAction('RecipeExecutor', functionData[1], wallet);
                });
            }
        }
    });
};

const sparkFlTest = async () => {
    describe('FL-Spark', function () {
        this.timeout(60000);

        let senderAcc;
        let proxy;
        let safe;
        let wallet;
        let flActionContract;
        let sparkFlFee;
        const FLASHLOAN_TOKENS = ['WETH', 'wstETH', 'rETH', 'DAI', 'sDAI'];

        before(async () => {
            await redeploy('RecipeExecutor');
            await redeploy('SendToken');
            flActionContract = await redeploy('FLAction');
            senderAcc = (await hre.ethers.getSigners())[0];
            proxy = await getProxy(senderAcc.address);
            safe = await getProxy(senderAcc.address, true);
            sparkFlFee = await getSparkFLFee().then((f) => f.toString());
        });

        const determineActiveWallet = (w) => { wallet = isWalletNameDsProxy(w) ? proxy : safe; };

        for (let i = 0; i < WALLETS.length; ++i) {
            for (let j = 0; j < FLASHLOAN_TOKENS.length; ++j) {
                const tokenSymbol = FLASHLOAN_TOKENS[j];

                it(`... should get an ${tokenSymbol} Spark flash loan using ${WALLETS[i]}`, async () => {
                    determineActiveWallet(WALLETS[i]);
                    const assetInfo = getAssetInfo(tokenSymbol, chainIds[getNetwork()]);

                    // test if balance will brick fl action
                    await setBalance(assetInfo.address, flActionContract.address, Float2BN('1', 0));

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
                        .mul(sparkFlFee)
                        .mul(10 ** assetInfo.decimals)
                        .div(100)
                        .toFixed(0, 7)
                        .toString();

                    await approve(assetInfo.address, wallet.address);
                    const flAction = new dfs.actions.flashloan.FLAction(
                        new dfs.actions.flashloan.SparkFlashLoanAction(
                            [assetInfo.address],
                            [loanAmount],
                            [0],
                            nullAddress,
                            nullAddress,
                            [],
                        ),
                    );

                    const basicFLRecipe = new dfs.Recipe('BasicFLRecipe', [
                        flAction,
                        new dfs.actions.basic.SendTokenAction(
                            assetInfo.address,
                            flActionContract.address,
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
                    await setBalance(assetInfo.address, wallet.address, hre.ethers.utils.parseUnits('0', 18));
                    await send(assetInfo.address, wallet.address, feeAmount);
                    await executeAction('RecipeExecutor', functionData[1], wallet);
                });
            }
        }
    });
};

const balancerFLTest = async () => {
    describe('FL-Balancer', function () {
        this.timeout(60000);

        let senderAcc;
        let proxy;
        let safe;
        let wallet;
        let flActionContract;
        let flBalancerContract;

        before(async () => {
            await redeploy('RecipeExecutor');
            await redeploy('SendToken');
            flActionContract = await redeploy('FLAction');
            flBalancerContract = await redeploy('FLBalancer');

            senderAcc = (await hre.ethers.getSigners())[0];
            proxy = await getProxy(senderAcc.address);
            safe = await getProxy(senderAcc.address, true);
        });
        const determineActiveWallet = (w) => { wallet = isWalletNameDsProxy(w) ? proxy : safe; };
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

        for (let i = 0; i < WALLETS.length; ++i) {
            it(`... should get a WETH and DAI Balancer flash loan using ${WALLETS[i]}`, async () => {
                determineActiveWallet(WALLETS[i]);
                // test if balance will brick fl action
                await setBalance(tokenAddrs[0], flActionContract.address, Float2BN('1', 0));
                await setBalance(tokenAddrs[1], flActionContract.address, Float2BN('1', 0));
                await setBalance(tokenAddrs[2], flActionContract.address, Float2BN('1', 0));

                const flAction = new dfs.actions.flashloan.FLAction(
                    new dfs.actions.flashloan.BalancerFlashLoanAction(
                        tokenAddrs,
                        amounts,
                        nullAddress,
                        [],
                    ),
                );

                const basicFLRecipe = new dfs.Recipe('BasicFLRecipe', [
                    flAction,
                    new dfs.actions.basic.SendTokenAction(
                        tokenAddrs[0],
                        flActionContract.address,
                        amounts[0],
                    ),
                    new dfs.actions.basic.SendTokenAction(
                        tokenAddrs[1],
                        flActionContract.address,
                        amounts[1],
                    ),
                    new dfs.actions.basic.SendTokenAction(
                        tokenAddrs[2],
                        flActionContract.address,
                        amounts[2],
                    ),
                ]);

                const functionData = basicFLRecipe.encodeForDsProxyCall();

                await executeAction('RecipeExecutor', functionData[1], wallet);
            });

            it(`... should get a WETH and DAI directly from FLBalancer ${WALLETS[i]}`, async () => {
                determineActiveWallet(WALLETS[i]);
                // test if balance will brick fl action
                await setBalance(tokenAddrs[0], flBalancerContract.address, Float2BN('1', 0));
                await setBalance(tokenAddrs[1], flBalancerContract.address, Float2BN('1', 0));
                await setBalance(tokenAddrs[2], flBalancerContract.address, Float2BN('1', 0));

                const flAction = new dfs.actions.flashloan.BalancerFlashLoanAction(
                        tokenAddrs,
                        amounts,
                        nullAddress,
                        [],
                );

                const basicFLRecipe = new dfs.Recipe('BasicFLRecipe', [
                    flAction,
                    new dfs.actions.basic.SendTokenAction(
                        tokenAddrs[0],
                        flBalancerContract.address,
                        amounts[0],
                    ),
                    new dfs.actions.basic.SendTokenAction(
                        tokenAddrs[1],
                        flBalancerContract.address,
                        amounts[1],
                    ),
                    new dfs.actions.basic.SendTokenAction(
                        tokenAddrs[2],
                        flBalancerContract.address,
                        amounts[2],
                    ),
                ]);

                const functionData = basicFLRecipe.encodeForDsProxyCall();

                await executeAction('RecipeExecutor', functionData[1], wallet);
            });
        }
    });
};

const makerFLTest = async () => {
    describe('FL-Maker', function () {
        this.timeout(60000);

        let senderAcc;
        let proxy;
        let safe;
        let wallet;
        let flActionContract;
        let flMakerContract;

        before(async () => {
            await redeploy('RecipeExecutor');
            await redeploy('SendToken');
            flActionContract = await redeploy('FLAction');
            flMakerContract = await redeploy('FLMaker');

            senderAcc = (await hre.ethers.getSigners())[0];
            proxy = await getProxy(senderAcc.address);
            safe = await getProxy(senderAcc.address, true);
        });

        const tokenSymbol = 'DAI';

        const determineActiveWallet = (w) => { wallet = isWalletNameDsProxy(w) ? proxy : safe; };

        for (let i = 0; i < WALLETS.length; ++i) {
            it(`... should get a ${tokenSymbol} Maker flash loan using ${WALLETS[i]}`, async () => {
                determineActiveWallet(WALLETS[i]);
                const assetInfo = getAssetInfo(tokenSymbol);

                // test if balance will brick fl action
                await setBalance(assetInfo.address, flActionContract.address, Float2BN('1', 0));

                const amount = fetchAmountinUSDPrice(tokenSymbol, '1000');
                const loanAmount = hre.ethers.utils.parseUnits(
                    amount,
                    assetInfo.decimals,
                );
                const feeAmount = '0';
                const flAction = new dfs.actions.flashloan.FLAction(
                    new dfs.actions.flashloan.MakerFlashLoanAction(
                        loanAmount,
                        nullAddress,
                        [],
                    ),
                );
                const basicFLRecipe = new dfs.Recipe('BasicFLRecipe', [
                    flAction,
                    new dfs.actions.basic.SendTokenAction(
                        assetInfo.address,
                        flActionContract.address,
                        loanAmount,
                    ),
                ]);

                const functionData = basicFLRecipe.encodeForDsProxyCall();

                // buy token so we have it for fee
                const tokenBalance = await balanceOf(assetInfo.address, senderAcc.address);

                if (tokenBalance.lt(feeAmount)) {
                    await sell(
                        wallet,
                        WETH_ADDRESS,
                        assetInfo.address,
                        hre.ethers.utils.parseUnits('1', 18),
                        UNISWAP_WRAPPER,
                        senderAcc.address,
                        senderAcc.address,
                    );
                }

                await send(assetInfo.address, wallet.address, feeAmount);

                await executeAction('RecipeExecutor', functionData[1], wallet);
            });

            it(`... should get directly from FLMaker a ${tokenSymbol} flash loan using ${WALLETS[i]}`, async () => {
                determineActiveWallet(WALLETS[i]);
                const assetInfo = getAssetInfo(tokenSymbol);

                // test if balance will brick fl action
                await setBalance(assetInfo.address, flMakerContract.address, Float2BN('1', 0));

                const amount = fetchAmountinUSDPrice(tokenSymbol, '1000');
                const loanAmount = hre.ethers.utils.parseUnits(
                    amount,
                    assetInfo.decimals,
                );
                const feeAmount = '0';
                const flAction = new dfs.actions.flashloan.MakerFlashLoanAction(
                        loanAmount,
                        nullAddress,
                        [],
                );
                const basicFLRecipe = new dfs.Recipe('BasicFLRecipe', [
                    flAction,
                    new dfs.actions.basic.SendTokenAction(
                        assetInfo.address,
                        flMakerContract.address,
                        loanAmount,
                    ),
                ]);

                const functionData = basicFLRecipe.encodeForDsProxyCall();

                // buy token so we have it for fee
                const tokenBalance = await balanceOf(assetInfo.address, senderAcc.address);

                if (tokenBalance.lt(feeAmount)) {
                    await sell(
                        wallet,
                        WETH_ADDRESS,
                        assetInfo.address,
                        hre.ethers.utils.parseUnits('1', 18),
                        UNISWAP_WRAPPER,
                        senderAcc.address,
                        senderAcc.address,
                    );
                }

                await send(assetInfo.address, wallet.address, feeAmount);

                await executeAction('RecipeExecutor', functionData[1], wallet);
            });
        }
    });
};

const uniswapV3FlashloanTest = async () => {
    describe('FL-UniV3', function () {
        this.timeout(60000);

        let senderAcc;
        let proxy;
        let safe;
        let wallet;
        let flActionContract;
        let fullMathLibrary;

        before(async () => {
            await redeploy('RecipeExecutor');
            await redeploy('SendTokens');
            flActionContract = await redeploy('FLAction');
            senderAcc = (await hre.ethers.getSigners())[0];
            proxy = await getProxy(senderAcc.address);
            safe = await getProxy(senderAcc.address, true);

            const fullMath = await hre.ethers.getContractFactory('FullMath');
            fullMathLibrary = await fullMath.deploy();
        });

        const determineActiveWallet = (w) => { wallet = isWalletNameDsProxy(w) ? proxy : safe; };

        const uniPoolInfo = [
            {
                token0: 'DAI', token1: 'USDC', pool: '0x5777d92f208679DB4b9778590Fa3CAB3aC9e2168', fee: 100,
            },
            {
                token0: 'WBTC', token1: 'WETH', pool: '0x4585FE77225b41b697C938B018E2Ac67Ac5a20c0', fee: 500,
            },
            {
                token0: 'USDC', token1: 'WETH', pool: '0x88e6A0c2dDD26FEEb64F039a2c41296FcB3f5640', fee: 500,
            },
        ];

        for (let i = 0; i < WALLETS.length; ++i) {
            for (let j = 0; j < uniPoolInfo.length; j++) {
                it(`... should get a ${uniPoolInfo[j].token0} and ${uniPoolInfo[j].token1} UniV3 flash loan using ${WALLETS[i]}`, async () => {
                    determineActiveWallet(WALLETS[i]);
                    const assetInfo0 = getAssetInfo(uniPoolInfo[j].token0);
                    const assetInfo1 = getAssetInfo(uniPoolInfo[j].token1);

                    const amount0 = hre.ethers.utils.parseUnits('10', assetInfo0.decimals);
                    const amount1 = hre.ethers.utils.parseUnits('10', assetInfo1.decimals);

                    const flAction = new dfs.actions.flashloan.FLAction(
                        new dfs.actions.flashloan.UniV3FlashLoanAction(
                            assetInfo0.address,
                            assetInfo1.address,
                            uniPoolInfo[j].pool,
                            amount0,
                            amount1,
                        ),
                    );
                    const fee0 = await fullMathLibrary.mulDivRoundingUp(
                        amount0, uniPoolInfo[j].fee, 1e6,
                    );
                    const fee1 = await fullMathLibrary.mulDivRoundingUp(
                        amount1, uniPoolInfo[j].fee, 1e6,
                    );
                    await setBalance(assetInfo0.address, wallet.address, fee0);
                    await setBalance(assetInfo1.address, wallet.address, fee1);

                    const basicFLRecipe = new dfs.Recipe('BasicFLRecipe', [
                        flAction,
                        new dfs.actions.basic.SendTokensAction(
                            [assetInfo0.address, assetInfo1.address],
                            [flActionContract.address, flActionContract.address],
                            [hre.ethers.constants.MaxUint256, hre.ethers.constants.MaxUint256],
                        ),
                    ]);

                    const functionData = basicFLRecipe.encodeForDsProxyCall();
                    await executeAction('RecipeExecutor', functionData[1], wallet);
                });
                it(`... should get a ${uniPoolInfo[j].token0} only token (token0) from UniV3 flash loan using ${WALLETS[i]}`, async () => {
                    determineActiveWallet(WALLETS[i]);
                    const assetInfo0 = getAssetInfo(uniPoolInfo[j].token0);
                    const assetInfo1 = getAssetInfo(uniPoolInfo[j].token1);

                    const amount0 = hre.ethers.utils.parseUnits('10', assetInfo0.decimals);
                    const amount1 = hre.ethers.utils.parseUnits('0', assetInfo1.decimals);

                    const flAction = new dfs.actions.flashloan.FLAction(
                        new dfs.actions.flashloan.UniV3FlashLoanAction(
                            assetInfo0.address,
                            assetInfo1.address,
                            uniPoolInfo[j].pool,
                            amount0,
                            amount1,
                        ),
                    );
                    const fee0 = await fullMathLibrary.mulDivRoundingUp(
                        amount0, uniPoolInfo[j].fee, 1e6,
                    );
                    await setBalance(assetInfo0.address, wallet.address, fee0);

                    const basicFLRecipe = new dfs.Recipe('BasicFLRecipe', [
                        flAction,
                        new dfs.actions.basic.SendTokensAction(
                            [assetInfo0.address, assetInfo1.address],
                            [flActionContract.address, flActionContract.address],
                            [hre.ethers.constants.MaxUint256, hre.ethers.constants.MaxUint256],
                        ),
                    ]);

                    const functionData = basicFLRecipe.encodeForDsProxyCall();
                    await executeAction('RecipeExecutor', functionData[1], wallet);
                });
                it(`... should get a ${uniPoolInfo[j].token1} only token (token1) from UniV3 flash loan using ${WALLETS[i]}`, async () => {
                    determineActiveWallet(WALLETS[i]);
                    const assetInfo0 = getAssetInfo(uniPoolInfo[j].token0);
                    const assetInfo1 = getAssetInfo(uniPoolInfo[j].token1);

                    const amount0 = hre.ethers.utils.parseUnits('0', assetInfo0.decimals);
                    const amount1 = hre.ethers.utils.parseUnits('10', assetInfo1.decimals);

                    const flAction = new dfs.actions.flashloan.FLAction(
                        new dfs.actions.flashloan.UniV3FlashLoanAction(
                            assetInfo0.address,
                            assetInfo1.address,
                            uniPoolInfo[j].pool,
                            amount0,
                            amount1,
                        ),
                    );
                    const fee1 = await fullMathLibrary.mulDivRoundingUp(
                        amount1, uniPoolInfo[j].fee, 1e6,
                    );
                    await setBalance(assetInfo1.address, wallet.address, fee1);

                    const basicFLRecipe = new dfs.Recipe('BasicFLRecipe', [
                        flAction,
                        new dfs.actions.basic.SendTokensAction(
                            [assetInfo0.address, assetInfo1.address],
                            [flActionContract.address, flActionContract.address],
                            [hre.ethers.constants.MaxUint256, hre.ethers.constants.MaxUint256],
                        ),
                    ]);

                    const functionData = basicFLRecipe.encodeForDsProxyCall();
                    await executeAction('RecipeExecutor', functionData[1], wallet);
                });
            }
        }
    });
};

const ghoFLTest = async () => {
    describe('FL-Gho', function () {
        this.timeout(60000);

        let senderAcc;
        let proxy;
        let safe;
        let wallet;
        let flActionContract;

        before(async () => {
            await redeploy('RecipeExecutor');
            await redeploy('SendToken');
            flActionContract = await redeploy('FLAction');
            senderAcc = (await hre.ethers.getSigners())[0];
            proxy = await getProxy(senderAcc.address);
            safe = await getProxy(senderAcc.address, true);
        });

        const tokenSymbol = 'GHO';

        const determineActiveWallet = (w) => { wallet = isWalletNameDsProxy(w) ? proxy : safe; };

        for (let i = 0; i < WALLETS.length; ++i) {
            it(`... should get a ${tokenSymbol} flash loan using ${WALLETS[i]}`, async () => {
                determineActiveWallet(WALLETS[i]);
                const assetInfo = getAssetInfo(tokenSymbol);

                // test if balance will brick fl action
                await setBalance(assetInfo.address, flActionContract.address, Float2BN('1', 0));

                const amount = '10000';
                const loanAmount = hre.ethers.utils.parseUnits(
                    amount,
                    assetInfo.decimals,
                );
                const flAction = new dfs.actions.flashloan.FLAction(
                    new dfs.actions.flashloan.GhoFlashLoanAction(
                        loanAmount,
                        nullAddress,
                        [],
                    ),
                );

                const basicFLRecipe = new dfs.Recipe('BasicFLRecipe', [
                    flAction,
                    new dfs.actions.basic.SendTokenAction(
                        assetInfo.address,
                        flActionContract.address,
                        loanAmount,
                    ),
                ]);

                const functionData = basicFLRecipe.encodeForDsProxyCall();
                await executeAction('RecipeExecutor', functionData[1], wallet);
            });
        }
    });
};

const flMorphoBlueTest = async () => {
    describe('FL-MorphoBlue', function () {
        this.timeout(60000);

        let senderAcc;
        let proxy;
        let safe;
        let wallet;
        let flActionContract;

        before(async () => {
            await redeploy('RecipeExecutor');
            await redeploy('SendToken');
            flActionContract = await redeploy('FLAction');
            senderAcc = (await hre.ethers.getSigners())[0];
            proxy = await getProxy(senderAcc.address);
            safe = await getProxy(senderAcc.address, true);
        });
        const network = hre.network.config.name;
        const amountWeth = hre.ethers.utils.parseUnits(
            '1',
            18,
        );
        const wethAddr = addrs[network].WETH_ADDRESS;
        const determineActiveWallet = (w) => { wallet = isWalletNameDsProxy(w) ? proxy : safe; };

        for (let i = 0; i < WALLETS.length; ++i) {
            it(`... should get a WETH MorphoBlue flash loan using ${WALLETS[i]}`, async () => {
                determineActiveWallet(WALLETS[i]);
                // test if balance will brick fl action
                await setBalance(wethAddr, flActionContract.address, Float2BN('1', 0));

                const flAction = new dfs.actions.flashloan.FLAction(
                    new dfs.actions.flashloan.MorphoBlueFlashLoanAction(
                        wethAddr,
                        amountWeth,
                    ),
                );

                const basicFLRecipe = new dfs.Recipe('BasicFLRecipe', [
                    flAction,
                    new dfs.actions.basic.SendTokenAction(
                        wethAddr,
                        flActionContract.address,
                        amountWeth,
                    ),
                ]);

                const functionData = basicFLRecipe.encodeForDsProxyCall();

                await executeAction('RecipeExecutor', functionData[1], wallet);
            });
        }
    });
};

describe('Generalised flashloan test', function () {
    this.timeout(60000);

    before(async () => {
        await redeploy('FLAction');
        await redeploy('SendTokens');
        await redeploy('RecipeExecutor');
    });

    it('... should test generalised flash loan', async () => {
        const network = hre.network.config.name;
        if (network === 'mainnet') {
            await aaveFlTest();
            await sparkFlTest();
            await makerFLTest();
            await ghoFLTest();
            await uniswapV3FlashloanTest();
            await flMorphoBlueTest();
        }

        await balancerFLTest();
        await aaveV3FlTest();
    });
});
