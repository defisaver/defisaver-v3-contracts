/* eslint-disable max-len */
/* eslint-disable no-await-in-loop */
const { getAssetInfo } = require('@defisaver/tokens');
const { expect } = require('chai');
const hre = require('hardhat');

const {
    supplyCompV3,
    transferCompV3,
    allowCompV3,
    borrowCompV3,
    withdrawCompV3,
    claimCompV3,
    paybackCompV3,
} = require('../actions');

const {
    redeploy,
    fetchAmountinUSDPrice,
    getProxy,
    takeSnapshot,
    revertToSnapshot,
    setBalance,
    balanceOf,
    impersonateAccount,
    stopImpersonatingAccount,
    resetForkToBlock,
    addrs,
    USDC_ADDR,
} = require('../utils');

const network = hre.network.config.name;

const compAssets = {
    USDC_MARKET: {
        collaterals: ['WETH', 'WBTC', 'COMP', 'UNI', 'LINK'],
        bAsset: 'USDC',
    },
};
const compMarkets = Object.keys(compAssets);

const compV3SupplyTest = async () => {
    describe('CompV3-Supply', async function () {
        this.timeout(80000);

        let senderAcc;
        let proxy;
        let comet;

        before(async () => {
            await resetForkToBlock();

            await redeploy('CompV3Supply');

            comet = await hre.ethers.getContractAt('IComet', addrs[network].COMET_USDC_ADDR);

            senderAcc = (await hre.ethers.getSigners())[0];
            proxy = await getProxy(senderAcc.address);
        });

        for (let m = 0; m < compMarkets.length; m++) {
            const collaterals = compAssets[compMarkets[m]].collaterals;

            for (let i = 0; i < collaterals.length; i++) {
                const collName = collaterals[i];

                it(`should supply ${collName} token to CompoundV3`, async () => {
                    const token = getAssetInfo(collName);

                    const fetchedAmountWithUSD = fetchAmountinUSDPrice(token.symbol, '10000');
                    const amount = hre.ethers.utils.parseUnits(fetchedAmountWithUSD, token.decimals);

                    const balanceBefore = await comet.collateralBalanceOf(proxy.address, token.address);

                    await supplyCompV3(addrs[network].COMET_USDC_ADDR, proxy, token.address, amount, senderAcc.address);

                    const balanceAfter = await comet.collateralBalanceOf(proxy.address, token.address);

                    expect(balanceAfter).to.be.gt(balanceBefore);
                });
            }

            it(`should supply ${compAssets[compMarkets[m]].bAsset} (base asset) to CompoundV3`, async () => {
                const bAsset = compAssets[compMarkets[m]].bAsset;

                const token = getAssetInfo(bAsset);
                const fetchedAmountWithUSD = fetchAmountinUSDPrice(token.symbol, '10000');
                const amount = hre.ethers.utils.parseUnits(fetchedAmountWithUSD, token.decimals);

                const balanceBefore = await comet.balanceOf(proxy.address);

                await supplyCompV3(addrs[network].COMET_USDC_ADDR, proxy, token.address, amount, senderAcc.address);

                const balanceAfter = await comet.balanceOf(proxy.address);

                expect(balanceAfter).to.be.gt(balanceBefore);
            });
        }
    });
};

