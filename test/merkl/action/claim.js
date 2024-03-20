const hre = require('hardhat');
const dfs = require('@defisaver/sdk');
const { expect } = require('chai');
const { executeAction } = require('../../actions');
const {
    resetForkToBlock, redeploy, sendEther, impersonateAccount, getProxy, WETH_ADDRESS, balanceOf,
} = require('../../utils');

describe('Merkl-Claim', function () {
    this.timeout(80000);
    const blockToClaimOn = 19475917;
    const dfsUser = '0x96E5e99C661C90625B7A5D7A76ac1A40a1daf0ED';

    before(async () => {
        await resetForkToBlock(blockToClaimOn);
        await redeploy('MerklClaim');
        await sendEther((await hre.ethers.getSigners())[0], dfsUser, '10');
    });
    it('should claim Merkl airdrop for DSProxy', async () => {
        await impersonateAccount(dfsUser);
        const proxy = await getProxy(dfsUser);
        const ownerAcc = await hre.ethers.provider.getSigner(dfsUser);
        const impersonatedProxy = proxy.connect(ownerAcc);

        const merklClaimAction = new dfs.actions.merkl.MerklClaimAction(
            [proxy.address],
            [WETH_ADDRESS],
            ['3218562366892677000'],
            [
                [
                    '0x1d87f299634cefc4eb7bc187b4f1d416e19761ae1c4a0eb19256deb6d1162321',
                    '0x9fef5e29e93e87bb32bfaf6f122a8851c1025d11f0035ef10f4cebc4d8f68393',
                    '0x9de795a0ac80db92d36c869dbf19b351535e1995ce97f4fe76af27671fa56fc9',
                    '0x1b2550241fdef357d3296e8ae9b0a8ccd6e83a105f24c2e69cbdb1ac1e41c259',
                    '0xe67c7697171e735334ee1340c18f7e46ac95e285e6ea06af683bb6da7a2e0140',
                    '0x4bd1056611d848459df723828ff7ffa13f8facb91c81c425eaa5471b17f830fd',
                    '0x6b2f8afe25ed65e8c4d8f48b93515590a1bff9d4d65225ea9d96c228e7cca0e3',
                    '0x18b52ff4822be0e031b5dd1bbef6d762f5da62abaeef7ce2baed703a46b7cbaf',
                    '0x38013ffc2304286db1424470610d54bcd7361b92ec70e518bdcaa34b1e1f61b2',
                    '0x3fb74b6d34ccf86d60247bfcd0934bd3e7a34e28b07107c78bf189668d0935c1',
                    '0x5b6aa1af748dd742d864ec38a0d26ca3b57f7a76ef40fe0973324ac1f3c7f5ee',
                    '0x45a65d19871319fb36f79c7b50fcd8e5afe9b63902c773f40240cf188816d7cd',
                ],
            ],
            [WETH_ADDRESS],
            ['3218562366892677000'],
            dfsUser,
        );
        const eoaBalanceBefore = await balanceOf(WETH_ADDRESS, dfsUser);
        const smartWalletBalanceBefore = await balanceOf(WETH_ADDRESS, proxy.address);
        await executeAction('MerklClaim', merklClaimAction.encodeForDsProxyCall()[1], impersonatedProxy);
        const eoaBalanceAfter = await balanceOf(WETH_ADDRESS, dfsUser);
        const smartWalletBalanceAfter = await balanceOf(WETH_ADDRESS, proxy.address);
        expect(smartWalletBalanceAfter).to.be.eq(smartWalletBalanceBefore);
        expect(eoaBalanceAfter.sub(eoaBalanceBefore)).to.be.eq(hre.ethers.utils.parseUnits('3218562366892677000', 0));
    });
});
