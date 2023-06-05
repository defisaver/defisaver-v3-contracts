const { getAssetInfo, utils: { compare } } = require('@defisaver/tokens');

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

const getTotalBorrowed = async (view, user, tokenAddress) => view.getUserInfo(user)
    .then(({ userBalances }) => userBalances.find(
        ({ underlying }) => compare(underlying, tokenAddress),
    ))
    .then(({ borrowBalanceInP2P, borrowBalanceOnPool }) => borrowBalanceInP2P
        .add(borrowBalanceOnPool));

const getTotalSupplied = async (view, user, tokenAddress) => view.getUserInfo(user)
    .then(({ userBalances }) => userBalances.find(
        ({ underlying }) => compare(underlying, tokenAddress),
    ) || { supplyBalanceInP2P: Float2BN('0'), supplyBalanceOnPool: Float2BN('0') })
    .then(({ supplyBalanceInP2P, supplyBalanceOnPool }) => supplyBalanceInP2P
        .add(supplyBalanceOnPool));

const testSupply = async ({
    proxy,
    tokenAddress,
    amount,
    senderAcc,
    view,
}) => {
    const supplyBefore = await getTotalSupplied(view, proxy.address, tokenAddress);
    let collBalance;
    if (amount.eq(ethers.constants.MaxUint256)) {
        collBalance = await balanceOf(tokenAddress, senderAcc.address);
    }

    const { logs } = await morphoAaveV2Supply(
        proxy,
        tokenAddress,
        amount,
        senderAcc.address,
    ).then((e) => e.wait());

    const totalSupplied = await getTotalSupplied(
        view, proxy.address, tokenAddress,
    ).then((bn) => bn.sub(supplyBefore));

    // eslint-disable-next-line no-param-reassign
    if (amount.eq(ethers.constants.MaxUint256)) amount = collBalance;
    // Aave 1 wei math error
    expect(totalSupplied.add('1')).to.be.gte(supplyBefore.add(amount));

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
}) => {
    const balanceBefore = await balanceOf(tokenAddress, senderAcc.address);
    const { logs } = await morphoAaveV2Borrow(
        proxy,
        tokenAddress,
        amount,
        senderAcc.address,
    ).then((e) => e.wait());

    expect(
        await balanceOf(tokenAddress, senderAcc.address).then(
            (e) => e.sub(balanceBefore),
        ),
    ).to.be.eq(amount);

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
    expect(returnAmount).to.be.eq(amount);
};

const morphoAaveV2SupplyTest = (testLength) => describe('Morpho-Supply-Test', function () {
    this.timeout(1000000);
    let senderAcc;
    let proxy;
    let view;
    let marketInfo;
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
        ({ marketInfo } = await view.getAllMarketsInfo());
    });

    morphoMarkets.slice(0, testLength).map((market) => describe(
        `Morpho-AaveV2-Supply ${market}`,
        () => {
            it(`... should supply ${market} to morpho`, async function () {
                const tokenAddress = getAssetInfo(market).address;
                const { isSupplyPaused, isDeprecated } = marketInfo.find(
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
            });

            it(`... should supply maxuint ${market} to morpho`, async function () {
                const tokenAddress = getAssetInfo(market).address;
                const { isSupplyPaused, isDeprecated } = marketInfo.find(
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
                    amount: ethers.constants.MaxUint256,
                    senderAcc,
                    view,
                });
            });
        },
    ));
});

