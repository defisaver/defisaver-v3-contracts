const { expect } = require("chai");

const { getAssetInfo, ilks } = require('@defisaver/tokens');
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
    WETH_ADDRESS,
    ETH_ADDR,
} = require('../utils');

const {
    fetchMakerAddresses,
    getVaultsForUser,
    getRatio,
    getVaultInfo,
    MCD_MANAGER_ADDR,
} = require('../utils-mcd');

const {
    openVault,
    addFlDust
} = require('../actions.js');

const VAULT_DAI_AMOUNT = '970';

const dydxFLAction = dfs.actions.flashloan.DyDxFlashLoanAction;
const aaveFLAction = dfs.actions.flashloan.AaveFlashLoanAction;
const mcdPaybackAction = dfs.actions.maker.MakerPaybackAction;
const mcdWithdrawAction = dfs.actions.maker.MakerWithdrawAction;
const sellAction = dfs.actions.basic.SellAction;

describe("Mcd-Repay", function() {
    this.timeout(80000);

    let makerAddresses, senderAcc, proxy, dydxFlAddr, aaveFlAddr, aaveV2FlAddr, mcdView, taskExecutorAddr;

    before(async () => {
        await redeploy('FLDyDx');
        await redeploy('FLAave');
        await redeploy('FLAaveV2');

        mcdView = await redeploy('McdView');
        taskExecutorAddr = await getAddrFromRegistry('TaskExecutor');

        dydxFlAddr = await getAddrFromRegistry('FLDyDx');
        aaveFlAddr = await getAddrFromRegistry('FLAave');

        makerAddresses = await fetchMakerAddresses();

        aaveV2FlAddr = await getAddrFromRegistry('FLAaveV2');

        senderAcc = (await hre.ethers.getSigners())[0];
        proxy = await getProxy(senderAcc.address);

        await addFlDust(proxy, senderAcc, dydxFlAddr);
    });

    for (let i = 0; i < 1; ++i) {
        const ilkData = ilks[i];
        const joinAddr = ilkData.join;
        const tokenData = getAssetInfo(ilkData.asset);
        let vaultId;

        let repayAmount = (standardAmounts[tokenData.symbol] / 30).toString();

        // it(`... should call a repay ${repayAmount} ${tokenData.symbol} on a ${ilkData.ilkLabel} vault`, async () => {

        //     // create a vault
        //     vaultId = await openVault(
        //         makerAddresses,
        //         proxy,
        //         joinAddr,
        //         tokenData,
        //         standardAmounts[tokenData.symbol],
        //         VAULT_DAI_AMOUNT
        //     );

        //     repayAmount = ethers.utils.parseUnits(repayAmount, tokenData.decimals);

        //     const ratioBefore = await getRatio(mcdView, vaultId);
        //     const info = await getVaultInfo(mcdView, vaultId, ilkData.ilkBytes);
        //     console.log(`Ratio before: ${ratioBefore.toFixed(2)}% (coll: ${info.coll.toFixed(2)} ${tokenData.symbol}, debt: ${info.debt.toFixed(2)} Dai)`);

        //     const from = proxy.address;
        //     const to = proxy.address;
        //     const collToken = tokenData.address;
        //     const fromToken = makerAddresses["MCD_DAI"];
           
        //     const mcdWithdrawAction = 
        //         new dfs.actions.maker.MakerWithdrawAction(vaultId, repayAmount, joinAddr, to, MCD_MANAGER_ADDR);
            
        //     const sellAction = new dfs.actions.basic.SellAction(
        //         formatExchangeObj(
        //             collToken,
        //             fromToken,
        //             '$1',
        //             UNISWAP_WRAPPER
        //         ),
        //         from,
        //         to
        //     );

        //     const mcdPaybackAction = 
        //         new dfs.actions.maker.MakerPaybackAction(vaultId, '$2', from, MCD_MANAGER_ADDR);

        //     const repayRecipe = new dfs.Recipe("RepayRecipe", [
        //         mcdWithdrawAction,
        //         sellAction,
        //         mcdPaybackAction
        //     ]);

        //     const functionData = repayRecipe.encodeForDsProxyCall();

        //     await proxy['execute(address,bytes)'](taskExecutorAddr, functionData[1], {gasLimit: 3000000});

        //     const ratioAfter = await getRatio(mcdView, vaultId);
        //     const info2 = await getVaultInfo(mcdView, vaultId, ilkData.ilkBytes);
        //     console.log(`Ratio before: ${ratioAfter.toFixed(2)}% (coll: ${info2.coll.toFixed(2)} ${tokenData.symbol}, debt: ${info2.debt.toFixed(2)} Dai)`);

        //     expect(ratioAfter).to.be.gt(ratioBefore);
        //     expect(info2.coll).to.be.lt(info.coll);
        //     expect(info2.debt).to.be.lt(info.debt);
        // });

        it(`... should call a FL repay ${repayAmount} ${tokenData.symbol} on a ${ilkData.ilkLabel} vault`, async () => {

            // create a vault
            vaultId = await openVault(
                makerAddresses,
                proxy,
                joinAddr,
                tokenData,
                standardAmounts[tokenData.symbol],
                VAULT_DAI_AMOUNT
            );

            repayAmount = ethers.utils.parseUnits(repayAmount, tokenData.decimals);
            const flAmount = ethers.utils.parseUnits('0.1', 18);

            const ratioBefore = await getRatio(mcdView, vaultId);
            const info = await getVaultInfo(mcdView, vaultId, ilkData.ilkBytes);
            console.log(`Ratio before: ${ratioBefore.toFixed(2)}% (coll: ${info.coll.toFixed(2)} ${tokenData.symbol}, debt: ${info.debt.toFixed(2)} Dai)`);
        

            const from = proxy.address;
            const to = proxy.address;
            const collToken = tokenData.address;
            const daiToken = makerAddresses["MCD_DAI"];
      
            const exchangeOrder = formatExchangeObj(
                collToken,
                daiToken,
                flAmount,
                UNISWAP_WRAPPER
            );

            console.log(dfs.actions.flashloan);

            const flToken = collToken.toLowerCase() === ETH_ADDR.toLowerCase() ? WETH_ADDRESS : collToken;

            const flAaveV2Action = 
            new dfs.actions.flashloan.AaveV2FlashLoanAction([flAmount], [flToken], [0], nullAddress);

            const repayRecipe = new dfs.Recipe("FLRepayRecipe", [
                new dydxFLAction(flAmount, collToken),
                new sellAction(exchangeOrder, proxy.address, proxy.address),
                new mcdPaybackAction(vaultId, '$2', proxy.address, MCD_MANAGER_ADDR),
                new mcdWithdrawAction(vaultId, '$1', joinAddr, dydxFlAddr, MCD_MANAGER_ADDR)
            ]);

            const functionData = repayRecipe.encodeForDsProxyCall();

            await proxy['execute(address,bytes)'](taskExecutorAddr, functionData[1], {gasLimit: 3000000});

            const ratioAfter = await getRatio(mcdView, vaultId);
            const info2 = await getVaultInfo(mcdView, vaultId, ilkData.ilkBytes);
            console.log(`Ratio before: ${ratioAfter.toFixed(2)}% (coll: ${info2.coll.toFixed(2)} ${tokenData.symbol}, debt: ${info2.debt.toFixed(2)} Dai)`);

            expect(ratioAfter).to.be.gt(ratioBefore);
            expect(info2.coll).to.be.lt(info.coll);
            expect(info2.debt).to.be.lt(info.debt);
        });

    }

});
