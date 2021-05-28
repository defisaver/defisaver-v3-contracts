const { expect } = require('chai');
const hre = require('hardhat');
const {
    balanceOf,
    getProxy,
    redeploy,
    depositToWeth,
    send,
    WETH_ADDRESS,
} = require('../utils');

const {
    liquityOpen,
    liquityWithdraw,
} = require('../actions.js');

const BNtoFloat = (bn) => hre.ethers.utils.formatUnits(bn, 18);

describe('Liquity-Withdraw', () => {
    const collAmountOpen = hre.ethers.utils.parseUnits('12', 18);
    const collAmountWithdraw = hre.ethers.utils.parseUnits('2', 18);
    const LUSDAmountOpen = hre.ethers.utils.parseUnits('7000', 18);
    const maxFeePercentage = hre.ethers.utils.parseUnits('5', 16);

    let senderAcc; let proxy; let proxyAddr;
    let liquityView; let ITroveManager; let IPriceFeed;
    let LUSDAddr;

    before(async () => {
        senderAcc = (await hre.ethers.getSigners())[0];
        proxy = await getProxy(senderAcc.address);
        proxyAddr = proxy.address;

        liquityView = await redeploy('LiquityView');
        ITroveManager = await hre.ethers.getContractAt('ITroveManager', liquityView.TroveManagerAddr());
        IPriceFeed = await hre.ethers.getContractAt('IPriceFeed', liquityView.PriceFeed());
        LUSDAddr = await liquityView.LUSDTokenAddr();

        await depositToWeth(collAmountOpen);
        await send(WETH_ADDRESS, proxyAddr, collAmountOpen);

        await redeploy('LiquityOpen');
        await redeploy('LiquityWithdraw');
    });

    afterEach(async () => {
        const troveStatus = await ITroveManager['getTroveStatus(address)'](proxyAddr);
        console.log(`\tTrove status: ${troveStatus}`);
        // eslint-disable-next-line eqeqeq
        if (troveStatus != 1) {
            console.log('\tTrove not active');
            return;
        }

        const ethPrice = await IPriceFeed['lastGoodPrice()']();
        const coll = await ITroveManager['getTroveColl(address)'](proxyAddr);
        const debt = await ITroveManager['getTroveDebt(address)'](proxyAddr);
        const CR = coll.mul(ethPrice).div(debt);

        console.log(`\tTrove coll:\t${BNtoFloat(coll)} ETH`);
        console.log(`\tTrove debt:\t${BNtoFloat(debt)} LUSD`);
        console.log(`\tTrove CR:\t${BNtoFloat(CR.mul(100))}%`);
        console.log(`\tETH price:\t${BNtoFloat(ethPrice)}`);
    });

    it(`... should open Trove with ${BNtoFloat(collAmountOpen)} ETH collateral and ${BNtoFloat(LUSDAmountOpen)} LUSD debt`, async () => {
        // eslint-disable-next-line max-len
        await liquityOpen(proxy, maxFeePercentage, collAmountOpen, LUSDAmountOpen, proxyAddr, proxyAddr);

        const coll = await ITroveManager['getTroveColl(address)'](proxyAddr);

        expect(coll).to.equal(collAmountOpen);
        expect(await balanceOf(LUSDAddr, proxyAddr)).to.equal(LUSDAmountOpen);
    });

    it(`... should withdraw ${BNtoFloat(collAmountWithdraw)} ETH from collateral`, async () => {
        await liquityWithdraw(proxy, collAmountWithdraw, proxyAddr);

        // eslint-disable-next-line max-len
        expect(await balanceOf(WETH_ADDRESS, proxyAddr)).to.equal(collAmountWithdraw);
    });
});
