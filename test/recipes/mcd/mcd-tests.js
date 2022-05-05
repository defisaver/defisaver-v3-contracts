const { expect } = require('chai');
const hre = require('hardhat');

const { getAssetInfo, ilks } = require('@defisaver/tokens');
const dfs = require('@defisaver/sdk');

const {
    getAddrFromRegistry,
    getProxy,
    redeploy,
    formatExchangeObj,
    setNewExchangeWrapper,
    nullAddress,
    WETH_ADDRESS,
    MIN_VAULT_DAI_AMOUNT,
    fetchAmountinUSDPrice,
    USDC_ADDR,
    DAI_ADDR,
    balanceOf,
    approve,
    setBalance,
    UNISWAP_WRAPPER,
} = require('../../utils');

const {
    fetchMakerAddresses,
    getRatio,
    getVaultInfo,
    MCD_MANAGER_ADDR,
    getVaultsForUser,
    canGenerateDebt,
} = require('../../utils-mcd');

const BigNumber = hre.ethers.BigNumber;

const SUPPLY_AMOUNT_IN_USD = '150000';
const GENERATE_AMOUNT_IN_USD = '50000';
const {
    openVaultForExactAmountInDecimals, gUniDeposit, openVault, executeAction,
} = require('../../actions.js');

const McdPaybackAction = dfs.actions.maker.MakerPaybackAction;
const McdWithdrawAction = dfs.actions.maker.MakerWithdrawAction;
const SellAction = dfs.actions.basic.SellAction;

