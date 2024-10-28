/* eslint-disable no-await-in-loop */
/* eslint-disable max-len */
const hre = require('hardhat');
const { getAssetInfo } = require('@defisaver/tokens');
const {
    getProxy,
    network,
    addrs,
    getOwnerAddr,
    getContractFromRegistry,
} = require('../../utils');
const {
    addBotCaller,
} = require('../../utils-strategies');

const { topUp } = require('../../../scripts/utils/fork');
const { liquityV2Open } = require('../../actions');
const { getLiquityV2TestPairs } = require('../../utils-liquityV2');
const { subLiquityV2RepayBundle } = require('../../strategy-subs');

const isFork = true;

describe('Sub', function () {
    this.timeout(1200000);

    const REGISTRY_ADDR = addrs[network].REGISTRY_ADDR;
    let senderAcc;
    let proxy;
    let botAcc;

    const openTrove = async (testPair, collAmount, boldAmount) => {
        const collAsset = getAssetInfo(testPair.supplyTokenSymbol);
        const interestRate = hre.ethers.utils.parseUnits('1', 16);
        const ownerIndex = 0;

        await liquityV2Open(
            proxy,
            testPair.market,
            testPair.collIndex,
            collAsset.address,
            collAmount,
            boldAmount,
            interestRate,
            hre.ethers.constants.AddressZero,
            ownerIndex,
            senderAcc.address,
            senderAcc.address,
            isFork,
        );

        const encodedData = hre.ethers.utils.defaultAbiCoder.encode(
            ['address', 'uint256'],
            [proxy.address, ownerIndex],
        );
        const troveId = hre.ethers.utils.keccak256(encodedData);

        return troveId;
    };

    before(async () => {
        [senderAcc, botAcc] = await hre.ethers.getSigners();
        if (isFork) {
            await topUp(senderAcc.address);
            await topUp(botAcc.address);
            await topUp(getOwnerAddr());
        }
        proxy = await getProxy(senderAcc.address, hre.config.isWalletSafe);
        proxy = proxy.connect(senderAcc);

        const mainnetBocAccounts = [
            '0x61fe1bdcd91E8612a916f86bA50a3EDF3E5654c4',
            '0xC561281982c3042376eB8242d6A78Ab18062674F',
            '0x660B3515F493200C47Ef3DF195abEAfc57Bd6496',
            '0xF14e7451A6836725481d8E9042C22117b2039539',
            '0xB1E5d1260A63163cdCC114cceD9bC0659de96EB8',
            '0x36229a6999EEEb5217482299A6f6eeC76641757B',
        ];
        for (let i = 0; i < mainnetBocAccounts.length; i++) {
            await topUp(mainnetBocAccounts[i]);
            await addBotCaller(mainnetBocAccounts[i], REGISTRY_ADDR, isFork);
        }

        const collAmount = hre.ethers.utils.parseUnits('10', 18); // 25k
        const debtAmount = hre.ethers.utils.parseUnits('15000', 18); // 15k
        const markets = await getLiquityV2TestPairs();
        const troveId = await openTrove(markets[0], collAmount, debtAmount);

        const minRatio = 180;
        const targetRatio = 225;
        const { subId, strategySub } = await subLiquityV2RepayBundle(
            proxy,
            markets[0].market,
            troveId,
            minRatio,
            targetRatio,
            37,
        );

        const viewContract = await getContractFromRegistry('LiquityV2View', REGISTRY_ADDR, false, isFork);
        const troveInfo = await viewContract.getTroveInfo(markets[0].market, troveId);

        console.log('troveInfo', troveInfo);
        console.log('proxy', proxy.address);
        console.log('senderAcc', senderAcc.address);
        console.log('subId', subId);
        console.log('strategySub', strategySub);
    });

    it('...', async () => {});
});
