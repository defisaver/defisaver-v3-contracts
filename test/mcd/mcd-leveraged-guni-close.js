const hre = require('hardhat');
const dfs = require('@defisaver/sdk');

const {
    getProxy,
    redeploy,
    DAI_ADDR,
    approve,
    getAddrFromRegistry,
    balanceOf,
    USDC_ADDR,
} = require('../utils');

const {
    fetchMakerAddresses,
    getVaultsForUser,
    getRatio,
    getVaultInfo,
} = require('../utils-mcd');

const {
    buyTokenIfNeeded,
} = require('../actions.js');
// FORK ON BLOCK NUMBER 13629046 OR ANY THAT HAS ENOUGH LIMIT ON GUNI-A
describe('Mcd-Open', () => {
    let makerAddresses; let senderAcc; let proxy; let mcdView;

    before(async () => {
        await redeploy('McdWindGUni');
        await redeploy('McdUnwindGUni');
        makerAddresses = await fetchMakerAddresses();
        mcdView = await redeploy('McdView');

        senderAcc = (await hre.ethers.getSigners())[0];
        proxy = await getProxy(senderAcc.address);
    });

    it('... should create leveraged GUNI mcd vault', async () => {
        const joinAddr = '0xbFD445A97e7459b0eBb34cfbd3245750Dba4d7a4';
        const mcdManagerAddr = '0x5ef30b9986345249bc32d8928B7ee64DE9435E39';
        await buyTokenIfNeeded(DAI_ADDR, senderAcc, proxy, hre.ethers.utils.parseUnits('50000', 18));
        await approve(DAI_ADDR, proxy.address);
        const mcdopenWindedAddress = await getAddrFromRegistry('McdWindGUni');
        const daiBalance = await balanceOf(DAI_ADDR, senderAcc.address);
        const mcdopenWindedAction = new dfs.actions.maker.MakerWindGUniAction(
            daiBalance, senderAcc.address, daiBalance, 0, 0, mcdManagerAddr, joinAddr,
        );
        const functionData = mcdopenWindedAction.encodeForDsProxyCall()[1];
        await proxy['execute(address,bytes)'](mcdopenWindedAddress, functionData, { gasLimit: 3000000 });
        const vaultsAfter = await getVaultsForUser(proxy.address, makerAddresses);

        const vaultId = vaultsAfter.ids[vaultsAfter.ids.length - 1].toString();
        const ratioAfter = await getRatio(mcdView, vaultId);
        const info2 = await getVaultInfo(mcdView, vaultId, '0x47554e49563344414955534443312d4100000000000000000000000000000000');
        console.log(`Ratio after winding: ${ratioAfter.toFixed(2)}% (coll: ${info2.coll.toFixed(2)} GUNIV3DAIUSDC1, debt: ${info2.debt.toFixed(2)} Dai)`);

        const mcdUnwindAddress = await getAddrFromRegistry('McdUnwindGUni');
        const mcdUnwindAction = new dfs.actions.maker.MakerUnwindGUniAction(
            0, mcdManagerAddr, vaultId, senderAcc.address,
        );
        const functionDataSecond = mcdUnwindAction.encodeForDsProxyCall()[1];
        console.log(`DAI BEFORE UNWINDING SENDERACC ${await balanceOf(DAI_ADDR, senderAcc.address)}`);
        console.log(`DAI BEFORE UNWINDING PROXY ${await balanceOf(DAI_ADDR, proxy.address)}`);
        console.log(`USDC BEFORE UNWINDING SENDERACC ${await balanceOf(USDC_ADDR, senderAcc.address)}`);
        console.log(`USDC BEFORE UNWINDING PROXY  ${await balanceOf(USDC_ADDR, proxy.address)}`);
        await proxy['execute(address,bytes)'](mcdUnwindAddress, functionDataSecond, { gasLimit: 3000000 });
        const ratioAfterUnwind = await getRatio(mcdView, vaultId);
        const info2Unwind = await getVaultInfo(mcdView, vaultId, '0x47554e49563344414955534443312d4100000000000000000000000000000000');
        console.log(`Ratio after unwinding: ${ratioAfterUnwind.toFixed(2)}% (coll: ${info2Unwind.coll.toFixed(2)} GUNIV3DAIUSDC1, debt: ${info2Unwind.debt.toFixed(2)} Dai)`);

        console.log(`DAI AFTER UNWINDING SENDERACC ${await balanceOf(DAI_ADDR, senderAcc.address)}`);
        console.log(`DAI AFTER UNWINDING PROXY ${await balanceOf(DAI_ADDR, proxy.address)}`);
        console.log(`USDC AFTER UNWINDING SENDERACC ${await balanceOf(USDC_ADDR, senderAcc.address)}`);
        console.log(`USDC AFTER UNWINDING PROXY  ${await balanceOf(USDC_ADDR, proxy.address)}`);
    });
});
