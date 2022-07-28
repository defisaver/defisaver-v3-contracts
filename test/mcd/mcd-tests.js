/* eslint-disable max-len */
const { ilks, getAssetInfo } = require('@defisaver/tokens');
const { expect } = require('chai');
const { BigNumber } = require('ethers');
const hre = require('hardhat');
const {
    openMcd,
    supplyMcd,
    generateMcd,
    mcdGive,
    openVault,
    mcdMerge,
    paybackMcd,
    withdrawMcd,
    claimMcd,
    sell,
    mcdRepayComposite,
    mcdBoostComposite,
} = require('../actions');
const {
    getProxy,
    redeploy,
    fetchAmountinUSDPrice,
    send,
    getAddrFromRegistry,
    balanceOf,
    WETH_ADDRESS,
    MIN_VAULT_DAI_AMOUNT,
    DAI_ADDR,
    UNISWAP_WRAPPER,
    MAX_UINT,
    REGISTRY_ADDR,
    formatExchangeObj,
    setNewExchangeWrapper,
    Float2BN,
    takeSnapshot,
    revertToSnapshot,
    setBalance,
} = require('../utils');
const {
    getVaultsForUser,
    fetchMakerAddresses,
    getVaultInfo,
    canGenerateDebt,
    cropJoinIlks,
    MCD_MANAGER_ADDR,
    CROPPER_ADDR,
    LDO_ADDR,
    cropData,
    getRatio,
} = require('../utils-mcd');

const SUPPLY_AMOUNT_IN_USD = '150000';
const GENERATE_AMOUNT_IN_USD = '50000';

const mcdOpenTest = async (mcdTestLength) => {
    describe('Mcd-Open', () => {
        let makerAddresses;
        let senderAcc;
        let proxy;
        let mcdView;
        let mcdViewAddr;

        before(async () => {
            makerAddresses = await fetchMakerAddresses();

            senderAcc = (await hre.ethers.getSigners())[0];
            proxy = await getProxy(senderAcc.address);

            mcdViewAddr = await getAddrFromRegistry('McdView');
            mcdView = await hre.ethers.getContractAt('McdView', mcdViewAddr);
        });

        for (let i = 0; i < mcdTestLength; ++i) {
            const ilkData = ilks[i];
            const joinAddr = ilkData.join;

            it(`... should open an empty ${ilkData.ilkLabel} Maker vault`, async () => {
                const vaultsBefore = await getVaultsForUser(proxy.address, makerAddresses);
                const numVaultsForUser = vaultsBefore[0].length;

                await openMcd(proxy, joinAddr);

                const vaultsAfter = await getVaultsForUser(proxy.address, makerAddresses);
                const numVaultsForUserAfter = vaultsAfter[0].length;
                const lastVaultIlk = vaultsAfter.ilks[vaultsAfter.ilks.length - 1];

                expect(numVaultsForUser + 1).to.be.eq(numVaultsForUserAfter);
                expect(lastVaultIlk).to.be.eq(ilkData.ilkBytes);
            });
        }

        it('... should open an empty CropJoin Maker vault', async () => {
            // await castSpell('0xEEC1e1aef39309998d14615a177d989F37342cf1');

            const vaultId = await openMcd(proxy, cropData.joinAddr, CROPPER_ADDR);

            const vaultInfo = await mcdView.getCropJoinCdps([cropData.ilk], proxy.address);

            console.log(vaultInfo);

            expect(parseFloat(vaultId)).to.be.gt(0);
        });
    });
};

const mcdSupplyTest = async (mcdTestLength) => {
    describe('Mcd-Supply', function () {
        this.timeout(80000);

        let senderAcc;
        let proxy;
        let mcdView;
        let mcdViewAddr;

        before(async () => {
            mcdViewAddr = await getAddrFromRegistry('McdView');
            mcdView = await hre.ethers.getContractAt('McdView', mcdViewAddr);

            senderAcc = (await hre.ethers.getSigners())[0];
            proxy = await getProxy(senderAcc.address);
        });

        for (let i = 0; i < mcdTestLength; ++i) {
            const ilkData = ilks[i];
            const joinAddr = ilkData.join;
            const tokenData = getAssetInfo(ilkData.asset);
            // eslint-disable-next-line max-len
            const amountFetchedFromUSD = fetchAmountinUSDPrice(
                tokenData.symbol,
                SUPPLY_AMOUNT_IN_USD,
            );
            it(`... should supply ${amountFetchedFromUSD} ${tokenData.symbol} to a ${ilkData.ilkLabel} vault`, async () => {
                // skip uni tokens
                if (tokenData.symbol.indexOf('UNIV2') !== -1) {
                    // eslint-disable-next-line no-unused-expressions
                    expect(true).to.be.true;
                    return;
                }
                // erc20 token has an edge case for setting balance so we skip
                if (tokenData.symbol === 'GUSD' || tokenData.symbol === 'RENBTC') {
                    // eslint-disable-next-line no-unused-expressions
                    expect(true).to.be.true;
                    return;
                }
                if (ilkData.ilkLabel === 'GUNIV3DAIUSDC1-A'
                || ilkData.ilkLabel === 'GUNIV3DAIUSDC2-A'
                || ilkData.ilkLabel === 'WSTETH-A'
                || ilkData.ilkLabel === 'CRVV1ETHSTETH-A'
                || ilkData.ilkLabel === 'TUSD-A'
                ) {
                    // eslint-disable-next-line no-unused-expressions
                    expect(true).to.be.true;
                    return;
                }

                const vaultId = await openMcd(proxy, joinAddr);
                const amount = BigNumber.from(
                    hre.ethers.utils.parseUnits(amountFetchedFromUSD, tokenData.decimals),
                );

                const from = senderAcc.address;

                if (tokenData.symbol === 'ETH') {
                    tokenData.address = WETH_ADDRESS;
                }

                await supplyMcd(proxy, vaultId, amount, tokenData.address, joinAddr, from);

                const info = await getVaultInfo(mcdView, vaultId, ilkData.ilkBytes);

                expect(parseFloat(amountFetchedFromUSD)).to.be.eq(info.coll);
            });
        }

        it('... should supply to CropJoin vault', async () => {
            const vaultId = await openMcd(proxy, cropData.joinAddr, CROPPER_ADDR);

            const amount = '40';
            const amountWei = hre.ethers.utils.parseUnits(amount, 18);

            const from = senderAcc.address;

            const infoBefore = await getVaultInfo(mcdView, vaultId, cropJoinIlks[0], CROPPER_ADDR);

            await supplyMcd(
                proxy,
                vaultId,
                amountWei,
                cropData.tokenAddr,
                cropData.joinAddr,
                from,
                REGISTRY_ADDR,
                CROPPER_ADDR,
            );

            const info = await getVaultInfo(mcdView, vaultId, cropJoinIlks[0], CROPPER_ADDR);

            expect(infoBefore.coll + parseFloat(amount)).to.be.eq(info.coll);
        });
    });
};

