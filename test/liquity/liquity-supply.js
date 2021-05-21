const { expect } = require('chai');
const hre = require('hardhat');

const dfs = require('@defisaver/sdk');

const {
    getAddrFromRegistry,
    balanceOf,
    getProxy,
    redeploy,
    BNtoFloat,
} = require('../utils');

const {
    liquityOpen,
    liquitySupply,
} = require('../actions.js');

describe('Liquity-Supply', () => {
    const collAmount = hre.ethers.utils.parseUnits('100', 18);
    const collAmountOpen = hre.ethers.utils.parseUnits('8', 18);
    const collAmountSupply = hre.ethers.utils.parseUnits('4', 18);
    const LUSDAmountOpen = hre.ethers.utils.parseUnits('7000', 18);
    const maxFeePercentage = hre.ethers.utils.parseUnits('5', 16);

    let senderAcc; let proxy; let proxyAddr;
    let liquityView; let ITroveManager; let IPriceFeed;

    before(async () => {
        senderAcc = (await hre.ethers.getSigners())[0];
        proxy = await getProxy(senderAcc.address);
        proxyAddr = proxy.address;

        await redeploy('LiquityOpen');
        await redeploy('LiquitySupply');
        liquityView = await redeploy('LiquityView');
        ITroveManager = await hre.ethers.getContractAt('ITroveManager', liquityView.TroveManagerAddr());
        IPriceFeed = await hre.ethers.getContractAt('IPriceFeed', liquityView.PriceFeed());

        const wrapEthAddr = await getAddrFromRegistry('WrapEth');
        const wrapEthAction = new dfs.actions.basic.WrapEthAction(collAmount);
        const functionData = wrapEthAction.encodeForDsProxyCall()[1];
        await proxy['execute(address,bytes)'](wrapEthAddr, functionData, {
            value: collAmount,
            gasLimit: 3000000,
        });
    });

    afterEach(async () => {
        const ethPrice = await IPriceFeed['lastGoodPrice()']();
        const coll = await ITroveManager['getTroveColl(address)'](proxyAddr);
        const debt = await ITroveManager['getTroveDebt(address)'](proxyAddr);
        const CR = coll.mul(ethPrice).div(debt);

        console.log(`\tETH price:\t${BNtoFloat(ethPrice)}`);
        console.log(`\tTrove coll:\t${BNtoFloat(coll)} ETH`);
        console.log(`\tTrove debt:\t${BNtoFloat(debt)} LUSD`);
        console.log(`\tTrove CR:\t${BNtoFloat(CR.mul(100))}%`);
    });

    it(`... should open Trove with ${BNtoFloat(collAmountOpen)} ETH collateral and ${BNtoFloat(LUSDAmountOpen)} LUSD debt`, async () => {
        // eslint-disable-next-line max-len
        await liquityOpen(proxy, maxFeePercentage, collAmountOpen, LUSDAmountOpen, proxyAddr, proxyAddr);

        const coll = await ITroveManager['getTroveColl(address)'](proxyAddr);

        expect(coll).to.equal(collAmountOpen);
        expect(await balanceOf('0x5f98805A4E8be255a32880FDeC7F6728C6568bA0', proxyAddr)).to.equal(LUSDAmountOpen);
    });

    it(`... should supply additional ${BNtoFloat(collAmountSupply)} ETH of collateral`, async () => {
        await liquitySupply(proxy, collAmountSupply, proxyAddr);

        const collAfter = await ITroveManager['getTroveColl(address)'](proxyAddr);

        expect(collAfter).to.equal(collAmountOpen.add(collAmountSupply));
    });
});
