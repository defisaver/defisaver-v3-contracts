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
    // liquityClose,
} = require('../actions.js');

describe('Liquity-Open', () => {
    const collMax = hre.ethers.utils.parseUnits('100', 18);
    const collAmount = hre.ethers.utils.parseUnits('10', 18);
    const LUSDAmount = hre.ethers.utils.parseUnits('4000', 18);
    const maxFeePercentage = hre.ethers.utils.parseUnits('5', 16);
    // const maxSlip = hre.ethers.utils.parseUnits('2', 16);

    let senderAcc; let proxy; let proxyAddr;
    let liquityView; let ITroveManager; let IPriceFeed;

    before(async () => {
        senderAcc = (await hre.ethers.getSigners())[0];
        proxy = await getProxy(senderAcc.address);
        proxyAddr = proxy.address;

        await redeploy('LiquityOpen');
        liquityView = await redeploy('LiquityView');
        ITroveManager = await hre.ethers.getContractAt('ITroveManager', liquityView.TroveManagerAddr());
        IPriceFeed = await hre.ethers.getContractAt('IPriceFeed', liquityView.PriceFeed());

        const wrapEthAddr = await getAddrFromRegistry('WrapEth');
        const wrapEthAction = new dfs.actions.basic.WrapEthAction(collMax);
        const functionData = wrapEthAction.encodeForDsProxyCall()[1];
        await proxy['execute(address,bytes)'](wrapEthAddr, functionData, {
            value: collMax,
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

    it(`... should open Trove with ${BNtoFloat(collAmount)} ETH collateral and ${BNtoFloat(LUSDAmount)} LUSD debt`, async () => {
        await liquityOpen(proxy, maxFeePercentage, collAmount, LUSDAmount, proxyAddr, proxyAddr);

        const coll = await ITroveManager['getTroveColl(address)'](proxyAddr);

        expect(coll).to.equal(collAmount);
        expect(await balanceOf('0x5f98805A4E8be255a32880FDeC7F6728C6568bA0', proxyAddr)).to.equal(LUSDAmount);
    });

    it(`... should open Trove with whole WETH balance as collateral and ${BNtoFloat(LUSDAmount)} LUSD debt`, async () => {
        // wait for LiquityClose tests
    });
});
