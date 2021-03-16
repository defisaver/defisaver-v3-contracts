const { expect } = require("chai");

const { getAssetInfo, ilks } = require('@defisaver/tokens');

const {
    getAddrFromRegistry,
    balanceOf,
    getProxy,
    redeploy,
    standardAmounts,
    MAX_UINT,
    MIN_VAULT_DAI_AMOUNT,
    WETH_ADDRESS
} = require('../utils');

const {
    fetchMakerAddresses,
} = require('../utils-mcd.js');

const {
    withdrawMcd,
    openVault,
} = require('../actions.js');

describe("Mcd-Withdraw", function() {
    this.timeout(40000);

    let makerAddresses, senderAcc, proxy;

    before(async () => {
        await redeploy('McdWithdraw');

        makerAddresses = await fetchMakerAddresses();

        senderAcc = (await hre.ethers.getSigners())[0];
        proxy = await getProxy(senderAcc.address);

    });

    for (let i = 2; i < 6; ++i) {
        const ilkData = ilks[i];
        const joinAddr = ilkData.join;
        const tokenData = getAssetInfo(ilkData.asset);
        let vaultId;

        // skip uni tokens
        if (tokenData.symbol.indexOf("UNIV2") !== -1) {
            expect(true).to.be.true;
            return;
        }

        const withdrawAmount = (standardAmounts[tokenData.symbol] / 20).toString();

        it(`... should withdraw ${withdrawAmount} ${tokenData.symbol} from ${ilkData.ilkLabel} vault`, async () => {

            if (tokenData.symbol === 'ETH') {
                tokenData.address = WETH_ADDRESS;
            }

            vaultId = await openVault(
                makerAddresses,
                proxy,
                joinAddr,
                tokenData,
                (standardAmounts[tokenData.symbol] * 2).toString(),
                MIN_VAULT_DAI_AMOUNT
            );

            const to = senderAcc.address;
            const amountColl = ethers.utils.parseUnits(withdrawAmount, tokenData.decimals);

            const collBalanceBefore = await balanceOf(tokenData.address, to);

                console.log('Withdraw');

            await withdrawMcd(proxy, vaultId, amountColl, joinAddr, to);

            const collBalanceAfter = await balanceOf(tokenData.address, to);

            expect(collBalanceAfter).to.be.gt(collBalanceBefore);
        });
    }
});
