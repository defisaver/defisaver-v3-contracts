/* eslint-disable no-unused-vars */
const { expect } = require('chai');
const hre = require('hardhat');
const { supplyCompV3, claimCompV3 } = require('../actions');
const {
    redeploy,
    USDC_ADDR,
    balanceOf,
    getProxy,
    setBalance,
    impersonateAccount,
    stopImpersonatingAccount,
} = require('../utils');
const { COMP_ADDR } = require('../utils-comp');

describe('CompV3-Claim', function () {
    this.timeout(80000);

    let senderAcc;
    let proxy;

    before(async () => {
        await redeploy('CompV3Supply');
        await redeploy('CompV3Claim');
        await redeploy('CompV3Borrow');
        senderAcc = (await hre.ethers.getSigners())[0];
        proxy = await getProxy(senderAcc.address);
    });

    it('... claim usdc tokens for proxy account', async () => {
        // base min for rewards is 1000000000000
        const amount = hre.ethers.utils.parseUnits('3000', 6);

        const COMET_REWARDS_ADDR = '0x1B0e765F6224C21223AeA2af16c1C46E38885a40';
        const COMET_ADDR = '0xc3d688B66703497DAA19211EEdff47f25384cdc3';
        const CONFIG_ADDR = '0x316f9708bB98af7dA9c68C1C3b5e79039cD336E3';
        const GOVERNOR_ADDR = '0x6d903f6003cca6255d85cca4d3b5e5146dc33925';

        const abi = [
            'function getRewardOwed(address, address) public view returns(address, uint256)',
        ];

        const abiConfig = [
            'function setBaseTrackingSupplySpeed(address cometProxy, uint64 newBaseTrackingSupplySpeed)',
            'function deploy(address cometProxy) external returns (address)',
        ];

        const CometRewardsContract = new hre.ethers.Contract(COMET_REWARDS_ADDR, abi, senderAcc);

        const ConfigContract = new hre.ethers.Contract(CONFIG_ADDR, abiConfig, senderAcc);

        await impersonateAccount(GOVERNOR_ADDR);
        const signer = await hre.ethers.provider.getSigner(GOVERNOR_ADDR);

        // set base tracking speed
        const configContract = ConfigContract.connect(signer);
        await configContract.setBaseTrackingSupplySpeed(COMET_ADDR, '10000000000', { gasLimit: 600000 });

        const tx = await configContract.deploy(COMET_ADDR, { gasLimit: 6000000 });
        const parsedTx = await tx.wait();

        // set new Comet implementation contract
        await hre.ethers.provider.send('hardhat_setStorageAt', [
            COMET_ADDR,
            '0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc', // proxy impl. storage slot
            parsedTx.events[0].topics[2], // new Comet impl. contract addr
        ]);

        await stopImpersonatingAccount(GOVERNOR_ADDR);

        await setBalance(COMP_ADDR, COMET_REWARDS_ADDR, hre.ethers.utils.parseUnits('100000', 18));

        await supplyCompV3(proxy, USDC_ADDR, amount, senderAcc.address);

        await hre.network.provider.send('evm_increaseTime', [36000]);
        await hre.network.provider.send('evm_mine');

        // eslint-disable-next-line max-len
        const reward = await CometRewardsContract.callStatic.getRewardOwed(COMET_ADDR, proxy.address);
        console.log('Comp reward to get: ', reward[1].toString());

        const BalanceBefore = await balanceOf(COMP_ADDR, senderAcc.address);
        const BalanceProxyBefore = await balanceOf(COMP_ADDR, proxy.address);

        await claimCompV3(proxy, proxy.address, senderAcc.address, true);

        const BalanceAfter = await balanceOf(COMP_ADDR, senderAcc.address);
        const BalanceProxyAfter = await balanceOf(COMP_ADDR, proxy.address);

        expect(BalanceProxyAfter).to.be.eq(BalanceProxyBefore);
        expect(BalanceAfter).to.be.gt(BalanceBefore);
    });
});
