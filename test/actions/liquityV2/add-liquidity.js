/* eslint-disable max-len */
const hre = require('hardhat');
const {
    getOwnerAddr,
    getProxy,
    setBalance,
} = require('../../utils/utils');
const { topUp } = require('../../../scripts/utils/fork');
const { uniV3CreatePool } = require('../../utils/actions');

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
            const bold = '0xbfe297dacb7a2b16df0c9d2b942d127dfb26fd59';
            const dai = '0x6B175474E89094C44Da98b954EedeAC495271d0F';
            const boldAmount = hre.ethers.utils.parseUnits('1000000000', 18);
            const daiAmount = hre.ethers.utils.parseUnits('1000000000', 18);
            await setBalance(bold, senderAcc.address, boldAmount);
            await setBalance(dai, senderAcc.address, daiAmount);
            await uniV3CreatePool(
                proxy,
                dai,
                bold,
                '100',
                -101,
                99,
                daiAmount,
                boldAmount,
                senderAcc.address,
                senderAcc.address,
                '79228162514264337593543950336',
            );
        });
        it('...test add liquidity', async () => {
        });
    });
};

describe('Add BOLD liquidity', function () {
    this.timeout(300000);
    it('...test add bold liquidity', async () => {
        await addLiquidity();
    }).timeout(300000);
});
