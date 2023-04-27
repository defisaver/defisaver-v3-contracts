const { ethers } = require('hardhat');
const { getAssetInfo } = require('@defisaver/tokens');
const { expect } = require('chai');
const {
    getProxy,
    getContractFromRegistry,
    setBalance,
    Float2BN,
    approve,
    balanceOf,
    BN2Float,
    takeSnapshot,
    revertToSnapshot,
    WETH_ADDRESS,
} = require('../utils');
const { bprotocolLiquitySPDeposit, bprotocolLiquitySPWithdraw } = require('../actions');
const { getLocalTokenPrice } = require('../utils');

const lusdAddress = getAssetInfo('LUSD').address;
const lqtyAddress = getAssetInfo('LQTY').address;
const BAMMAddress = '0x00FF66AB8699AAfa050EE5EF5041D1503aa0849a';

const testDeposit = async (proxy, lusdAmount, from, lqtyTo, uintmax = false) => {
    await setBalance(lusdAddress, from, lusdAmount);
    await approve(lusdAddress, proxy.address);

    const sharesBefore = await balanceOf(BAMMAddress, proxy.address);
    const lqtyBalanceBefore = await balanceOf(lqtyAddress, lqtyTo);

    await bprotocolLiquitySPDeposit(
        proxy, uintmax ? ethers.constants.MaxUint256 : lusdAmount, from, lqtyTo,
    );

    const sharesMinted = await balanceOf(BAMMAddress, proxy.address)
        .then((e) => e.sub(sharesBefore));
    const lqtyRewarded = await balanceOf(lqtyAddress, lqtyTo)
        .then((balance) => balance.sub(lqtyBalanceBefore));

    console.log('BprotocolLiquitySPDeposit', {
        sharesMinted: BN2Float(sharesMinted), lqtyRewarded: BN2Float(lqtyRewarded),
    });
    return sharesMinted;
};

const testWithdraw = async (proxy, shareAmount, to, lqtyTo) => {
    const wethBalanceBefore = await balanceOf(WETH_ADDRESS, to);
    const lusdBalanceBefore = await balanceOf(lusdAddress, to);
    const lqtyBalanceBefore = await balanceOf(lqtyAddress, lqtyTo);
    await bprotocolLiquitySPWithdraw(
        proxy, shareAmount, to, lqtyTo,
    );
    const wethReturned = await balanceOf(WETH_ADDRESS, to)
        .then((balance) => balance.sub(wethBalanceBefore));
    const lusdReturned = await balanceOf(lusdAddress, to)
        .then((balance) => balance.sub(lusdBalanceBefore));
    const lqtyRewarded = await balanceOf(lqtyAddress, lqtyTo)
        .then((balance) => balance.sub(lqtyBalanceBefore));

    console.log('BprotocolLiquitySPWithdraw', {
        wethReturned: BN2Float(wethReturned),
        lusdReturned: BN2Float(lusdReturned),
        lqtyRewarded: BN2Float(lqtyRewarded),
    });

    const ethPrice = Float2BN(getLocalTokenPrice('ETH').toString());
    const wethReturnedValue = ethPrice.mul(wethReturned).div(Float2BN('1', 18));

    return {
        wethReturned, wethReturnedValue, lusdReturned, lqtyRewarded,
    };
};

const BprotocolLiquitySPDepositTest = () => describe('Bprotocol-LiquitySP-Deposit-Test', () => {
    let senderAcc;
    let proxy;
    let snapshot;

    const DEPOSIT_AMOUNT = Float2BN('5000');

    before(async () => {
        ([senderAcc] = await ethers.getSigners());
        proxy = await getProxy(senderAcc.address);
        await getContractFromRegistry('BprotocolLiquitySPDeposit');
    });

    beforeEach(() => takeSnapshot().then((e) => { snapshot = e; }));
    afterEach(() => revertToSnapshot(snapshot));

    it(`... should deposit ${BN2Float(DEPOSIT_AMOUNT)} LUSD to Bprotocol`, async () => {
        await testDeposit(proxy, DEPOSIT_AMOUNT, senderAcc.address, senderAcc.address);
    });

    it('... should deposit MAXUINT LUSD to Bprotocol', async () => {
        await testDeposit(proxy, DEPOSIT_AMOUNT, senderAcc.address, senderAcc.address, true);
    });
});

const BprotocolLiquitySPWithdrawTest = () => describe('Bprotocol-LiquitySP-Withdraw-Test', () => {
    let senderAcc;
    let proxy;
    let snapshot;

    const DEPOSIT_AMOUNT = Float2BN('5000');

    before(async () => {
        ([senderAcc] = await ethers.getSigners());
        proxy = await getProxy(senderAcc.address);
        await getContractFromRegistry('BprotocolLiquitySPDeposit');
        await getContractFromRegistry('BprotocolLiquitySPWithdraw');
    });

    beforeEach(() => takeSnapshot().then((e) => { snapshot = e; }));
    afterEach(() => revertToSnapshot(snapshot));

    it(`... should deposit ${BN2Float(DEPOSIT_AMOUNT)} LUSD then withdraw zero (LQTY reward claim only)`, async () => {
        await testDeposit(
            proxy, DEPOSIT_AMOUNT, senderAcc.address, senderAcc.address,
        );
        const { lusdReturned, wethReturnedValue } = await testWithdraw(
            proxy, '0', senderAcc.address, senderAcc.address,
        );

        const withdrawnValue = lusdReturned.add(wethReturnedValue);
        console.log({ withdrawnValue: BN2Float(withdrawnValue) });
    });

    it(`... should deposit ${BN2Float(DEPOSIT_AMOUNT)} LUSD then withdraw half from Bprotocol`, async () => {
        const sharesMinted = await testDeposit(
            proxy, DEPOSIT_AMOUNT, senderAcc.address, senderAcc.address,
        );
        const { lusdReturned, wethReturnedValue } = await testWithdraw(
            proxy, sharesMinted.div(2n), senderAcc.address, senderAcc.address,
        );

        const withdrawnValue = lusdReturned.add(wethReturnedValue);
        console.log({ withdrawnValue: BN2Float(withdrawnValue) });
        expect(withdrawnValue).to.be.closeTo(DEPOSIT_AMOUNT.div(2n), DEPOSIT_AMOUNT.div(20n));
    });

    it('... should deposit then withdraw MAXUINT from Bprotocol', async () => {
        await testDeposit(
            proxy, DEPOSIT_AMOUNT, senderAcc.address, senderAcc.address, true,
        );

        const { lusdReturned, wethReturnedValue } = await testWithdraw(
            proxy, ethers.constants.MaxUint256, senderAcc.address, senderAcc.address,
        );

        const withdrawnValue = lusdReturned.add(wethReturnedValue);
        console.log({ withdrawnValue: BN2Float(withdrawnValue) });
        expect(withdrawnValue).to.be.closeTo(DEPOSIT_AMOUNT, DEPOSIT_AMOUNT.div(20n));
    });
});

module.exports = {
    BprotocolLiquitySPDepositTest,
    BprotocolLiquitySPWithdrawTest,
};