const compV3TransferTest = async () => {
    describe('CompV3-Transfer', function () {
        this.timeout(80000);

        let senderAcc;
        let receiverAcc;
        let proxy;
        let proxy2;
        let snapshot;

        beforeEach(async () => {
            snapshot = await takeSnapshot();
        });

        afterEach(async () => {
            await revertToSnapshot(snapshot);
        });

        before(async () => {
            await resetForkToBlock();
            await redeploy('CompV3Supply');
            await redeploy('CompV3Transfer');

            senderAcc = (await hre.ethers.getSigners())[0];
            receiverAcc = (await hre.ethers.getSigners())[1];
            proxy = await getProxy(senderAcc.address);
            proxy2 = await getProxy(receiverAcc.address);
        });

        for (let m = 0; m < compMarkets.length; m++) {
            const collaterals = compAssets[compMarkets[m]].collaterals;

            for (let i = 0; i < collaterals.length; i++) {
                const collName = collaterals[i];

                it(`... should transfer ${collName} from one acc to another`, async () => {
                    const cometContract = await hre.ethers.getContractAt('IComet', addrs[network].COMET_USDC_ADDR);
                    const assetInfo = getAssetInfo(collName);

                    const amount = fetchAmountinUSDPrice(collName, '2000');

                    const transferringAmount = hre.ethers.utils.parseUnits(
                        amount,
                        assetInfo.decimals,
                    );

                    await supplyCompV3(
                        addrs[network].COMET_USDC_ADDR,
                        proxy,
                        assetInfo.address,
                        transferringAmount,
                        senderAcc.address,
                    );

                    const senderBalanceBefore = await cometContract.collateralBalanceOf(
                        proxy.address,
                        assetInfo.address,
                    );
                    const receiverBalanceBefore = await cometContract.collateralBalanceOf(
                        proxy2.address,
                        assetInfo.address,
                    );

                    await transferCompV3(
                        addrs[network].COMET_USDC_ADDR,
                        proxy,
                        proxy.address,
                        proxy2.address,
                        assetInfo.address,
                        transferringAmount,
                    );

                    let senderBalanceAfter = await cometContract.collateralBalanceOf(
                        proxy.address,
                        assetInfo.address,
                    );
                    let receiverBalanceAfter = await cometContract.collateralBalanceOf(
                        proxy2.address,
                        assetInfo.address,
                    );

                    expect(receiverBalanceAfter).to.be.gt(receiverBalanceBefore);
                    expect(senderBalanceAfter).to.be.lt(senderBalanceBefore);
                    await transferCompV3(
                        addrs[network].COMET_USDC_ADDR,
                        proxy,
                        proxy.address,
                        proxy2.address,
                        assetInfo.address,
                        hre.ethers.constants.MaxUint256,
                    );

                    senderBalanceAfter = await cometContract.collateralBalanceOf(
                        proxy.address,
                        assetInfo.address,
                    );
                    receiverBalanceAfter = await cometContract.collateralBalanceOf(
                        proxy2.address,
                        assetInfo.address,
                    );

                    expect(receiverBalanceAfter).to.be.gt(receiverBalanceBefore);
                    expect(senderBalanceAfter).to.be.lt(senderBalanceBefore);
                    expect(senderBalanceAfter).to.be.eq(0);
                });
            }

            it(`... should transfer ${compAssets[compMarkets[m]].bAsset} (base asset)`, async () => {
                const bAsset = compAssets[compMarkets[m]].bAsset;
                const cometContract = await hre.ethers.getContractAt('IComet', addrs[network].COMET_USDC_ADDR);
                const assetInfo = getAssetInfo(bAsset);

                const supplyAmount = hre.ethers.utils.parseUnits(
                    fetchAmountinUSDPrice(bAsset, '3000'),
                    assetInfo.decimals,
                );

                const transferringAmount = hre.ethers.utils.parseUnits(
                    fetchAmountinUSDPrice(bAsset, '2000'),
                    assetInfo.decimals,
                );

                await setBalance(assetInfo.address, senderAcc.address, supplyAmount);

                await supplyCompV3(addrs[network].COMET_USDC_ADDR, proxy, assetInfo.address, supplyAmount, senderAcc.address);

                const senderBalanceBefore = await cometContract.balanceOf(proxy.address);
                const receiverBalanceBefore = await cometContract.balanceOf(proxy2.address);

                await transferCompV3(
                    addrs[network].COMET_USDC_ADDR,
                    proxy,
                    proxy.address,
                    proxy2.address,
                    assetInfo.address,
                    transferringAmount,
                );

                let senderBalanceAfter = await cometContract.balanceOf(proxy.address);
                let receiverBalanceAfter = await cometContract.balanceOf(proxy2.address);

                expect(receiverBalanceAfter).to.be.gt(receiverBalanceBefore);
                expect(senderBalanceAfter).to.be.lt(senderBalanceBefore);

                await transferCompV3(
                    addrs[network].COMET_USDC_ADDR,
                    proxy,
                    proxy.address,
                    proxy2.address,
                    assetInfo.address,
                    hre.ethers.constants.MaxUint256,
                );

                senderBalanceAfter = await cometContract.balanceOf(proxy.address);
                receiverBalanceAfter = await cometContract.balanceOf(proxy2.address);

                expect(receiverBalanceAfter).to.be.gt(receiverBalanceBefore);
                expect(senderBalanceAfter).to.be.lt(senderBalanceBefore);
                expect(senderBalanceAfter).to.be.eq(0);
            });
        }
    });
};