const mcdGenerateTest = async (mcdTestLength) => {
    describe('Mcd-Generate', function () {
        this.timeout(80000);

        let makerAddresses;
        let senderAcc;
        let proxy;
        let mcdViewAddr;
        let mcdView;

        before(async () => {
            makerAddresses = await fetchMakerAddresses();

            senderAcc = (await hre.ethers.getSigners())[0];
            proxy = await getProxy(senderAcc.address);
            mcdViewAddr = await getAddrFromRegistry('McdView');
            mcdView = await hre.ethers.getContractAt('McdView', mcdViewAddr);
        });
        // ETH-B fails often
        for (let i = 0; i < mcdTestLength; ++i) {
            const ilkData = ilks[i];
            const joinAddr = ilkData.join;
            const tokenData = getAssetInfo(ilkData.asset);

            it(`... should generate ${GENERATE_AMOUNT_IN_USD} DAI for ${ilkData.ilkLabel} vault`, async () => {
                // skip uni tokens
                if (tokenData.symbol.indexOf('UNIV2') !== -1) {
                    // eslint-disable-next-line no-unused-expressions
                    expect(true).to.be.true;
                    return;
                }
                // erc20 token has an edge case for setting balance so we skip
                if (tokenData.symbol === 'GUSD' || tokenData.symbol === 'RENBTC') {
                    // eslint-disable-next-line no-unused-expressions
                    expect(true).to.be.true;
                    return;
                }
                // can't fetch price for these
                if (ilkData.ilkLabel === 'GUNIV3DAIUSDC1-A'
                || ilkData.ilkLabel === 'GUNIV3DAIUSDC2-A'
                || ilkData.ilkLabel === 'WSTETH-A'
                || ilkData.ilkLabel === 'CRVV1ETHSTETH-A'
                || ilkData.ilkLabel === 'TUSD-A') {
                    // eslint-disable-next-line no-unused-expressions
                    expect(true).to.be.true;
                    return;
                }

                const canGenerate = await canGenerateDebt(ilkData);
                if (!canGenerate) {
                    // eslint-disable-next-line no-unused-expressions
                    expect(true).to.be.true;
                    return;
                }

                if (tokenData.symbol === 'ETH') {
                    tokenData.address = WETH_ADDRESS;
                }

                const vaultId = await openMcd(proxy, joinAddr);
                const collAmount = hre.ethers.utils.parseUnits(
                    fetchAmountinUSDPrice(tokenData.symbol, SUPPLY_AMOUNT_IN_USD),
                    tokenData.decimals,
                );

                const from = senderAcc.address;
                const to = senderAcc.address;

                const amountDai = hre.ethers.utils.parseUnits(GENERATE_AMOUNT_IN_USD, 18);

                const daiBalanceBefore = await balanceOf(makerAddresses.MCD_DAI, from);

                await supplyMcd(proxy, vaultId, collAmount, tokenData.address, joinAddr, from);
                await generateMcd(proxy, vaultId, amountDai, to);
                const daiBalanceAfter = await balanceOf(makerAddresses.MCD_DAI, from);

                expect(daiBalanceBefore.add(amountDai)).to.be.eq(daiBalanceAfter);
            });
        }

        it('... should generate from CropJoin vault', async () => {
            const vaultId = await openMcd(proxy, cropData.joinAddr, CROPPER_ADDR);

            const amount = '40';
            const amountWei = hre.ethers.utils.parseUnits(amount, 18);

            const amountDai = '30000';
            const amountDaiWei = hre.ethers.utils.parseUnits(amountDai, 18);

            const from = senderAcc.address;

            await supplyMcd(
                proxy,
                vaultId,
                amountWei,
                cropData.tokenAddr,
                cropData.joinAddr,
                from,
                REGISTRY_ADDR,
                CROPPER_ADDR,
            );
            const infoBefore = await getVaultInfo(mcdView, vaultId, cropJoinIlks[0], CROPPER_ADDR);

            await generateMcd(proxy, vaultId, amountDaiWei, senderAcc.address, CROPPER_ADDR);

            const infoAfter = await getVaultInfo(mcdView, vaultId, cropJoinIlks[0], CROPPER_ADDR);

            expect(infoBefore.debt + parseFloat(amountDai)).to.be.closeTo(infoAfter.debt, 0.01);
        });
    });
};

