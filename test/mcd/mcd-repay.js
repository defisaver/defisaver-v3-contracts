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
    encodeMcdWithdrawAction,
    encodeDfsSellAction,
    encodeMcdPaybackAction,
} = require('../actions.js');

const TaskBuilder = require('../task.js');

const VAULT_DAI_AMOUNT = '140';

describe("Mcd-Repay", function() {
    this.timeout(80000);

    let makerAddresses, senderAcc, proxy, mcdOpenAddr, mcdView;

    before(async () => {
        await redeploy('McdPayback');
        await redeploy('McdWithdraw');
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

        let repayAmount = (standardAmounts[tokenData.symbol] / 10).toString();

        it(`... should call a repay ${repayAmount} ${tokenData.symbol} on a ${ilkData.ilkLabel} vault`, async () => {

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

            const ratioBefore = await getRatio(mcdView, vaultId);
            const info = await getVaultInfo(mcdView, vaultId, ilkData.ilkBytes);
            console.log(`Ratio before: ${ratioBefore.toFixed(2)}% (coll: ${info.coll.toFixed(2)} ${tokenData.symbol}, debt: ${info.debt.toFixed(2)} Dai)`);

            const from = proxy.address;
            const to = proxy.address;
            const collToken = tokenData.address;
            const fromToken = makerAddresses["MCD_DAI"];
            const dfsSellAddr = await getAddrFromRegistry('DFSSell');
            const dfsSell = await hre.ethers.getContractAt("DFSSell", dfsSellAddr);

            const boostTask = new TaskBuilder('RepayTask');
            boostTask.addAction(
                'McdWithdraw',
                encodeMcdWithdrawAction(vaultId, repayAmount, joinAddr, to),
                [0, 0, 0, 0]
            );
            boostTask.addAction(
                'DFSSell',
                (await encodeDfsSellAction(dfsSell, collToken, fromToken, 0, UNISWAP_WRAPPER, from, to)),
                [0, 0, 1, 0, 0]
            );
            boostTask.addAction(
                'McdPayback',
                encodeMcdPaybackAction(vaultId, 0, from),
                [0, 2, 0]
            );

            await boostTask.execute(proxy);

            const ratioAfter = await getRatio(mcdView, vaultId);
            const info2 = await getVaultInfo(mcdView, vaultId, ilkData.ilkBytes);
            console.log(`Ratio before: ${ratioAfter.toFixed(2)}% (coll: ${info2.coll.toFixed(2)} ${tokenData.symbol}, debt: ${info2.debt.toFixed(2)} Dai)`);

            expect(ratioAfter).to.be.gt(ratioBefore);
            expect(info2.coll).to.be.lt(info.coll);
            expect(info2.debt).to.be.lt(info.debt);
        });

    }

});
