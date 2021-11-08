const { expect } = require('chai');
const hre = require('hardhat');

const {
    balanceOf,
    getProxy,
    redeploy,
    timeTravel,
} = require('../utils');

const {
    curveClaimFees,
} = require('../actions.js');

describe('Curve-Claim-Fees', function () {
    console.log('this test should be run forking the block 13000000');
    this.timeout(1000000);

    const claimFor = '0x7563839e02004d3f419ff78df4256e9c5dd713ed';
    const WEEK = 3600 * 24 * 7;

    let senderAcc;
    let proxy;
    let curveView; let crv3crvToken;

    before(async () => {
        senderAcc = (await hre.ethers.getSigners())[0];
        proxy = await getProxy(senderAcc.address);

        await redeploy('CurveClaimFees');
        curveView = await redeploy('CurveView');
        crv3crvToken = await curveView['CRV_3CRV_TOKEN_ADDR()']();
    });

    it('... should claim rewards', async () => {
        await timeTravel(WEEK);
        const balanceBefore = await balanceOf(crv3crvToken, claimFor);

        await curveClaimFees(proxy, claimFor, claimFor);

        const feesRewarded = (await balanceOf(crv3crvToken, claimFor)).sub(balanceBefore);

        expect(feesRewarded).to.be.gt(0);
    });
});