const morphoAaveV2WithdrawTest = (testLength) => describe('Morpho-Withdraw-Test', function () {
    this.timeout(1000000);
    let senderAcc;
    let proxy;
    let view;
    let marketInfo;
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
        ({ marketInfo } = await view.getAllMarketsInfo());
    });

    morphoMarkets.slice(0, testLength).map((market) => describe(
        `Morpho-AaveV2-Withdraw ${market}`, async () => {
            it(`... should withdraw ${market} from morpho`, async () => {
                const tokenAddress = getAssetInfo(market).address;
                const { isSupplyPaused, isWithdrawPaused, isDeprecated } = marketInfo.find(
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

                const balanceBefore = await balanceOf(tokenAddress, senderAcc.address);

                await morphoAaveV2Withdraw(
                    proxy,
                    tokenAddress,
                    amount.div(2),
                    senderAcc.address,
                ).then((e) => e.wait());

                const withdrawn = await balanceOf(
                    tokenAddress, senderAcc.address,
                ).then((bn) => bn.sub(balanceBefore));
                expect(withdrawn).to.be.eq(amount.div(2));
            });

            it(`... should withdraw maxuint ${market} from morpho`, async () => {
                const tokenAddress = getAssetInfo(market).address;
                const { isSupplyPaused, isWithdrawPaused, isDeprecated } = marketInfo.find(
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

                const balanceBefore = await balanceOf(tokenAddress, senderAcc.address);

                await morphoAaveV2Withdraw(
                    proxy,
                    tokenAddress,
                    ethers.constants.MaxInt256,
                    senderAcc.address,
                ).then((e) => e.wait());

                const withdrawn = await balanceOf(
                    tokenAddress, senderAcc.address,
                ).then((bn) => bn.sub(balanceBefore));
                expect(withdrawn).to.be.gte(amount);
            });
        },
    ));
});

const morphoAaveV2BorrowTest = (testLength) => describe('Morpho-Borrow-Test', function () {
    this.timeout(1000000);
    let senderAcc;
    let proxy;
    let view;
    let marketInfo;
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
        ({ marketInfo } = await view.getAllMarketsInfo());
    });

    morphoMarkets.slice(0, testLength).map((market) => it(`... should borrow ${market} from morpho`, async function () {
        const tokenAddress = getAssetInfo(market).address;
        const { isSupplyPaused, isBorrowPaused, isDeprecated } = marketInfo.find(
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
            amount: amount.div(2),
            senderAcc,
            view,
        });
    }));
});

const morphoAaveV2PaybackTest = (testLength) => describe('Morpho-Payback-Test', function () {
    this.timeout(1000000);
    let senderAcc;
    let proxy;
    let view;
    let marketInfo;
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
        ({ marketInfo } = await view.getAllMarketsInfo());
    });

    morphoMarkets.slice(0, testLength).map((market) => describe(
        `Morpho-AaveV2-Payback ${market}`, () => {
            it(`... should payback ${market} to morpho`, async function () {
                const tokenAddress = getAssetInfo(market).address;
                const {
                    isSupplyPaused, isBorrowPaused, isRepayPaused, isDeprecated,
                } = marketInfo.find(
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
                    amount: amount.div(2),
                    senderAcc,
                    view,
                });

                const { logs } = await morphoAaveV2Payback(
                    proxy,
                    tokenAddress,
                    amount.div(4),
                    senderAcc.address,
                    proxy.address,
                ).then((e) => e.wait());
                const totalBorrowed = await getTotalBorrowed(view, proxy.address, tokenAddress);
                expect(totalBorrowed).to.be.gte(amount.div(4));
                expect(totalBorrowed).to.be.lt(amount.div(2));

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
                expect(returnAmount).to.be.eq(amount.div(4));
            });

            it(`... should payback maxuint ${market} to morpho`, async function () {
                const tokenAddress = getAssetInfo(market).address;
                const {
                    isSupplyPaused, isBorrowPaused, isRepayPaused, isDeprecated,
                } = marketInfo.find(
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
                    amount: amount.div(2),
                    senderAcc,
                    view,
                });

                const { logs } = await morphoAaveV2Payback(
                    proxy,
                    tokenAddress,
                    ethers.constants.MaxUint256,
                    senderAcc.address,
                    proxy.address,
                ).then((e) => e.wait());
                const totalBorrowed = await getTotalBorrowed(view, proxy.address, tokenAddress);
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
                expect(returnAmount).to.be.lt(amount);
            });
        },
    ));
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
