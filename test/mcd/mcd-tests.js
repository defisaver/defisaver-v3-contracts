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
} = require('../utils');
const {
    getVaultsForUser,
    fetchMakerAddresses,
    getVaultInfo,
    canGenerateDebt,
    castSpell,
    cropJoinIlks,
    MCD_MANAGER_ADDR,
    CROPPER_ADDR,
    LDO_ADDR,
    cropData,
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

                await openMcd(proxy, makerAddresses, joinAddr);

                const vaultsAfter = await getVaultsForUser(proxy.address, makerAddresses);
                const numVaultsForUserAfter = vaultsAfter[0].length;
                const lastVaultIlk = vaultsAfter.ilks[vaultsAfter.ilks.length - 1];

                expect(numVaultsForUser + 1).to.be.eq(numVaultsForUserAfter);
                expect(lastVaultIlk).to.be.eq(ilkData.ilkBytes);
            });
        }

        it('... should open an empty CropJoin Maker vault', async () => {
            await castSpell('0xEEC1e1aef39309998d14615a177d989F37342cf1');

            const vaultId = await openMcd(proxy, makerAddresses, cropData.joinAddr, CROPPER_ADDR);

            const vaultInfo = await mcdView.getCropJoinCdps([cropData.ilk], proxy.address);

            console.log(vaultInfo);

            expect(parseFloat(vaultId)).to.be.gt(0);
        });
    });
};