const mcdGiveTest = async () => {
    describe('Mcd-Give', () => {
        let senderAcc;
        let secondAcc;
        let thirdAcc;
        let proxy;
        // let mcdView;
        let mcdManager;

        before(async () => {
            senderAcc = (await hre.ethers.getSigners())[0];
            secondAcc = (await hre.ethers.getSigners())[1];
            thirdAcc = (await hre.ethers.getSigners())[2];
            proxy = await getProxy(senderAcc.address);

            // mcdView = await redeploy('McdView');

            mcdManager = await hre.ethers.getContractAt('IManager', MCD_MANAGER_ADDR);
        });

        it('... should give a cdp to another proxy', async () => {
            const { join } = ilks[0];

            const vaultId = await openMcd(proxy, join);

            const secondProxy = await getProxy(secondAcc.address);
            const createProxy = false;

            await mcdGive(proxy, vaultId, secondProxy, createProxy);

            const ownerAfter = await mcdManager.owns(vaultId);

            expect(ownerAfter).to.be.eq(secondProxy.address);
        });

        it('... should give a cdp to an address and proxy should be created for it', async () => {
            const { join } = ilks[0];

            const vaultId = await openMcd(proxy, join);

            const createProxy = true;

            await mcdGive(proxy, vaultId, thirdAcc, createProxy);

            const ownerAfter = await mcdManager.owns(vaultId);

            const thirdProxy = await getProxy(thirdAcc.address);

            expect(ownerAfter).to.be.eq(thirdProxy.address);
        });
    });
};
const mcdMergeTest = async (mcdTestLength) => {
    describe('Mcd-Merge', () => {
        let senderAcc;
        let proxy;
        let mcdView;
        let mcdViewAddr;
        before(async () => {
            senderAcc = (await hre.ethers.getSigners())[0];
            proxy = await getProxy(senderAcc.address);

            mcdViewAddr = await getAddrFromRegistry('McdView');
            mcdView = await hre.ethers.getContractAt('McdView', mcdViewAddr);
        });

        for (let i = 0; i < mcdTestLength; ++i) {
            const ilkData = ilks[i];
            const tokenData = getAssetInfo(ilkData.asset);

            it(`... should merge two ${ilkData.ilkLabel} Maker vaults`, async () => {
                if (tokenData.symbol === 'ETH') {
                    tokenData.address = WETH_ADDRESS;
                }
                // skip uni tokens
                if (tokenData.symbol.indexOf('UNIV2') !== -1) {
                    // eslint-disable-next-line no-unused-expressions
                    expect(true).to.be.true;
                    return;
                }
                // TODO: Try to increase maximum debt for ilk
                const canGenerate = await canGenerateDebt(ilkData);
                if (!canGenerate) {
                    // eslint-disable-next-line no-unused-expressions
                    expect(true).to.be.true;
                    return;
                }
                // TODO: ERC20 Proxy edge cases
                if (tokenData.symbol === 'GUSD' || tokenData.symbol === 'RENBTC') {
                    // eslint-disable-next-line no-unused-expressions
                    expect(true).to.be.true;
                    return;
                }
                // can't fetch price for these
                if (ilkData.ilkLabel === 'GUNIV3DAIUSDC1-A'
                || ilkData.ilkLabel === 'GUNIV3DAIUSDC2-A'
                || ilkData.ilkLabel === 'WSTETH-A'
                || ilkData.ilkLabel === 'CRVV1ETHSTETH-A'
                || ilkData.ilkLabel === 'TUSD-A') {
                    // eslint-disable-next-line no-unused-expressions
                    expect(true).to.be.true;
                    return;
                }
                const vaultId1 = await openVault(
                    proxy,
                    ilkData.ilkLabel,
                    fetchAmountinUSDPrice(tokenData.symbol, SUPPLY_AMOUNT_IN_USD),
                    GENERATE_AMOUNT_IN_USD,
                );
                const vaultId2 = await openVault(
                    proxy,
                    ilkData.ilkLabel,
                    fetchAmountinUSDPrice(tokenData.symbol, SUPPLY_AMOUNT_IN_USD),
                    GENERATE_AMOUNT_IN_USD,
                );
                const vault1Before = await getVaultInfo(mcdView, vaultId1, ilkData.ilkBytes);
                const vault2Before = await getVaultInfo(mcdView, vaultId2, ilkData.ilkBytes);
                await mcdMerge(proxy, vaultId1, vaultId2);

                const vault2After = await getVaultInfo(mcdView, vaultId2, ilkData.ilkBytes);

                // eslint-disable-next-line max-len
                expect(vault2After.debt).to.be.closeTo(
                    vault1Before.debt + vault2Before.debt,
                    0.0001,
                );
                // eslint-disable-next-line max-len
                expect(vault2After.coll).to.be.closeTo(
                    vault1Before.coll + vault2Before.coll,
                    0.0001,
                );
            }).timeout(50000);
        }
    });
};

