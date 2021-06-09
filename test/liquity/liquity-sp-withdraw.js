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
    liquitySPWithdraw,
} = require('../actions.js');

describe('Liquity-SP-Withdraw', function () {
    this.timeout(1000000);
    const WETHSellAmount = Float2BN(fetchAmountinUSDPrice('WETH', 12000), 18);
    const lusdAmountDeposit = Float2BN(fetchAmountinUSDPrice('LUSD', 10000), 18);
    const lusdAmountWithdraw = Float2BN(fetchAmountinUSDPrice('LUSD', 4000), 18);

    let senderAcc; let proxy; let proxyAddr;
    let liquityView; let LUSDAddr; let uniWrapper;
    let lusdAmountBought;

    before(async () => {
        senderAcc = (await hre.ethers.getSigners())[0];
        proxy = await getProxy(senderAcc.address);
        proxyAddr = proxy.address;

        liquityView = await redeploy('LiquityView');
        LUSDAddr = await liquityView.LUSDTokenAddr();

        await depositToWeth(WETHSellAmount);
        await send(WETH_ADDRESS, proxyAddr, WETHSellAmount);

        await redeploy('DFSSell');
        uniWrapper = await redeploy('UniswapWrapperV3');
        await setNewExchangeWrapper(senderAcc, uniWrapper.address);

        await redeploy('LiquitySPDeposit');
        await redeploy('LiquitySPWithdraw');

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

    it(`... should withdraw ${BN2Float(lusdAmountWithdraw)}`, async () => {
        // eslint-disable-next-line max-len
        await liquitySPWithdraw(proxy, lusdAmountWithdraw, proxyAddr, proxyAddr, proxyAddr);

        const { compoundedLUSD } = await liquityView['getDepositorInfo(address)'](proxyAddr);
        const lusdBalance = await balanceOf(LUSDAddr, proxyAddr);

        expect(compoundedLUSD).to.be.equal(lusdAmountDeposit.sub(lusdAmountWithdraw));
        // eslint-disable-next-line max-len
        expect(lusdBalance).to.be.equal(lusdAmountBought.sub(lusdAmountDeposit.sub(lusdAmountWithdraw)));
    });

    it('... should withdraw the rest of the deposited LUSD', async () => {
        // eslint-disable-next-line max-len
        await liquitySPWithdraw(proxy, hre.ethers.constants.MaxUint256, proxyAddr, proxyAddr, proxyAddr);

        const { compoundedLUSD } = await liquityView['getDepositorInfo(address)'](proxyAddr);
        const lusdBalance = await balanceOf(LUSDAddr, proxyAddr);

        expect(compoundedLUSD).to.be.equal(0);
        // eslint-disable-next-line max-len
        expect(lusdBalance).to.be.equal(lusdAmountBought);
    });
});
