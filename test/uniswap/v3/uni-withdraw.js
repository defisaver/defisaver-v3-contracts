/* eslint-disable no-await-in-loop */
const { expect } = require('chai');

const hre = require('hardhat');
const { getAssetInfo } = require('@defisaver/tokens');
const {
    getProxy,
    redeploy,
    LOGGER_ADDR,
    UNIV3POSITIONMANAGER_ADDR,
    fetchAmountinUSDPrice,
} = require('../../utils');

const {
    uniV3Mint,
    uniV3Supply,
    uniV3Withdraw,
} = require('../../actions.js');

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
        await redeploy('UniMintV3');
        await redeploy('UniSupplyV3');
        await redeploy('UniWithdrawV3');
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
            const amount0 = hre.ethers.utils.parseUnits(uniPairs[i].amount0, tokenDataA.decimals);
            const amount1 = hre.ethers.utils.parseUnits(uniPairs[i].amount1, tokenDataB.decimals);

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
