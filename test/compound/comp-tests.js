/* eslint-disable no-await-in-loop */
const { assets, getAssetInfo } = require('@defisaver/tokens');
const { expect } = require('chai');
const hre = require('hardhat');

// eslint-disable-next-line max-len
const compoundCollateralAssets = assets.filter((a) => a.compoundCollateral).map((a) => getAssetInfo(a.symbol));

const {
    supplyComp, withdrawComp, borrowComp, paybackComp, claimComp,
} = require('../actions');
const {
    fetchAmountinUSDPrice,
    balanceOf,
    redeploy,
    getProxy,
    WETH_ADDRESS,
    getAddrFromRegistry,
} = require('../utils');
const { getBorrowBalance, COMP_ADDR } = require('../utils-comp');

const compSupplyTest = async (compTestLength) => {
    describe('Comp-Supply', function () {
        this.timeout(80000);

        let senderAcc; let
            proxy;

        before(async () => {
            senderAcc = (await hre.ethers.getSigners())[0];
            proxy = await getProxy(senderAcc.address);
        });
        for (let i = 0; i < compTestLength; ++i) {
            const cTokenData = compoundCollateralAssets[i];
            if (cTokenData.symbol === 'cWBTC Legacy') {
                // Jump over WBTC Legacy
                // eslint-disable-next-line no-continue
                continue;
            }
            const fetchedAmountWithUSD = fetchAmountinUSDPrice(cTokenData.underlyingAsset, '10000');

            it(`... should supply ${fetchedAmountWithUSD} ${cTokenData.underlyingAsset} to Compound`, async () => {
                const assetInfo = getAssetInfo(cTokenData.underlyingAsset);
                const cToken = cTokenData.address;

                if (assetInfo.symbol === 'REP') return;

                if (assetInfo.symbol === 'ETH') {
                    assetInfo.address = WETH_ADDRESS;
                }

                const amount = hre.ethers.utils.parseUnits(
                    fetchedAmountWithUSD,
                    assetInfo.decimals,
                );

                const balanceBefore = await balanceOf(cToken, proxy.address);
                await supplyComp(proxy, cToken, assetInfo.address, amount, senderAcc.address);

                const balanceAfter = await balanceOf(cToken, proxy.address);

                expect(balanceAfter).to.be.gt(balanceBefore);
            });
        }
    });
};

const compWithdrawTest = async (compTestLength) => {
    describe('Comp-Withdraw', function () {
        this.timeout(80000);

        let senderAcc; let
            proxy;

        before(async () => {
            senderAcc = (await hre.ethers.getSigners())[0];
            proxy = await getProxy(senderAcc.address);
        });

        for (let i = 0; i < compTestLength; ++i) {
            const cTokenData = compoundCollateralAssets[i];
            if (cTokenData.symbol === 'cWBTC Legacy') {
                // Jump over WBTC Legacy
                // eslint-disable-next-line no-continue
                continue;
            }

            const fetchedAmountWithUSD = fetchAmountinUSDPrice(cTokenData.underlyingAsset, '1000');
            it(`... should withdraw ${fetchedAmountWithUSD} ${cTokenData.underlyingAsset} from Compound`, async () => {
                const assetInfo = getAssetInfo(cTokenData.underlyingAsset);
                const cToken = cTokenData.address;

                if (assetInfo.symbol === 'REP') return;

                if (assetInfo.symbol === 'ETH') {
                    assetInfo.address = WETH_ADDRESS;
                }

                const amount = hre.ethers.utils.parseUnits(
                    fetchedAmountWithUSD,
                    assetInfo.decimals,
                );

                await supplyComp(proxy, cToken, assetInfo.address, amount, senderAcc.address);

                const balanceBefore = await balanceOf(assetInfo.address, senderAcc.address);

                await withdrawComp(proxy, cToken, amount, senderAcc.address);

                const balanceAfter = await balanceOf(assetInfo.address, senderAcc.address);

                expect(balanceAfter).to.be.gt(balanceBefore);
            });
        }
    });
};

const compBorrowTest = async (compTestLength) => {
    describe('Comp-Borrow', function () {
        this.timeout(80000);

        let senderAcc; let
            proxy;

        before(async () => {
            senderAcc = (await hre.ethers.getSigners())[0];
            proxy = await getProxy(senderAcc.address);
        });

        for (let i = 0; i < compTestLength; ++i) {
            const cTokenData = compoundCollateralAssets[i];
            if (cTokenData.symbol === 'cWBTC Legacy') {
            // Jump over WBTC Legacy
            // eslint-disable-next-line no-continue
                continue;
            }

            it(`... should borrow ${fetchAmountinUSDPrice(cTokenData.underlyingAsset, '1000')} ${cTokenData.underlyingAsset} from Compound`, async () => {
                const assetInfo = getAssetInfo(cTokenData.underlyingAsset);
                const cToken = cTokenData.address;

                if (assetInfo.symbol === 'REP') return;

                // currently can't borrow any comp
                // TODO: make the check dynamic
                if (assetInfo.symbol === 'COMP') return;

                if (assetInfo.symbol === 'ETH') {
                    assetInfo.address = WETH_ADDRESS;
                }

                const supplyingAmount = hre.ethers.utils.parseUnits(
                    fetchAmountinUSDPrice(cTokenData.underlyingAsset, '3000'),
                    assetInfo.decimals,
                );

                const borrowingAmount = hre.ethers.utils.parseUnits(
                    fetchAmountinUSDPrice(cTokenData.underlyingAsset, '1000'),
                    assetInfo.decimals,
                );

                await supplyComp(
                    proxy,
                    cToken,
                    assetInfo.address,
                    supplyingAmount,
                    senderAcc.address,
                );

                const balanceBefore = await balanceOf(assetInfo.address, senderAcc.address);

                await borrowComp(proxy, cToken, borrowingAmount, senderAcc.address);

                const balanceAfter = await balanceOf(assetInfo.address, senderAcc.address);

                expect(balanceAfter).to.be.gt(balanceBefore);
            });
        }
    });
};

