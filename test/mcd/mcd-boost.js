const { expect } = require("chai");

const { getAssetInfo, ilks } = require('defisaver-tokens');

const {
    getAddrFromRegistry,
    getProxy,
    redeploy,
    send,
    nullAddress,
    REGISTRY_ADDR,
    standardAmounts,
    UNISWAP_WRAPPER,
} = require('../utils');

const {
    fetchMakerAddresses,
    getVaultsForUser,
    getRatio,
    getVaultInfo,
} = require('../utils-mcd');

const {
    openVault,
    encodeMcdGenerateAction,
    encodeDfsSellAction,
    encodeMcdSupplyAction,
} = require('../actions.js');

const TaskBuilder = require('../task.js');

const VAULT_DAI_AMOUNT = '140';

describe("Mcd-Boost", function() {
    this.timeout(80000);

    let makerAddresses, senderAcc, proxy, mcdOpenAddr, mcdView;

    before(async () => {
        await redeploy('McdSupply');
        await redeploy('McdGenerate');
        await redeploy('DFSSell');

        mcdView = await redeploy('McdView');

        makerAddresses = await fetchMakerAddresses();

        senderAcc = (await hre.ethers.getSigners())[0];
        proxy = await getProxy(senderAcc.address);
    });

    for (let i = 0; i < ilks.length; ++i) {
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
            console.log(`Ratio before: ${ratioBefore.toFixed(2)}% (coll: ${info.coll.toFixed(2)} ${tokenData.symbol}, debt: ${info.debt.toFixed(2)} Dai)`);

            const from = proxy.address;
            const to = proxy.address;
            const collToken = tokenData.address;
            const fromToken = makerAddresses["MCD_DAI"];
            const dfsSellAddr = await getAddrFromRegistry('DFSSell');
            const dfsSell = await hre.ethers.getContractAt("DFSSell", dfsSellAddr);

            const boostTask = new TaskBuilder('BoostTask');
            boostTask.addAction(
                'McdGenerate',
                encodeMcdGenerateAction(vaultId, boostAmount, to),
                [0, 0, 0]
            );
            boostTask.addAction(
                'DFSSell',
                (await encodeDfsSellAction(dfsSell, fromToken, collToken, 0, UNISWAP_WRAPPER, from, to)),
                [0, 0, 1, 0, 0]
            );
            boostTask.addAction(
                'McdSupply',
                encodeMcdSupplyAction(vaultId, 0, joinAddr, from),
                [0, 2, 0, 0]
            );

            await boostTask.execute(proxy);

            const ratioAfter = await getRatio(mcdView, vaultId);
            const info2 = await getVaultInfo(mcdView, vaultId, ilkData.ilkBytes);
            console.log(`Ratio before: ${ratioAfter.toFixed(2)}% (coll: ${info2.coll.toFixed(2)} ${tokenData.symbol}, debt: ${info2.debt.toFixed(2)} Dai)`);

            expect(ratioAfter).to.be.lt(ratioBefore);
            expect(info2.coll).to.be.gt(info.coll);
            expect(info2.debt).to.be.gt(info.debt);
        });
    }

});
