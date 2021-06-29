const { expect } = require('chai');
const hre = require('hardhat');
const {
    balanceOf,
    getProxy,
    redeploy,
    setNewExchangeWrapper,
    depositToWeth,
    send,
    WETH_ADDRESS,
    Float2BN,
    BN2Float,
    fetchAmountinUSDPrice,
} = require('../../utils');

const {
    sell,
    liquityOpen,
    liquityClose,
} = require('../../actions.js');

describe('Liquity-Close', function () {
    this.timeout(1000000);
    const WETHSellAmount = Float2BN(fetchAmountinUSDPrice('WETH', 500), 18);
    const collAmountOpen = Float2BN(fetchAmountinUSDPrice('WETH', 12000), 18);
    const LUSDAmountOpen = Float2BN(fetchAmountinUSDPrice('LUSD', 6000), 18);
    const maxFeePercentage = hre.ethers.utils.parseUnits('5', 16);

    let senderAcc; let proxy; let proxyAddr;
    let LUSDAddr; let liquityView; let uniWrapper;

    before(async () => {
        senderAcc = (await hre.ethers.getSigners())[0];
        proxy = await getProxy(senderAcc.address);
        proxyAddr = proxy.address;

        liquityView = await redeploy('LiquityView');
        LUSDAddr = await liquityView.LUSDTokenAddr();

        await depositToWeth(collAmountOpen);
        await send(WETH_ADDRESS, proxyAddr, collAmountOpen);

        await redeploy('DFSSell');
        uniWrapper = await redeploy('UniswapWrapperV3');
        await setNewExchangeWrapper(senderAcc, uniWrapper.address);

        await redeploy('LiquityOpen');
        await redeploy('LiquityClose');
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