const mcdSupplyTest = async (mcdTestLength) => {
    describe('Mcd-Supply', function () {
        this.timeout(80000);

        let makerAddresses;
        let senderAcc;
        let proxy;
        let mcdView;
        let mcdViewAddr;

        before(async () => {
            makerAddresses = await fetchMakerAddresses();

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
                // can't fetch price for these
                if (ilkData.ilkLabel === 'GUNIV3DAIUSDC1-A'
                || ilkData.ilkLabel === 'GUNIV3DAIUSDC2-A'
                || ilkData.ilkLabel === 'WSTETH-A') {
                    // eslint-disable-next-line no-unused-expressions
                    expect(true).to.be.true;
                    return;
                }

                const vaultId = await openMcd(proxy, makerAddresses, joinAddr);
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
            await castSpell('0xEEC1e1aef39309998d14615a177d989F37342cf1');

            const vaultId = await openMcd(proxy, makerAddresses, cropData.joinAddr, CROPPER_ADDR);

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
                || ilkData.ilkLabel === 'WSTETH-A') {
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

                const vaultId = await openMcd(proxy, makerAddresses, joinAddr);
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
            await castSpell('0xEEC1e1aef39309998d14615a177d989F37342cf1');

            const vaultId = await openMcd(proxy, makerAddresses, cropData.joinAddr, CROPPER_ADDR);

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
        let makerAddresses;
        let senderAcc;
        let secondAcc;
        let thirdAcc;
        let proxy;
        // let mcdView;
        let mcdManager;

        before(async () => {
            makerAddresses = await fetchMakerAddresses();

            senderAcc = (await hre.ethers.getSigners())[0];
            secondAcc = (await hre.ethers.getSigners())[1];
            thirdAcc = (await hre.ethers.getSigners())[2];
            proxy = await getProxy(senderAcc.address);

            // mcdView = await redeploy('McdView');

            mcdManager = await hre.ethers.getContractAt('IManager', MCD_MANAGER_ADDR);
        });

        it('... should give a cdp to another proxy', async () => {
            const { join } = ilks[0];

            const vaultId = await openMcd(proxy, makerAddresses, join);

            const secondProxy = await getProxy(secondAcc.address);
            const createProxy = false;

            await mcdGive(proxy, vaultId, secondProxy, createProxy);

            const ownerAfter = await mcdManager.owns(vaultId);

            expect(ownerAfter).to.be.eq(secondProxy.address);
        });

        it('... should give a cdp to an address and proxy should be created for it', async () => {
            const { join } = ilks[0];

            const vaultId = await openMcd(proxy, makerAddresses, join);

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
                || ilkData.ilkLabel === 'WSTETH-A') {
                    // eslint-disable-next-line no-unused-expressions
                    expect(true).to.be.true;
                    return;
                }
                const vaultId1 = await openVault(
                    makerAddresses,
                    proxy,
                    joinAddr,
                    tokenData,
                    fetchAmountinUSDPrice(tokenData.symbol, SUPPLY_AMOUNT_IN_USD),
                    GENERATE_AMOUNT_IN_USD,
                );
                const vaultId2 = await openVault(
                    makerAddresses,
                    proxy,
                    joinAddr,
                    tokenData,
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
            const joinAddr = ilkData.join;
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
                || ilkData.ilkLabel === 'WSTETH-A') {
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
                    makerAddresses,
                    proxy,
                    joinAddr,
                    tokenData,
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
                || ilkData.ilkLabel === 'WSTETH-A') {
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
                    makerAddresses,
                    proxy,
                    joinAddr,
                    tokenData,
                    fetchAmountinUSDPrice(tokenData.symbol, SUPPLY_AMOUNT_IN_USD),
                    GENERATE_AMOUNT_IN_USD,
                );

                vaultId = await openVault(
                    makerAddresses,
                    proxy,
                    joinAddr,
                    tokenData,
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
                || ilkData.ilkLabel === 'WSTETH-A') {
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
                    makerAddresses,
                    proxy,
                    joinAddr,
                    tokenData,
                    fetchAmountinUSDPrice(tokenData.symbol, SUPPLY_AMOUNT_IN_USD),
                    amountDebt,
                );

                vaultId = await openVault(
                    makerAddresses,
                    proxy,
                    joinAddr,
                    tokenData,
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
            await castSpell('0xEEC1e1aef39309998d14615a177d989F37342cf1');

            const vaultId = await openMcd(proxy, makerAddresses, cropData.joinAddr, CROPPER_ADDR);

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
                CROPPER_ADDR,
            );

            await generateMcd(proxy, vaultId, amountDaiWei, senderAcc.address, CROPPER_ADDR);

            const infoBefore = await getVaultInfo(mcdView, vaultId, cropJoinIlks[0], CROPPER_ADDR);

            await paybackMcd(proxy, vaultId, paybackAmountWei, from, DAI_ADDR, CROPPER_ADDR);

            const infoAfter = await getVaultInfo(mcdView, vaultId, cropJoinIlks[0], CROPPER_ADDR);
            expect(infoBefore.debt - parseFloat(paybackAmount)).to.be.closeTo(infoAfter.debt, 0.01);
        });

        it('... should payback uint.max Dai in CropJoin vault', async () => {
            const vaultId = await openMcd(proxy, makerAddresses, cropData.joinAddr, CROPPER_ADDR);
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
                || ilkData.ilkLabel === 'WSTETH-A') {
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
                    makerAddresses,
                    proxy,
                    joinAddr,
                    tokenData,
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
                || ilkData.ilkLabel === 'WSTETH-A') {
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

                vaultId = await openMcd(proxy, makerAddresses, joinAddr);
                await supplyMcd(proxy, vaultId, amount, tokenData.address, joinAddr, from);
                const collBalanceBefore = await balanceOf(tokenData.address, to);
                await withdrawMcd(proxy, vaultId, hre.ethers.constants.MaxUint256, joinAddr, to);

                const collBalanceAfter = await balanceOf(tokenData.address, to);
                expect(collBalanceAfter).to.be.gt(collBalanceBefore);
            });
        }

        it('... should withdraw from CropJoin vault', async () => {
            await castSpell('0xEEC1e1aef39309998d14615a177d989F37342cf1');

            const vaultId = await openMcd(proxy, makerAddresses, cropData.joinAddr, CROPPER_ADDR);

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
                CROPPER_ADDR,
            );

            const infoBefore = await getVaultInfo(mcdView, vaultId, cropJoinIlks[0], CROPPER_ADDR);

            await withdrawMcd(proxy, vaultId, withdrawAmountWei, cropData.joinAddr, to, CROPPER_ADDR);

            const infoAfter = await getVaultInfo(mcdView, vaultId, cropJoinIlks[0], CROPPER_ADDR);

            expect(infoBefore.coll - parseFloat(withdrawAmount)).to.be.eq(infoAfter.coll);
        });
    });
};

const mcdClaimTest = async () => {
    describe('Mcd-Claim', function () {
        this.timeout(40000);

        let makerAddresses;
        let senderAcc;
        let proxy;

        before(async () => {
            makerAddresses = await fetchMakerAddresses();

            senderAcc = (await hre.ethers.getSigners())[0];
            proxy = await getProxy(senderAcc.address);
        });

        it('... should claim from CropJoin vault', async () => {
            await castSpell('0xEEC1e1aef39309998d14615a177d989F37342cf1');

            const vaultId = await openMcd(proxy, makerAddresses, cropData.joinAddr, CROPPER_ADDR);

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
            const bonusBalanceProxy = await balanceOf(LDO_ADDR, proxy.address);

            expect(bonusBalanceProxy).to.be.eq(0);
            expect(bonusBalanceAfter).to.be.gt(bonusBalanceBefore);
        });
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
    GENERATE_AMOUNT_IN_USD,
};
