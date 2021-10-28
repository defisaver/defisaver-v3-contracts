const { expect } = require('chai');
const hre = require('hardhat');

const { getAssetInfo, ilks } = require('@defisaver/tokens');

const {
    balanceOf,
    getProxy,
    redeploy,
    MIN_VAULT_DAI_AMOUNT,
    WETH_ADDRESS,
    fetchAmountinUSDPrice,
} = require('../utils');

const {
    fetchMakerAddresses,
    canGenerateDebt,
} = require('../utils-mcd.js');

const {
    withdrawMcd,
    openVault,
    openMcd,
    supplyMcd,
} = require('../actions.js');

const BigNumber = hre.ethers.BigNumber;

describe('Mcd-Withdraw', function () {
    this.timeout(40000);

    let makerAddresses; let senderAcc; let proxy;

    before(async () => {
        await redeploy('McdWithdraw');
        await redeploy('McdGenerate');

        makerAddresses = await fetchMakerAddresses();

        senderAcc = (await hre.ethers.getSigners())[0];
        proxy = await getProxy(senderAcc.address);
    });

    for (let i = 0; i < ilks.length; ++i) {
        const ilkData = ilks[i];
        const joinAddr = ilkData.join;
        const tokenData = getAssetInfo(ilkData.asset);
        let vaultId;
        const supplyAmount = fetchAmountinUSDPrice(tokenData.symbol, '25000');
        const withdrawAmount = fetchAmountinUSDPrice(tokenData.symbol, '500');

        if (supplyAmount === 0) {
            // skip tokens we don't have price for
            // eslint-disable-next-line no-continue
            continue;
        }

        it(`... should withdraw ${withdrawAmount} ${tokenData.symbol} from ${ilkData.ilkLabel} vault`, async () => {
            // skip uni tokens
            if (tokenData.symbol.indexOf('UNIV2') !== -1) {
                // eslint-disable-next-line no-unused-expressions
                expect(true).to.be.true;
                return;
            }

            // TODO: Maybe optimize this so it's called only once per running tests
            const canGenerate = await canGenerateDebt(ilkData);
            if (!canGenerate) {
                // eslint-disable-next-line no-unused-expressions
                expect(true).to.be.true;
                return;
            }

            if (tokenData.symbol === 'ETH') {
                tokenData.address = WETH_ADDRESS;
            }
            vaultId = await openVault(
                proxy,
                ilkData.ilkLabel,
                supplyAmount,
                MIN_VAULT_DAI_AMOUNT,
            );

            const to = senderAcc.address;
            const amountColl = hre.ethers.utils.parseUnits(withdrawAmount, tokenData.decimals);

            const collBalanceBefore = await balanceOf(tokenData.address, to);

            await withdrawMcd(proxy, vaultId, amountColl, joinAddr, to);

            const collBalanceAfter = await balanceOf(tokenData.address, to);

            expect(collBalanceAfter).to.be.gt(collBalanceBefore);
        });

        it(`... should withdraw all coll ${tokenData.symbol} from ${ilkData.ilkLabel} vault`, async () => {
            // skip uni tokens
            if (tokenData.symbol.indexOf('UNIV2') !== -1) {
                // eslint-disable-next-line no-unused-expressions
                expect(true).to.be.true;
                return;
            }

            const canGenerate = await canGenerateDebt(ilkData);
            if (!canGenerate) {
                // eslint-disable-next-line no-unused-expressions
                expect(true).to.be.true;
                return;
            }

            if (tokenData.symbol === 'ETH') {
                tokenData.address = WETH_ADDRESS;
            }

            const amount = BigNumber.from(
                hre.ethers.utils.parseUnits(supplyAmount, tokenData.decimals),
            );
            const to = senderAcc.address;
            const from = senderAcc.address;

            vaultId = await openMcd(proxy, joinAddr);
            await supplyMcd(proxy, vaultId, amount, tokenData.address, joinAddr, from);
            const collBalanceBefore = await balanceOf(tokenData.address, to);
            await withdrawMcd(proxy, vaultId, hre.ethers.constants.MaxUint256, joinAddr, to);

            const collBalanceAfter = await balanceOf(tokenData.address, to);
            expect(collBalanceAfter).to.be.gt(collBalanceBefore);
        });
    }
});