const mcdPaybackTest = async (mcdTestLength) => {
    const PARTIAL_DAI_AMOUNT = '100';

    describe('Mcd-Payback', function () {
        this.timeout(40000);

        let makerAddresses;
        let senderAcc;
        let proxy;
        let mcdView;
        let mcdViewAddr;

        before(async () => {
            makerAddresses = await fetchMakerAddresses();
            senderAcc = (await hre.ethers.getSigners())[0];
            proxy = await getProxy(senderAcc.address);
            mcdViewAddr = await getAddrFromRegistry('McdView');
            mcdView = await hre.ethers.getContractAt('McdView', mcdViewAddr);
        });

        for (let i = 0; i < mcdTestLength; ++i) {
            const ilkData = ilks[i];
            const tokenData = getAssetInfo(ilkData.asset);
            let vaultId;
            it(`... should payback ${PARTIAL_DAI_AMOUNT} DAI for ${ilkData.ilkLabel} vault`, async () => {
                // skip uni tokens
                if (tokenData.symbol.indexOf('UNIV2') !== -1) {
                    // eslint-disable-next-line no-unused-expressions
                    expect(true).to.be.true;
                    return;
                }
                // erc20 token has an edge case for setting balance so we skip
                if (tokenData.symbol === 'GUSD' || tokenData.symbol === 'RENBTC') {
                    // eslint-disable-next-line no-unused-expressions
                    expect(true).to.be.true;
                    return;
                }
                // can't fetch price for these
                if (ilkData.ilkLabel === 'GUNIV3DAIUSDC1-A'
                || ilkData.ilkLabel === 'GUNIV3DAIUSDC2-A'
                || ilkData.ilkLabel === 'WSTETH-A'
                || ilkData.ilkLabel === 'CRVV1ETHSTETH-A'
                || ilkData.ilkLabel === 'TUSD-A') {
                    // eslint-disable-next-line no-unused-expressions
                    expect(true).to.be.true;
                    return;
                }

                const canGenerate = await canGenerateDebt(ilkData);
                if (!canGenerate) {
                    // eslint-disable-next-line no-unused-expressions
                    expect(true).to.be.true;
                    return;
                }

                if (tokenData.symbol === 'ETH') {
                    tokenData.address = WETH_ADDRESS;
                }

                vaultId = await openVault(
                    proxy,
                    ilkData.ilkLabel,
                    fetchAmountinUSDPrice(tokenData.symbol, SUPPLY_AMOUNT_IN_USD),
                    fetchAmountinUSDPrice('DAI', GENERATE_AMOUNT_IN_USD),
                );

                // const ratio = await getRatio(mcdView, vaultId);
                // console.log('ratio: ', ratio.toString());

                const from = senderAcc.address;
                const amountDai = hre.ethers.utils.parseUnits(PARTIAL_DAI_AMOUNT, 18);

                const daiBalanceBefore = await balanceOf(makerAddresses.MCD_DAI, from);

                await paybackMcd(proxy, vaultId, amountDai, from, makerAddresses.MCD_DAI);

                const daiBalanceAfter = await balanceOf(makerAddresses.MCD_DAI, from);

                expect(daiBalanceBefore.sub(amountDai)).to.be.eq(daiBalanceAfter);
            });

            it(`... should payback all debt by sending amount higher than debt DAI for ${ilkData.ilkLabel} vault`, async () => {
                // skip uni tokens
                if (tokenData.symbol.indexOf('UNIV2') !== -1) {
                    // eslint-disable-next-line no-unused-expressions
                    expect(true).to.be.true;
                    return;
                }
                // erc20 token has an edge case for setting balance so we skip
                if (tokenData.symbol === 'GUSD' || tokenData.symbol === 'RENBTC') {
                    // eslint-disable-next-line no-unused-expressions
                    expect(true).to.be.true;
                    return;
                }
                // can't fetch price for these
                if (ilkData.ilkLabel === 'GUNIV3DAIUSDC1-A'
                || ilkData.ilkLabel === 'GUNIV3DAIUSDC2-A'
                || ilkData.ilkLabel === 'WSTETH-A'
                || ilkData.ilkLabel === 'CRVV1ETHSTETH-A'
                || ilkData.ilkLabel === 'TUSD-A') {
                    // eslint-disable-next-line no-unused-expressions
                    expect(true).to.be.true;
                    return;
                }

                const canGenerate = await canGenerateDebt(ilkData);
                if (!canGenerate) {
                    // eslint-disable-next-line no-unused-expressions
                    expect(true).to.be.true;
                    return;
                }

                if (tokenData.symbol === 'ETH') {
                    tokenData.address = WETH_ADDRESS;
                }
                await openVault(
                    proxy,
                    ilkData.ilkLabel,
                    fetchAmountinUSDPrice(tokenData.symbol, SUPPLY_AMOUNT_IN_USD),
                    GENERATE_AMOUNT_IN_USD,
                );

                vaultId = await openVault(
                    proxy,
                    ilkData.ilkLabel,
                    fetchAmountinUSDPrice(tokenData.symbol, SUPPLY_AMOUNT_IN_USD),
                    GENERATE_AMOUNT_IN_USD,
                );
                // const ratio = await getRatio(mcdView, vaultId);
                // console.log('ratio: ', ratio.toString());

                const from = senderAcc.address;
                const amountDai = hre.ethers.utils.parseUnits(
                    (+GENERATE_AMOUNT_IN_USD + +'1000').toString(),
                    18,
                );

                const daiBalanceBefore = await balanceOf(makerAddresses.MCD_DAI, from);

                await paybackMcd(proxy, vaultId, amountDai, from, makerAddresses.MCD_DAI);
                const daiBalanceAfter = await balanceOf(makerAddresses.MCD_DAI, from);
                const debtAmountInWei = hre.ethers.utils.parseUnits(GENERATE_AMOUNT_IN_USD, 18);

                expect(daiBalanceBefore.sub(debtAmountInWei)).to.be.eq(daiBalanceAfter);
            });

            it(`... should payback all debt by sending uint.max as parameter for ${ilkData.ilkLabel} vault`, async () => {
                // skip uni tokens
                if (tokenData.symbol.indexOf('UNIV2') !== -1) {
                    // eslint-disable-next-line no-unused-expressions
                    expect(true).to.be.true;
                    return;
                }
                // erc20 token has an edge case for setting balance so we skip
                if (tokenData.symbol === 'GUSD' || tokenData.symbol === 'RENBTC') {
                    // eslint-disable-next-line no-unused-expressions
                    expect(true).to.be.true;
                    return;
                }
                // can't fetch price for these
                if (ilkData.ilkLabel === 'GUNIV3DAIUSDC1-A'
                || ilkData.ilkLabel === 'GUNIV3DAIUSDC2-A'
                || ilkData.ilkLabel === 'WSTETH-A'
                || ilkData.ilkLabel === 'CRVV1ETHSTETH-A'
                || ilkData.ilkLabel === 'TUSD-A') {
                    // eslint-disable-next-line no-unused-expressions
                    expect(true).to.be.true;
                    return;
                }

                const canGenerate = await canGenerateDebt(ilkData);
                if (!canGenerate) {
                    // eslint-disable-next-line no-unused-expressions
                    expect(true).to.be.true;
                    return;
                }

                if (tokenData.symbol === 'ETH') {
                    tokenData.address = WETH_ADDRESS;
                }
                const amountDebt = GENERATE_AMOUNT_IN_USD;
                await openVault(
                    proxy,
                    ilkData.ilkLabel,
                    fetchAmountinUSDPrice(tokenData.symbol, SUPPLY_AMOUNT_IN_USD),
                    amountDebt,
                );

                vaultId = await openVault(
                    proxy,
                    ilkData.ilkLabel,
                    fetchAmountinUSDPrice(tokenData.symbol, SUPPLY_AMOUNT_IN_USD),
                    amountDebt,
                );
                // const ratio = await getRatio(mcdView, vaultId);
                // console.log('ratio: ', ratio.toString());

                const from = senderAcc.address;

                const daiBalanceBefore = await balanceOf(makerAddresses.MCD_DAI, from);

                await paybackMcd(
                    proxy,
                    vaultId,
                    hre.ethers.constants.MaxUint256,
                    from,
                    makerAddresses.MCD_DAI,
                );
                const debtAmountInWei = hre.ethers.utils.parseUnits(amountDebt, 18);
                const daiBalanceAfter = await balanceOf(makerAddresses.MCD_DAI, from);

                expect(daiBalanceBefore.sub(debtAmountInWei)).to.be.eq(daiBalanceAfter);
            });
        }

        it('... should payback Dai in CropJoin vault', async () => {
            const vaultId = await openMcd(proxy, cropData.joinAddr, CROPPER_ADDR);

            const amount = '40';
            const amountWei = hre.ethers.utils.parseUnits(amount, 18);

            const amountDai = '30000';
            const amountDaiWei = hre.ethers.utils.parseUnits(amountDai, 18);

            const paybackAmount = '1000';
            const paybackAmountWei = hre.ethers.utils.parseUnits(paybackAmount, 18);

            const from = senderAcc.address;

            await supplyMcd(
                proxy,
                vaultId,
                amountWei,
                cropData.tokenAddr,
                cropData.joinAddr,
                from,
                REGISTRY_ADDR,
                CROPPER_ADDR,
            );

            await generateMcd(proxy, vaultId, amountDaiWei, senderAcc.address, CROPPER_ADDR);

            const infoBefore = await getVaultInfo(mcdView, vaultId, cropJoinIlks[0], CROPPER_ADDR);

            await paybackMcd(proxy, vaultId, paybackAmountWei, from, DAI_ADDR, CROPPER_ADDR);

            const infoAfter = await getVaultInfo(mcdView, vaultId, cropJoinIlks[0], CROPPER_ADDR);
            expect(infoBefore.debt - parseFloat(paybackAmount)).to.be.closeTo(infoAfter.debt, 0.01);
        });

        it('... should payback uint.max Dai in CropJoin vault', async () => {
            const vaultId = await openMcd(proxy, cropData.joinAddr, CROPPER_ADDR);
            const from = senderAcc.address;

            await paybackMcd(proxy, vaultId, MAX_UINT, from, DAI_ADDR, CROPPER_ADDR);

            const infoAfter = await getVaultInfo(mcdView, vaultId, cropJoinIlks[0], CROPPER_ADDR);

            expect(infoAfter.debt).to.be.eq(0);
        });
    });
};
const mcdWithdrawTest = async (mcdTestLength) => {
    describe('Mcd-Withdraw', function () {
        this.timeout(40000);

        let senderAcc;
        let proxy;
        let mcdView;
        let mcdViewAddr;

        before(async () => {
            senderAcc = (await hre.ethers.getSigners())[0];
            proxy = await getProxy(senderAcc.address);
            mcdViewAddr = await getAddrFromRegistry('McdView');
            mcdView = await hre.ethers.getContractAt('McdView', mcdViewAddr);
        });

        for (let i = 0; i < mcdTestLength; ++i) {
            const ilkData = ilks[i];
            const joinAddr = ilkData.join;
            const tokenData = getAssetInfo(ilkData.asset);
            let vaultId;
            const supplyAmount = fetchAmountinUSDPrice(tokenData.symbol, SUPPLY_AMOUNT_IN_USD);
            const withdrawAmount = fetchAmountinUSDPrice(tokenData.symbol, '500');

            if (supplyAmount === 0) {
                // skip tokens we don't have price for
                // eslint-disable-next-line no-continue
                continue;
            }

            it(`... should withdraw ${withdrawAmount} ${tokenData.symbol} from ${ilkData.ilkLabel} vault`, async () => {
                // skip uni tokens
                if (tokenData.symbol.indexOf('UNIV2') !== -1) {
                    // eslint-disable-next-line no-unused-expressions
                    expect(true).to.be.true;
                    return;
                }
                // erc20 token has an edge case for setting balance so we skip
                if (tokenData.symbol === 'GUSD' || tokenData.symbol === 'RENBTC') {
                    // eslint-disable-next-line no-unused-expressions
                    expect(true).to.be.true;
                    return;
                }
                // can't fetch price for these
                if (ilkData.ilkLabel === 'GUNIV3DAIUSDC1-A'
                || ilkData.ilkLabel === 'GUNIV3DAIUSDC2-A'
                || ilkData.ilkLabel === 'WSTETH-A'
                || ilkData.ilkLabel === 'CRVV1ETHSTETH-A'
                || ilkData.ilkLabel === 'TUSD-A') {
                    // eslint-disable-next-line no-unused-expressions
                    expect(true).to.be.true;
                    return;
                }

                // TODO: Maybe optimize this so it's called only once per running tests
                const canGenerate = await canGenerateDebt(ilkData);
                if (!canGenerate) {
                    // eslint-disable-next-line no-unused-expressions
                    expect(true).to.be.true;
                    return;
                }

                if (tokenData.symbol === 'ETH') {
                    tokenData.address = WETH_ADDRESS;
                }
                vaultId = await openVault(
                    proxy,
                    ilkData.ilkLabel,
                    supplyAmount,
                    MIN_VAULT_DAI_AMOUNT,
                );

                const to = senderAcc.address;
                const amountColl = hre.ethers.utils.parseUnits(withdrawAmount, tokenData.decimals);

                const collBalanceBefore = await balanceOf(tokenData.address, to);

                await withdrawMcd(proxy, vaultId, amountColl, joinAddr, to);

                const collBalanceAfter = await balanceOf(tokenData.address, to);

                expect(collBalanceAfter).to.be.gt(collBalanceBefore);
            });

            it(`... should withdraw all coll ${tokenData.symbol} from ${ilkData.ilkLabel} vault`, async () => {
                // skip uni tokens
                if (tokenData.symbol.indexOf('UNIV2') !== -1) {
                    // eslint-disable-next-line no-unused-expressions
                    expect(true).to.be.true;
                    return;
                }
                // erc20 token has an edge case for setting balance so we skip
                if (tokenData.symbol === 'GUSD' || tokenData.symbol === 'RENBTC') {
                    // eslint-disable-next-line no-unused-expressions
                    expect(true).to.be.true;
                    return;
                }
                // can't fetch price for these
                if (ilkData.ilkLabel === 'GUNIV3DAIUSDC1-A'
                || ilkData.ilkLabel === 'GUNIV3DAIUSDC2-A'
                || ilkData.ilkLabel === 'WSTETH-A'
                || ilkData.ilkLabel === 'CRVV1ETHSTETH-A'
                || ilkData.ilkLabel === 'TUSD-A') {
                    // eslint-disable-next-line no-unused-expressions
                    expect(true).to.be.true;
                    return;
                }

                const canGenerate = await canGenerateDebt(ilkData);
                if (!canGenerate) {
                    // eslint-disable-next-line no-unused-expressions
                    expect(true).to.be.true;
                    return;
                }

                if (tokenData.symbol === 'ETH') {
                    tokenData.address = WETH_ADDRESS;
                }

                const amount = BigNumber.from(
                    hre.ethers.utils.parseUnits(supplyAmount, tokenData.decimals),
                );
                const to = senderAcc.address;
                const from = senderAcc.address;

                vaultId = await openMcd(proxy, joinAddr);
                await supplyMcd(proxy, vaultId, amount, tokenData.address, joinAddr, from);
                const collBalanceBefore = await balanceOf(tokenData.address, to);
                await withdrawMcd(proxy, vaultId, hre.ethers.constants.MaxUint256, joinAddr, to);

                const collBalanceAfter = await balanceOf(tokenData.address, to);
                expect(collBalanceAfter).to.be.gt(collBalanceBefore);
            });
        }

        it('... should withdraw from CropJoin vault', async () => {
            const vaultId = await openMcd(proxy, cropData.joinAddr, CROPPER_ADDR);

            const amount = '40';
            const amountWei = hre.ethers.utils.parseUnits(amount, 18);

            const withdrawAmount = '4';
            const withdrawAmountWei = hre.ethers.utils.parseUnits(withdrawAmount, 18);

            const from = senderAcc.address;
            const to = senderAcc.address;

            await supplyMcd(
                proxy,
                vaultId,
                amountWei,
                cropData.tokenAddr,
                cropData.joinAddr,
                from,
                REGISTRY_ADDR,
                CROPPER_ADDR,
            );

            const infoBefore = await getVaultInfo(mcdView, vaultId, cropJoinIlks[0], CROPPER_ADDR);

            await withdrawMcd(proxy, vaultId, withdrawAmountWei, cropData.joinAddr, to, REGISTRY_ADDR, CROPPER_ADDR);

            const infoAfter = await getVaultInfo(mcdView, vaultId, cropJoinIlks[0], CROPPER_ADDR);

            expect(infoBefore.coll - parseFloat(withdrawAmount)).to.be.eq(infoAfter.coll);
        });
    });
};

