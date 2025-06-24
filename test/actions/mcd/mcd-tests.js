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
    mcdFLBoostComposite,
    mcdFLRepayComposite,
    mcdDsrDeposit,
    mcdDsrWithdraw,
    mcdTokenConvert,
} = require('../../utils/actions');
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
    setNewExchangeWrapper,
    Float2BN,
    takeSnapshot,
    revertToSnapshot,
    setBalance,
    formatMockExchangeObj,
    cacheChainlinkPrice,
    LOGGER_ADDR,
    getContractFromRegistry,
    approve,
} = require('../../utils/utils');
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
} = require('../../utils/mcd');

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
        let proxy;
        // let mcdView;
        let mcdManager;

        before(async () => {
            senderAcc = (await hre.ethers.getSigners())[0];
            secondAcc = (await hre.ethers.getSigners())[1];
            proxy = await getProxy(senderAcc.address);

            // mcdView = await redeploy('McdView');

            mcdManager = await hre.ethers.getContractAt('IManager', MCD_MANAGER_ADDR);
        });

        it('... should give a cdp to another proxy', async () => {
            const { join } = ilks[0];

            const vaultId = await openMcd(proxy, join);

            const secondProxy = await getProxy(secondAcc.address);

            await mcdGive(proxy, vaultId, secondProxy);

            const ownerAfter = await mcdManager.owns(vaultId);

            expect(ownerAfter).to.be.eq(secondProxy.address);
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

const mcdFLRepayCompositeTest = async () => {
    describe('Mcd-FL-Repay-Composite', async function () {
        this.timeout(80000);

        const repayGasUsed = 2_000_000;
        const USD_REPAY_AMOUNT = '10000';

        let feeReceiver;
        let mockWrapper;
        let senderAcc;
        let proxy;
        let mcdView;
        let repayComposite;

        let snapshot;

        const ilkSubset = ilks.reduce((acc, curr) => {
            if ([
                'ETH',
                'WBTC',
                'wstETH',
            ].includes(curr.asset)) acc.push(curr);
            return acc;
        }, []).sort((a, b) => (a.ilkLabel < b.ilkLabel ? (-1) : 1));

        before(async () => {
            mockWrapper = await redeploy('MockExchangeWrapper');
            mcdView = await redeploy('McdView');
            repayComposite = await redeploy('McdRepayComposite');

            senderAcc = (await hre.ethers.getSigners())[0];
            proxy = await getProxy(senderAcc.address);

            const feeRecipient = await repayComposite.feeRecipient();
            feeReceiver = hre.ethers.utils.defaultAbiCoder.decode(
                ['address'],
                await senderAcc.call({
                    to: feeRecipient,
                    data: hre.ethers.utils.id('wallet()'),
                }),
            )[0];

            await setNewExchangeWrapper(senderAcc, mockWrapper.address);

            await Promise.all(
                ilkSubset.map(async (ilk) => {
                    const tokenInfo = getAssetInfo(ilk.asset);
                    return cacheChainlinkPrice(tokenInfo.symbol, tokenInfo.address);
                }),
            );
        });

        beforeEach(async () => {
            snapshot = await takeSnapshot();
        });

        afterEach(async () => {
            await revertToSnapshot(snapshot);
        });

        ilkSubset.forEach((ilkData) => {
            const joinAddr = ilkData.join;
            const tokenData = getAssetInfo(ilkData.asset);

            if (tokenData.symbol === 'ETH') {
                tokenData.address = WETH_ADDRESS;
            }

            it(`... should call a FL repay $${USD_REPAY_AMOUNT} ${tokenData.symbol} on a ${ilkData.ilkLabel} vault`, async () => {
                const repayAmount = fetchAmountinUSDPrice(tokenData.symbol, USD_REPAY_AMOUNT);
                expect(repayAmount).to.not.be.eq(0, `cant fetch price for ${tokenData.symbol}`);

                // create a vault
                // eslint-disable-next-line no-await-in-loop
                const vaultId = await openVault(
                    proxy,
                    ilkData.ilkLabel,
                    fetchAmountinUSDPrice(tokenData.symbol, SUPPLY_AMOUNT_IN_USD),
                    GENERATE_AMOUNT_IN_USD,
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

                const exchangeOrder = await formatMockExchangeObj(
                    tokenData,
                    getAssetInfo('DAI'),
                    Float2BN(repayAmount, tokenData.decimals),
                    mockWrapper.address,
                );

                const feesBeforeCollateralAsset = await balanceOf(tokenData.address, feeReceiver);
                const feesBeforeDebtAsset = await balanceOf(DAI_ADDR, feeReceiver);
                const receipt = await (await mcdFLRepayComposite(
                    proxy,
                    vaultId,
                    joinAddr,
                    repayGasUsed,
                    exchangeOrder,
                )).wait();
                const feesAfterCollateralAsset = await balanceOf(tokenData.address, feeReceiver);
                const feesAfterDebtAsset = await balanceOf(DAI_ADDR, feeReceiver);

                const recipeEvent = receipt.events.find((e) => e.topics[0] === hre.ethers.utils.id('RecipeEvent(address,string)')
                    && e.topics[1] === hre.ethers.utils.defaultAbiCoder.encode(['address'], [repayComposite.address])
                    && e.topics[2] === hre.ethers.utils.id('McdFLRepayComposite'));
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
                expect(info.coll.sub(info2.coll)).to.be.closeTo(
                    Float2BN(repayAmount, tokenData.decimals),
                    Float2BN(repayAmount, tokenData.decimals).div(Float2BN('1', 6)),
                );
                expect(info.debt.sub(info2.debt)).to.be.closeTo(
                    eventParams.paybackAmount,
                    eventParams.paybackAmount.div(Float2BN('1', 6)),
                );
                expect(await balanceOf(tokenData.address, repayComposite.address)).to.be.eq(0);
                expect(await balanceOf(DAI_ADDR, repayComposite.address)).to.be.eq(0);
                expect(await balanceOf(tokenData.address, proxy.address)).to.be.eq(0);
                expect(await balanceOf(DAI_ADDR, proxy.address)).to.be.eq(0);
                expect(feesAfterCollateralAsset.sub(feesBeforeCollateralAsset)).to.be.eq(feeAmount);
                expect(feesAfterDebtAsset.sub(
                    feesBeforeDebtAsset,
                ).add(await balanceOf(DAI_ADDR, senderAcc.address))).to.be.eq(
                    eventParams.exchangedAmount.sub(eventParams.paybackAmount),
                );
            });
        });
    });
};

const mcdRepayCompositeTest = async () => {
    describe('Mcd-Repay-Composite', async function () {
        this.timeout(80000);

        const repayGasUsed = 2_000_000;
        const USD_REPAY_AMOUNT = '10000';

        let feeReceiver;
        let mockWrapper;
        let senderAcc;
        let proxy;
        let mcdView;
        let repayComposite;
        let snapshot;

        const ilkSubset = ilks.reduce((acc, curr) => {
            if ([
                'ETH',
                'WBTC',
                'wstETH',
            ].includes(curr.asset)) acc.push(curr);
            return acc;
        }, []).sort((a, b) => (a.ilkLabel < b.ilkLabel ? (-1) : 1));

        before(async () => {
            mockWrapper = await redeploy('MockExchangeWrapper');
            mcdView = await redeploy('McdView');
            repayComposite = await redeploy('McdRepayComposite');

            senderAcc = (await hre.ethers.getSigners())[0];
            proxy = await getProxy(senderAcc.address);

            const feeRecipient = await repayComposite.feeRecipient();
            feeReceiver = hre.ethers.utils.defaultAbiCoder.decode(
                ['address'],
                await senderAcc.call({
                    to: feeRecipient,
                    data: hre.ethers.utils.id('wallet()'),
                }),
            )[0];

            await setNewExchangeWrapper(senderAcc, mockWrapper.address);

            await Promise.all(
                ilkSubset.map(async (ilk) => {
                    const tokenInfo = getAssetInfo(ilk.asset);
                    return cacheChainlinkPrice(tokenInfo.symbol, tokenInfo.address);
                }),
            );
        });

        beforeEach(async () => {
            snapshot = await takeSnapshot();
        });

        afterEach(async () => {
            await revertToSnapshot(snapshot);
        });

        ilkSubset.forEach((ilkData) => {
            const joinAddr = ilkData.join;
            const tokenData = getAssetInfo(ilkData.asset);

            if (tokenData.symbol === 'ETH') {
                tokenData.address = WETH_ADDRESS;
            }

            it(`... should call a repay $${USD_REPAY_AMOUNT} ${tokenData.symbol} on a ${ilkData.ilkLabel} vault`, async () => {
                const repayAmount = fetchAmountinUSDPrice(tokenData.symbol, USD_REPAY_AMOUNT);
                expect(repayAmount).to.not.be.eq(0, `cant fetch price for ${tokenData.symbol}`);
                // create a vault
                // eslint-disable-next-line no-await-in-loop
                const vaultId = await openVault(
                    proxy,
                    ilkData.ilkLabel,
                    fetchAmountinUSDPrice(tokenData.symbol, SUPPLY_AMOUNT_IN_USD),
                    GENERATE_AMOUNT_IN_USD,
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

                const exchangeOrder = await formatMockExchangeObj(
                    tokenData,
                    getAssetInfo('DAI'),
                    Float2BN(repayAmount, tokenData.decimals),
                    mockWrapper.address,
                );

                const feesBeforeCollateralAsset = await balanceOf(tokenData.address, feeReceiver);
                const feesBeforeDebtAsset = await balanceOf(DAI_ADDR, feeReceiver);
                const receipt = await (await mcdRepayComposite(
                    proxy,
                    vaultId,
                    joinAddr,
                    repayGasUsed,
                    exchangeOrder,
                )).wait();
                const feesAfterCollateralAsset = await balanceOf(tokenData.address, feeReceiver);
                const feesAfterDebtAsset = await balanceOf(DAI_ADDR, feeReceiver);

                const actionEvent = receipt.events.find((e) => e.topics[0] === hre.ethers.utils.id('ActionDirectEvent(address,string,bytes)')
                    && e.address === LOGGER_ADDR);
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
                expect(info.coll.sub(info2.coll)).to.be.closeTo(
                    Float2BN(repayAmount, tokenData.decimals),
                    Float2BN(repayAmount, tokenData.decimals).div(Float2BN('1', 6)),
                );
                expect(info.debt.sub(info2.debt)).to.be.closeTo(
                    eventParams.paybackAmount,
                    eventParams.paybackAmount.div(Float2BN('1', 6)),
                );
                expect(await balanceOf(tokenData.address, repayComposite.address)).to.be.eq(0);
                expect(await balanceOf(DAI_ADDR, repayComposite.address)).to.be.eq(0);
                expect(await balanceOf(tokenData.address, proxy.address)).to.be.eq(0);
                expect(await balanceOf(DAI_ADDR, proxy.address)).to.be.eq(0);
                expect(feesAfterCollateralAsset.sub(feesBeforeCollateralAsset)).to.be.eq(feeAmount);
                expect(feesAfterDebtAsset.sub(
                    feesBeforeDebtAsset,
                ).add(await balanceOf(DAI_ADDR, senderAcc.address))).to.be.eq(
                    eventParams.exchangedAmount.sub(eventParams.paybackAmount),
                );
            });
        });
    });
};

const mcdFLBoostCompositeTest = async () => {
    describe('Mcd-FL-Boost-Composite', async function () {
        this.timeout(80000);

        const boostGasUsed = 2_000_000;
        const USD_BOOST_AMOUNT = '10000';

        let mockWrapper;
        let senderAcc;
        let proxy;
        let mcdView;
        let boostComposite;
        let feeReceiver;

        let snapshot;

        const ilkSubset = ilks.reduce((acc, curr) => {
            if ([
                'ETH',
                'WBTC',
                'wstETH',
            ].includes(curr.asset)) acc.push(curr);
            return acc;
        }, []).sort((a, b) => (a.ilkLabel < b.ilkLabel ? (-1) : 1));

        before(async () => {
            mockWrapper = await redeploy('MockExchangeWrapper');
            mcdView = await redeploy('McdView');
            boostComposite = await redeploy('McdFLBoostComposite');

            senderAcc = (await hre.ethers.getSigners())[0];
            proxy = await getProxy(senderAcc.address);

            const feeRecipient = await boostComposite.feeRecipient();
            feeReceiver = hre.ethers.utils.defaultAbiCoder.decode(
                ['address'],
                await senderAcc.call({
                    to: feeRecipient,
                    data: hre.ethers.utils.id('wallet()'),
                }),
            )[0];

            await setNewExchangeWrapper(senderAcc, mockWrapper.address);

            await Promise.all(
                ilkSubset.map(async (ilk) => {
                    const tokenInfo = getAssetInfo(ilk.asset);
                    return cacheChainlinkPrice(tokenInfo.symbol, tokenInfo.address);
                }),
            );
        });

        beforeEach(async () => {
            snapshot = await takeSnapshot();
        });

        afterEach(async () => {
            await revertToSnapshot(snapshot);
        });

        ilkSubset.forEach((ilkData) => {
            const joinAddr = ilkData.join;
            const tokenData = getAssetInfo(ilkData.asset);

            if (tokenData.symbol === 'ETH') {
                tokenData.address = WETH_ADDRESS;
            }

            it(`... should call a FL boost $${USD_BOOST_AMOUNT} DAI on a ${ilkData.ilkLabel} vault`, async () => {
                const boostAmount = Float2BN(USD_BOOST_AMOUNT);
                const openSupplyAmount = fetchAmountinUSDPrice(tokenData.symbol, SUPPLY_AMOUNT_IN_USD);
                expect(openSupplyAmount).to.not.be.eq(0, `cant fetch price for ${tokenData.symbol}`);

                // create a vault
                // eslint-disable-next-line no-await-in-loop
                const vaultId = await openVault(
                    proxy,
                    ilkData.ilkLabel,
                    openSupplyAmount,
                    GENERATE_AMOUNT_IN_USD,
                );
                expect(vaultId).to.not.be.eq(-1, 'cant open vault');

                const ratioBefore = await getRatio(mcdView, vaultId);
                const info = await getVaultInfo(mcdView, vaultId, ilkData.ilkBytes);
                console.log(
                    `Ratio before: ${ratioBefore.toFixed(2)}% (coll: ${info.coll.toFixed(2)} ${
                        tokenData.symbol
                    }, debt: ${info.debt.toFixed(2)} Dai)`,
                );

                const exchangeOrder = await formatMockExchangeObj(
                    getAssetInfo('DAI'),
                    tokenData,
                    boostAmount,
                    mockWrapper.address,
                );

                const feesBeforeCollateralAsset = await balanceOf(tokenData.address, feeReceiver);
                const feesBeforeDebtAsset = await balanceOf(DAI_ADDR, feeReceiver);
                const receipt = await (await mcdFLBoostComposite(
                    proxy,
                    vaultId,
                    joinAddr,
                    boostGasUsed,
                    exchangeOrder,
                )).wait();
                const feesAfterCollateralAsset = await balanceOf(tokenData.address, feeReceiver);
                const feesAfterDebtAsset = await balanceOf(DAI_ADDR, feeReceiver);

                const recipeEvent = receipt.events.find((e) => e.topics[0] === hre.ethers.utils.id('RecipeEvent(address,string)')
                    && e.topics[1] === hre.ethers.utils.defaultAbiCoder.encode(['address'], [boostComposite.address])
                    && e.topics[2] === hre.ethers.utils.id('McdFLBoostComposite'));
                expect(recipeEvent).to.not.be.eq(undefined);

                const actionEvent = receipt.events.find((e) => e.topics[0] === hre.ethers.utils.id('ActionEvent(string,bytes)')
                    && e.address === boostComposite.address);
                expect(actionEvent).to.not.be.eq(undefined);
                const eventParams = hre.ethers.utils.defaultAbiCoder.decode(
                    ['(address proxy, uint256 boostAmount, uint256 exchangedAmount, uint256 supplyAmount)'],
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
                const feeAmount = boostAmount.div(400);

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
                    boostAmount,
                    boostAmount.div(Float2BN('1', 6)),
                );
                expect(await balanceOf(tokenData.address, boostComposite.address)).to.be.eq(0);
                expect(await balanceOf(DAI_ADDR, boostComposite.address)).to.be.eq(0);
                expect(await balanceOf(tokenData.address, proxy.address)).to.be.eq(0);
                expect(await balanceOf(DAI_ADDR, proxy.address)).to.be.eq(0);
                expect(feesAfterDebtAsset.sub(feesBeforeDebtAsset)).to.be.eq(feeAmount);
                expect(feesAfterCollateralAsset.sub(feesBeforeCollateralAsset)).to.be.eq(
                    eventParams.exchangedAmount.sub(eventParams.supplyAmount),
                );
            });
        });
    });
};

const mcdBoostCompositeTest = async () => {
    describe('Mcd-Boost-Composite', async function () {
        this.timeout(80000);

        const boostGasUsed = 2_000_000;
        const USD_BOOST_AMOUNT = '10000';

        let mockWrapper;
        let senderAcc;
        let proxy;
        let mcdView;
        let boostComposite;
        let feeReceiver;

        let snapshot;

        const ilkSubset = ilks.reduce((acc, curr) => {
            if ([
                'ETH',
                'WBTC',
                'wstETH',
            ].includes(curr.asset)) acc.push(curr);
            return acc;
        }, []).sort((a, b) => (a.ilkLabel < b.ilkLabel ? (-1) : 1));

        before(async () => {
            mockWrapper = await redeploy('MockExchangeWrapper');
            mcdView = await redeploy('McdView');
            boostComposite = await redeploy('McdBoostComposite');

            senderAcc = (await hre.ethers.getSigners())[0];
            proxy = await getProxy(senderAcc.address);

            const feeRecipient = await boostComposite.feeRecipient();
            feeReceiver = hre.ethers.utils.defaultAbiCoder.decode(
                ['address'],
                await senderAcc.call({
                    to: feeRecipient,
                    data: hre.ethers.utils.id('wallet()'),
                }),
            )[0];

            await setNewExchangeWrapper(senderAcc, mockWrapper.address);

            await Promise.all(
                ilkSubset.map(async (ilk) => {
                    const tokenInfo = getAssetInfo(ilk.asset);
                    return cacheChainlinkPrice(tokenInfo.symbol, tokenInfo.address);
                }),
            );
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

            it(`... should call a boost ${USD_BOOST_AMOUNT} DAI on a ${ilkData.ilkLabel} vault`, async () => {
                const boostAmount = Float2BN(USD_BOOST_AMOUNT);
                const openSupplyAmount = fetchAmountinUSDPrice(tokenData.symbol, SUPPLY_AMOUNT_IN_USD);
                expect(openSupplyAmount).to.not.be.eq(0, `cant fetch price for ${tokenData.symbol}`);

                // create a vault
                // eslint-disable-next-line no-await-in-loop
                const vaultId = await openVault(
                    proxy,
                    ilkData.ilkLabel,
                    openSupplyAmount,
                    GENERATE_AMOUNT_IN_USD,
                );
                expect(vaultId).to.not.be.eq(-1, 'cant open vault');

                const ratioBefore = await getRatio(mcdView, vaultId);
                const info = await getVaultInfo(mcdView, vaultId, ilkData.ilkBytes);
                console.log(
                    `Ratio before: ${ratioBefore.toFixed(2)}% (coll: ${info.coll.toFixed(2)} ${
                        tokenData.symbol
                    }, debt: ${info.debt.toFixed(2)} Dai)`,
                );

                const exchangeOrder = await formatMockExchangeObj(
                    getAssetInfo('DAI'),
                    tokenData,
                    boostAmount,
                    mockWrapper.address,
                );

                const feesBeforeCollateralAsset = await balanceOf(tokenData.address, feeReceiver);
                const feesBeforeDebtAsset = await balanceOf(DAI_ADDR, feeReceiver);
                const receipt = await (await mcdBoostComposite(
                    proxy,
                    vaultId,
                    joinAddr,
                    boostGasUsed,
                    exchangeOrder,
                )).wait();
                const feesAfterCollateralAsset = await balanceOf(tokenData.address, feeReceiver);
                const feesAfterDebtAsset = await balanceOf(DAI_ADDR, feeReceiver);

                const actionEvent = receipt.events.find((e) => e.topics[0] === hre.ethers.utils.id('ActionDirectEvent(address,string,bytes)')
                    && e.address === LOGGER_ADDR);
                expect(actionEvent).to.not.be.eq(undefined);

                const eventParams = hre.ethers.utils.defaultAbiCoder.decode(
                    ['(uint256 boostAmount, uint256 exchangedAmount, uint256 supplyAmount)'],
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
                const feeAmount = boostAmount.div(400);

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
                    boostAmount,
                    boostAmount.div(Float2BN('1', 6)),
                );
                expect(await balanceOf(tokenData.address, boostComposite.address)).to.be.eq(0);
                expect(await balanceOf(DAI_ADDR, boostComposite.address)).to.be.eq(0);
                expect(await balanceOf(tokenData.address, proxy.address)).to.be.eq(0);
                expect(await balanceOf(DAI_ADDR, proxy.address)).to.be.eq(0);
                expect(feesAfterDebtAsset.sub(feesBeforeDebtAsset)).to.be.eq(feeAmount);
                expect(feesAfterCollateralAsset.sub(feesBeforeCollateralAsset)).to.be.eq(
                    eventParams.exchangedAmount.sub(eventParams.supplyAmount),
                );
            });
        }
    });
};

const mcdDsrDepositTest = async () => {
    describe('Mcd-Dsr-Deposit', async function () {
        this.timeout(80000);

        const DSR_DEPOSIT_AMOUNT = Float2BN('3000');
        const { address: daiAddr } = getAssetInfo('DAI');

        let senderAcc;
        let proxy;
        let snapshot;
        let view;

        before(async () => {
            await hre.ethers.provider.getBlockNumber().then((blockNumber) => console.log({ blockNumber }));
            [senderAcc] = await hre.ethers.getSigners();
            proxy = await getProxy(senderAcc.address);

            await getContractFromRegistry('McdDsrDeposit');
            view = await redeploy('McdView');
        });

        beforeEach(async () => {
            snapshot = await takeSnapshot();
        });

        afterEach(async () => {
            await revertToSnapshot(snapshot);
        });

        it('... should deposit DAI into Maker DSR', async () => {
            await setBalance(daiAddr, senderAcc.address, DSR_DEPOSIT_AMOUNT);
            await approve(daiAddr, proxy.address);
            await mcdDsrDeposit(proxy, DSR_DEPOSIT_AMOUNT, senderAcc.address);
            const dsrBalance = await view.callStatic.getUserDsrBalance(proxy.address);
            expect(dsrBalance).to.be.closeTo(DSR_DEPOSIT_AMOUNT, 1); // off by one wei
        });

        it('... should deposit MAXUINT DAI into Maker DSR', async () => {
            await setBalance(daiAddr, senderAcc.address, DSR_DEPOSIT_AMOUNT);
            await approve(daiAddr, proxy.address);
            await mcdDsrDeposit(proxy, hre.ethers.constants.MaxUint256, senderAcc.address);
            const dsrBalance = await view.callStatic.getUserDsrBalance(proxy.address);
            expect(dsrBalance).to.be.closeTo(DSR_DEPOSIT_AMOUNT, 1); // off by one wei
        });
    });
};

const mcdDsrWithdrawTest = async () => {
    describe('Mcd-Dsr-Withdraw', async function () {
        this.timeout(80000);

        const DSR_DEPOSIT_AMOUNT = Float2BN('3000');
        const { address: daiAddr } = getAssetInfo('DAI');

        let senderAcc;
        let proxy;
        let view;

        before(async () => {
            await hre.ethers.provider.getBlockNumber().then((blockNumber) => console.log({ blockNumber }));
            [senderAcc] = await hre.ethers.getSigners();
            proxy = await getProxy(senderAcc.address);

            await getContractFromRegistry('McdDsrDeposit');
            await getContractFromRegistry('McdDsrWithdraw');
            view = await getContractFromRegistry('McdView');
        });

        it('... should deposit DAI to Maker DSR', async () => {
            await setBalance(daiAddr, senderAcc.address, DSR_DEPOSIT_AMOUNT);
            await approve(daiAddr, proxy.address);
            await mcdDsrDeposit(proxy, DSR_DEPOSIT_AMOUNT, senderAcc.address);
            const dsrBalance = await view.callStatic.getUserDsrBalance(proxy.address);
            expect(dsrBalance).to.be.closeTo(DSR_DEPOSIT_AMOUNT, 1); // off by one wei
        });

        it('... should withdraw half of deposited DAI from Maker DSR', async () => {
            await mcdDsrWithdraw(proxy, DSR_DEPOSIT_AMOUNT.div(2), senderAcc.address);
            expect(await balanceOf(daiAddr, senderAcc.address)).to.be.eq(DSR_DEPOSIT_AMOUNT.div(2));

            const dsrBalance = await view.callStatic.getUserDsrBalance(proxy.address);
            expect(dsrBalance).to.be.gte(DSR_DEPOSIT_AMOUNT.div(2));
        });

        it('... should withdraw MAXUINT DAI from Maker DSR', async () => {
            await mcdDsrWithdraw(proxy, hre.ethers.constants.MaxUint256, senderAcc.address);
            expect(await balanceOf(daiAddr, senderAcc.address)).to.be.gte(DSR_DEPOSIT_AMOUNT);

            const dsrBalance = await view.callStatic.getUserDsrBalance(proxy.address);
            expect(dsrBalance).to.be.eq(0);

            const pieLeft = await hre.ethers.getContractAt('IPot', '0x197E90f9FAD81970bA7976f33CbD77088E5D7cf7').then(
                (pot) => pot.pie(proxy.address),
            );
            expect(pieLeft).to.be.eq(0);
        });
    });
};

const mcdTokenConverterTest = async () => {
    describe('Mcd-Token-converter', async function () {
        this.timeout(80000);

        let senderAcc;
        let proxy;

        const DAI_ADDRESS = '0x6B175474E89094C44Da98b954EedeAC495271d0F';
        const MKR_ADDRESS = '0x9f8F72aA9304c8B593d555F12eF6589cC3A579A2';
        const SKY_ADDRESS = '0x56072C95FAA701256059aa122697B133aDEd9279';
        const USDS_ADDRESS = '0xdC035D45d973E3EC169d2276DDab16f1e407384F';

        before(async () => {
            [senderAcc] = await hre.ethers.getSigners();
            proxy = await getProxy(senderAcc.address);
        });
        it('... should convert DAI to USDS', async () => {
            const daiAmount = hre.ethers.utils.parseUnits('100', 18);
            await setBalance(DAI_ADDRESS, senderAcc.address, daiAmount);
            await setBalance(USDS_ADDRESS, senderAcc.address, hre.ethers.utils.parseUnits('0', 18));
            await approve(DAI_ADDRESS, proxy.address);

            await mcdTokenConvert(proxy, DAI_ADDRESS, senderAcc.address, senderAcc.address, daiAmount);
            const newUsdsBalance = await balanceOf(USDS_ADDRESS, senderAcc.address);
            expect(newUsdsBalance).to.be.equal(daiAmount);
        });
        it('... should convert USDS to DAI', async () => {
            const usdsAmount = hre.ethers.utils.parseUnits('100', 18);
            await setBalance(USDS_ADDRESS, senderAcc.address, usdsAmount);
            await setBalance(DAI_ADDRESS, senderAcc.address, hre.ethers.utils.parseUnits('0', 18));
            await approve(USDS_ADDRESS, proxy.address);
            await mcdTokenConvert(proxy, USDS_ADDRESS, senderAcc.address, senderAcc.address, usdsAmount);
            const newDaiBalance = await balanceOf(DAI_ADDR, senderAcc.address);
            expect(newDaiBalance).to.be.equal(usdsAmount);
        });
        it('... should convert MKR to SKY', async () => {
            const mkrAmount = hre.ethers.utils.parseUnits('100', 18);
            await setBalance(MKR_ADDRESS, senderAcc.address, mkrAmount);
            await setBalance(SKY_ADDRESS, senderAcc.address, hre.ethers.utils.parseUnits('0', 18));
            await approve(MKR_ADDRESS, proxy.address);

            await mcdTokenConvert(proxy, MKR_ADDRESS, senderAcc.address, senderAcc.address, mkrAmount);
            const newSkyBalance = await balanceOf(SKY_ADDRESS, senderAcc.address);
            expect(newSkyBalance).to.be.equal(mkrAmount.mul('24000'));
        });

        it('... should convert SKY to MKR', async () => {
            const skyAmount = hre.ethers.utils.parseUnits('100', 18);
            await setBalance(SKY_ADDRESS, senderAcc.address, skyAmount);
            await setBalance(MKR_ADDRESS, senderAcc.address, hre.ethers.utils.parseUnits('0', 18));
            await approve(SKY_ADDRESS, proxy.address);

            await mcdTokenConvert(proxy, SKY_ADDRESS, senderAcc.address, senderAcc.address, skyAmount);
            const newMkrBalance = await balanceOf(MKR_ADDRESS, senderAcc.address);
            expect(newMkrBalance).to.be.equal(skyAmount.div('24000'));
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
    mcdFLRepayCompositeTest,
    mcdRepayCompositeTest,
    mcdFLBoostCompositeTest,
    mcdBoostCompositeTest,
    mcdDsrDepositTest,
    mcdDsrWithdrawTest,
    mcdTokenConverterTest,
    GENERATE_AMOUNT_IN_USD,
};
