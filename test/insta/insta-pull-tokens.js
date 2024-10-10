/* eslint-disable max-len */
const { expect } = require('chai');
const hre = require('hardhat');

const {
    getProxy,
    redeploy,
    impersonateAccount,
    stopImpersonatingAccount,
    balanceOf,
    setBalance,
} = require('../utils');
const { pullTokensInstDSA } = require('../actions');
const {
    AUNI_ADDR,
    AWETH_ADDR,
    ADAI_ADDR,
} = require('../utils');

const instaPullTokensTest = async () => {
    // @dev DSA proxy present at block: 20484188 with owner=OWNER_ACC
    describe('Pull tokens from DSA', function () {
        this.timeout(150000);

        let proxy;
        let ownerAcc;
        let dsaContract;
        let dsaAddress;
        const OWNER_ACC = '0xb94c575bFfDc7aB6EC97ad55A9007E2C924A8484';
        before(async () => {
            await redeploy('InstPullTokens');
            dsaAddress = '0x999CBD9Dc31A471aFEa801B0995D86aB3303Be8B';
            dsaContract = await hre.ethers.getContractAt('IInstaAccountV2', dsaAddress);
        });

        it('... pull aUni, aWETH, aDAI tokens from dsa', async () => {
            await impersonateAccount(OWNER_ACC);

            const amount = hre.ethers.utils.parseUnits('1000', 18);

            await setBalance(AUNI_ADDR, dsaAddress, amount);
            await setBalance(AWETH_ADDR, dsaAddress, amount);
            await setBalance(ADAI_ADDR, dsaAddress, amount);

            ownerAcc = await hre.ethers.provider.getSigner(OWNER_ACC);
            const dsaContractImpersonated = dsaContract.connect(ownerAcc);

            proxy = await getProxy(OWNER_ACC);

            const ABI = [
                'function add(address)',
            ];
            const iface = new hre.ethers.utils.Interface(ABI);
            const data = iface.encodeFunctionData('add', [proxy.address]);

            await dsaContractImpersonated.cast(['AUTHORITY-A'], [data], OWNER_ACC);
            const impersonatedProxy = proxy.connect(ownerAcc);

            const aUniBalanceBefore = await balanceOf(AUNI_ADDR, OWNER_ACC);
            const aWethBalanceBefore = await balanceOf(AWETH_ADDR, OWNER_ACC);
            const aDaiBalanceBefore = await balanceOf(ADAI_ADDR, OWNER_ACC);

            await pullTokensInstDSA(
                impersonatedProxy,
                dsaAddress,
                [AUNI_ADDR, AWETH_ADDR, ADAI_ADDR],
                [
                    hre.ethers.constants.MaxUint256,
                    hre.ethers.constants.MaxUint256,
                    hre.ethers.constants.MaxUint256,
                ],
                OWNER_ACC,
            );

            const aUniBalanceAfter = await balanceOf(AUNI_ADDR, OWNER_ACC);
            const aWethBalanceAfter = await balanceOf(AWETH_ADDR, OWNER_ACC);
            const aDaiBalanceAfter = await balanceOf(ADAI_ADDR, OWNER_ACC);

            const dsaAUniBalance = await balanceOf(AUNI_ADDR, dsaAddress);
            const dsaAWethBalance = await balanceOf(AWETH_ADDR, dsaAddress);
            const dsaADaiBalance = await balanceOf(ADAI_ADDR, dsaAddress);

            expect(dsaAUniBalance).to.be.eq(0);
            expect(dsaAWethBalance).to.be.eq(0);
            expect(dsaADaiBalance).to.be.eq(0);

            expect(aUniBalanceAfter).to.be.gte(aUniBalanceBefore.add(amount));
            expect(aWethBalanceAfter).to.be.gte(aWethBalanceBefore.add(amount));
            expect(aDaiBalanceAfter).to.be.gte(aDaiBalanceBefore.add(amount));

            await stopImpersonatingAccount(OWNER_ACC);
        }).timeout(50000);
    });
};

describe('Pull tokens from DSA', function () {
    this.timeout(80000);
    it('... pull aUni, aWETH, aDAI tokens from dsa', async () => {
        await instaPullTokensTest();
    }).timeout(50000);
});

module.exports = {
    instaPullTokensTest,
};
