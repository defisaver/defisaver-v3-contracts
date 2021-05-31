/* eslint-disable no-await-in-loop */
const { expect } = require('chai');
const hre = require('hardhat');
const { getAssetInfo } = require('@defisaver/tokens');

const {
    getProxy,
    redeploy,
    depositToWeth,
    approve,
    WETH_ADDRESS,
    MAX_UINT128,
    LOGGER_ADDR,
    UNIV3ROUTER_ADDR,
    UNIV3POSITIONMANAGER_ADDR,
    fetchAmountinUSDPrice,
} = require('../../utils');

const {
    uniV3Mint,
    uniV3Collect,
} = require('../../actions.js');

describe('Uni-Mint-V3', () => {
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
        await redeploy('UniMintV3');
        await redeploy('UniSupplyV3');
        await redeploy('UniCollectV3');
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
            const amount0 = hre.ethers.utils.parseUnits(uniPairs[i].amount0, tokenDataA.decimals);
            const amount1 = hre.ethers.utils.parseUnits(uniPairs[i].amount1, tokenDataB.decimals);
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
