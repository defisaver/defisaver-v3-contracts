const { expect } = require('chai');
const hre = require('hardhat');
const { getAssetInfo } = require('@defisaver/tokens');

const {
    getProxy,
    redeploy,
    fetchAmountinUSDPrice,
    balanceOf,
    UNIV3POSITIONMANAGER_ADDR,
    LOGGER_ADDR,
    depositToWeth,
    MAX_UINT128,
    approve,
    WETH_ADDRESS,
    UNIV3ROUTER_ADDR,
    resetForkToBlock,
} = require('../../utils');

const {
    uniV3CreatePool,
    uniV3Mint,
    uniV3Supply,
    uniV3Withdraw,
    uniV3Collect,
} = require('../../actions.js');

const univ3CreatePoolTest = async () => {
    describe('Uni-Mint-V3', () => {
        let senderAcc;
        let proxy;
        let positionManager;
        const uniPair = {
            tokenA: 'TORN',
            tokenB: 'WETH',
            amount0: fetchAmountinUSDPrice('TORN', '1000'),
            amount1: fetchAmountinUSDPrice('WETH', '1000'),
            fee: '3000',
            tickLower: '-120',
            tickUpper: '120',
        };
        const existingUniPair = {
            tokenA: 'DAI',
            tokenB: 'WETH',
            amount0: fetchAmountinUSDPrice('DAI', '1000'),
            amount1: fetchAmountinUSDPrice('WETH', '1000'),
            fee: '500',
            tickLower: '-92100',
            tickUpper: '-69060',
        };

        before(async () => {
            await resetForkToBlock(13369651);
            await redeploy('UniCreatePoolV3');
            senderAcc = (await hre.ethers.getSigners())[0];
            proxy = await getProxy(senderAcc.address);
            positionManager = await hre.ethers.getContractAt('IUniswapV3NonfungiblePositionManager', UNIV3POSITIONMANAGER_ADDR);
        });

        it('create a pool that does not exist yet and mint a position in it', async () => {
            const sqrtPriceX96 = '33613440923724446628483';
            const tokenDataA = {
                address: '0x77777FeDdddFfC19Ff86DB637967013e6C6A116C',
                decimals: 18,
            };
            const tokenDataB = await getAssetInfo(uniPair.tokenB);
            const startingProxyBalanceTokenA = await balanceOf(tokenDataA.address, proxy.address);
            const startingProxyBalanceTokenB = await balanceOf(tokenDataB.address, proxy.address);
            const numberOfPositionsBefore = await positionManager.balanceOf(senderAcc.address);

            const from = senderAcc.address;
            const to = senderAcc.address;
            const amount0 = hre.ethers.utils.parseUnits(uniPair.amount0, tokenDataA.decimals);
            const amount1 = hre.ethers.utils.parseUnits(uniPair.amount1, tokenDataB.decimals);
            await uniV3CreatePool(proxy, tokenDataA.address,
                tokenDataB.address, uniPair.fee, uniPair.tickLower,
                uniPair.tickUpper, amount0, amount1, to, from, sqrtPriceX96);

            const numberOfPositionsAfter = await positionManager.balanceOf(senderAcc.address);
            expect(numberOfPositionsAfter.toNumber())
                .to.be.equal(numberOfPositionsBefore.toNumber() + 1);
            const lastPositionIndex = numberOfPositionsBefore.toNumber();
            const tokenId = positionManager.tokenOfOwnerByIndex(to, lastPositionIndex);
            const position = await positionManager.positions(tokenId);
            expect(position.liquidity).to.be.gt(0);
            // confirming that position representng our mint is the same as parameters we put into
            expect(position.token0.toLowerCase()).to.be.equal(tokenDataA.address.toLowerCase());
            expect(position.token1.toLowerCase()).to.be.equal(tokenDataB.address.toLowerCase());
            expect(position.fee).to.be.equal(parseInt(uniPair.fee, 10));
            expect(position.tickLower).to.be.equal(parseInt(uniPair.tickLower, 10));
            expect(position.tickUpper).to.be.equal(parseInt(uniPair.tickUpper, 10));
            expect(await balanceOf(tokenDataA.address, proxy.address))
                .to.be.eq(startingProxyBalanceTokenA);
            expect(await balanceOf(tokenDataB.address, proxy.address))
                .to.be.eq(startingProxyBalanceTokenB);
        }).timeout(50000);

        it('mint a position where pool already exists', async () => {
            const sqrtPriceX96 = '33613440923724446628483';
            const tokenDataA = await getAssetInfo(existingUniPair.tokenA);
            const tokenDataB = await getAssetInfo(existingUniPair.tokenB);
            const startingProxyBalanceTokenA = await balanceOf(tokenDataA.address, proxy.address);
            const startingProxyBalanceTokenB = await balanceOf(tokenDataB.address, proxy.address);
            const numberOfPositionsBefore = await positionManager.balanceOf(senderAcc.address);

            const from = senderAcc.address;
            const to = senderAcc.address;
            const amount0 = hre.ethers.utils.parseUnits(
                existingUniPair.amount0, tokenDataA.decimals,
            );
            const amount1 = hre.ethers.utils.parseUnits(
                existingUniPair.amount1, tokenDataB.decimals,
            );
            await uniV3CreatePool(proxy, tokenDataA.address,
                tokenDataB.address, existingUniPair.fee, existingUniPair.tickLower,
                existingUniPair.tickUpper, amount0, amount1, to, from, sqrtPriceX96);

            const numberOfPositionsAfter = await positionManager.balanceOf(senderAcc.address);
            expect(numberOfPositionsAfter.toNumber())
                .to.be.equal(numberOfPositionsBefore.toNumber() + 1);
            const lastPositionIndex = numberOfPositionsBefore.toNumber();
            const tokenId = positionManager.tokenOfOwnerByIndex(to, lastPositionIndex);
            const position = await positionManager.positions(tokenId);
            expect(position.liquidity).to.be.gt(0);
            // confirming that position representng our mint is the same as parameters we put into
            expect(position.token0.toLowerCase()).to.be.equal(tokenDataA.address.toLowerCase());
            expect(position.token1.toLowerCase()).to.be.equal(tokenDataB.address.toLowerCase());
            expect(position.fee).to.be.equal(parseInt(existingUniPair.fee, 10));
            expect(position.tickLower).to.be.equal(parseInt(existingUniPair.tickLower, 10));
            expect(position.tickUpper).to.be.equal(parseInt(existingUniPair.tickUpper, 10));
            expect(await balanceOf(tokenDataA.address, proxy.address))
                .to.be.eq(startingProxyBalanceTokenA);
            expect(await balanceOf(tokenDataB.address, proxy.address))
                .to.be.eq(startingProxyBalanceTokenB);
        }).timeout(50000);
    });
};
const uniV3MintTest = async () => {
    describe('Uni-Mint-V3', () => {
        let senderAcc; let proxy; let positionManager;

        const uniPairs = [
            {
                tokenA: 'DAI',
                tokenB: 'WETH',
                amount0: fetchAmountinUSDPrice('DAI', '1000'),
                amount1: fetchAmountinUSDPrice('WETH', '1000'),
                fee: '3000',
                tickLower: '-92100',
                tickUpper: '-69060',
            },
            {
                tokenA: 'DAI',
                tokenB: 'USDC',
                amount0: fetchAmountinUSDPrice('DAI', '1000'),
                amount1: fetchAmountinUSDPrice('WETH', '1000'),
                fee: '500',
                tickLower: '-120',
                tickUpper: '120',
            },
            {
                tokenA: 'WBTC',
                tokenB: 'WETH',
                amount0: fetchAmountinUSDPrice('WBTC', '1000'),
                amount1: fetchAmountinUSDPrice('WETH', '1000'),
                fee: '3000',
                tickLower: '-120',
                tickUpper: '120',
            },
        ];

        before(async () => {
            senderAcc = (await hre.ethers.getSigners())[0];
            proxy = await getProxy(senderAcc.address);
            positionManager = await hre.ethers.getContractAt('IUniswapV3NonfungiblePositionManager', UNIV3POSITIONMANAGER_ADDR);
        });

        for (let i = 0; i < uniPairs.length; i++) {
            it(`... should mint a ${uniPairs[i].tokenA}/${uniPairs[i].tokenB} position to uniswap V3`, async () => {
                const tokenDataA = await getAssetInfo(uniPairs[i].tokenA);
                const tokenDataB = await getAssetInfo(uniPairs[i].tokenB);
                const startingProxyBalanceTokenA = await balanceOf(
                    tokenDataA.address, proxy.address,
                );
                const startingProxyBalanceTokenB = await balanceOf(
                    tokenDataB.address, proxy.address,
                );
                const numberOfPositionsBefore = await positionManager.balanceOf(senderAcc.address);

                const from = senderAcc.address;
                const to = senderAcc.address;
                const amount0 = hre.ethers.utils.parseUnits(
                    uniPairs[i].amount0, tokenDataA.decimals,
                );
                const amount1 = hre.ethers.utils.parseUnits(
                    uniPairs[i].amount1, tokenDataB.decimals,
                );
                await uniV3Mint(proxy, tokenDataA.address,
                    tokenDataB.address, uniPairs[i].fee, uniPairs[i].tickLower,
                    uniPairs[i].tickUpper, amount0, amount1, to, from);

                const numberOfPositionsAfter = await positionManager.balanceOf(senderAcc.address);
                expect(numberOfPositionsAfter.toNumber())
                    .to.be.equal(numberOfPositionsBefore.toNumber() + 1);
                const lastPositionIndex = numberOfPositionsBefore.toNumber();
                const tokenId = positionManager.tokenOfOwnerByIndex(to, lastPositionIndex);
                const position = await positionManager.positions(tokenId);
                // confirm that position representng our mint is the same as parameters we put into
                expect(position.token0.toLowerCase()).to.be.equal(tokenDataA.address.toLowerCase());
                expect(position.token1.toLowerCase()).to.be.equal(tokenDataB.address.toLowerCase());
                expect(position.fee).to.be.equal(parseInt(uniPairs[i].fee, 10));
                expect(position.tickLower).to.be.equal(parseInt(uniPairs[i].tickLower, 10));
                expect(position.tickUpper).to.be.equal(parseInt(uniPairs[i].tickUpper, 10));
                expect(await balanceOf(tokenDataA.address, proxy.address))
                    .to.be.eq(startingProxyBalanceTokenA);
                expect(await balanceOf(tokenDataB.address, proxy.address))
                    .to.be.eq(startingProxyBalanceTokenB);
            }).timeout(50000);
        }
    });
};

