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
} = require('../../utils');

const {
    sell,
    liquityStake,
    liquityUnstake,
} = require('../../actions.js');

describe('Liquity-Unstake', function () {
    this.timeout(1000000);
    const WETHSellAmount = Float2BN(fetchAmountinUSDPrice('WETH', 12000), 18);
    const lqtyAmountStake = Float2BN(fetchAmountinUSDPrice('LQTY', 8000), 18);
    const lqtyAmountUnstake = Float2BN(fetchAmountinUSDPrice('LQTY', 5000), 18);

    let senderAcc; let proxy; let proxyAddr;
    let liquityView; let LQTYAddr; let uniWrapper;
    let lqtyAmountBought; let LUSDAddr;

    before(async () => {
        senderAcc = (await hre.ethers.getSigners())[0];
        proxy = await getProxy(senderAcc.address);
        proxyAddr = proxy.address;

        liquityView = await redeploy('LiquityView');
        LQTYAddr = await liquityView.LQTYTokenAddr();
        LUSDAddr = await liquityView.LUSDTokenAddr();

        await depositToWeth(WETHSellAmount);
        await send(WETH_ADDRESS, proxyAddr, WETHSellAmount);

        await redeploy('DFSSell');
        uniWrapper = await redeploy('UniswapWrapperV3');
        await setNewExchangeWrapper(senderAcc, uniWrapper.address);

        await redeploy('LiquityStake');
        await redeploy('LiquityUnstake');

        await sell(
            proxy,
            WETH_ADDRESS,
            LQTYAddr,
            WETHSellAmount,
            uniWrapper.address,
            senderAcc.address,
            proxyAddr,
        );
        lqtyAmountBought = await balanceOf(LQTYAddr, proxyAddr);
    });

    afterEach(async () => {
        // eslint-disable-next-line object-curly-newline
        const { stake, ethGain, lusdGain } = await liquityView['getStakeInfo(address)'](proxyAddr);

        console.log(`\tStake:\t${BN2Float(stake)} LQTY`);
        console.log(`\tETH gain:\t${BN2Float(ethGain)} ETH`);
        console.log(`\tLUSD gain:\t${BN2Float(lusdGain)} LUSD`);
    });

    it(`... should deposit ${BN2Float(lqtyAmountStake)} LQTY to the staking contract`, async () => {
        // eslint-disable-next-line max-len
        await liquityStake(proxy, lqtyAmountStake, proxyAddr, proxyAddr, proxyAddr);

        const { stake } = await liquityView['getStakeInfo(address)'](proxyAddr);
        expect(stake).to.be.equal(lqtyAmountStake);
    });

    it(`... should withdraw ${BN2Float(lqtyAmountUnstake)} LQTY from the staking contract`, async () => {
        const wethBalance = await balanceOf(WETH_ADDRESS, proxyAddr);
        const lusdBalance = await balanceOf(LUSDAddr, proxyAddr);

        const { ethGain, lusdGain } = await liquityView['getStakeInfo(address)'](proxyAddr);
        // eslint-disable-next-line max-len
        await liquityUnstake(proxy, lqtyAmountUnstake, proxyAddr, proxyAddr, proxyAddr);

        const wethChange = (await balanceOf(WETH_ADDRESS, proxyAddr)).sub(wethBalance);
        const lusdChange = (await balanceOf(LUSDAddr, proxyAddr)).sub(lusdBalance);

        const { stake } = await liquityView['getStakeInfo(address)'](proxyAddr);
        expect(stake).to.be.equal(lqtyAmountStake.sub(lqtyAmountUnstake));
        expect(wethChange).to.be.equal(ethGain);
        expect(lusdChange).to.be.equal(lusdGain);
    });

    it('... should withdraw all staked LQTY from the staking contract', async () => {
        const wethBalance = await balanceOf(WETH_ADDRESS, proxyAddr);
        const lusdBalance = await balanceOf(LUSDAddr, proxyAddr);

        const { ethGain, lusdGain } = await liquityView['getStakeInfo(address)'](proxyAddr);
        // eslint-disable-next-line max-len
        await liquityUnstake(proxy, hre.ethers.constants.MaxUint256, proxyAddr, proxyAddr, proxyAddr);

        const wethChange = (await balanceOf(WETH_ADDRESS, proxyAddr)).sub(wethBalance);
        const lusdChange = (await balanceOf(LUSDAddr, proxyAddr)).sub(lusdBalance);

        const { stake } = await liquityView['getStakeInfo(address)'](proxyAddr);
        expect(stake).to.be.equal(0);
        expect(lqtyAmountBought).to.be.equal(await balanceOf(LQTYAddr, proxyAddr));
        expect(wethChange).to.be.equal(ethGain);
        expect(lusdChange).to.be.equal(lusdGain);
    });
});