const mcdClaimTest = async () => {
    describe('Mcd-Claim', function () {
        this.timeout(40000);

        let senderAcc;
        let proxy;

        before(async () => {
            senderAcc = (await hre.ethers.getSigners())[0];
            proxy = await getProxy(senderAcc.address);
        });

        it('... should claim from CropJoin vault', async () => {
            const vaultId = await openMcd(proxy, cropData.joinAddr, CROPPER_ADDR);

            const amount = '40';
            const amountWei = hre.ethers.utils.parseUnits(amount, 18);

            const from = senderAcc.address;
            const to = senderAcc.address;

            await supplyMcd(
                proxy,
                vaultId,
                amountWei,
                cropData.tokenAddr,
                cropData.joinAddr,
                from,
                REGISTRY_ADDR,
                CROPPER_ADDR,
            );

            const ldoAmount = '1000';
            const ldoAmountWei = hre.ethers.utils.parseUnits(ldoAmount, 18);

            // Buy some LDO tokens so we can send to join as minted bonus
            await sell(
                proxy,
                WETH_ADDRESS,
                LDO_ADDR,
                hre.ethers.utils.parseUnits('10', 18),
                UNISWAP_WRAPPER,
                from,
                to,
            );
            await send(LDO_ADDR, cropData.joinAddr, ldoAmountWei);

            const senderAcc2 = (await hre.ethers.getSigners())[1];
            const bonusBalanceBefore = await balanceOf(LDO_ADDR, senderAcc2.address);

            await claimMcd(proxy, vaultId, cropData.joinAddr, senderAcc2.address);

            const bonusBalanceAfter = await balanceOf(LDO_ADDR, senderAcc2.address);

            expect(bonusBalanceAfter).to.be.gt(bonusBalanceBefore);
        });
    });
};

