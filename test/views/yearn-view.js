const hre = require('hardhat');

const {
    redeploy,
    getProxy,
    depositToWeth,
    approve,
    balanceOf,
    WETH_ADDRESS,
    YEARN_REGISTRY_ADDRESS,
} = require('../utils');

const { yearnSupply, yearnWithdraw } = require('../actions.js');

describe('Yearn-view', function () {
    this.timeout(80000);

    let yearnView;
    let senderAcc;
    let yearnRegistry;
    let proxy;

    before(async () => {
        yearnView = await redeploy('YearnView');
        yearnRegistry = await hre.ethers.getContractAt('IYearnRegistry', YEARN_REGISTRY_ADDRESS);

        senderAcc = (await hre.ethers.getSigners())[0];
        proxy = await getProxy(senderAcc.address);
    });

    it('... should get yearn underlying balance', async () => {
        const yWeth = await yearnRegistry.latestVault(WETH_ADDRESS);

        const wethAmount = hre.ethers.utils.parseUnits('10', 18);

        await depositToWeth(wethAmount);
        await approve(WETH_ADDRESS, proxy.address);

        await yearnSupply(
            WETH_ADDRESS,
            wethAmount,
            senderAcc.address,
            senderAcc.address,
            proxy,
        );

        const wethBalance = await yearnView.getUnderlyingBalanceInVault(senderAcc.address, yWeth);

        console.log(wethBalance.toString());

        const yTokenAmount = await balanceOf(yWeth, senderAcc.address);

        const balanceBefore = await balanceOf(WETH_ADDRESS, senderAcc.address);

        await approve(yWeth, proxy.address);

        await yearnWithdraw(
            yWeth,
            yTokenAmount,
            senderAcc.address,
            senderAcc.address,
            proxy,
        );

        const balanceAfter = await balanceOf(WETH_ADDRESS, senderAcc.address);

        console.log(balanceBefore.toString(), balanceAfter.toString());
    });

    it('... should get pool liquidity', async () => {
        const yWeth = await yearnRegistry.latestVault(WETH_ADDRESS);

        const liqBalance = await yearnView.getPoolLiquidity(yWeth);

        console.log(liqBalance.toString());
    });
});