const compPaybackTest = async (compTestLength) => {
    describe('Comp-Payback', function () {
        this.timeout(80000);

        let senderAcc; let proxy; let
            compView;

        before(async () => {
            const compViewAddr = await getAddrFromRegistry('CompView');
            compView = await hre.ethers.getContractAt('CompView', compViewAddr);
            senderAcc = (await hre.ethers.getSigners())[0];
            proxy = await getProxy(senderAcc.address);
        });

        for (let i = 0; i < compTestLength; ++i) {
            const cTokenData = compoundCollateralAssets[i];
            if (cTokenData.symbol === 'cWBTC Legacy') {
                // Jump over WBTC Legacy
                // eslint-disable-next-line no-continue
                continue;
            }
            const fetchedAmountWithUSD = fetchAmountinUSDPrice(cTokenData.underlyingAsset, '1000');

            it(`... should payback ${fetchedAmountWithUSD} ${cTokenData.underlyingAsset} from Compound`, async () => {
                const assetInfo = getAssetInfo(cTokenData.underlyingAsset);
                const cToken = cTokenData.address;

                if (assetInfo.symbol === 'REP') return;

                if (assetInfo.symbol === 'ETH') {
                    assetInfo.address = WETH_ADDRESS;
                }

                // currently can't borrow any comp
                // TODO: make the check dynamic
                if (assetInfo.symbol === 'COMP') return;

                const supplyingAmount = hre.ethers.utils.parseUnits(
                    fetchAmountinUSDPrice(cTokenData.underlyingAsset, '3000'),
                    assetInfo.decimals,
                );

                const borrowingAmount = hre.ethers.utils.parseUnits(
                    fetchAmountinUSDPrice(cTokenData.underlyingAsset, '1000'),
                    assetInfo.decimals,
                );

                await supplyComp(
                    proxy,
                    cToken,
                    assetInfo.address,
                    supplyingAmount,
                    senderAcc.address,
                );

                await borrowComp(proxy, cToken, borrowingAmount, senderAcc.address);

                const balanceBefore = await balanceOf(assetInfo.address, senderAcc.address);
                const borrowBalanceBefore = await getBorrowBalance(compView, proxy.address, cToken);

                await paybackComp(proxy, cToken, borrowingAmount, senderAcc.address);

                const balanceAfter = await balanceOf(assetInfo.address, senderAcc.address);
                const borrowBalanceAfter = await getBorrowBalance(compView, proxy.address, cToken);

                expect(balanceAfter).to.be.lt(balanceBefore);
                expect(borrowBalanceAfter).to.be.lt(borrowBalanceBefore);
            });
        }
    });
};

const compClaimTest = async () => {
    describe('Comp-Claim', function () {
        this.timeout(80000);

        let senderAcc; let proxy;

        before(async () => {
            senderAcc = (await hre.ethers.getSigners())[0];
            proxy = await getProxy(senderAcc.address);
        });

        it('... claim comp tokens for proxy account', async () => {
            const cEth = getAssetInfo('cETH');

            const amount = hre.ethers.utils.parseUnits('10', 18);

            await supplyComp(proxy, cEth.address, WETH_ADDRESS, amount, senderAcc.address);

            const from = proxy.address;
            const to = senderAcc.address;

            const cSupplyAddresses = [cEth.address];
            const cBorrowAddresses = [];

            const compBalanceBefore = await balanceOf(COMP_ADDR, senderAcc.address);
            const compBalanceProxyBefore = await balanceOf(COMP_ADDR, proxy.address);

            // claim comp
            await claimComp(proxy, cSupplyAddresses, cBorrowAddresses, from, to);

            const compBalanceAfter = await balanceOf(COMP_ADDR, senderAcc.address);
            const compBalanceProxyAfter = await balanceOf(COMP_ADDR, proxy.address);

            expect(compBalanceProxyAfter).to.be.eq(compBalanceProxyBefore);
            expect(compBalanceAfter).to.be.gt(compBalanceBefore);
        });
    });
};
const compoundDeployContracts = async () => {
    await redeploy('CompWithdraw');
    await redeploy('CompClaim');
    await redeploy('CompPayback');
    await redeploy('CompBorrow');
    await redeploy('CompView');
    await redeploy('CompSupply');
};

const compoundFullTest = async (compTestLength) => {
    await compoundDeployContracts();
    await compSupplyTest(compTestLength);
    await compWithdrawTest(compTestLength);
    await compBorrowTest(compTestLength);
    await compPaybackTest(compTestLength);
    await compClaimTest();
};

module.exports = {
    compClaimTest,
    compPaybackTest,
    compBorrowTest,
    compWithdrawTest,
    compSupplyTest,
    compoundDeployContracts,
    compoundFullTest,
};
