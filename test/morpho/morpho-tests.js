const { getAssetInfo } = require('@defisaver/tokens');
const { compare } = require('@defisaver/tokens/esm/utils');
const { expect } = require('chai');
const { ethers } = require('hardhat');
const {
    morphoSupply, morphoWithdraw, morphoBorrow, morphoPayback,
} = require('../actions');
const {
    getContractFromRegistry,
    getProxy,
    fetchAmountinUSDPrice,
    approve,
    setBalance,
    setNetwork,
    Float2BN,
    balanceOf,
    takeSnapshot,
    revertToSnapshot,
} = require('../utils');

const morphoMarkets = [
    'DAI',
    'WETH',
    'USDC',
    'USDT',
    'WBTC',
    'STETH',
    'CRV',
];

const testSupply = async ({
    proxy,
    tokenAddress,
    amount,
    senderAcc,
    view,
}) => {
    const { logs } = await morphoSupply(
        proxy,
        tokenAddress,
        amount,
        senderAcc.address,
    ).then((e) => e.wait());

    const {
        totalSupplied,
    } = await view.getUserInfo(proxy.address).then((balances) => balances.filter(
        ({ tokenAddr: underlyingToken }) => compare(underlyingToken, tokenAddress),
    )[0]);
    // Aave 1 wei math error
    expect(totalSupplied.add('1')).to.be.gte(amount);

    const { data: logData } = logs.filter((e) => e.topics.includes(ethers.utils.id('MorphoSupply')))[0];
    const { amount: returnAmount } = ethers.utils.defaultAbiCoder.decode(
        [
            `(
                address tokenAddr,
                uint256 amount,
                address from,
                address onBehalf
            )`,
        ],
        `0x${logData.slice(130)}`,
    )[0];
    expect(returnAmount).to.be.eq(amount);
};

const testBorrow = async ({
    proxy,
    tokenAddress,
    amount,
    senderAcc,
    view,
}) => {
    const balanceB4 = await balanceOf(tokenAddress, senderAcc.address);
    const { logs } = await morphoBorrow(
        proxy,
        tokenAddress,
        amount.div('2'),
        senderAcc.address,
    ).then((e) => e.wait());

    const {
        totalBorrowed,
    } = await view.getUserInfo(proxy.address).then((balances) => balances.filter(
        ({ tokenAddr: underlyingToken }) => compare(underlyingToken, tokenAddress),
    )[0]);
    expect(totalBorrowed).to.be.gte(amount.div('2'));
    expect(
        await balanceOf(tokenAddress, senderAcc.address).then(
            (e) => e.sub(balanceB4),
        ),
    ).to.be.eq(amount.div('2'));

    const { data: logData } = logs.filter((e) => e.topics.includes(ethers.utils.id('MorphoBorrow')))[0];
    const { amount: returnAmount } = ethers.utils.defaultAbiCoder.decode(
        [
            `(
                address tokenAddr,
                uint256 amount,
                address to
            )`,
        ],
        `0x${logData.slice(130)}`,
    )[0];
    expect(returnAmount).to.be.eq(amount.div('2'));
};

const morphoSupplyTest = (testLength) => describe('Morpho-Supply-Test', () => {
    let senderAcc;
    let proxy;
    let view;
    let snapshotId;

    beforeEach(async () => {
        snapshotId = await takeSnapshot();
    });

    afterEach(async () => revertToSnapshot(snapshotId));

    before(async () => {
        setNetwork('mainnet');

        ([senderAcc] = await ethers.getSigners());
        proxy = await getProxy(senderAcc.address);
        await getContractFromRegistry('MorphoSupply');
        view = await getContractFromRegistry('MorphoView');
    });

    morphoMarkets.slice(0, testLength).map((market) => it(`... should supply ${market} to morpho`, async () => {
        const tokenAddress = getAssetInfo(market).address;
        const amount = Float2BN(fetchAmountinUSDPrice(market, 1000));
        await setBalance(tokenAddress, senderAcc.address, amount);
        await approve(tokenAddress, proxy.address);

        await testSupply({
            proxy,
            tokenAddress,
            amount,
            senderAcc,
            view,
        });
    }));
});

