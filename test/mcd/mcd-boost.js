const { expect } = require("chai");

const { getAssetInfo, ilks } = require('defisaver-tokens');

const dfs = require('defisaver-sdk');

const {
    getAddrFromRegistry,
    getProxy,
    redeploy,
    send,
    formatExchangeObj,
    nullAddress,
    REGISTRY_ADDR,
    standardAmounts,
    UNISWAP_WRAPPER,
    WETH_ADDRESS
} = require('../utils');

const {
    fetchMakerAddresses,
    getVaultsForUser,
    getRatio,
    getVaultInfo,
    MCD_MANAGER_ADDR
} = require('../utils-mcd');

const {
    openVault,
} = require('../actions.js');

const VAULT_DAI_AMOUNT = '540';

describe("Mcd-Boost", function() {
    this.timeout(80000);

    let makerAddresses, senderAcc, proxy, dydxFlAddr, aaveFlAddr, aaveV2FlAddr, mcdView, taskExecutorAddr;

    before(async () => {
        await redeploy('McdOpen');
        await redeploy('McdSupply');
        await redeploy('TaskExecutor');
        await redeploy('McdGenerate');
        await redeploy('FLDyDx');
        await redeploy('FLAave');
        await redeploy('FLAaveV2');
        await redeploy('TaskExecutor');
        await redeploy('DFSSell');

        mcdView = await redeploy('McdView');

        makerAddresses = await fetchMakerAddresses();

        taskExecutorAddr = await getAddrFromRegistry('TaskExecutor');
        dydxFlAddr = await getAddrFromRegistry('FLDyDx');
        aaveFlAddr = await getAddrFromRegistry('FLAave');
        aaveV2FlAddr = await getAddrFromRegistry('FLAaveV2');

        await send(makerAddresses["MCD_DAI"], dydxFlAddr, '200');

        senderAcc = (await hre.ethers.getSigners())[0];
        proxy = await getProxy(senderAcc.address);

    });

    for (let i = 0; i < 1; ++i) {
        const ilkData = ilks[i];
        const joinAddr = ilkData.join;
        const tokenData = getAssetInfo(ilkData.asset);
        let vaultId;

        let boostAmount = '100';

        it(`... should call a boost ${boostAmount} on a ${ilkData.ilkLabel} vault`, async () => {

            // create a vault
            vaultId = await openVault(
                makerAddresses,
                proxy,
                joinAddr,
                tokenData,
                standardAmounts[tokenData.symbol],
                VAULT_DAI_AMOUNT
            );

            boostAmount = ethers.utils.parseUnits(boostAmount, 18);

            const ratioBefore = await getRatio(mcdView, vaultId);
            const info = await getVaultInfo(mcdView, vaultId, ilkData.ilkBytes);
            console.log(`Ratio before:  ${ratioBefore.toFixed(2)}% (coll: ${info.coll.toFixed(2)} ${tokenData.symbol}, debt: ${info.debt.toFixed(2)} Dai)`);

            const from = proxy.address;
            const to = proxy.address;
            const collToken = tokenData.address;
            const fromToken = makerAddresses["MCD_DAI"];

            const mcdGenerateAction = 
                new dfs.actions.maker.MakerGenerateAction(vaultId, boostAmount.toString(), to, MCD_MANAGER_ADDR);

            const sellAction = new dfs.actions.basic.SellAction(
                formatExchangeObj(
                    fromToken,
                    collToken,
                    '$1',
                    UNISWAP_WRAPPER
                ),
                from,
                to
            );

            const mcdSupplyAction = 
                new dfs.actions.maker.MakerSupplyAction(vaultId, '$2', joinAddr, from, MCD_MANAGER_ADDR);

            const boostRecipe = new dfs.Recipe("BoostRecipe", [
                mcdGenerateAction,
                sellAction,
                mcdSupplyAction
            ]);

            const functionData = boostRecipe.encodeForDsProxyCall();

            await proxy['execute(address,bytes)'](taskExecutorAddr, functionData[1], {gasLimit: 3000000});

            const ratioAfter = await getRatio(mcdView, vaultId);
            const info2 = await getVaultInfo(mcdView, vaultId, ilkData.ilkBytes);
            console.log(`Ratio before: ${ratioAfter.toFixed(2)}% (coll: ${info2.coll.toFixed(2)} ${tokenData.symbol}, debt: ${info2.debt.toFixed(2)} Dai)`);

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
            //     standardAmounts[tokenData.symbol],
            //     VAULT_DAI_AMOUNT
            // );

            // boostAmount = ethers.utils.parseUnits(boostAmount, 18);

            const ratioBefore = await getRatio(mcdView, vaultId);
            const info = await getVaultInfo(mcdView, vaultId, ilkData.ilkBytes);
            console.log(`Ratio before: ${ratioBefore.toFixed(2)}% (coll: ${info.coll.toFixed(2)} ${tokenData.symbol}, debt: ${info.debt.toFixed(2)} Dai)`);

            const from = proxy.address;
            const to = proxy.address;
            const collToken = tokenData.address;
            const fromToken = makerAddresses["MCD_DAI"];

            const dydxFLAction = 
                new dfs.actions.flashloan.DyDxFlashLoanAction(boostAmount, fromToken);

            const flAaveV2Action = 
                new dfs.actions.flashloan.AaveFlashLoanV2Action([boostAmount], [fromToken], [0], nullAddress);
            
            const sellAction = new dfs.actions.basic.SellAction(
                formatExchangeObj(
                    fromToken,
                    collToken,
                    boostAmount,
                    UNISWAP_WRAPPER
                ),
                from,
                to
            );

            const mcdSupplyAction = 
                new dfs.actions.maker.MakerSupplyAction(vaultId, '$2', joinAddr, from, MCD_MANAGER_ADDR);

            const mcdGenerateAction = 
                new dfs.actions.maker.MakerGenerateAction(vaultId, '$1', aaveV2FlAddr, MCD_MANAGER_ADDR);

            const boostRecipe = new dfs.Recipe("FLBoostRecipe", [
                flAaveV2Action,
                sellAction,
                mcdSupplyAction,
                mcdGenerateAction
            ]);

            const functionData = boostRecipe.encodeForDsProxyCall();

            await proxy['execute(address,bytes)'](taskExecutorAddr, functionData[1], {gasLimit: 3000000});

            const ratioAfter = await getRatio(mcdView, vaultId);
            const info2 = await getVaultInfo(mcdView, vaultId, ilkData.ilkBytes);
            console.log(`Ratio before: ${ratioAfter.toFixed(2)}% (coll: ${info2.coll.toFixed(2)} ${tokenData.symbol}, debt: ${info2.debt.toFixed(2)} Dai)`);

            expect(ratioAfter).to.be.lt(ratioBefore);
            expect(info2.coll).to.be.gt(info.coll);
            expect(info2.debt).to.be.gt(info.debt);
        });
    }

});