const compV3AllowTest = async () => {
    describe('CompV3-Allow', function () {
        this.timeout(80000);

        let senderAcc;
        let ownerAcc;
        let proxy;

        before(async () => {
            await resetForkToBlock();

            await redeploy('CompV3Allow');
            senderAcc = (await hre.ethers.getSigners())[0];
            ownerAcc = (await hre.ethers.getSigners())[1];
            proxy = await getProxy(senderAcc.address);
        });

        it('... should test CompoundV3 allow', async () => {
            const cometContract = await hre.ethers.getContractAt('IComet', addrs[network].COMET_USDC_ADDR);

            // gib allowance
            await allowCompV3(addrs[network].COMET_USDC_ADDR, proxy, ownerAcc.address, true);
            const allowance = await cometContract.allowance(proxy.address, ownerAcc.address);
            expect(allowance.toString()).to.be.equal(hre.ethers.constants.MaxUint256);

            // remove allowance
            await allowCompV3(addrs[network].COMET_USDC_ADDR, proxy, ownerAcc.address, false);
            const allowanceAfter = await cometContract.allowance(proxy.address, ownerAcc.address);
            expect(allowanceAfter.toString()).to.equal('0');
        });
    });
};

const compV3WithdrawTest = async () => {
    describe('CompV3-Withdraw', function () {
        this.timeout(80000);

        let senderAcc;
        let proxy;

        before(async () => {
            await resetForkToBlock();

            await redeploy('CompV3Supply');
            await redeploy('CompV3Withdraw');

            senderAcc = (await hre.ethers.getSigners())[0];
            proxy = await getProxy(senderAcc.address);
        });

        for (let m = 0; m < compMarkets.length; m++) {
            const collaterals = compAssets[compMarkets[m]].collaterals;

            for (let i = 0; i < collaterals.length; i++) {
                const collName = collaterals[i];

                it(`... should withdraw ${collName} from CompoundV3`, async () => {
                    const assetInfo = getAssetInfo(collName);
                    const amount = hre.ethers.utils.parseUnits('1000', assetInfo.decimals);

                    await supplyCompV3(addrs[network].COMET_USDC_ADDR, proxy, assetInfo.address, amount, senderAcc.address);

                    const balanceBefore = await balanceOf(assetInfo.address, senderAcc.address);

                    await withdrawCompV3(addrs[network].COMET_USDC_ADDR, proxy, senderAcc.address, assetInfo.address, amount);

                    const balanceAfter = await balanceOf(assetInfo.address, senderAcc.address);

                    expect(balanceAfter).to.be.gt(balanceBefore);
                });
            }

            it(`... should withdraw MAX.UINT ${compAssets[compMarkets[m]].bAsset} (base asset)`, async () => {
                const bAsset = compAssets[compMarkets[m]].bAsset;
                const assetInfo = getAssetInfo(bAsset);
                const amount = hre.ethers.utils.parseUnits('1000', assetInfo.decimals);

                await supplyCompV3(addrs[network].COMET_USDC_ADDR, proxy, assetInfo.address, amount, senderAcc.address);

                const balanceBefore = await balanceOf(assetInfo.address, senderAcc.address);

                // withdraw all balance from address with max uint256 as amount
                await withdrawCompV3(
                    addrs[network].COMET_USDC_ADDR,
                    proxy,
                    senderAcc.address,
                    assetInfo.address,
                    hre.ethers.constants.MaxUint256,
                );

                const balanceAfter = await balanceOf(assetInfo.address, senderAcc.address);

                expect(balanceAfter).to.be.gt(balanceBefore);
            });

            it(`... should withdraw ${compAssets[compMarkets[m]].bAsset} (base asset)`, async () => {
                const bAsset = compAssets[compMarkets[m]].bAsset;
                const assetInfo = getAssetInfo(bAsset);
                const amount = hre.ethers.utils.parseUnits('1000', assetInfo.decimals);

                await supplyCompV3(addrs[network].COMET_USDC_ADDR, proxy, assetInfo.address, amount, senderAcc.address);

                const balanceBefore = await balanceOf(assetInfo.address, senderAcc.address);

                // withdraw all balance from address with max uint256 as amount
                await withdrawCompV3(
                    addrs[network].COMET_USDC_ADDR,
                    proxy,
                    senderAcc.address,
                    assetInfo.address,
                    hre.ethers.utils.parseUnits('500', assetInfo.decimals),
                );

                const balanceAfter = await balanceOf(assetInfo.address, senderAcc.address);

                expect(balanceAfter).to.be.gt(balanceBefore);
            });
        }
    });
};

