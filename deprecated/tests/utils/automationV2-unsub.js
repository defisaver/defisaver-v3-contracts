const hre = require('hardhat');
const { expect } = require('chai');
const {
    resetForkToBlock,
    redeploy,
    getProxy,
    stopImpersonatingAccount,
    impersonateAccount,
} = require('../../../test/utils/utils');
const { automationV2Unsub } = require('../../../test/utils/actions');

const ISubscriptionsABI =
    require('../../../artifacts/contracts/interfaces/ISubscriptions.sol/ISubscriptions.json').abi;

const automationV2UnsubTest = async () => {
    describe('AutomationV2-Unsubscribe', function () {
        this.timeout(1000000);

        before(async () => {
            const blockNum = 14368070;

            await resetForkToBlock(blockNum);
            expect(
                await hre.ethers.provider.getBlockNumber(),
                `This test should be ran at block number ${blockNum}`,
            ).to.eq(blockNum);
            await redeploy('AutomationV2Unsub');
        });

        it('... should unsubscribe Mcd subscription', async () => {
            const mcdSubscriptionsAddr = '0xC45d4f6B6bf41b6EdAA58B01c4298B8d9078269a';
            const CDP_OWNER_ACC = '0x8eceBBF3fA6d894476Cd9DD34D6A53DdD185233e';
            const cdpId = 20648;

            await impersonateAccount(CDP_OWNER_ACC);

            const ownerAcc = hre.ethers.provider.getSigner(CDP_OWNER_ACC);
            const ownerProxy = await getProxy(CDP_OWNER_ACC);
            const impersonatedProxy = ownerProxy.connect(ownerAcc);

            const mcdSubscriptions = new hre.ethers.Contract(
                mcdSubscriptionsAddr,
                ISubscriptionsABI,
                ownerAcc,
            );

            expect(
                (await mcdSubscriptions['subscribersPos(uint256)'](cdpId)).subscribed,
                "The proxy isn't subscribed.",
            ).to.be.true;

            await automationV2Unsub(impersonatedProxy, '0', cdpId);

            expect(
                (await mcdSubscriptions['subscribersPos(uint256)'](cdpId)).subscribed,
                "Couldn't unsubscribe the proxy.",
            ).to.be.false;

            await stopImpersonatingAccount(CDP_OWNER_ACC);
        });

        it('... should unsubscribe Compound subscription', async () => {
            const compoundSubscriptionsAddr = '0x52015EFFD577E08f498a0CCc11905925D58D6207';
            const COMPOUND_OWNER_ACC = '0xe10eB997d51C2AFCd3e0F80e0a984949b2ed3349';

            await impersonateAccount(COMPOUND_OWNER_ACC);

            const ownerAcc = hre.ethers.provider.getSigner(COMPOUND_OWNER_ACC);
            const ownerProxy = await getProxy(COMPOUND_OWNER_ACC);
            const impersonatedProxy = ownerProxy.connect(ownerAcc);

            const compoundSubscriptions = new hre.ethers.Contract(
                compoundSubscriptionsAddr,
                ISubscriptionsABI,
                ownerAcc,
            );

            expect(
                (await compoundSubscriptions['subscribersPos(address)'](ownerProxy.address))
                    .subscribed,
                "The proxy isn't subscribed.",
            ).to.be.true;

            await automationV2Unsub(impersonatedProxy, '1');

            expect(
                (await compoundSubscriptions['subscribersPos(address)'](ownerProxy.address))
                    .subscribed,
                "Couldn't unsubscribe the proxy.",
            ).to.be.false;

            await stopImpersonatingAccount(COMPOUND_OWNER_ACC);
        });

        it('... should unsubscribe Aave subscription', async () => {
            const aaveSubscriptionsAddr = '0x6B25043BF08182d8e86056C6548847aF607cd7CD';
            const AAVE_OWNER_ACC = '0x160FF555a7836d8bC027eDA92Fb524BecE5C9B88';

            await impersonateAccount(AAVE_OWNER_ACC);

            const ownerAcc = hre.ethers.provider.getSigner(AAVE_OWNER_ACC);
            const ownerProxy = await getProxy(AAVE_OWNER_ACC);
            const impersonatedProxy = ownerProxy.connect(ownerAcc);

            const aaveSubscriptions = new hre.ethers.Contract(
                aaveSubscriptionsAddr,
                ISubscriptionsABI,
                ownerAcc,
            );

            expect(
                (await aaveSubscriptions['subscribersPos(address)'](ownerProxy.address)).subscribed,
                "The proxy isn't subscribed.",
            ).to.be.true;

            await automationV2Unsub(impersonatedProxy, '2');

            expect(
                (await aaveSubscriptions['subscribersPos(address)'](ownerProxy.address)).subscribed,
                "Couldn't unsubscribe the proxy.",
            ).to.be.false;

            await stopImpersonatingAccount(AAVE_OWNER_ACC);
        });
    });
};

describe('AutomationV2-Unsubscribe', function () {
    this.timeout(1000000);

    before(async () => {});

    it('... should unsubscribe old automation subscription', async () => {
        await automationV2UnsubTest();
    });
});
