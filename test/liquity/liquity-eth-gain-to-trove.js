const { expect } = require('chai');
const hre = require('hardhat');
const {
    balanceOf,
    getProxy,
    redeploy,
    depositToWeth,
    send,
    WETH_ADDRESS,
    fetchAmountinUSDPrice,
    BN2Float,
    Float2BN,
} = require('../utils');

const {
    liquityOpen,
    liquitySPDeposit,
    liquityEthGainToTrove,
} = require('../actions.js');

describe('Liquity-ETH-Gain-To-Trove', function () {
    this.timeout(1000000);
    const WETHAmountOpen = Float2BN(fetchAmountinUSDPrice('WETH', 12000), 18);
    const LUSDAmountOpen = Float2BN(fetchAmountinUSDPrice('LUSD', 6000), 18);

    let senderAcc; let proxy; let proxyAddr;
    let liquityView; let LQTYAddr;

    before(async () => {
        senderAcc = (await hre.ethers.getSigners())[0];
        proxy = await getProxy(senderAcc.address);
        proxyAddr = proxy.address;

        liquityView = await redeploy('LiquityView');
        LQTYAddr = await liquityView.LQTYTokenAddr();

        await depositToWeth(WETHAmountOpen);
        await send(WETH_ADDRESS, proxyAddr, WETHAmountOpen);

        await redeploy('LiquityOpen');
        await redeploy('LiquitySPDeposit');
        await redeploy('LiquityEthGainToTrove');
    });

    afterEach(async () => {
        // eslint-disable-next-line object-curly-newline
        const { troveStatus, collAmount, debtAmount, collPrice } = await liquityView['getTroveInfo(address)'](proxyAddr);
        console.log(`\tTrove status: ${troveStatus}`);
        // eslint-disable-next-line eqeqeq
        if (troveStatus != 1) {
            console.log('\tTrove not active');
            return;
        }
        const CR = collAmount.mul(collPrice).div(debtAmount);

        console.log(`\tTrove coll:\t${BN2Float(collAmount)} ETH`);
        console.log(`\tTrove debt:\t${BN2Float(debtAmount)} LUSD`);
        console.log(`\tTrove CR:\t${BN2Float(CR.mul(100))}%`);
        console.log(`\tETH price:\t${BN2Float(collPrice)}`);

        const { compoundedLUSD, ethGain, lqtyGain } = await liquityView['getDepositorInfo(address)'](proxyAddr);

        console.log(`\tCompounded deposit:\t${BN2Float(compoundedLUSD)} LUSD`);
        console.log(`\tETH gain:\t${BN2Float(ethGain)} ETH`);
        console.log(`\tLQTY gain:\t${BN2Float(lqtyGain)} LQTY`);
    });

    it(`... should open a Trove with ${BN2Float(WETHAmountOpen)} WETH collateral and ${BN2Float(LUSDAmountOpen)} LUSD net debt`, async () => {
        // eslint-disable-next-line max-len
        await liquityOpen(proxy, Float2BN('0.05'), WETHAmountOpen, LUSDAmountOpen, proxyAddr, proxyAddr);
    });

    it(`... should deposit ${BN2Float(LUSDAmountOpen)} LUSD to the stability pool`, async () => {
        // eslint-disable-next-line max-len
        await liquitySPDeposit(proxy, LUSDAmountOpen, proxyAddr, proxyAddr, proxyAddr);

        const { compoundedLUSD } = await liquityView['getDepositorInfo(address)'](proxyAddr);
        expect(compoundedLUSD).to.be.equal(LUSDAmountOpen);
    });

    it('... should withdraw ETH gain to the users trove', async () => {
        const { collAmount } = await liquityView['getTroveInfo(address)'](proxyAddr);
        const lqtyAmount = await balanceOf(LQTYAddr, proxyAddr);
        const { ethGain, lqtyGain } = await liquityView['getDepositorInfo(address)'](proxyAddr);

        if (ethGain.isZero()) return;
        // reverts if gain is 0
        // TODO figure out how to test this

        await liquityEthGainToTrove(proxy, proxyAddr);

        const collChange = (await liquityView['getTroveInfo(address)'](proxyAddr)).collAmount.sub(collAmount);
        const lqtyChange = (await balanceOf(LQTYAddr, proxyAddr)).sub(lqtyAmount)

        expect(ethGain).to.be.equal(collChange);
        expect(lqtyGain).to.be.equal(lqtyChange);
    });
});
