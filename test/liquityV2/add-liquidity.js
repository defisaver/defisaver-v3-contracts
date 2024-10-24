/* eslint-disable max-len */
const hre = require('hardhat');
const {
    getOwnerAddr,
    getProxy,
    setBalance,
} = require('../utils');
const { topUp } = require('../../scripts/utils/fork');
const { uniV3CreatePool } = require('../actions');

const addLiquidity = async () => {
    describe('addLiquidity', function () {
        this.timeout(100000);
        let senderAcc;
        let proxy;
        before(async () => {
            [senderAcc] = await hre.ethers.getSigners();
            await topUp(senderAcc.address);
            await topUp(getOwnerAddr());
            proxy = await getProxy(senderAcc.address, hre.config.isWalletSafe);
        });
        it('...test add liquidity', async () => {
            const bold = '0x4f37d1f70b7ed0868baa367c82897006b5e1a6e4';
            const dai = '0x6B175474E89094C44Da98b954EedeAC495271d0F';
            const boldAmount = hre.ethers.utils.parseUnits('1000000000', 18);
            const daiAmount = hre.ethers.utils.parseUnits('1000000000', 18);
            await setBalance(bold, senderAcc.address, boldAmount);
            await setBalance(dai, senderAcc.address, daiAmount);
            await uniV3CreatePool(
                proxy,
                bold,
                dai,
                '100',
                -101,
                99,
                boldAmount,
                daiAmount,
                senderAcc.address,
                senderAcc.address,
                '79228162514264337593543950336',
            );
        });
    });
};

describe('Add BOLD liquidity', function () {
    this.timeout(300000);
    it('...test add bold liquidity', async () => {
        await addLiquidity();
    }).timeout(300000);
});