const mcdRepayCompositeTest = async () => {
    describe('Mcd-Repay-Composite', async function () {
        this.timeout(80000);

        let makerAddresses;
        let feeReciever;
        let sellWrapper;
        let backupWrapper;
        let senderAcc;
        let proxy;
        let mcdView;
        let repayComposite;

        let snapshot;

        before(async () => {
            sellWrapper = await redeploy('UniswapWrapperV3');
            backupWrapper = await redeploy('UniV3WrapperV3');
            mcdView = await redeploy('McdView');
            repayComposite = await redeploy('McdRepayComposite');

            makerAddresses = await fetchMakerAddresses();
            senderAcc = (await hre.ethers.getSigners())[0];
            proxy = await getProxy(senderAcc.address);

            const feeRecipient = await repayComposite.feeRecipient();
            feeReciever = hre.ethers.utils.defaultAbiCoder.decode(
                ['address'],
                await senderAcc.call({
                    to: feeRecipient,
                    data: hre.ethers.utils.id('wallet()'),
                }),
            )[0];

            await setNewExchangeWrapper(senderAcc, sellWrapper.address);
            await setNewExchangeWrapper(senderAcc, backupWrapper.address);
        });

        beforeEach(async () => {
            snapshot = await takeSnapshot();
        });

        afterEach(async () => {
            await revertToSnapshot(snapshot);
        });

        for (let i = 0; i < ilks.length; i++) {
            const ilkData = ilks[i];
            const joinAddr = ilkData.join;
            const tokenData = getAssetInfo(ilkData.asset);

            if (tokenData.symbol === 'ETH') {
                tokenData.address = WETH_ADDRESS;
            }

            if (![
                'ETH',
                'WBTC',
                'wstETH',
            // eslint-disable-next-line no-continue
            ].includes(tokenData.symbol)) continue;

            const repayAmount = fetchAmountinUSDPrice(tokenData.symbol, '10000');

            it(`... should call a FL repay ${repayAmount} ${tokenData.symbol} on a ${ilkData.ilkLabel} vault`, async () => {
                expect(repayAmount).to.not.be.eq(0, `cant fetch price for ${tokenData.symbol}`);

                // create a vault
                // eslint-disable-next-line no-await-in-loop
                const vaultId = await openVault(
                    proxy,
                    ilkData.ilkLabel,
                    fetchAmountinUSDPrice(tokenData.symbol, SUPPLY_AMOUNT_IN_USD),
                    (parseInt(GENERATE_AMOUNT_IN_USD, 10) + 500).toString(),
                );
                expect(vaultId).to.not.be.eq(-1, 'cant open vault');

                const ratioBefore = await getRatio(mcdView, vaultId);
                const info = await getVaultInfo(mcdView, vaultId, ilkData.ilkBytes);
                console.log(
                    `Ratio before: ${ratioBefore.toFixed(2)}% (coll: ${info.coll.toFixed(2)} ${
                        tokenData.symbol
                    }, debt: ${info.debt.toFixed(2)} Dai)`,
                );

                await setBalance(DAI_ADDR, senderAcc.address, Float2BN('0'));
                const collToken = tokenData.address;
                const daiToken = makerAddresses.MCD_DAI;

                const exchangeOrder = formatExchangeObj(
                    collToken,
                    daiToken,
                    Float2BN(repayAmount, tokenData.decimals),
                    sellWrapper.address,
                );

                if (tokenData.symbol === 'wstETH') {
                    exchangeOrder[7] = backupWrapper.address;
                    exchangeOrder[8] = '0x7f39c581f595b53c5cb19bd0b3f8da6c935e2ca00001f4c02aaa39b223fe8d0a0e5c4f27ead9083c756cc20001f46b175474e89094c44da98b954eedeac495271d0f';
                }

                const feesBefore = await balanceOf(tokenData.address, feeReciever);
                const receipt = await (await mcdRepayComposite(
                    proxy,
                    vaultId,
                    Float2BN(repayAmount, tokenData.decimals),
                    ilkData.isCrop ? CROPPER_ADDR : MCD_MANAGER_ADDR,
                    joinAddr,
                    exchangeOrder,
                )).wait();
                const feesAfter = await balanceOf(tokenData.address, feeReciever);

                const recipeEvent = receipt.events.find((e) => e.topics[0] === hre.ethers.utils.id('RecipeEvent(address,string)')
                    && e.topics[1] === hre.ethers.utils.defaultAbiCoder.encode(['address'], [repayComposite.address])
                    && e.topics[2] === hre.ethers.utils.id('McdRepayComposite'));
                expect(recipeEvent).to.not.be.eq(undefined);

                const actionEvent = receipt.events.find((e) => e.topics[0] === hre.ethers.utils.id('ActionEvent(string,bytes)')
                    && e.address === repayComposite.address);
                expect(actionEvent).to.not.be.eq(undefined);

                const eventParams = hre.ethers.utils.defaultAbiCoder.decode(
                    ['(address proxy, uint256 repayAmount, uint256 exchangedAmount, uint256 paybackAmount)'],
                    hre.ethers.utils.defaultAbiCoder.decode(
                        ['bytes'],
                        actionEvent.data,
                    )[0],
                )[0];

                const ratioAfter = await getRatio(mcdView, vaultId);
                const info2 = await getVaultInfo(mcdView, vaultId, ilkData.ilkBytes);
                console.log(
                    `Ratio after: ${ratioAfter.toFixed(2)}% (coll: ${info2.coll.toFixed(2)} ${
                        tokenData.symbol
                    }, debt: ${info2.debt.toFixed(2)} Dai)`,
                );
                const feeAmount = Float2BN(repayAmount, tokenData.decimals).div(400);

                info.coll = Float2BN(`${info.coll}`, tokenData.decimals);
                info.debt = Float2BN(`${info.debt}`);
                info2.coll = Float2BN(`${info2.coll}`, tokenData.decimals);
                info2.debt = Float2BN(`${info2.debt}`);

                if (ratioAfter !== 0) {
                    expect(ratioAfter).to.be.gt(ratioBefore);
                }
                expect(info.coll.sub(info2.coll)).to.be.eq(Float2BN(repayAmount, tokenData.decimals));
                expect(info.debt.sub(info2.debt)).to.be.closeTo(
                    eventParams.paybackAmount,
                    eventParams.paybackAmount.div(Float2BN('1', 6)),
                );
                expect(await balanceOf(tokenData.address, repayComposite.address)).to.be.eq(0);
                expect(await balanceOf(DAI_ADDR, repayComposite.address)).to.be.eq(0);
                expect(await balanceOf(tokenData.address, proxy.address)).to.be.eq(0);
                expect(await balanceOf(DAI_ADDR, proxy.address)).to.be.eq(0);
                expect(await balanceOf(DAI_ADDR, senderAcc.address)).to.be.eq(
                    eventParams.exchangedAmount.sub(eventParams.paybackAmount),
                );
                expect(feesAfter.sub(feesBefore)).to.be.eq(feeAmount);
            });
        }
    });
};

