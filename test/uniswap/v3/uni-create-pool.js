/* eslint-disable max-len */
/* eslint-disable no-await-in-loop */
const { expect } = require('chai');
const hre = require('hardhat');
const { getAssetInfo } = require('@defisaver/tokens');

const {
    getProxy, redeploy, fetchAmountinUSDPrice, balanceOf, UNIV3POSITIONMANAGER_ADDR,
} = require('../../utils');

const { uniV3CreatePool } = require('../../actions.js');

describe('Uni-Mint-V3', () => {
    let senderAcc;
    let proxy;
    let positionManager;
    const uniPair = {
        tokenA: 'TORN',
        tokenB: 'WETH',
        amount0: fetchAmountinUSDPrice('TORN', '1000'),
        amount1: fetchAmountinUSDPrice('WETH', '1000'),
        fee: '500',
        tickLower: '-120',
        tickUpper: '120',
    };
    const existingUniPair = {
        tokenA: 'DAI',
        tokenB: 'WETH',
        amount0: fetchAmountinUSDPrice('DAI', '1000'),
        amount1: fetchAmountinUSDPrice('WETH', '1000'),
        fee: '3000',
        tickLower: '-92100',
        tickUpper: '-69060',
    };

    before(async () => {
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
        console.log(position.liquidity);
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
        const amount0 = hre.ethers.utils.parseUnits(existingUniPair.amount0, tokenDataA.decimals);
        const amount1 = hre.ethers.utils.parseUnits(existingUniPair.amount1, tokenDataB.decimals);
        await uniV3CreatePool(proxy, tokenDataA.address,
            tokenDataB.address, existingUniPair.fee, existingUniPair.tickLower,
            existingUniPair.tickUpper, amount0, amount1, to, from, sqrtPriceX96);

        const numberOfPositionsAfter = await positionManager.balanceOf(senderAcc.address);
        expect(numberOfPositionsAfter.toNumber())
            .to.be.equal(numberOfPositionsBefore.toNumber() + 1);
        const lastPositionIndex = numberOfPositionsBefore.toNumber();
        const tokenId = positionManager.tokenOfOwnerByIndex(to, lastPositionIndex);
        const position = await positionManager.positions(tokenId);
        console.log(position.liquidity);
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
