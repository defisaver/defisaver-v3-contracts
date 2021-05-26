const { expect } = require('chai');
const hre = require('hardhat');
const dfs = require('@defisaver/sdk');
const {
    getAddrFromRegistry,
    balanceOf,
    getProxy,
    redeploy,
    setNewExchangeWrapper,
    WETH_ADDRESS,
} = require('../utils');

const {
    sell,
    liquityOpen,
    liquityClose,
} = require('../actions.js');

const BNtoFloat = (bn) => hre.ethers.utils.formatUnits(bn, 18);

describe('Liquity-Close', () => {
    const WETHSellAmount = hre.ethers.utils.parseUnits('1', 18);
    const collAmountOpen = hre.ethers.utils.parseUnits('10', 18);
    const LUSDAmountOpen = hre.ethers.utils.parseUnits('4000', 18);
    const maxFeePercentage = hre.ethers.utils.parseUnits('5', 16);

    let senderAcc; let proxy; let proxyAddr;
    let LUSDAddr;
    let liquityView; let ITroveManager; let IPriceFeed;
    let uniWrapper;

    before(async () => {
        senderAcc = (await hre.ethers.getSigners())[0];
        proxy = await getProxy(senderAcc.address);
        proxyAddr = proxy.address;

        liquityView = await redeploy('LiquityView');
        ITroveManager = await hre.ethers.getContractAt('ITroveManager', liquityView.TroveManagerAddr());
        IPriceFeed = await hre.ethers.getContractAt('IPriceFeed', liquityView.PriceFeed());
        LUSDAddr = await liquityView.LUSDTokenAddr();

        const wrapEthAddr = await getAddrFromRegistry('WrapEth');
        const wrapEthAction = new dfs.actions.basic.WrapEthAction(collAmountOpen);
        const functionData = wrapEthAction.encodeForDsProxyCall()[1];
        await proxy['execute(address,bytes)'](wrapEthAddr, functionData, {
            value: collAmountOpen,
            gasLimit: 3000000,
        });

        await redeploy('DFSSell');
        uniWrapper = await redeploy('UniswapWrapperV3');
        await setNewExchangeWrapper(senderAcc, uniWrapper.address);

        await redeploy('LiquityOpen');
        await redeploy('LiquityClose');
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

    it('... should close Trove', async () => {
        await sell(
            proxy,
            WETH_ADDRESS,
            LUSDAddr,
            WETHSellAmount,
            uniWrapper.address,
            senderAcc.address,
            proxyAddr,
        );

        await liquityClose(proxy, proxyAddr, proxyAddr);
        expect(await balanceOf(WETH_ADDRESS, proxyAddr)).to.equal(collAmountOpen);
    });
});
