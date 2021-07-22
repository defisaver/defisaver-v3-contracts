const { expect } = require('chai');
const hre = require('hardhat');
const {
    balanceOf,
    getProxy,
    redeploy,
    depositToWeth,
    send,
    WETH_ADDRESS,
    Float2BN,
    BN2Float,
    fetchAmountinUSDPrice,
} = require('../../utils');

const {
    liquityOpen,
    liquitySupply,
} = require('../../actions.js');

describe('Liquity-Supply', function () {
    this.timeout(1000000);
    const WETHAmount = Float2BN(fetchAmountinUSDPrice('WETH', 60000), 18);
    const collAmountOpen = Float2BN(fetchAmountinUSDPrice('WETH', 24000), 18);
    const collAmountSupply = Float2BN(fetchAmountinUSDPrice('WETH', 12000), 18);
    const LUSDAmountOpen = Float2BN(fetchAmountinUSDPrice('LUSD', 6000), 18);
    const maxFeePercentage = hre.ethers.utils.parseUnits('5', 16);

    let senderAcc; let proxy; let proxyAddr;
    let liquityView; let LUSDAddr;

    before(async () => {
        senderAcc = (await hre.ethers.getSigners())[0];
        proxy = await getProxy(senderAcc.address);
        proxyAddr = proxy.address;

        liquityView = await redeploy('LiquityView');
        LUSDAddr = await liquityView.LUSDTokenAddr();

        await depositToWeth(WETHAmount);
        await send(WETH_ADDRESS, proxyAddr, WETHAmount);

        await redeploy('LiquityOpen');
        await redeploy('LiquitySupply');
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
    });

    it(`... should open Trove with ${BN2Float(collAmountOpen)} WETH collateral and ${BN2Float(LUSDAmountOpen)} LUSD debt`, async () => {
        // eslint-disable-next-line max-len
        await liquityOpen(proxy, maxFeePercentage, collAmountOpen, LUSDAmountOpen, proxyAddr, proxyAddr);

        const { collAmount } = await liquityView['getTroveInfo(address)'](proxyAddr);

        expect(collAmount).to.equal(collAmountOpen);
        expect(await balanceOf(LUSDAddr, proxyAddr)).to.equal(LUSDAmountOpen);
    });

    it(`... should supply additional ${BN2Float(collAmountSupply)} WETH of collateral`, async () => {
        await liquitySupply(proxy, collAmountSupply, proxyAddr);

        const { collAmount } = await liquityView['getTroveInfo(address)'](proxyAddr);

        expect(collAmount).to.equal(collAmountOpen.add(collAmountSupply));
    });

    it('... should supply the rest of available WETH as collateral', async () => {
        await liquitySupply(proxy, hre.ethers.constants.MaxUint256, proxyAddr);

        const { collAmount } = await liquityView['getTroveInfo(address)'](proxyAddr);

        expect(collAmount).to.equal(WETHAmount);
    });
});