const compV3BorrowTest = async () => {
    describe('CompV3-Borrow', function () {
        this.timeout(80000);

        let senderAcc;
        let proxy;

        before(async () => {
            await resetForkToBlock();

            await redeploy('CompV3Supply');
            await redeploy('CompV3Borrow');
            senderAcc = (await hre.ethers.getSigners())[0];
            proxy = await getProxy(senderAcc.address);
        });

        for (let m = 0; m < compMarkets.length; m++) {
            const bAsset = compAssets[compMarkets[m]].bAsset;
            const collaterals = compAssets[compMarkets[m]].collaterals;

            it(`... should test CompoundV3 borrow ${bAsset}`, async () => {
                const assetInfo = getAssetInfo(bAsset);
                const colInfo = getAssetInfo(collaterals[0]);
                await setBalance(colInfo.address, senderAcc.address, hre.ethers.utils.parseEther('100'));

                const borrowingAmount = hre.ethers.utils.parseUnits(
                    fetchAmountinUSDPrice(bAsset, '2000'),
                    assetInfo.decimals,
                );

                await supplyCompV3(
                    addrs[network].COMET_USDC_ADDR,
                    proxy,
                    colInfo.address,
                    hre.ethers.utils.parseEther('10'),
                    senderAcc.address,
                );

                const balanceBefore = await balanceOf(assetInfo.address, senderAcc.address);

                await borrowCompV3(addrs[network].COMET_USDC_ADDR, proxy, borrowingAmount, senderAcc.address);

                const balanceAfter = await balanceOf(assetInfo.address, senderAcc.address);

                expect(balanceAfter).to.be.gt(balanceBefore);
            });
        }
    });
};

