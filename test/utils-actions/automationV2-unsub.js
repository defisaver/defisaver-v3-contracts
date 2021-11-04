const { expect } = require('chai');
const hre = require('hardhat');
const { automationV2McdUnsub, automationV2CompAaveUnsub } = require('../actions');
const {
    getProxy,
    redeploy,
    impersonateAccount,
    stopImpersonatingAccount,
} = require('../utils');

const ISubscriptionsABI = require('../../artifacts/contracts/interfaces/ISubscriptions.sol/ISubscriptions.json').abi;

describe('AutomationV2-Unsubscribe', function () {
    this.timeout(1000000);

    before(async () => {
        const blockNum = 13530577;
        expect(
            await hre.ethers.provider.getBlockNumber(),
            `This test should be ran at block number ${blockNum}`,
        ).to.eq(blockNum);
        await redeploy('AutomationV2Unsub');
    });

    it('... should unsubscribe Mcd subscription', async () => {
        const mcdSubscriptionsAddr = '0xC45d4f6B6bf41b6EdAA58B01c4298B8d9078269a';
        const OWNER_ACC = '0xC48d4d15c2aE6037E9E9E4E79fC989feFAF4d6Fc';
        const cdpId = 12190;

        await impersonateAccount(OWNER_ACC);

        const ownerAcc = hre.ethers.provider.getSigner(OWNER_ACC);
        const ownerProxy = await getProxy(OWNER_ACC);
        const impersonatedProxy = ownerProxy.connect(ownerAcc);

        const mcdSubscriptions = new hre.ethers.Contract(
            mcdSubscriptionsAddr,
            ISubscriptionsABI,
            ownerAcc,
        );

        // eslint-disable-next-line no-unused-expressions
        expect(
            (await mcdSubscriptions['subscribersPos(uint256)'](cdpId)).subscribed,
            'The proxy isn\'t subscribed.',
        ).to.be.true;

        await automationV2McdUnsub(impersonatedProxy, cdpId);

        // eslint-disable-next-line no-unused-expressions
        expect(
            (await mcdSubscriptions['subscribersPos(uint256)'](cdpId)).subscribed,
            'Couldn\'t unsubscribe the proxy.',
        ).to.be.false;

        await stopImpersonatingAccount(OWNER_ACC);
    });

    it('... should unsubscribe Compound subscription', async () => {
        const compoundSubscriptionsAddr = '0x52015EFFD577E08f498a0CCc11905925D58D6207';
        const OWNER_ACC = '0x18625142e5E576C524329B2568884099E4D9caC1';

        await impersonateAccount(OWNER_ACC);

        const ownerAcc = hre.ethers.provider.getSigner(OWNER_ACC);
        const ownerProxy = await getProxy(OWNER_ACC);
        const impersonatedProxy = ownerProxy.connect(ownerAcc);

        const compoundSubscriptions = new hre.ethers.Contract(
            compoundSubscriptionsAddr,
            ISubscriptionsABI,
            ownerAcc,
        );

        // eslint-disable-next-line no-unused-expressions
        expect(
            (await compoundSubscriptions['subscribersPos(address)'](ownerProxy.address)).subscribed,
            'The proxy isn\'t subscribed.',
        ).to.be.true;

        await automationV2CompAaveUnsub(impersonatedProxy, '1');

        // eslint-disable-next-line no-unused-expressions
        expect(
            (await compoundSubscriptions['subscribersPos(address)'](ownerProxy.address)).subscribed,
            'Couldn\'t unsubscribe the proxy.',
        ).to.be.false;

        await stopImpersonatingAccount(OWNER_ACC);
    });

    it('... should unsubscribe Aave subscription', async () => {
        const aaveSubscriptionsAddr = '0x6B25043BF08182d8e86056C6548847aF607cd7CD';
        const OWNER_ACC = '0x01d31Ad58827df47Fae2642AFFB5dE41b0891d93';

        await impersonateAccount(OWNER_ACC);

        const ownerAcc = hre.ethers.provider.getSigner(OWNER_ACC);
        const ownerProxy = await getProxy(OWNER_ACC);
        const impersonatedProxy = ownerProxy.connect(ownerAcc);

        const aaveSubscriptions = new hre.ethers.Contract(
            aaveSubscriptionsAddr,
            ISubscriptionsABI,
            ownerAcc,
        );

        // eslint-disable-next-line no-unused-expressions
        expect(
            (await aaveSubscriptions['subscribersPos(address)'](ownerProxy.address)).subscribed,
            'The proxy isn\'t subscribed.',
        ).to.be.true;

        await automationV2CompAaveUnsub(impersonatedProxy, '2');

        // eslint-disable-next-line no-unused-expressions
        expect(
            (await aaveSubscriptions['subscribersPos(address)'](ownerProxy.address)).subscribed,
            'Couldn\'t unsubscribe the proxy.',
        ).to.be.false;

        await stopImpersonatingAccount(OWNER_ACC);
    });
});
