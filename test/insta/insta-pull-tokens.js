const { expect } = require('chai');
const hre = require('hardhat');

const {
    getProxy,
    redeploy,
    impersonateAccount,
    stopImpersonatingAccount,
    balanceOf,
} = require('../utils');
const { pullTokensInstDSA } = require('../actions.js');
const {
    AUNI_ADDR,
    AWETH_ADDR,
    ADAI_ADDR,
} = require('../utils');

describe('Pull tokens from DSA', function () {
    this.timeout(80000);

    let proxy;
    let ownerAcc;
    let dsaContract;
    let dsaAddress;
    /// @notice run on block number 12805354
    const OWNER_ACC = '0x6F6c0194A67c2727c61370e76042B3D92F3AC35E';
    before(async () => {
        await redeploy('InstPullTokens');
        dsaAddress = '0xe9BEE24323AaAd3792836005a1Cb566C72B3FaD3';
        dsaContract = await hre.ethers.getContractAt('IInstaAccountV2', dsaAddress);
    });

    it('... claim INST', async () => {
        await impersonateAccount(OWNER_ACC);
        ownerAcc = await hre.ethers.provider.getSigner(OWNER_ACC);
        const dsaContractImpersonated = dsaContract.connect(ownerAcc);

        const ABI = [
            'function add(address)',
        ];
        const iface = new hre.ethers.utils.Interface(ABI);
        const data = iface.encodeFunctionData('add', [OWNER_ACC]);

        dsaContractImpersonated.cast(['AUTHORITY-A'], [data], OWNER_ACC);
        proxy = await getProxy(OWNER_ACC);
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
        expect(aUniBalanceAfter).to.be.gt(aUniBalanceBefore);
        expect(aWethBalanceAfter).to.be.gt(aWethBalanceBefore);
        expect(aDaiBalanceAfter).to.be.gt(aDaiBalanceBefore);

        await stopImpersonatingAccount(OWNER_ACC);
    }).timeout(50000);
});