const compV3PaybackTest = async () => {
    describe('CompV3-Payback', function () {
        this.timeout(80000);

        let senderAcc;
        let proxy;
        let snapshot;

        beforeEach(async () => {
            snapshot = await takeSnapshot();
        });

        afterEach(async () => {
            await revertToSnapshot(snapshot);
        });

        before(async () => {
            await resetForkToBlock();

            await redeploy('CompV3Supply');
            await redeploy('CompV3Borrow');
            await redeploy('CompV3Payback');

            senderAcc = (await hre.ethers.getSigners())[0];
            proxy = await getProxy(senderAcc.address);
        });

        for (let m = 0; m < compMarkets.length; m++) {
            const bAsset = compAssets[compMarkets[m]].bAsset;
            const collaterals = compAssets[compMarkets[m]].collaterals;

            it(`... Payback part of ${bAsset} debt`, async () => {
                const cometContract = await hre.ethers.getContractAt('IComet', addrs[network].COMET_USDC_ADDR);

                const assetInfo = getAssetInfo(bAsset);
                const collAssetInfo = getAssetInfo(collaterals[0]);

                const borrowingAmount = hre.ethers.utils.parseUnits(
                    fetchAmountinUSDPrice(bAsset, '10000'),
                    assetInfo.decimals,
                );

                const paybackAmount = hre.ethers.utils.parseUnits(
                    fetchAmountinUSDPrice(bAsset, '5000'),
                    assetInfo.decimals,
                );

                await supplyCompV3(
                    addrs[network].COMET_USDC_ADDR,
                    proxy,
                    collAssetInfo.address,
                    hre.ethers.utils.parseEther('25'),
                    senderAcc.address,
                );

                await borrowCompV3(addrs[network].COMET_USDC_ADDR, proxy, borrowingAmount, senderAcc.address);

                const balanceBefore = await balanceOf(assetInfo.address, senderAcc.address);
                const borrowBalanceBefore = await cometContract.borrowBalanceOf(proxy.address);

                await paybackCompV3(addrs[network].COMET_USDC_ADDR, proxy, paybackAmount, senderAcc.address, proxy.address);

                const balanceAfter = await balanceOf(assetInfo.address, senderAcc.address);
                const borrowBalanceAfter = await cometContract.borrowBalanceOf(proxy.address);

                expect(balanceBefore).to.be.gt(balanceAfter);
                expect(borrowBalanceBefore).to.be.gt(borrowBalanceAfter);
                expect(balanceAfter).to.not.be.eq(borrowBalanceAfter);
            });

            it(`... Payback whole ${bAsset} debt`, async () => {
                const cometContract = await hre.ethers.getContractAt('IComet', addrs[network].COMET_USDC_ADDR);

                const assetInfo = getAssetInfo(bAsset);
                const collAssetInfo = getAssetInfo(collaterals[0]);

                const amount = hre.ethers.utils.parseUnits('1000000', 18);
                await setBalance(assetInfo.address, senderAcc.address, amount);

                const borrowingAmount = hre.ethers.utils.parseUnits(
                    fetchAmountinUSDPrice(bAsset, '10000'),
                    assetInfo.decimals,
                );

                const paybackAmount = hre.ethers.utils.parseUnits(
                    fetchAmountinUSDPrice(bAsset, '500000'),
                    assetInfo.decimals,
                );

                await supplyCompV3(
                    addrs[network].COMET_USDC_ADDR,
                    proxy,
                    collAssetInfo.address,
                    hre.ethers.utils.parseEther('25'),
                    senderAcc.address,
                );

                await borrowCompV3(addrs[network].COMET_USDC_ADDR, proxy, borrowingAmount, senderAcc.address);

                const balanceBefore = await balanceOf(assetInfo.address, senderAcc.address);

                await paybackCompV3(addrs[network].COMET_USDC_ADDR, proxy, paybackAmount, senderAcc.address, proxy.address);

                const balanceAfter = await balanceOf(assetInfo.address, senderAcc.address);
                const borrowBalanceAfter = await cometContract.borrowBalanceOf(proxy.address);

                expect(balanceBefore).to.be.gt(balanceAfter);
                expect(borrowBalanceAfter).to.be.eq(0);
            });
        }
    });
};