const mcdBoostCompositeTest = async () => {
    describe('Mcd-Boost-Composite', async function () {
        this.timeout(80000);

        let makerAddresses;
        let sellWrapper;
        let backupWrapper;
        let senderAcc;
        let proxy;
        let mcdView;
        let boostComposite;
        let feeReciever;

        let snapshot;

        before(async () => {
            sellWrapper = await redeploy('UniswapWrapperV3');
            backupWrapper = await redeploy('UniV3WrapperV3');
            mcdView = await redeploy('McdView');
            boostComposite = await redeploy('McdBoostComposite');

            makerAddresses = await fetchMakerAddresses();
            senderAcc = (await hre.ethers.getSigners())[0];
            proxy = await getProxy(senderAcc.address);

            const feeRecipient = await boostComposite.feeRecipient();
            feeReciever = hre.ethers.utils.defaultAbiCoder.decode(
                ['address'],
                await senderAcc.call({
                    to: feeRecipient,
                    data: hre.ethers.utils.id('wallet()'),
                }),
            )[0];

            await setNewExchangeWrapper(senderAcc, sellWrapper.address);
            await setNewExchangeWrapper(senderAcc, backupWrapper.address);
        });

        beforeEach(async () => {
            snapshot = await takeSnapshot();
        });

        afterEach(async () => {
            await revertToSnapshot(snapshot);
        });

        for (let i = 0; i < ilks.length; i++) {
            const ilkData = ilks[i];
            const joinAddr = ilkData.join;
            const tokenData = getAssetInfo(ilkData.asset);

            if (tokenData.symbol === 'ETH') {
                tokenData.address = WETH_ADDRESS;
            }

            if (![
                'ETH',
                'WBTC',
                'wstETH',
            // eslint-disable-next-line no-continue
            ].includes(tokenData.symbol)) continue;

            const boostAmount = fetchAmountinUSDPrice(getAssetInfo('DAI').symbol, '10000');

            it(`... should call a FL boost ${boostAmount} DAI on a ${ilkData.ilkLabel} vault`, async () => {
                expect(boostAmount).to.not.be.eq(0, `cant fetch price for ${tokenData.symbol}`);

                // create a vault
                // eslint-disable-next-line no-await-in-loop
                const vaultId = await openVault(
                    proxy,
                    ilkData.ilkLabel,
                    fetchAmountinUSDPrice(tokenData.symbol, SUPPLY_AMOUNT_IN_USD),
                    (parseInt(GENERATE_AMOUNT_IN_USD, 10) + 500).toString(),
                );
                expect(vaultId).to.not.be.eq(-1, 'cant open vault');

                const ratioBefore = await getRatio(mcdView, vaultId);
                const info = await getVaultInfo(mcdView, vaultId, ilkData.ilkBytes);
                console.log(
                    `Ratio before: ${ratioBefore.toFixed(2)}% (coll: ${info.coll.toFixed(2)} ${
                        tokenData.symbol
                    }, debt: ${info.debt.toFixed(2)} Dai)`,
                );

                const collToken = tokenData.address;
                const daiToken = makerAddresses.MCD_DAI;

                const exchangeOrder = formatExchangeObj(
                    daiToken,
                    collToken,
                    Float2BN(boostAmount),
                    sellWrapper.address,
                );

                if (tokenData.symbol === 'wstETH') {
                    exchangeOrder[7] = backupWrapper.address;
                    exchangeOrder[8] = '0x6b175474e89094c44da98b954eedeac495271d0f0001f4c02aaa39b223fe8d0a0e5c4f27ead9083c756cc20001f47f39c581f595b53c5cb19bd0b3f8da6c935e2ca0';
                }

                const feesBefore = await balanceOf(DAI_ADDR, feeReciever);
                const receipt = await (await mcdBoostComposite(
                    proxy,
                    vaultId,
                    Float2BN(boostAmount),
                    ilkData.isCrop ? CROPPER_ADDR : MCD_MANAGER_ADDR,
                    joinAddr,
                    exchangeOrder,
                )).wait();
                const feesAfter = await balanceOf(DAI_ADDR, feeReciever);

                const recipeEvent = receipt.events.find((e) => e.topics[0] === hre.ethers.utils.id('RecipeEvent(address,string)')
                    && e.topics[1] === hre.ethers.utils.defaultAbiCoder.encode(['address'], [boostComposite.address])
                    && e.topics[2] === hre.ethers.utils.id('McdBoostComposite'));
                expect(recipeEvent).to.not.be.eq(undefined);

                const actionEvent = receipt.events.find((e) => e.topics[0] === hre.ethers.utils.id('ActionEvent(string,bytes)')
                    && e.address === boostComposite.address);
                expect(actionEvent).to.not.be.eq(undefined);
                const eventParams = hre.ethers.utils.defaultAbiCoder.decode(
                    ['(address proxy, uint256 boostAmount, uint256 supplyAmount)'],
                    hre.ethers.utils.defaultAbiCoder.decode(
                        ['bytes'],
                        actionEvent.data,
                    )[0],
                )[0];

                const ratioAfter = await getRatio(mcdView, vaultId);
                const info2 = await getVaultInfo(mcdView, vaultId, ilkData.ilkBytes);
                console.log(
                    `Ratio after: ${ratioAfter.toFixed(2)}% (coll: ${info2.coll.toFixed(2)} ${
                        tokenData.symbol
                    }, debt: ${info2.debt.toFixed(2)} Dai)`,
                );
                const feeAmount = Float2BN(boostAmount).div(400);

                info.coll = Float2BN(`${info.coll}`, tokenData.decimals);
                info.debt = Float2BN(`${info.debt}`);
                info2.coll = Float2BN(`${info2.coll}`, tokenData.decimals);
                info2.debt = Float2BN(`${info2.debt}`);

                expect(ratioAfter).to.be.lt(ratioBefore);
                expect(info2.coll.sub(info.coll)).to.be.closeTo(
                    eventParams.supplyAmount,
                    eventParams.supplyAmount.div(Float2BN('1', 6)),
                );
                expect(info2.debt.sub(info.debt)).to.be.closeTo(
                    Float2BN(boostAmount),
                    Float2BN(boostAmount).div(Float2BN('1', 6)),
                );
                expect(await balanceOf(tokenData.address, boostComposite.address)).to.be.eq(0);
                expect(await balanceOf(DAI_ADDR, boostComposite.address)).to.be.eq(0);
                expect(await balanceOf(tokenData.address, proxy.address)).to.be.eq(0);
                expect(await balanceOf(DAI_ADDR, proxy.address)).to.be.eq(0);
                expect(feesAfter.sub(feesBefore)).to.be.eq(feeAmount);
            });
        }
    });
};

