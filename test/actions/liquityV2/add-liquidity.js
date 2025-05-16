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

        const BOLD = '0xbfe297dacb7a2b16df0c9d2b942d127dfb26fd59';
        const DAI = '0x6B175474E89094C44Da98b954EedeAC495271d0F';
        const wstETH = '0x7f39C581F595B53c5cb19bD0b3f8dA6c935E2Ca0';
        const rETH = '0xae78736Cd615f374D3085123A210448E74Fc6393';

        const createStablePool = async (stableToken) => {
            const boldAmount = hre.ethers.utils.parseUnits('1000000000', 18);
            const stableAmount = hre.ethers.utils.parseUnits('1000000000', 18);
            await setBalance(BOLD, senderAcc.address, boldAmount);
            await setBalance(DAI, senderAcc.address, stableAmount);
            await uniV3CreatePool(
                proxy,
                stableToken,
                BOLD,
                '100',
                -101,
                99,
                stableAmount,
                boldAmount,
                senderAcc.address,
                senderAcc.address,
                '79228162514264337593543950336', // 2**96
            );
        };
        const createEthPool = async (ethToken) => {
            const boldAmount = hre.ethers.utils.parseUnits('96261006702191769789923328', 1);
            const ethAmount = hre.ethers.utils.parseUnits('259999999999999967170880602112', 1);
            await setBalance(BOLD, senderAcc.address, boldAmount);
            await setBalance(ethToken, senderAcc.address, ethAmount);
            await uniV3CreatePool(
                proxy,
                ethToken,
                BOLD,
                '100',
                78244,
                79014,
                ethAmount,
                boldAmount,
                senderAcc.address,
                senderAcc.address,
                '4039859466863342524139596414976',
            );
        };

        before(async () => {
            [senderAcc] = await hre.ethers.getSigners();
            await topUp(senderAcc.address);
            await topUp(getOwnerAddr());
            proxy = await getProxy(senderAcc.address, hre.config.isWalletSafe);

            await createStablePool(DAI);
            await createEthPool(wstETH);
            await createEthPool(rETH);
        });

        it('...test add liquidity', async () => {});
    });
};

describe('Add BOLD liquidity', function () {
    this.timeout(300000);
    it('...test add bold liquidity', async () => {
        await addLiquidity();
    }).timeout(300000);
});