const compV3ClaimTest = async () => {
    describe('CompV3-Claim', function () {
        this.timeout(80000);

        let senderAcc;
        let proxy;

        before(async () => {
            await resetForkToBlock();

            await redeploy('CompV3Supply');
            await redeploy('CompV3Claim');
            await redeploy('CompV3Borrow');
            senderAcc = (await hre.ethers.getSigners())[0];
            proxy = await getProxy(senderAcc.address);
        });

        it('... claim usdc tokens for proxy account', async () => {
            // base min for rewards is 1000000000000
            const amount = hre.ethers.utils.parseUnits('3000', 6);

            const CONFIG_ADDR = '0x316f9708bB98af7dA9c68C1C3b5e79039cD336E3';
            const GOVERNOR_ADDR = '0x6d903f6003cca6255d85cca4d3b5e5146dc33925';

            // const abi = [
            //     'function getRewardOwed(address, address) public view returns(address, uint256)',
            // ];

            const abiConfig = [
                'function setBaseTrackingSupplySpeed(address cometProxy, uint64 newBaseTrackingSupplySpeed)',
                'function deploy(address cometProxy) external returns (address)',
            ];

            // const CometRewardsContract = new hre.ethers.Contract(
            //     addrs[network].COMET_USDC_REWARDS_ADDR,
            //     abi,
            //     senderAcc,
            // );

            const ConfigContract = new hre.ethers.Contract(CONFIG_ADDR, abiConfig, senderAcc);

            await impersonateAccount(GOVERNOR_ADDR);
            const signer = await hre.ethers.provider.getSigner(GOVERNOR_ADDR);

            // set base tracking speed
            const configContract = ConfigContract.connect(signer);
            await configContract.setBaseTrackingSupplySpeed(addrs[network].COMET_USDC_ADDR, '10000000000', {
                gasLimit: 600000,
            });

            const tx = await configContract.deploy(addrs[network].COMET_USDC_ADDR, { gasLimit: 6000000 });
            const parsedTx = await tx.wait();

            // set new Comet implementation contract
            await hre.ethers.provider.send('hardhat_setStorageAt', [
                addrs[network].COMET_USDC_ADDR,
                '0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc', // proxy impl. storage slot
                parsedTx.events[0].topics[2], // new Comet impl. contract addr
            ]);

            await stopImpersonatingAccount(GOVERNOR_ADDR);

            await setBalance(
                addrs[network].COMP_ADDR,
                addrs[network].COMET_USDC_REWARDS_ADDR,
                hre.ethers.utils.parseUnits('100000', 18),
            );

            await supplyCompV3(addrs[network].COMET_USDC_ADDR, proxy, USDC_ADDR, amount, senderAcc.address);

            await hre.network.provider.send('evm_increaseTime', [36000]);
            await hre.network.provider.send('evm_mine');

            // checks amount to get
            // await CometRewardsContract.callStatic.getRewardOwed(
            //     addrs[network].COMET_USDC_ADDR,
            //     proxy.address,
            // );

            const BalanceBefore = await balanceOf(addrs[network].COMP_ADDR, senderAcc.address);
            const BalanceProxyBefore = await balanceOf(addrs[network].COMP_ADDR, proxy.address);

            await claimCompV3(addrs[network].COMET_USDC_ADDR, proxy, proxy.address, senderAcc.address, true);

            const BalanceAfter = await balanceOf(addrs[network].COMP_ADDR, senderAcc.address);
            const BalanceProxyAfter = await balanceOf(addrs[network].COMP_ADDR, proxy.address);

            expect(BalanceProxyAfter).to.be.eq(BalanceProxyBefore);
            expect(BalanceAfter).to.be.gt(BalanceBefore);
        });
    });
};

const compoundDeployContracts = async () => {
    await redeploy('CompV3Withdraw');
    await redeploy('CompV3Claim');
    await redeploy('CompV3Payback');
    await redeploy('CompV3Borrow');
    await redeploy('CompV3View');
    await redeploy('CompV3Supply');
    await redeploy('CompV3Allow');
    await redeploy('CompV3Transfer');
};

const compoundV3FullTest = async () => {
    await compoundDeployContracts();
    await compV3SupplyTest();
    await compV3TransferTest();
    await compV3WithdrawTest();
    await compV3BorrowTest();
    await compV3PaybackTest();
    await compV3ClaimTest();
    await compV3AllowTest();
};

module.exports = {
    compV3ClaimTest,
    compV3PaybackTest,
    compV3BorrowTest,
    compV3WithdrawTest,
    compV3SupplyTest,
    compV3TransferTest,
    compV3AllowTest,
    compoundDeployContracts,
    compoundV3FullTest,
};
