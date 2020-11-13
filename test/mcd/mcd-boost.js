const { expect } = require("chai");

const { getAssetInfo, mcdCollateralAssets, ilkToJoinMap } = require('defisaver-tokens');

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

    let makerAddresses, senderAcc, proxy, mcdOpenAddr;

    before(async () => {
        // await redeploy('McdOpen');
        // await redeploy('McdGenerate');
        // await redeploy('McdSupply');
        await redeploy('DFSSell');
        await redeploy('TaskManager');
        await redeploy('ActionExecutor');

        makerAddresses = await fetchMakerAddresses();

        senderAcc = (await hre.ethers.getSigners())[0];
        proxy = await getProxy(senderAcc.address);

        // mcdOpenAddr = await getAddrFromRegistry('McdOpen');
    });

    for (let i = 0; i < 1; ++i) {
        const tokenData = mcdCollateralAssets[i];
        const joinAddr = ilkToJoinMap[tokenData.ilk];
        let vaultId;


        it(`... should call a boost on a vault`, async () => {
            // create a vault
            const vaultId = await openVault(
                makerAddresses,
                proxy,
                joinAddr,
                tokenData,
                standardAmounts[tokenData.symbol],
                VAULT_DAI_AMOUNT
            );

            const boostAmount = ethers.utils.parseUnits('20', 18);
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

        });

    }

});