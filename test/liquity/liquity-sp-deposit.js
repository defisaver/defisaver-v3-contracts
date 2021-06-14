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
    fetchAmountinUSDPrice,
    BN2Float,
    Float2BN,
} = require('../utils');

const {
    sell,
    liquitySPDeposit,
} = require('../actions.js');

describe('Liquity-SP-Deposit', function () {
    this.timeout(1000000);
    const WETHSellAmount = Float2BN(fetchAmountinUSDPrice('WETH', 12000), 18);
    const lusdAmountDeposit = Float2BN(fetchAmountinUSDPrice('LUSD', 4000), 18);

    let senderAcc; let proxy; let proxyAddr;
    let liquityView; let LUSDAddr; let uniWrapper;
    let lusdAmountBought; let LQTYAddr;

    before(async () => {
        senderAcc = (await hre.ethers.getSigners())[0];
        proxy = await getProxy(senderAcc.address);
        proxyAddr = proxy.address;

        liquityView = await redeploy('LiquityView');
        LUSDAddr = await liquityView.LUSDTokenAddr();
        LQTYAddr = await liquityView.LQTYTokenAddr();

        await depositToWeth(WETHSellAmount);
        await send(WETH_ADDRESS, proxyAddr, WETHSellAmount);

        await redeploy('DFSSell');
        uniWrapper = await redeploy('UniswapWrapperV3');
        await setNewExchangeWrapper(senderAcc, uniWrapper.address);

        await redeploy('LiquitySPDeposit');

        await sell(
            proxy,
            WETH_ADDRESS,
            LUSDAddr,
            WETHSellAmount,
            uniWrapper.address,
            senderAcc.address,
            proxyAddr,
        );
        lusdAmountBought = await balanceOf(LUSDAddr, proxyAddr);
    });

    afterEach(async () => {
        // eslint-disable-next-line object-curly-newline
        const { compoundedLUSD, ethGain, lqtyGain } = await liquityView['getDepositorInfo(address)'](proxyAddr);

        console.log(`\tCompounded deposit:\t${BN2Float(compoundedLUSD)} LUSD`);
        console.log(`\tETH gain:\t${BN2Float(ethGain)} ETH`);
        console.log(`\tLQTY gain:\t${BN2Float(lqtyGain)} LQTY`);
    });

    it(`... should deposit ${BN2Float(lusdAmountDeposit)} LUSD to the stability pool`, async () => {
        // eslint-disable-next-line max-len
        await liquitySPDeposit(proxy, lusdAmountDeposit, proxyAddr, proxyAddr, proxyAddr);

        const { compoundedLUSD } = await liquityView['getDepositorInfo(address)'](proxyAddr);
        expect(compoundedLUSD).to.be.equal(lusdAmountDeposit);
    });

    it('... should deposit the remainder of available LUSD', async () => {
        const wethBalance = await balanceOf(WETH_ADDRESS, proxyAddr);
        const lqtyBalance = await balanceOf(LQTYAddr, proxyAddr);

        const { ethGain, lqtyGain } = await liquityView['getDepositorInfo(address)'](proxyAddr);
        // eslint-disable-next-line max-len
        await liquitySPDeposit(proxy, hre.ethers.constants.MaxUint256, proxyAddr, proxyAddr, proxyAddr);

        const { compoundedLUSD } = await liquityView['getDepositorInfo(address)'](proxyAddr);

        const wethChange = (await balanceOf(WETH_ADDRESS, proxyAddr)).sub(wethBalance);
        const lqtyChange = (await balanceOf(LQTYAddr, proxyAddr)).sub(lqtyBalance);

        expect(ethGain).to.be.equal(wethChange);
        expect(lqtyGain).to.be.equal(lqtyChange);
        expect(compoundedLUSD).to.be.equal(lusdAmountBought);
    });
});