const uniV3SupplyTest = async () => {
    describe('Uni-Supply-V3', () => {
        let senderAcc; let proxy; let logger; let positionManager;

        const uniPairs = [
            {
                tokenA: 'DAI',
                tokenB: 'WETH',
                amount0: fetchAmountinUSDPrice('DAI', '1000'),
                amount1: fetchAmountinUSDPrice('WETH', '1000'),
                fee: '3000',
                tickLower: '-92100',
                tickUpper: '-69060',
            },
            {
                tokenA: 'DAI',
                tokenB: 'USDC',
                amount0: fetchAmountinUSDPrice('DAI', '1000'),
                amount1: fetchAmountinUSDPrice('WETH', '1000'),
                fee: '500',
                tickLower: '-120',
                tickUpper: '120',
            },
            {
                tokenA: 'WBTC',
                tokenB: 'WETH',
                amount0: fetchAmountinUSDPrice('WBTC', '1000'),
                amount1: fetchAmountinUSDPrice('WETH', '1000'),
                fee: '3000',
                tickLower: '-120',
                tickUpper: '120',
            },
        ];

        before(async () => {
            logger = await hre.ethers.getContractAt('DefisaverLogger', LOGGER_ADDR);
            senderAcc = (await hre.ethers.getSigners())[0];
            proxy = await getProxy(senderAcc.address);
            positionManager = await hre.ethers.getContractAt('IUniswapV3NonfungiblePositionManager', UNIV3POSITIONMANAGER_ADDR);
        });

        for (let i = 0; i < uniPairs.length; i++) {
            it(`... should mint and supply  ${uniPairs[i].tokenA}/${uniPairs[i].tokenB} position on uniswap V3`, async () => {
                const tokenDataA = await getAssetInfo(uniPairs[i].tokenA);
                const tokenDataB = await getAssetInfo(uniPairs[i].tokenB);
                const startingProxyBalanceTokenA = await balanceOf(
                    tokenDataA.address, proxy.address,
                );
                const startingProxyBalanceTokenB = await balanceOf(
                    tokenDataB.address, proxy.address,
                );
                const numberOfPositionsBefore = await positionManager.balanceOf(senderAcc.address);

                const from = senderAcc.address;
                const to = senderAcc.address;
                const amount0 = hre.ethers.utils.parseUnits(
                    uniPairs[i].amount0, tokenDataA.decimals,
                );
                const amount1 = hre.ethers.utils.parseUnits(
                    uniPairs[i].amount1, tokenDataB.decimals,
                );
                await uniV3Mint(proxy, tokenDataA.address,
                    tokenDataB.address, uniPairs[i].fee, uniPairs[i].tickLower,
                    uniPairs[i].tickUpper, amount0, amount1, to, from);

                const lastPositionIndex = numberOfPositionsBefore.toNumber();
                const tokenId = await positionManager.tokenOfOwnerByIndex(to, lastPositionIndex);
                let position = await positionManager.positions(tokenId);
                const liquidityBeforeSupply = position.liquidity;

                await uniV3Supply(proxy, tokenId.toNumber(), amount0, amount1,
                    from, tokenDataA.address, tokenDataB.address);
                position = await positionManager.positions(tokenId);
                const liquidityAfterSupply = position.liquidity;

                expect(liquidityAfterSupply.sub(liquidityBeforeSupply)).to.be.gte(0);
                expect(await balanceOf(tokenDataA.address, proxy.address))
                    .to.be.eq(startingProxyBalanceTokenA);
                expect(await balanceOf(tokenDataB.address, proxy.address))
                    .to.be.eq(startingProxyBalanceTokenB);
            }).timeout(50000);
        }
        it('... should Log event', async () => {
            const i = 0;
            const tokenDataA = getAssetInfo(uniPairs[i].tokenA);
            const tokenDataB = getAssetInfo(uniPairs[i].tokenB);

            const numberOfPositionsBefore = await positionManager.balanceOf(senderAcc.address);
            const from = senderAcc.address;
            const to = senderAcc.address;
            const amount0 = hre.ethers.utils.parseUnits(uniPairs[i].amount0, tokenDataA.decimals);
            const amount1 = hre.ethers.utils.parseUnits(uniPairs[i].amount1, tokenDataB.decimals);

            await expect(uniV3Mint(proxy, tokenDataA.address,
                tokenDataB.address, uniPairs[i].fee, uniPairs[i].tickLower,
                uniPairs[i].tickUpper, amount0, amount1, to, from))
                .to.emit(logger, 'LogEvent');

            const lastPositionIndex = numberOfPositionsBefore.toNumber();
            const tokenId = await positionManager.tokenOfOwnerByIndex(to, lastPositionIndex);

            await expect(uniV3Supply(proxy, tokenId.toNumber(), amount0, amount1,
                from, tokenDataA.address, tokenDataB.address))
                .to.emit(logger, 'LogEvent');
        }).timeout(50000);
    });
};