const mcdDeployContracts = async () => {
    await redeploy('McdOpen');
    await redeploy('McdSupply');
    await redeploy('McdGenerate');
    await redeploy('McdGive');
    await redeploy('McdMerge');
    await redeploy('McdPayback');
    await redeploy('McdWithdraw');
    await redeploy('McdView');
    await redeploy('McdClaim');
};

const mcdFullTest = async (mcdTestLength) => {
    await mcdDeployContracts();
    await mcdOpenTest(mcdTestLength);
    await mcdSupplyTest(mcdTestLength);
    await mcdGenerateTest(mcdTestLength);
    await mcdMergeTest(mcdTestLength);
    await mcdGiveTest();
    await mcdPaybackTest(mcdTestLength);
    await mcdWithdrawTest(mcdTestLength);
    await mcdClaimTest(mcdTestLength);
};

module.exports = {
    mcdOpenTest,
    mcdFullTest,
    mcdSupplyTest,
    mcdGenerateTest,
    mcdDeployContracts,
    mcdGiveTest,
    mcdMergeTest,
    mcdPaybackTest,
    mcdWithdrawTest,
    mcdClaimTest,
    mcdRepayCompositeTest,
    mcdBoostCompositeTest,
    GENERATE_AMOUNT_IN_USD,
};
