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
} = require('../utils-mcd');

const {
    openVault,
} = require('../actions.js');

const VAULT_DAI_AMOUNT = '540';

describe("Mcd-Boost", function() {
    this.timeout(80000);

    let makerAddresses, senderAcc, proxy, mcdOpenAddr, mcdView, taskExecutorAddr;

    before(async () => {
        await redeploy('McdSupply');
        await redeploy('TaskExecutor');
        await redeploy('McdGenerate');
        // await redeploy('FLAave');

        mcdView = await redeploy('McdView');

        makerAddresses = await fetchMakerAddresses();

        taskExecutorAddr = await getAddrFromRegistry('TaskExecutor');

        senderAcc = (await hre.ethers.getSigners())[0];
        proxy = await getProxy(senderAcc.address);

    });

    for (let i = 0; i < 1; ++i) {
        const ilkData = ilks[i];
        const joinAddr = ilkData.join;
        const tokenData = getAssetInfo(ilkData.asset);
        let vaultId;

        let boostAmount = '20';

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
                new dfs.actions.maker.MakerGenerateAction(vaultId, boostAmount.toString(), to);

            const exchangeObject = formatExchangeObj(
                fromToken,
                collToken,
                '$1',
                UNISWAP_WRAPPER
            );
            
            const sellAction = new dfs.actions.basic.SellAction(
                exchangeObject,
                from,
                to
            );

            const mcdSupplyAction = 
                new dfs.actions.maker.MakerSupplyAction(vaultId, '$2', joinAddr, from);

            const boostRecipe = new dfs.ActionSet("BoostRecipe", [
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

        // it(`... should call a boost with FL ${boostAmount} on a ${ilkData.ilkLabel} vault`, async () => {

        //     // create a vault
        //     vaultId = await openVault(
        //         makerAddresses,
        //         proxy,
        //         joinAddr,
        //         tokenData,
        //         standardAmounts[tokenData.symbol],
        //         VAULT_DAI_AMOUNT
        //     );

        //     boostAmount = ethers.utils.parseUnits(boostAmount, 18);

        //     const ratioBefore = await getRatio(mcdView, vaultId);
        //     const info = await getVaultInfo(mcdView, vaultId, ilkData.ilkBytes);
        //     console.log(`Ratio before: ${ratioBefore.toFixed(2)}% (coll: ${info.coll.toFixed(2)} ${tokenData.symbol}, debt: ${info.debt.toFixed(2)} Dai)`);

        //     const from = proxy.address;
        //     const to = proxy.address;
        //     const collToken = tokenData.address;
        //     const fromToken = makerAddresses["MCD_DAI"];
        //     const dfsSellAddr = await getAddrFromRegistry('DFSSell');
        //     const dfsSell = await hre.ethers.getContractAt("DFSSell", dfsSellAddr);

        //     const boostTask = new TaskBuilder('BoostTask');
        //     boostTask.addAction(
        //         'FLAave',
        //         encodeMcdGenerateAction(vaultId, boostAmount, to),
        //         [0, 0, 0]
        //     );
        //     boostTask.addAction(
        //         'McdGenerate',
        //         encodeMcdGenerateAction(vaultId, boostAmount, to),
        //         [0, 0, 0]
        //     );
        //     boostTask.addAction(
        //         'DFSSell',
        //         (await encodeDfsSellAction(dfsSell, fromToken, collToken, 0, UNISWAP_WRAPPER, from, to)),
        //         [0, 0, 1, 0, 0]
        //     );
        //     boostTask.addAction(
        //         'McdSupply',
        //         encodeMcdSupplyAction(vaultId, 0, joinAddr, from),
        //         [0, 2, 0, 0]
        //     );

        //     await boostTask.execute(proxy);

        //     const ratioAfter = await getRatio(mcdView, vaultId);
        //     const info2 = await getVaultInfo(mcdView, vaultId, ilkData.ilkBytes);
        //     console.log(`Ratio before: ${ratioAfter.toFixed(2)}% (coll: ${info2.coll.toFixed(2)} ${tokenData.symbol}, debt: ${info2.debt.toFixed(2)} Dai)`);

        //     expect(ratioAfter).to.be.lt(ratioBefore);
        //     expect(info2.coll).to.be.gt(info.coll);
        //     expect(info2.debt).to.be.gt(info.debt);
        // });
    }

});