const uniV3WithdrawTest = async () => {
    describe('Uni-Supply-V3', () => {
        let senderAcc; let proxy; let logger; let positionManager;

        const uniPairs = [
            {
                tokenA: 'DAI',
                tokenB: 'WETH',
                amount0: fetchAmountinUSDPrice('DAI', '1000'),
                amount1: fetchAmountinUSDPrice('WETH', '1000'),
                fee: '3000',
                tickLower: '-92100',
                tickUpper: '-69060',
            },
            {
                tokenA: 'DAI',
                tokenB: 'USDC',
                amount0: fetchAmountinUSDPrice('DAI', '1000'),
                amount1: fetchAmountinUSDPrice('WETH', '1000'),
                fee: '500',
                tickLower: '-120',
                tickUpper: '120',
            },
            {
                tokenA: 'WBTC',
                tokenB: 'WETH',
                amount0: fetchAmountinUSDPrice('WBTC', '1000'),
                amount1: fetchAmountinUSDPrice('WETH', '1000'),
                fee: '3000',
                tickLower: '-120',
                tickUpper: '120',
            },
        ];

        before(async () => {
            logger = await hre.ethers.getContractAt('DefisaverLogger', LOGGER_ADDR);
            senderAcc = (await hre.ethers.getSigners())[0];
            proxy = await getProxy(senderAcc.address);
            positionManager = await hre.ethers.getContractAt('IUniswapV3NonfungiblePositionManager', UNIV3POSITIONMANAGER_ADDR);
        });

        for (let i = 0; i < uniPairs.length; i++) {
            it(`... should mint, withdraw, supply then withdraw again a  ${uniPairs[i].tokenA}/${uniPairs[i].tokenB} position on uniswap V3`, async () => {
                const tokenDataA = await getAssetInfo(uniPairs[i].tokenA);
                const tokenDataB = await getAssetInfo(uniPairs[i].tokenB);
                const numberOfPositionsBefore = await positionManager.balanceOf(senderAcc.address);
                const from = senderAcc.address;
                const to = senderAcc.address;
                const amount0 = hre.ethers.utils.parseUnits(
                    uniPairs[i].amount0, tokenDataA.decimals,
                );
                const amount1 = hre.ethers.utils.parseUnits(
                    uniPairs[i].amount1, tokenDataB.decimals,
                );

                await uniV3Mint(proxy, tokenDataA.address,
                    tokenDataB.address, uniPairs[i].fee, uniPairs[i].tickLower,
                    uniPairs[i].tickUpper, amount0, amount1, to, from);
                const lastPositionIndex = numberOfPositionsBefore.toNumber();
                const tokenId = await positionManager.tokenOfOwnerByIndex(to, lastPositionIndex);
                await positionManager.approve(proxy.address, tokenId);
                let position = await positionManager.positions(tokenId);
                const liquidityBeforeSupply = position.liquidity;

                await uniV3Withdraw(proxy, tokenId.toNumber(), liquidityBeforeSupply, to);
                position = await positionManager.positions(tokenId);
                expect(position.liquidity).to.be.eq(0);
                expect(position.tokensOwed0.add(position.tokensOwed1)).to.be.eq(0);

                await uniV3Supply(proxy, tokenId.toNumber(), amount0, amount1,
                    from, tokenDataA.address, tokenDataB.address);
                position = await positionManager.positions(tokenId);
                const liquidityAfterSupply = position.liquidity;

                await uniV3Withdraw(proxy, tokenId.toNumber(), liquidityAfterSupply, to);
                position = await positionManager.positions(tokenId);
                expect(position.liquidity).to.be.eq(0);
                expect(position.tokensOwed0.add(position.tokensOwed1)).to.be.eq(0);
            }).timeout(50000);
        }
        it('... should Log event', async () => {
            const i = 0;
            const tokenDataA = getAssetInfo(uniPairs[i].tokenA);
            const tokenDataB = getAssetInfo(uniPairs[i].tokenB);

            const numberOfPositionsBefore = await positionManager.balanceOf(senderAcc.address);
            const from = senderAcc.address;
            const to = senderAcc.address;
            const amount0 = hre.ethers.utils.parseUnits(uniPairs[i].amount0, tokenDataA.decimals);
            const amount1 = hre.ethers.utils.parseUnits(uniPairs[i].amount1, tokenDataB.decimals);

            await expect(uniV3Mint(proxy, tokenDataA.address,
                tokenDataB.address, uniPairs[i].fee, uniPairs[i].tickLower,
                uniPairs[i].tickUpper, amount0, amount1, to, from))
                .to.emit(logger, 'LogEvent');

            const lastPositionIndex = numberOfPositionsBefore.toNumber();
            const tokenId = await positionManager.tokenOfOwnerByIndex(to, lastPositionIndex);

            await expect(uniV3Supply(proxy, tokenId.toNumber(), amount0, amount1,
                from, tokenDataA.address, tokenDataB.address))
                .to.emit(logger, 'LogEvent');

            await positionManager.approve(proxy.address, tokenId);
            const position = await positionManager.positions(tokenId);
            const liquidityAfterSupply = position.liquidity;

            await expect(uniV3Withdraw(proxy, tokenId.toNumber(), liquidityAfterSupply, to))
                .to.emit(logger, 'LogEvent');
        }).timeout(50000);
    });
};