const mcdBoostTest = async () => {
    describe('Mcd-Boost', function () {
        this.timeout(80000);

        let makerAddresses;
        let senderAcc;
        let proxy;
        let dydxFlAddr;
        // let aaveV2FlAddr;
        let mcdView;
        let uniWrapper;

        before(async () => {
            await redeploy('McdOpen');
            await redeploy('McdSupply');
            await redeploy('RecipeExecutor');
            await redeploy('McdGenerate');
            await redeploy('FLDyDx');
            await redeploy('FLAaveV2');
            await redeploy('DFSSell');
            await redeploy('GUniDeposit');

            uniWrapper = await redeploy('UniswapWrapperV3');
            mcdView = await redeploy('McdView');

            makerAddresses = await fetchMakerAddresses();
            dydxFlAddr = await getAddrFromRegistry('FLDyDx');
            // aaveV2FlAddr = await getAddrFromRegistry('FLAaveV2');

            senderAcc = (await hre.ethers.getSigners())[0];
            proxy = await getProxy(senderAcc.address);

            await setNewExchangeWrapper(senderAcc, uniWrapper.address);
        });

        for (let i = 0; i < 1; ++i) {
            const ilkData = ilks[i];
            const joinAddr = ilkData.join;
            const tokenData = getAssetInfo(ilkData.asset);
            let vaultId;

            if (tokenData.symbol === 'ETH') {
                tokenData.address = WETH_ADDRESS;
            }

            let boostAmount = '100';

            it(`... should call a boost ${boostAmount} on a ${ilkData.ilkLabel} vault`, async () => {
                // create a vault
                vaultId = await openVault(
                    proxy,
                    ilkData.ilkLabel,
                    fetchAmountinUSDPrice(tokenData.symbol, SUPPLY_AMOUNT_IN_USD),
                    fetchAmountinUSDPrice('DAI', GENERATE_AMOUNT_IN_USD),
                );

                boostAmount = hre.ethers.utils.parseUnits(boostAmount, 18);

                const ratioBefore = await getRatio(mcdView, vaultId);
                const info = await getVaultInfo(mcdView, vaultId, ilkData.ilkBytes);
                console.log(
                    `Ratio before:  ${ratioBefore.toFixed(2)}% (coll: ${info.coll.toFixed(2)} ${
                        tokenData.symbol
                    }, debt: ${info.debt.toFixed(2)} Dai)`,
                );

                const from = proxy.address;
                const to = proxy.address;
                const collToken = tokenData.address;
                const fromToken = makerAddresses.MCD_DAI;

                const mcdGenerateAction = new dfs.actions.maker.MakerGenerateAction(
                    vaultId,
                    boostAmount.toString(),
                    to,
                    MCD_MANAGER_ADDR,
                );

                const sellAction = new dfs.actions.basic.SellAction(
                    formatExchangeObj(fromToken, collToken, '$1', uniWrapper.address),
                    from,
                    to,
                );

                const mcdSupplyAction = new dfs.actions.maker.MakerSupplyAction(
                    vaultId,
                    '$2',
                    joinAddr,
                    from,
                    MCD_MANAGER_ADDR,
                );

                const boostRecipe = new dfs.Recipe('BoostRecipe', [
                    mcdGenerateAction,
                    sellAction,
                    mcdSupplyAction,
                ]);

                const functionData = boostRecipe.encodeForDsProxyCall();

                await executeAction('RecipeExecutor', functionData[1], proxy);
                const ratioAfter = await getRatio(mcdView, vaultId);
                const info2 = await getVaultInfo(mcdView, vaultId, ilkData.ilkBytes);
                console.log(
                    `Ratio after: ${ratioAfter.toFixed(2)}% (coll: ${info2.coll.toFixed(2)} ${
                        tokenData.symbol
                    }, debt: ${info2.debt.toFixed(2)} Dai)`,
                );

                expect(ratioAfter).to.be.lt(ratioBefore);
                expect(info2.coll).to.be.gt(info.coll);
                expect(info2.debt).to.be.gt(info.debt);
            });

            it(`... should call a boost with FL ${boostAmount} Dai on a ${ilkData.ilkLabel} vault`, async () => {
                // create a vault
                // vaultId = await openVault(
                //     makerAddresses,
                //     proxy,
                //     joinAddr,
                //     tokenData,
                //     (standardAmounts[tokenData.symbol] * 2).toString(),
                //     (parseInt(MIN_VAULT_DAI_AMOUNT) + 200).toString()
                // );

                boostAmount = '200';

                boostAmount = hre.ethers.utils.parseUnits(boostAmount, 18);

                const ratioBefore = await getRatio(mcdView, vaultId);
                const info = await getVaultInfo(mcdView, vaultId, ilkData.ilkBytes);
                console.log(
                    `Ratio before: ${ratioBefore.toFixed(2)}% (coll: ${info.coll.toFixed(2)} ${
                        tokenData.symbol
                    }, debt: ${info.debt.toFixed(2)} Dai)`,
                );

                const from = proxy.address;
                const to = proxy.address;
                const collToken = tokenData.address;
                const fromToken = makerAddresses.MCD_DAI;

                const dydxFLAction = new dfs.actions.flashloan.DyDxFlashLoanAction(
                    boostAmount,
                    fromToken,
                    nullAddress,
                    [],
                );

                // const flAaveV2Action = new dfs.actions.flashloan.AaveV2FlashLoanAction(
                //     [boostAmount],
                //     [fromToken],
                //     [0],
                //     nullAddress,
                //     nullAddress,
                //     [],
                // );

                const sellAction = new dfs.actions.basic.SellAction(
                    formatExchangeObj(fromToken, collToken, boostAmount, uniWrapper.address),
                    from,
                    to,
                );

                const mcdSupplyAction = new dfs.actions.maker.MakerSupplyAction(
                    vaultId,
                    '$2',
                    joinAddr,
                    from,
                    MCD_MANAGER_ADDR,
                );

                const mcdGenerateAction = new dfs.actions.maker.MakerGenerateAction(
                    vaultId,
                    '$1',
                    dydxFlAddr,
                    MCD_MANAGER_ADDR,
                );

                const boostRecipe = new dfs.Recipe('FLBoostRecipe', [
                    dydxFLAction,
                    sellAction,
                    mcdSupplyAction,
                    mcdGenerateAction,
                ]);

                const functionData = boostRecipe.encodeForDsProxyCall();

                await executeAction('RecipeExecutor', functionData[1], proxy);

                const ratioAfter = await getRatio(mcdView, vaultId);
                const info2 = await getVaultInfo(mcdView, vaultId, ilkData.ilkBytes);
                console.log(
                    `Ratio before: ${ratioAfter.toFixed(2)}% (coll: ${info2.coll.toFixed(2)} ${
                        tokenData.symbol
                    }, debt: ${info2.debt.toFixed(2)} Dai)`,
                );

                expect(ratioAfter).to.be.lt(ratioBefore);
                expect(info2.coll).to.be.gt(info.coll);
                expect(info2.debt).to.be.gt(info.debt);
            });
        }

        it('... should call a boost for GUNIV3DAIUSDC1-A vault', async () => {
            const GUNIV3DAIUSDC = '0xabddafb225e10b90d798bb8a886238fb835e2053';
            const joinAddr = '0xbFD445A97e7459b0eBb34cfbd3245750Dba4d7a4';

            const daiAmount = hre.ethers.utils.parseUnits('20000', 18);
            const usdtAmount = hre.ethers.utils.parseUnits('20000', 6);
            await setBalance(DAI_ADDR, senderAcc.address, daiAmount);
            await setBalance(USDC_ADDR, senderAcc.address, usdtAmount);

            await approve(DAI_ADDR, proxy.address);
            await approve(USDC_ADDR, proxy.address);
            await gUniDeposit(
                GUNIV3DAIUSDC,
                DAI_ADDR,
                USDC_ADDR,
                daiAmount,
                usdtAmount,
                senderAcc.address,
                proxy,
            );
            const poolTokensBalanceAfter = await balanceOf(GUNIV3DAIUSDC, senderAcc.address);

            await approve(GUNIV3DAIUSDC, proxy.address);

            const vaultId = await openVaultForExactAmountInDecimals(
                makerAddresses,
                proxy,
                joinAddr,
                { address: GUNIV3DAIUSDC, decimals: 18 },
                poolTokensBalanceAfter.toString(),
                (parseInt(MIN_VAULT_DAI_AMOUNT, 10) + 200).toString(),
            );
            const ratioBefore = await getRatio(mcdView, vaultId);
            const info = await getVaultInfo(
                mcdView,
                vaultId,
                '0x47554e49563344414955534443312d4100000000000000000000000000000000',
            );
            console.log(
                `Ratio before: ${ratioBefore.toFixed(2)}% (coll: ${info.coll.toFixed(
                    2,
                )} GUNIV3DAIUSDC1, debt: ${info.debt.toFixed(2)} Dai)`,
            );

            const from = proxy.address;
            const to = proxy.address;
            const fromToken = makerAddresses.MCD_DAI;

            const mcdGenerateAction = new dfs.actions.maker.MakerGenerateAction(
                vaultId,
                hre.ethers.utils.parseUnits('1000', 18).toString(),
                to,
                MCD_MANAGER_ADDR,
            );
            const sellAction = new dfs.actions.basic.SellAction(
                formatExchangeObj(
                    fromToken,
                    USDC_ADDR,
                    hre.ethers.utils.parseUnits('500', 18).toString(),
                    uniWrapper.address,
                ),
                from,
                to,
            );
            const gUniDepositAction = new dfs.actions.guni.GUniDeposit(
                GUNIV3DAIUSDC,
                DAI_ADDR,
                USDC_ADDR,
                hre.ethers.utils.parseUnits('500', 18).toString(),
                '$2',
                0,
                0,
                from,
                to,
            );
            const mcdSupplyAction = new dfs.actions.maker.MakerSupplyAction(
                vaultId,
                '$3',
                joinAddr,
                from,
                MCD_MANAGER_ADDR,
            );
            const boostRecipe = new dfs.Recipe('FLBoostRecipe', [
                mcdGenerateAction,
                sellAction,
                gUniDepositAction,
                mcdSupplyAction,
            ]);

            const functionData = boostRecipe.encodeForDsProxyCall();

            await executeAction('RecipeExecutor', functionData[1], proxy);

            const ratioAfter = await getRatio(mcdView, vaultId);
            const info2 = await getVaultInfo(
                mcdView,
                vaultId,
                '0x47554e49563344414955534443312d4100000000000000000000000000000000',
            );
            console.log(
                `Ratio before: ${ratioAfter.toFixed(2)}% (coll: ${info2.coll.toFixed(
                    2,
                )} GUNIV3DAIUSDC1, debt: ${info2.debt.toFixed(2)} Dai)`,
            );
            expect(ratioAfter).to.be.lt(ratioBefore);
            expect(info2.coll).to.be.gt(info.coll);
            expect(info2.debt).to.be.gt(info.debt);
        }).timeout(300000);
    });
};
const mcdCloseTest = async () => {
    describe('Mcd-Close', function () {
        this.timeout(80000);

        let makerAddresses;
        let senderAcc;
        let proxy;
        let dydxFlAddr;
        let uniWrapper;
        // let mcdView;

        before(async () => {
            await redeploy('RecipeExecutor');
            await redeploy('FLDyDx');
            await redeploy('DFSSell');
            await redeploy('SendToken');

            // mcdView = await redeploy('McdView');

            makerAddresses = await fetchMakerAddresses();
            uniWrapper = await redeploy('UniswapWrapperV3');

            dydxFlAddr = await getAddrFromRegistry('FLDyDx');

            senderAcc = (await hre.ethers.getSigners())[0];
            proxy = await getProxy(senderAcc.address);

            await setNewExchangeWrapper(senderAcc, uniWrapper.address);
        });

        for (let i = 0; i < 1; ++i) {
            const ilkData = ilks[i];
            const tokenData = getAssetInfo(ilkData.asset);

            if (tokenData.symbol === 'ETH') {
                tokenData.address = WETH_ADDRESS;
            }

            const joinAddr = ilkData.join;
            const tokenAddr = tokenData.address;

            it(`... should close a ${ilkData.ilkLabel} Vault and return Dai`, async () => {
                const canGenerate = await canGenerateDebt(ilkData);
                if (!canGenerate) {
                    // eslint-disable-next-line no-unused-expressions
                    expect(true).to.be.true;
                    return;
                }

                const vaultColl = fetchAmountinUSDPrice('WETH', SUPPLY_AMOUNT_IN_USD);

                const amountDai = (parseInt(GENERATE_AMOUNT_IN_USD, 10) + 200).toString();
                const vaultId = await openVault(
                    proxy,
                    ilkData.ilkLabel,
                    vaultColl,
                    amountDai,
                );

                const daiAddr = makerAddresses.MCD_DAI;

                // Vault debt + 1 dai to handle stability fee
                let flAmount = (parseFloat(amountDai) + 1).toString();
                flAmount = hre.ethers.utils.parseUnits(flAmount, 18);

                console.log(hre.ethers.utils.parseUnits(vaultColl, tokenData.decimals).toString());

                const exchangeOrder = formatExchangeObj(
                    tokenAddr,
                    daiAddr,
                    hre.ethers.utils.parseUnits(vaultColl, tokenData.decimals),
                    uniWrapper.address,
                );

                const closeToDaiVaultRecipe = new dfs.Recipe('CloseToDaiVaultRecipe', [
                    new dfs.actions.flashloan.DyDxFlashLoanAction(
                        flAmount,
                        daiAddr,
                        nullAddress,
                        [],
                    ),
                    new dfs.actions.maker.MakerPaybackAction(
                        vaultId,
                        hre.ethers.constants.MaxUint256,
                        proxy.address,
                        MCD_MANAGER_ADDR,
                    ),
                    new dfs.actions.maker.MakerWithdrawAction(
                        vaultId,
                        hre.ethers.constants.MaxUint256,
                        joinAddr,
                        proxy.address,
                        MCD_MANAGER_ADDR,
                    ),
                    new dfs.actions.basic.SellAction(exchangeOrder, proxy.address, proxy.address),
                    new dfs.actions.basic.SendTokenAction(daiAddr, dydxFlAddr, flAmount),
                    new dfs.actions.basic.SendTokenAction(
                        daiAddr,
                        senderAcc.address,
                        hre.ethers.constants.MaxUint256,
                    ), // return extra dai
                ]);

                const functionData = closeToDaiVaultRecipe.encodeForDsProxyCall();

                const daiBalanceBefore = await balanceOf(daiAddr, senderAcc.address);
                console.log(`Dai balance before: ${daiBalanceBefore / 1e18}`);

                await executeAction('RecipeExecutor', functionData[1], proxy);

                const daiBalanceAfter = await balanceOf(daiAddr, senderAcc.address);
                console.log(`Dai balance before: ${daiBalanceAfter / 1e18}`);

                expect(daiBalanceAfter).to.be.gt(daiBalanceBefore);
            });

            it(`... should close a ${ilkData.ilkLabel} Vault and return collateral`, async () => {
                const canGenerate = await canGenerateDebt(ilkData);

                if (!canGenerate) {
                    // eslint-disable-next-line no-unused-expressions
                    expect(true).to.be.true;
                    return;
                }

                const amountDai = (parseInt(GENERATE_AMOUNT_IN_USD, 10) + 200).toString();
                const amountColl = fetchAmountinUSDPrice(tokenData.symbol, SUPPLY_AMOUNT_IN_USD);

                const vaultId = await openVault(
                    proxy,
                    ilkData.ilkLabel,
                    amountColl,
                    amountDai,
                );

                // Vault debt + 1 dai to handle stability fee
                let flAmount = (parseFloat(amountDai) + 1).toString();
                flAmount = hre.ethers.utils.parseUnits(flAmount, 18);

                const daiAddr = makerAddresses.MCD_DAI;

                const exchangeOrder = formatExchangeObj(
                    tokenAddr,
                    daiAddr,
                    hre.ethers.utils.parseUnits(amountColl, tokenData.decimals),
                    uniWrapper.address,
                    flAmount,
                );

                const closeToCollVaultRecipe = new dfs.Recipe('CloseToCollVaultRecipe', [
                    new dfs.actions.flashloan.DyDxFlashLoanAction(
                        flAmount,
                        daiAddr,
                        nullAddress,
                        [],
                    ),
                    new dfs.actions.maker.MakerPaybackAction(
                        vaultId,
                        hre.ethers.constants.MaxUint256,
                        proxy.address,
                        MCD_MANAGER_ADDR,
                    ),
                    new dfs.actions.maker.MakerWithdrawAction(
                        vaultId,
                        hre.ethers.constants.MaxUint256,
                        joinAddr,
                        proxy.address,
                        MCD_MANAGER_ADDR,
                    ),
                    new dfs.actions.basic.BuyAction(exchangeOrder, proxy.address, dydxFlAddr),
                    new dfs.actions.basic.SendTokenAction(
                        tokenAddr,
                        senderAcc.address,
                        hre.ethers.constants.MaxUint256,
                    ),
                ]);

                const functionData = closeToCollVaultRecipe.encodeForDsProxyCall();

                const collBalanceBefore = await balanceOf(tokenAddr, senderAcc.address);
                console.log(`Coll balance before: ${collBalanceBefore / 10 ** tokenData.decimals}`);

                await executeAction('RecipeExecutor', functionData[1], proxy);

                const collBalanceAfter = await balanceOf(tokenAddr, senderAcc.address);
                console.log(`Coll balance after: ${collBalanceAfter / 10 ** tokenData.decimals}`);

                expect(collBalanceAfter).to.be.gt(collBalanceBefore);
            });
        }
    });
};
const mcdCreateTest = async () => {
    describe('Mcd-Create', function () {
        this.timeout(80000);

        let makerAddresses;
        let senderAcc;
        let proxy;
        let dydxFlAddr;
        // let aaveV2FlAddr;
        let mcdView;
        let uniWrapper;

        before(async () => {
            await redeploy('McdOpen');
            await redeploy('McdSupply');
            await redeploy('RecipeExecutor');
            await redeploy('SumInputs');
            await redeploy('McdGenerate');
            await redeploy('FLDyDx');
            await redeploy('FLAaveV2');

            mcdView = await redeploy('McdView');
            uniWrapper = await redeploy('UniswapWrapperV3');

            makerAddresses = await fetchMakerAddresses();

            dydxFlAddr = await getAddrFromRegistry('FLDyDx');
            // aaveV2FlAddr = await getAddrFromRegistry('FLAaveV2');

            senderAcc = (await hre.ethers.getSigners())[0];
            proxy = await getProxy(senderAcc.address);

            await setNewExchangeWrapper(senderAcc, uniWrapper.address);
        });

        for (let i = 0; i < 1; ++i) {
            const ilkData = ilks[i];
            const tokenData = getAssetInfo(ilkData.asset);

            if (tokenData.symbol === 'ETH') {
                tokenData.address = WETH_ADDRESS;
            }

            const joinAddr = ilkData.join;
            const tokenAddr = tokenData.address;

            it(`... should create a ${ilkData.ilkLabel} Vault and generate Dai`, async () => {
                const canGenerate = await canGenerateDebt(ilkData);
                if (!canGenerate) {
                    // eslint-disable-next-line no-unused-expressions
                    expect(true).to.be.true;
                    return;
                }

                const amount = GENERATE_AMOUNT_IN_USD;

                const daiAmount = hre.ethers.utils.parseUnits(amount, 18);
                const collAmount = BigNumber.from(
                    hre.ethers.utils.parseUnits(
                        fetchAmountinUSDPrice('WETH', SUPPLY_AMOUNT_IN_USD),
                        tokenData.decimals,
                    ),
                );

                const collAmountParsed = hre.ethers.utils.parseUnits(collAmount.toString(), 1);
                await setBalance(tokenAddr, senderAcc.address, collAmountParsed);

                await approve(tokenAddr, proxy.address);

                const createVaultRecipe = new dfs.Recipe('CreateVaultRecipe', [
                    new dfs.actions.maker.MakerOpenVaultAction(joinAddr, MCD_MANAGER_ADDR),
                    new dfs.actions.maker.MakerSupplyAction(
                        '$1',
                        collAmount,
                        joinAddr,
                        senderAcc.address,
                        MCD_MANAGER_ADDR,
                    ),
                    new dfs.actions.maker.MakerGenerateAction(
                        '$1',
                        daiAmount,
                        senderAcc.address,
                        MCD_MANAGER_ADDR,
                    ),
                ]);

                const functionData = createVaultRecipe.encodeForDsProxyCall();

                await executeAction('RecipeExecutor', functionData[1], proxy);

                const vaultsAfter = await getVaultsForUser(proxy.address, makerAddresses);
                const vaultId = vaultsAfter.ids[vaultsAfter.ids.length - 1].toString();

                const ratioAfter = await getRatio(mcdView, vaultId);
                const info2 = await getVaultInfo(mcdView, vaultId, ilkData.ilkBytes);
                console.log(
                    `Ratio: ${ratioAfter.toFixed(2)}% (coll: ${info2.coll.toFixed(2)} ${
                        tokenData.symbol
                    }, debt: ${info2.debt.toFixed(2)} Dai)`,
                );

                expect(info2.debt).to.be.eq(parseInt(amount, 10));
            });

            it(`... should create a leveraged ${ilkData.ilkLabel} Vault and generate Dai`, async () => {
                const canGenerate = await canGenerateDebt(ilkData);
                if (!canGenerate) {
                    // eslint-disable-next-line no-unused-expressions
                    expect(true).to.be.true;
                    return;
                }

                const amount = (parseInt(MIN_VAULT_DAI_AMOUNT, 10) * 1.5).toString();

                const daiAmount = hre.ethers.utils.parseUnits(amount, 18);
                const daiAddr = makerAddresses.MCD_DAI;

                const collAmount = BigNumber.from(
                    hre.ethers.utils.parseUnits(
                        fetchAmountinUSDPrice('WETH', SUPPLY_AMOUNT_IN_USD),
                        tokenData.decimals,
                    ),
                );

                const collAmountParsed = hre.ethers.utils.parseUnits(collAmount.toString(), 1);
                await setBalance(tokenAddr, senderAcc.address, collAmountParsed);

                await approve(tokenAddr, proxy.address);

                const exchangeOrder = formatExchangeObj(
                    daiAddr,
                    tokenAddr,
                    daiAmount,
                    uniWrapper.address,
                );

                const createVaultRecipe = new dfs.Recipe('CreateVaultRecipe', [
                    // eslint-disable-next-line max-len
                    // new dfs.actions.flashloan.AaveV2FlashLoanAction([daiAmount], [daiAddr], [0], nullAddress, nullAddress, []),
                    new dfs.actions.flashloan.DyDxFlashLoanAction(
                        daiAmount,
                        daiAddr,
                        nullAddress,
                        [],
                    ),
                    new dfs.actions.basic.SellAction(exchangeOrder, proxy.address, proxy.address),
                    new dfs.actions.maker.MakerOpenVaultAction(joinAddr, MCD_MANAGER_ADDR),
                    new dfs.actions.basic.PullTokenAction(tokenAddr, senderAcc.address, collAmount),
                    new dfs.actions.maker.MakerSupplyAction(
                        '$3',
                        hre.ethers.constants.MaxUint256,
                        joinAddr,
                        proxy.address,
                        MCD_MANAGER_ADDR,
                    ),
                    new dfs.actions.maker.MakerGenerateAction(
                        '$3',
                        '$1',
                        dydxFlAddr,
                        MCD_MANAGER_ADDR,
                    ),
                ]);

                const functionData = createVaultRecipe.encodeForDsProxyCall();

                await executeAction('RecipeExecutor', functionData[1], proxy);

                const vaultsAfter = await getVaultsForUser(proxy.address, makerAddresses);
                const vaultId = vaultsAfter.ids[vaultsAfter.ids.length - 1].toString();

                const ratioAfter = await getRatio(mcdView, vaultId);
                const info2 = await getVaultInfo(mcdView, vaultId, ilkData.ilkBytes);
                console.log(
                    `Ratio: ${ratioAfter.toFixed(2)}% (coll: ${info2.coll.toFixed(2)} ${
                        tokenData.symbol
                    }, debt: ${info2.debt.toFixed(2)} Dai)`,
                );

                expect(info2.debt).to.be.gte(parseInt(amount, 10));
            });
        }

        // it(`... should create a leveraged UNIV2ETHDAI vault`, async () => {
        //     const uniJoinAddr = '';

        //     const uniVaultRecipe = new dfs.Recipe("CreateVaultRecipe", [
        //         new dfs.actions.maker.MakerOpenVaultAction(uniJoinAddr, MCD_MANAGER_ADDR),

        //     ]);
        // });
    });
};

