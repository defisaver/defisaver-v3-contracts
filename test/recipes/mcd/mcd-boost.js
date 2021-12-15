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
} = require('../../utils');

const {
    fetchMakerAddresses,
    getRatio,
    getVaultInfo,
    MCD_MANAGER_ADDR,
} = require('../../utils-mcd');

const {
    openVaultForExactAmountInDecimals,
    gUniDeposit,
    openVault,
} = require('../../actions.js');

describe('Mcd-Boost', function () {
    this.timeout(80000);

    let makerAddresses;
    let senderAcc;
    let proxy;
    let dydxFlAddr;
    // let aaveV2FlAddr;
    let mcdView;
    let taskExecutorAddr;
    let uniWrapper;

    before(async () => {
        await redeploy('McdOpen');
        await redeploy('McdSupply');
        await redeploy('TaskExecutor');
        await redeploy('McdGenerate');
        await redeploy('FLDyDx');
        await redeploy('FLAaveV2');
        await redeploy('DFSSell');
        await redeploy('GUniDeposit');

        uniWrapper = await redeploy('UniswapWrapperV3');
        mcdView = await redeploy('McdView');

        makerAddresses = await fetchMakerAddresses();

        taskExecutorAddr = await getAddrFromRegistry('TaskExecutor');
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
                makerAddresses,
                proxy,
                joinAddr,
                tokenData,
                fetchAmountinUSDPrice(tokenData.symbol, '30000'),
                (parseInt(MIN_VAULT_DAI_AMOUNT, 10) + 200).toString(),
            );

            boostAmount = hre.ethers.utils.parseUnits(boostAmount, 18);

            const ratioBefore = await getRatio(mcdView, vaultId);
            const info = await getVaultInfo(mcdView, vaultId, ilkData.ilkBytes);
            console.log(`Ratio before:  ${ratioBefore.toFixed(2)}% (coll: ${info.coll.toFixed(2)} ${tokenData.symbol}, debt: ${info.debt.toFixed(2)} Dai)`);

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
                formatExchangeObj(
                    fromToken,
                    collToken,
                    '$1',
                    uniWrapper.address,
                ),
                from,
                to,
            );

            const mcdSupplyAction = new dfs.actions.maker.MakerSupplyAction(vaultId, '$2', joinAddr, from, MCD_MANAGER_ADDR);

            const boostRecipe = new dfs.Recipe('BoostRecipe', [
                mcdGenerateAction,
                sellAction,
                mcdSupplyAction,
            ]);

            const functionData = boostRecipe.encodeForDsProxyCall();

            await proxy['execute(address,bytes)'](taskExecutorAddr, functionData[1], { gasLimit: 3000000 });

            const ratioAfter = await getRatio(mcdView, vaultId);
            const info2 = await getVaultInfo(mcdView, vaultId, ilkData.ilkBytes);
            console.log(`Ratio after: ${ratioAfter.toFixed(2)}% (coll: ${info2.coll.toFixed(2)} ${tokenData.symbol}, debt: ${info2.debt.toFixed(2)} Dai)`);

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
            console.log(`Ratio before: ${ratioBefore.toFixed(2)}% (coll: ${info.coll.toFixed(2)} ${tokenData.symbol}, debt: ${info.debt.toFixed(2)} Dai)`);

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
                formatExchangeObj(
                    fromToken,
                    collToken,
                    boostAmount,
                    uniWrapper.address,
                ),
                from,
                to,
            );

            const mcdSupplyAction = new dfs.actions.maker.MakerSupplyAction(vaultId, '$2', joinAddr, from, MCD_MANAGER_ADDR);

            const mcdGenerateAction = new dfs.actions.maker.MakerGenerateAction(vaultId, '$1', dydxFlAddr, MCD_MANAGER_ADDR);

            const boostRecipe = new dfs.Recipe('FLBoostRecipe', [
                dydxFLAction,
                sellAction,
                mcdSupplyAction,
                mcdGenerateAction,
            ]);

            const functionData = boostRecipe.encodeForDsProxyCall();

            await proxy['execute(address,bytes)'](taskExecutorAddr, functionData[1], { gasLimit: 3000000 });

            const ratioAfter = await getRatio(mcdView, vaultId);
            const info2 = await getVaultInfo(mcdView, vaultId, ilkData.ilkBytes);
            console.log(`Ratio before: ${ratioAfter.toFixed(2)}% (coll: ${info2.coll.toFixed(2)} ${tokenData.symbol}, debt: ${info2.debt.toFixed(2)} Dai)`);

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
        const info = await getVaultInfo(mcdView, vaultId, '0x47554e49563344414955534443312d4100000000000000000000000000000000');
        console.log(`Ratio before: ${ratioBefore.toFixed(2)}% (coll: ${info.coll.toFixed(2)} GUNIV3DAIUSDC1, debt: ${info.debt.toFixed(2)} Dai)`);

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
            GUNIV3DAIUSDC, DAI_ADDR, USDC_ADDR, hre.ethers.utils.parseUnits('500', 18).toString(), '$2', 0, 0, from, to,
        );
        const mcdSupplyAction = new dfs.actions.maker.MakerSupplyAction(vaultId, '$3', joinAddr, from, MCD_MANAGER_ADDR);
        const boostRecipe = new dfs.Recipe('FLBoostRecipe', [
            mcdGenerateAction,
            sellAction,
            gUniDepositAction,
            mcdSupplyAction,
        ]);

        const functionData = boostRecipe.encodeForDsProxyCall();

        await proxy['execute(address,bytes)'](taskExecutorAddr, functionData[1], { gasLimit: 3000000 });

        const ratioAfter = await getRatio(mcdView, vaultId);
        const info2 = await getVaultInfo(mcdView, vaultId, '0x47554e49563344414955534443312d4100000000000000000000000000000000');
        console.log(`Ratio before: ${ratioAfter.toFixed(2)}% (coll: ${info2.coll.toFixed(2)} GUNIV3DAIUSDC1, debt: ${info2.debt.toFixed(2)} Dai)`);
        expect(ratioAfter).to.be.lt(ratioBefore);
        expect(info2.coll).to.be.gt(info.coll);
        expect(info2.debt).to.be.gt(info.debt);
    }).timeout(300000);
});