const uniV3CollectTest = async () => {
    describe('Uni-Collect-V3', () => {
        let senderAcc; let proxy; let logger; let positionManager; let router;

        const uniPairs = [
            {
                tokenA: 'DAI',
                tokenB: 'WETH',
                amount0: fetchAmountinUSDPrice('DAI', '1000'),
                amount1: fetchAmountinUSDPrice('WETH', '1000'),
                fee: '3000',
                tickLower: '-92100',
                tickUpper: '-69060',
            },
        ];

        before(async () => {
            logger = await hre.ethers.getContractAt('DefisaverLogger', LOGGER_ADDR);
            router = await hre.ethers.getContractAt('ISwapRouter', UNIV3ROUTER_ADDR);
            senderAcc = (await hre.ethers.getSigners())[0];
            proxy = await getProxy(senderAcc.address);
            positionManager = await hre.ethers.getContractAt('IUniswapV3NonfungiblePositionManager', UNIV3POSITIONMANAGER_ADDR);
        });

        for (let i = 0; i < uniPairs.length; i++) {
            it(`... should only collect tokens owed from  ${uniPairs[i].tokenA}/${uniPairs[i].tokenB} position on uniswap V3`, async () => {
                const tokenDataA = await getAssetInfo(uniPairs[i].tokenA);
                const tokenDataB = await getAssetInfo(uniPairs[i].tokenB);
                const numberOfPositionsBefore = await positionManager.balanceOf(senderAcc.address);
                const from = senderAcc.address;
                const to = senderAcc.address;
                const amount0 = hre.ethers.utils.parseUnits(
                    uniPairs[i].amount0, tokenDataA.decimals,
                );
                const amount1 = hre.ethers.utils.parseUnits(
                    uniPairs[i].amount1, tokenDataB.decimals,
                );
                await uniV3Mint(proxy, tokenDataA.address,
                    tokenDataB.address, uniPairs[i].fee, uniPairs[i].tickLower,
                    uniPairs[i].tickUpper, amount0, amount1, to, from);

                const lastPositionIndex = numberOfPositionsBefore.toNumber();
                await depositToWeth(hre.ethers.utils.parseUnits('20', 18));

                const swapArguments = [tokenDataB.address, tokenDataA.address, 3000, to, Date.now(), hre.ethers.utils.parseUnits('19', 18), 0, 0];
                await approve(WETH_ADDRESS, router.address);
                await router.exactInputSingle(swapArguments);

                const tokenId = await positionManager.tokenOfOwnerByIndex(to, lastPositionIndex);
                await positionManager.approve(proxy.address, tokenId);
                await uniV3Collect(proxy, tokenId.toNumber(), to, 1, 1);
                let position = await positionManager.positions(tokenId);
                expect(position.tokensOwed0.add(position.tokensOwed1)).to.be.gt(0);
                await uniV3Collect(proxy, tokenId.toNumber(), to, MAX_UINT128, MAX_UINT128);

                position = await positionManager.positions(tokenId);
                expect(position.tokensOwed0.add(position.tokensOwed1)).to.be.eq(0);
            }).timeout(50000);
        }
        it('... should Log event', async () => {
            const i = 0;
            const tokenDataA = getAssetInfo(uniPairs[i].tokenA);
            const tokenDataB = getAssetInfo(uniPairs[i].tokenB);

            const from = senderAcc.address;
            const to = senderAcc.address;
            const numberOfPositionsBefore = await positionManager.balanceOf(senderAcc.address);
            const amount0 = hre.ethers.utils.parseUnits(uniPairs[i].amount0, tokenDataA.decimals);
            const amount1 = hre.ethers.utils.parseUnits(uniPairs[i].amount1, tokenDataB.decimals);
            await expect(uniV3Mint(proxy, tokenDataA.address,
                tokenDataB.address, uniPairs[i].fee, uniPairs[i].tickLower,
                uniPairs[i].tickUpper, amount0, amount1, to, from))
                .to.emit(logger, 'LogEvent');
            const lastPositionIndex = numberOfPositionsBefore.toNumber();
            await depositToWeth(hre.ethers.utils.parseUnits('20', 18));
            const tokenId = await positionManager.tokenOfOwnerByIndex(to, lastPositionIndex);
            await positionManager.approve(proxy.address, tokenId);
            await expect(uniV3Collect(proxy, tokenId, to, MAX_UINT128, MAX_UINT128))
                .to.emit(logger, 'LogEvent');
            const position = await positionManager.positions(tokenId);
            expect(position.tokensOwed0.add(position.tokensOwed1)).to.be.eq(0);
        }).timeout(50000);
    });
};
const deployUniV3Contracts = async () => {
    await redeploy('UniMintV3');
    await redeploy('UniCreatePoolV3');
    await redeploy('UniSupplyV3');
    await redeploy('UniCollectV3');
    await redeploy('UniWithdrawV3');
};

const uniV3FullTest = async () => {
    await deployUniV3Contracts();

    await uniV3MintTest();
    await uniV3SupplyTest();
    await uniV3WithdrawTest();
    await uniV3CollectTest();

    await univ3CreatePoolTest();
};

module.exports = {
    univ3CreatePoolTest,
    uniV3MintTest,
    uniV3SupplyTest,
    uniV3WithdrawTest,
    uniV3CollectTest,
    uniV3FullTest,
};