const mcdRepayTest = async () => {
    describe('Mcd-Repay', function () {
        this.timeout(80000);

        let makerAddresses;
        let uniWrapper;
        let senderAcc;
        let proxy;
        // let dydxFlAddr;
        let aaveV2FlAddr;
        let mcdView;

        before(async () => {
            uniWrapper = await redeploy('UniswapWrapperV3');
            mcdView = await redeploy('McdView');

            // dydxFlAddr = await getAddrFromRegistry('FLDyDx');

            makerAddresses = await fetchMakerAddresses();

            aaveV2FlAddr = await getAddrFromRegistry('FLAaveV2');

            senderAcc = (await hre.ethers.getSigners())[0];
            proxy = await getProxy(senderAcc.address);

            await setNewExchangeWrapper(senderAcc, uniWrapper.address);
        });

        for (let i = 0; i < 1; ++i) {
            const ilkData = ilks[i];
            const joinAddr = ilkData.join;
            const tokenData = getAssetInfo(ilkData.asset);
            let vaultId;

            if (tokenData.symbol === 'ETH') {
                tokenData.address = WETH_ADDRESS;
            }

            let repayAmount = fetchAmountinUSDPrice(tokenData.symbol, '100');

            it(`... should call a repay ${repayAmount} ${tokenData.symbol} on a ${ilkData.ilkLabel} vault`, async () => {
                // create a vault
                vaultId = await openVault(
                    proxy,
                    ilkData.ilkLabel,
                    fetchAmountinUSDPrice(tokenData.symbol, SUPPLY_AMOUNT_IN_USD),
                    (parseInt(GENERATE_AMOUNT_IN_USD, 10) + 400).toString(),
                );

                repayAmount = hre.ethers.utils.parseUnits(repayAmount, tokenData.decimals);

                const ratioBefore = await getRatio(mcdView, vaultId);
                const info = await getVaultInfo(mcdView, vaultId, ilkData.ilkBytes);
                console.log(
                    `Ratio before: ${ratioBefore.toFixed(2)}% (coll: ${info.coll.toFixed(2)} ${
                        tokenData.symbol
                    }, debt: ${info.debt.toFixed(2)} Dai)`,
                );

                const from = proxy.address;
                const to = proxy.address;
                const collToken = tokenData.address;
                const fromToken = makerAddresses.MCD_DAI;

                const mcdWithdrawAction = new dfs.actions.maker.MakerWithdrawAction(
                    vaultId,
                    repayAmount,
                    joinAddr,
                    to,
                    MCD_MANAGER_ADDR,
                );

                const sellAction = new dfs.actions.basic.SellAction(
                    formatExchangeObj(collToken, fromToken, '$1', UNISWAP_WRAPPER),
                    from,
                    to,
                );

                const mcdPaybackAction = new dfs.actions.maker.MakerPaybackAction(
                    vaultId,
                    '$2',
                    from,
                    MCD_MANAGER_ADDR,
                );

                const repayRecipe = new dfs.Recipe('RepayRecipe', [
                    mcdWithdrawAction,
                    sellAction,
                    mcdPaybackAction,
                ]);

                const functionData = repayRecipe.encodeForDsProxyCall();

                await executeAction('RecipeExecutor', functionData[1], proxy);

                const ratioAfter = await getRatio(mcdView, vaultId);
                const info2 = await getVaultInfo(mcdView, vaultId, ilkData.ilkBytes);
                console.log(
                    `Ratio before: ${ratioAfter.toFixed(2)}% (coll: ${info2.coll.toFixed(2)} ${
                        tokenData.symbol
                    }, debt: ${info2.debt.toFixed(2)} Dai)`,
                );

                expect(ratioAfter).to.be.gt(ratioBefore);
                expect(info2.coll).to.be.lt(info.coll);
                expect(info2.debt).to.be.lt(info.debt);
            });

            it(`... should call a FL repay ${repayAmount} ${tokenData.symbol} on a ${ilkData.ilkLabel} vault`, async () => {
                // create a vault
                vaultId = await openVault(
                    proxy,
                    ilkData.ilkLabel,
                    fetchAmountinUSDPrice(tokenData.symbol, SUPPLY_AMOUNT_IN_USD),
                    (parseInt(GENERATE_AMOUNT_IN_USD, 10) + 500).toString(),
                );

                const flAmount = hre.ethers.utils.parseUnits('0.2', 18);

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
                    collToken,
                    daiToken,
                    flAmount,
                    UNISWAP_WRAPPER,
                );

                const flAaveV2Action = new dfs.actions.flashloan.AaveV2FlashLoanAction(
                    [flAmount],
                    [collToken],
                    [0],
                    nullAddress,
                    nullAddress,
                    [],
                );

                const repayRecipe = new dfs.Recipe('FLRepayRecipe', [
                    flAaveV2Action, // new dydxFLAction(flAmount, collToken, nullAddress, []),
                    new SellAction(exchangeOrder, proxy.address, proxy.address),
                    new McdPaybackAction(vaultId, '$2', proxy.address, MCD_MANAGER_ADDR),
                    new McdWithdrawAction(vaultId, '$1', joinAddr, aaveV2FlAddr, MCD_MANAGER_ADDR),
                ]);

                const functionData = repayRecipe.encodeForDsProxyCall();

                await executeAction('RecipeExecutor', functionData[1], proxy);

                const ratioAfter = await getRatio(mcdView, vaultId);
                const info2 = await getVaultInfo(mcdView, vaultId, ilkData.ilkBytes);
                console.log(
                    `Ratio before: ${ratioAfter.toFixed(2)}% (coll: ${info2.coll.toFixed(2)} ${
                        tokenData.symbol
                    }, debt: ${info2.debt.toFixed(2)} Dai)`,
                );

                expect(ratioAfter).to.be.gt(ratioBefore);
                expect(info2.coll).to.be.lt(info.coll);
                expect(info2.debt).to.be.lt(info.debt);
            });
        }

        it('... should call a repay for GUNIV3DAIUSDC1-A vault', async () => {
            const GUNIV3DAIUSDC = '0xabddafb225e10b90d798bb8a886238fb835e2053';
            const joinAddr = '0xbFD445A97e7459b0eBb34cfbd3245750Dba4d7a4';

            const daiAmount = hre.ethers.utils.parseUnits('28000', 18);
            const usdtAmount = hre.ethers.utils.parseUnits('28000', 6);

            await setBalance(DAI_ADDR, senderAcc.address, daiAmount);
            await setBalance(USDC_ADDR, senderAcc.address, usdtAmount);

            await approve(DAI_ADDR, proxy.address);
            await approve(USDC_ADDR, proxy.address);
            await gUniDeposit(
                GUNIV3DAIUSDC,
                DAI_ADDR,
                USDC_ADDR,
                daiAmount,
                usdtAmount,
                senderAcc.address,
                proxy,
            );

            const poolTokensBalanceAfter = await balanceOf(GUNIV3DAIUSDC, senderAcc.address);

            await approve(GUNIV3DAIUSDC, proxy.address);

            const vaultId = await openVaultForExactAmountInDecimals(
                makerAddresses,
                proxy,
                joinAddr,
                { address: GUNIV3DAIUSDC, decimals: 18 },
                poolTokensBalanceAfter,
                (parseInt(GENERATE_AMOUNT_IN_USD, 10) + 200).toString(),
            );

            const ratioBefore = await getRatio(mcdView, vaultId);
            const info = await getVaultInfo(
                mcdView,
                vaultId,
                '0x47554e49563344414955534443312d4100000000000000000000000000000000',
            );
            console.log(
                `Ratio before: ${ratioBefore.toFixed(2)}% (coll: ${info.coll.toFixed(
                    2,
                )} GUNIV3DAIUSDC1, debt: ${info.debt.toFixed(2)} Dai)`,
            );

            const proxyAddr = proxy.address;
            const fromToken = makerAddresses.MCD_DAI;
            // -> WITHDRAW GUNI from COLL, GUNIWITHDRAW burn tokens, sell USDC for DAI, REPAY DAI

            const amountToWithdraw = poolTokensBalanceAfter.div(10).toString();
            console.log((amountToWithdraw / 1e18).toString());

            const mcdWithdrawAction = new dfs.actions.maker.MakerWithdrawAction(
                vaultId,
                amountToWithdraw,
                joinAddr,
                proxyAddr,
                MCD_MANAGER_ADDR,
            );
            const guniBurnAction = new dfs.actions.guni.GUniWithdraw(
                GUNIV3DAIUSDC,
                '$1',
                0,
                0,
                proxyAddr,
                proxyAddr,
            );
            const usdcTokenBalanceAction = new dfs.actions.basic.TokenBalanceAction(
                USDC_ADDR,
                proxyAddr,
            );
            const sellAction = new dfs.actions.basic.SellAction(
                formatExchangeObj(USDC_ADDR, fromToken, '$3', uniWrapper.address),
                proxyAddr,
                proxyAddr,
            );
            const daiTokenBalanceAction = new dfs.actions.basic.TokenBalanceAction(
                DAI_ADDR,
                proxyAddr,
            );
            const mcdPaybackAction = new dfs.actions.maker.MakerPaybackAction(
                vaultId,
                '$5',
                proxyAddr,
                MCD_MANAGER_ADDR,
            );
            const repayRecipe = new dfs.Recipe('RepayRecipe', [
                mcdWithdrawAction,
                guniBurnAction,
                usdcTokenBalanceAction,
                sellAction,
                daiTokenBalanceAction,
                mcdPaybackAction,
            ]);
            const functionData = repayRecipe.encodeForDsProxyCall();

            await executeAction('RecipeExecutor', functionData[1], proxy);

            const ratioAfter = await getRatio(mcdView, vaultId);
            const info2 = await getVaultInfo(
                mcdView,
                vaultId,
                '0x47554e49563344414955534443312d4100000000000000000000000000000000',
            );
            console.log(
                `Ratio after: ${ratioAfter.toFixed(2)}% (coll: ${info2.coll.toFixed(
                    2,
                )} GUNIV3DAIUSDC1, debt: ${info2.debt.toFixed(2)} Dai)`,
            );
            expect(ratioAfter).to.be.gt(ratioBefore);
            expect(info2.coll).to.be.lt(info.coll);
            expect(info2.debt).to.be.lt(info.debt);
        }).timeout(300000);
    });
};

const mcdRecipesFullTest = async () => {
    await mcdBoostTest();
    await mcdRepayTest();
    await mcdCreateTest();
    await mcdCloseTest();
};

module.exports = {
    mcdRecipesFullTest,
    mcdBoostTest,
    mcdRepayTest,
    mcdCreateTest,
    mcdCloseTest,
};