const morphoWithdrawTest = (testLength) => describe('Morpho-Withdraw-Test', () => {
    let senderAcc;
    let proxy;
    let view;
    let snapshotId;

    beforeEach(async () => {
        snapshotId = await takeSnapshot();
    });

    afterEach(async () => revertToSnapshot(snapshotId));

    before(async () => {
        setNetwork('mainnet');

        ([senderAcc] = await ethers.getSigners());
        proxy = await getProxy(senderAcc.address);

        await getContractFromRegistry('MorphoSupply');
        await getContractFromRegistry('MorphoWithdraw');
        view = await getContractFromRegistry('MorphoView');
    });

    morphoMarkets.slice(0, testLength).map((market) => it(`... should withdraw ${market} from morpho`, async () => {
        const tokenAddress = getAssetInfo(market).address;
        const amount = Float2BN(fetchAmountinUSDPrice(market, 1000));
        await setBalance(tokenAddress, senderAcc.address, amount);
        await approve(tokenAddress, proxy.address);

        await testSupply({
            proxy,
            tokenAddress,
            amount,
            senderAcc,
            view,
        });

        const { logs } = await morphoWithdraw(
            proxy,
            tokenAddress,
            amount.mul('2'),
            senderAcc.address,
        ).then((e) => e.wait());
        const {
            totalSupplied,
        } = await view.getUserInfo(proxy.address).then((balances) => balances.filter(
            ({ tokenAddr: underlyingToken }) => compare(underlyingToken, tokenAddress),
        )[0] || { totalSupplied: '0' });
        expect(totalSupplied).to.be.eq('0');

        const { data: logData } = logs.filter((e) => e.topics.includes(ethers.utils.id('MorphoWithdraw')))[0];
        const { amount: returnAmount } = ethers.utils.defaultAbiCoder.decode(
            [
                `(
                    address tokenAddr,
                    uint256 amount,
                    address to,
                )`,
            ],
            `0x${logData.slice(130)}`,
        )[0];
        expect(returnAmount).to.be.lte(amount.mul('2'));
        expect(returnAmount).to.be.gte(amount);
        expect(await balanceOf(tokenAddress, senderAcc.address)).to.be.gte(returnAmount);
    }));
});

const morphoBorrowTest = (testLength) => describe('Morpho-Borrow-Test', () => {
    let senderAcc;
    let proxy;
    let view;
    let snapshotId;

    beforeEach(async () => {
        snapshotId = await takeSnapshot();
    });

    afterEach(async () => revertToSnapshot(snapshotId));

    before(async () => {
        setNetwork('mainnet');

        ([senderAcc] = await ethers.getSigners());
        proxy = await getProxy(senderAcc.address);

        await getContractFromRegistry('MorphoSupply');
        await getContractFromRegistry('MorphoBorrow');
        view = await getContractFromRegistry('MorphoView');
    });

    morphoMarkets.slice(0, testLength).map((market) => it(`... should borrow ${market} from morpho`, async () => {
        const tokenAddress = getAssetInfo(market).address;
        const amount = Float2BN(fetchAmountinUSDPrice(market, 1000));
        await setBalance(tokenAddress, senderAcc.address, amount);
        await approve(tokenAddress, proxy.address);

        await testSupply({
            proxy,
            tokenAddress,
            amount,
            senderAcc,
            view,
        });

        await testBorrow({
            proxy,
            tokenAddress,
            amount,
            senderAcc,
            view,
        });
    }));
});

const morphoPaybackTest = (testLength) => describe('Morpho-Payback-Test', () => {
    let senderAcc;
    let proxy;
    let view;
    let snapshotId;

    beforeEach(async () => {
        snapshotId = await takeSnapshot();
    });

    afterEach(async () => revertToSnapshot(snapshotId));

    before(async () => {
        setNetwork('mainnet');

        ([senderAcc] = await ethers.getSigners());
        proxy = await getProxy(senderAcc.address);

        await getContractFromRegistry('MorphoSupply');
        await getContractFromRegistry('MorphoBorrow');
        await getContractFromRegistry('MorphoPayback');
        view = await getContractFromRegistry('MorphoView');
    });

    morphoMarkets.slice(0, testLength).map((market) => it(`... should payback ${market} to morpho`, async () => {
        const tokenAddress = getAssetInfo(market).address;
        const amount = Float2BN(fetchAmountinUSDPrice(market, 1000));
        await setBalance(tokenAddress, senderAcc.address, amount.mul('2'));
        await approve(tokenAddress, proxy.address);

        await testSupply({
            proxy,
            tokenAddress,
            amount,
            senderAcc,
            view,
        });

        await testBorrow({
            proxy,
            tokenAddress,
            amount,
            senderAcc,
            view,
        });

        const { logs } = await morphoPayback(
            proxy,
            tokenAddress,
            amount,
            senderAcc.address,
            proxy.address,
        ).then((e) => e.wait());
        const {
            totalBorrowed,
        } = await view.getUserInfo(proxy.address).then((balances) => balances.filter(
            ({ tokenAddr: underlyingToken }) => compare(underlyingToken, tokenAddress),
        )[0]);
        expect(totalBorrowed).to.be.eq('0');

        const { data: logData } = logs.filter((e) => e.topics.includes(ethers.utils.id('MorphoPayback')))[0];
        const { amount: returnAmount } = ethers.utils.defaultAbiCoder.decode(
            [
                `(
                    address tokenAddr,
                    uint256 amount,
                    address from,
                    address onBehalf
                )`,
            ],
            `0x${logData.slice(130)}`,
        )[0];
        expect(returnAmount).to.be.gte(amount.div(2));
        const userBalance = await balanceOf(tokenAddress, senderAcc.address);
        const proxyBalance = await balanceOf(tokenAddress, proxy.address);
        expect(userBalance.add(proxyBalance).add(returnAmount)).to.be.eq(amount.mul('3').div('2'));
    }));
});

const morphoFullTest = (testLength) => describe('Morpho-Full-Test', () => {
    morphoSupplyTest(testLength);
    morphoWithdrawTest(testLength);
    morphoBorrowTest(testLength);
    morphoPaybackTest(testLength);
});

module.exports = {
    morphoFullTest,
    morphoSupplyTest,
    morphoWithdrawTest,
    morphoBorrowTest,
    morphoPaybackTest,
};
