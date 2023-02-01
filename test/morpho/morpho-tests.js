const { getAssetInfo } = require('@defisaver/tokens');
const { compare } = require('@defisaver/tokens/esm/utils');
const { expect } = require('chai');
const { ethers } = require('hardhat');
const {
    morphoAaveV2Supply, morphoAaveV2Withdraw, morphoAaveV2Borrow, morphoAaveV2Payback, morphoClaim,
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
    resetForkToBlock,
    BN2Float,
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
    const { logs } = await morphoAaveV2Supply(
        proxy,
        tokenAddress,
        amount,
        senderAcc.address,
    ).then((e) => e.wait());

    const totalSupplied = await view.getUserInfo(proxy.address)
        .then(({ userBalances }) => userBalances.find(
            ({ underlying }) => compare(underlying, tokenAddress),
        ))
        .then(({ supplyBalanceInP2P, supplyBalanceOnPool }) => supplyBalanceInP2P
            .add(supplyBalanceOnPool));
    // Aave 1 wei math error
    expect(totalSupplied.add('1')).to.be.gte(amount);

    const { data: logData } = logs.filter((e) => e.topics.includes(ethers.utils.id('MorphoAaveV2Supply')))[0];
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
    const { logs } = await morphoAaveV2Borrow(
        proxy,
        tokenAddress,
        amount.div('2'),
        senderAcc.address,
    ).then((e) => e.wait());

    const totalBorrowed = await view.getUserInfo(proxy.address)
        .then(({ userBalances }) => userBalances.find(
            ({ underlying }) => compare(underlying, tokenAddress),
        ))
        .then(({ borrowBalanceInP2P, borrowBalanceOnPool }) => borrowBalanceInP2P
            .add(borrowBalanceOnPool));
    expect(totalBorrowed).to.be.gte(amount.div('2'));
    expect(
        await balanceOf(tokenAddress, senderAcc.address).then(
            (e) => e.sub(balanceB4),
        ),
    ).to.be.eq(amount.div('2'));

    const { data: logData } = logs.filter((e) => e.topics.includes(ethers.utils.id('MorphoAaveV2Borrow')))[0];
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

const morphoAaveV2SupplyTest = (testLength) => describe('Morpho-Supply-Test', () => {
    let senderAcc;
    let proxy;
    let view;
    let marketStatus;
    let snapshotId;

    beforeEach(async () => {
        snapshotId = await takeSnapshot();
    });

    afterEach(async () => revertToSnapshot(snapshotId));

    before(async () => {
        setNetwork('mainnet');

        ([senderAcc] = await ethers.getSigners());
        proxy = await getProxy(senderAcc.address);
        await getContractFromRegistry('MorphoAaveV2Supply');
        view = await getContractFromRegistry('MorphoAaveV2View');
        marketStatus = await view.getMarketInfo();
    });

    morphoMarkets.slice(0, testLength).map((market) => it(`... should supply ${market} to morpho`, async function () {
        const tokenAddress = getAssetInfo(market).address;
        const { isSupplyPaused, isDeprecated } = marketStatus.find(
            ({ underlying }) => compare(underlying, tokenAddress),
        ).pauseStatus;

        if (isSupplyPaused || isDeprecated) {
            console.log({ isSupplyPaused, isDeprecated });
            this.skip();
        }
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

const morphoAaveV2WithdrawTest = (testLength) => describe('Morpho-Withdraw-Test', () => {
    let senderAcc;
    let proxy;
    let view;
    let marketStatus;
    let snapshotId;

    beforeEach(async () => {
        snapshotId = await takeSnapshot();
    });

    afterEach(async () => revertToSnapshot(snapshotId));

    before(async () => {
        setNetwork('mainnet');

        ([senderAcc] = await ethers.getSigners());
        proxy = await getProxy(senderAcc.address);

        await getContractFromRegistry('MorphoAaveV2Supply');
        await getContractFromRegistry('MorphoAaveV2Withdraw');
        view = await getContractFromRegistry('MorphoAaveV2View');
        marketStatus = await view.getMarketInfo();
    });

    morphoMarkets.slice(0, testLength).map((market) => it(`... should withdraw ${market} from morpho`, async function () {
        const tokenAddress = getAssetInfo(market).address;
        const { isSupplyPaused, isWithdrawPaused, isDeprecated } = marketStatus.find(
            ({ underlying }) => compare(underlying, tokenAddress),
        ).pauseStatus;

        if (isSupplyPaused || isWithdrawPaused || isDeprecated) {
            console.log({ isSupplyPaused, isWithdrawPaused, isDeprecated });
            this.skip();
        }
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

        const { logs } = await morphoAaveV2Withdraw(
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

        const { data: logData } = logs.filter((e) => e.topics.includes(ethers.utils.id('MorphoAaveV2Withdraw')))[0];
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
        expect(returnAmount.add(1)).to.be.gte(amount);
        expect(await balanceOf(tokenAddress, senderAcc.address)).to.be.gte(returnAmount);
    }));
});

const morphoAaveV2BorrowTest = (testLength) => describe('Morpho-Borrow-Test', () => {
    let senderAcc;
    let proxy;
    let view;
    let marketStatus;
    let snapshotId;

    beforeEach(async () => {
        snapshotId = await takeSnapshot();
    });

    afterEach(async () => revertToSnapshot(snapshotId));

    before(async () => {
        setNetwork('mainnet');

        ([senderAcc] = await ethers.getSigners());
        proxy = await getProxy(senderAcc.address);

        await getContractFromRegistry('MorphoAaveV2Supply');
        await getContractFromRegistry('MorphoAaveV2Borrow');
        view = await getContractFromRegistry('MorphoAaveV2View');
        marketStatus = await view.getMarketInfo();
    });

    morphoMarkets.slice(0, testLength).map((market) => it(`... should borrow ${market} from morpho`, async function () {
        const tokenAddress = getAssetInfo(market).address;
        const { isSupplyPaused, isBorrowPaused, isDeprecated } = marketStatus.find(
            ({ underlying }) => compare(underlying, tokenAddress),
        ).pauseStatus;

        if (isSupplyPaused || isBorrowPaused || isDeprecated) {
            console.log({ isSupplyPaused, isBorrowPaused, isDeprecated });
            this.skip();
        }
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

const morphoAaveV2PaybackTest = (testLength) => describe('Morpho-Payback-Test', () => {
    let senderAcc;
    let proxy;
    let view;
    let marketStatus;
    let snapshotId;

    beforeEach(async () => {
        snapshotId = await takeSnapshot();
    });

    afterEach(async () => revertToSnapshot(snapshotId));

    before(async () => {
        setNetwork('mainnet');

        ([senderAcc] = await ethers.getSigners());
        proxy = await getProxy(senderAcc.address);

        await getContractFromRegistry('MorphoAaveV2Supply');
        await getContractFromRegistry('MorphoAaveV2Borrow');
        await getContractFromRegistry('MorphoAaveV2Payback');
        view = await getContractFromRegistry('MorphoAaveV2View');
        marketStatus = await view.getMarketInfo();
    });

    morphoMarkets.slice(0, testLength).map((market) => it(`... should payback ${market} to morpho`, async function () {
        const tokenAddress = getAssetInfo(market).address;
        const {
            isSupplyPaused, isBorrowPaused, isRepayPaused, isDeprecated,
        } = marketStatus.find(
            ({ underlying }) => compare(underlying, tokenAddress),
        ).pauseStatus;

        if (isSupplyPaused || isBorrowPaused || isRepayPaused || isDeprecated) {
            console.log({
                isSupplyPaused, isBorrowPaused, isRepayPaused, isDeprecated,
            });
            this.skip();
        }
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

        const { logs } = await morphoAaveV2Payback(
            proxy,
            tokenAddress,
            amount,
            senderAcc.address,
            proxy.address,
        ).then((e) => e.wait());
        const totalBorrowed = await view.getUserInfo(proxy.address)
            .then(({ userBalances }) => userBalances.find(
                ({ underlying }) => compare(underlying, tokenAddress),
            ))
            .then(({ borrowBalanceInP2P, borrowBalanceOnPool }) => borrowBalanceInP2P
                .add(borrowBalanceOnPool));
        expect(totalBorrowed).to.be.eq('0');

        const { data: logData } = logs.filter((e) => e.topics.includes(ethers.utils.id('MorphoAaveV2Payback')))[0];
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

const morphoClaimTest = () => describe('Morpho-Claim-Test', () => {
    const claimTxHash = '0xac1559f67f74569197f4279fc5493b3b4d752e66dd663fc2ea20deb96b6f23b1';

    let senderAcc;
    let proxy;

    let onBehalfOf;
    let claimable;
    let proof;

    let snapshotId;

    beforeEach(async () => {
        snapshotId = await takeSnapshot();
    });

    afterEach(async () => revertToSnapshot(snapshotId));

    before(async () => {
        setNetwork('mainnet');

        const claimTx = await ethers.provider.getTransaction(claimTxHash);
        ({ onBehalfOf, claimable, proof } = ethers.utils.defaultAbiCoder.decode(
            ['address onBehalfOf', 'uint256 claimable', 'bytes32[] proof'],
            `0x${claimTx.data.slice(10)}`,
        ));

        const blockNumber = claimTx.blockNumber;
        await resetForkToBlock(blockNumber - 1);
        console.log({ blockNumber, onBehalfOf, claimable });

        const view = await getContractFromRegistry('MorphoAaveV2View');
        const { morphoClaimed } = await view.getUserInfo(onBehalfOf);
        expect(morphoClaimed).to.be.lt(claimable);

        await getContractFromRegistry('MorphoClaim');
        ([senderAcc] = await ethers.getSigners());
        proxy = await getProxy(senderAcc.address);
    });

    it('... should claim rewards on behalf of eoa', async () => {
        const morphoToken = '0x9994E35Db50125E0DF82e4c2dde62496CE330999';

        const balanceBefore = await balanceOf(morphoToken, onBehalfOf);
        await morphoClaim(
            proxy, onBehalfOf, claimable, proof,
        );
        const balanceAfter = await balanceOf(morphoToken, onBehalfOf);
        const claimed = balanceAfter.sub(balanceBefore);
        expect(claimed).to.be.eq(claimable);

        console.log(`claimed ${(+BN2Float(claimed)).toFixed(2)} Morpho`);
    });
});

const morphoFullTest = (testLength) => describe('Morpho-Full-Test', () => {
    morphoAaveV2SupplyTest(testLength);
    morphoAaveV2WithdrawTest(testLength);
    morphoAaveV2BorrowTest(testLength);
    morphoAaveV2PaybackTest(testLength);
    morphoClaimTest();
});

module.exports = {
    morphoFullTest,
    morphoAaveV2SupplyTest,
    morphoAaveV2WithdrawTest,
    morphoAaveV2BorrowTest,
    morphoAaveV2PaybackTest,
    morphoClaimTest,
};
