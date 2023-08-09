/* eslint-disable no-await-in-loop */
/* eslint-disable guard-for-in */
/* eslint-disable no-restricted-syntax */
/* eslint-disable no-shadow */
const { ethers } = require('hardhat');
const { expect } = require('chai');

const {
    getContractFromRegistry, fetchAmountinUSDPrice, setBalance,
    balanceOf, getProxy, Float2BN, approve, BN2Float,
} = require('../utils');
const {
    tokenizedVaultAdapterDeposit,
    tokenizedVaultAdapterMint,
    tokenizedVaultAdapterRedeem,
    tokenizedVaultAdapterWithdraw,
} = require('../actions');

const vaults = [
    '0x36F8d0D0573ae92326827C4a82Fe4CE4C244cAb6', // Morpho-Aave Dai Stablecoin Supply Vault
    '0xA5269A8e31B93Ff27B887B56720A25F844db0529', // Morpho-Aave USD Coin Supply Vault
    '0xAFe7131a57E44f832cb2dE78ade38CaD644aaC2f', // Morpho-Aave Tether USD Supply Vault
    '0xac3E018457B222d93114458476f3E3416Abbe38F', // Staked Frax Ether
    '0x83F20F44975D03b1b09e64809B757c47f942BEeA', // Savings Dai
];

const getVaultData = async (vaultAddress) => {
    const vault = await ethers.getContractAt('IERC4626', vaultAddress);
    const shareTokenAddress = vaultAddress;
    const shareTokenSymbol = await vault.symbol();
    const shareTokenDecimals = await vault.decimals();
    const assetAddress = await vault.asset();
    const assetSymbol = await ethers.getContractAt('IERC20', assetAddress).then((c) => c.symbol());
    const assetDecimals = await ethers.getContractAt('IERC20', assetAddress).then((c) => c.decimals());

    return {
        vault,
        shareTokenAddress,
        shareTokenSymbol,
        shareTokenDecimals,
        assetAddress,
        assetSymbol,
        assetDecimals,
    };
};

const tokenizedVaultAdapterTest = () => describe('Tokenized-Vault-Adapter', () => {
    const ASSET_DOLLAR_AMOUNT = 40_000;

    let senderAddress;
    let proxy;
    let proxyAddress;

    before(async () => {
        senderAddress = await ethers.getSigners().then(([s]) => s.address);
        proxy = await getProxy(senderAddress);
        proxyAddress = proxy.address;

        await getContractFromRegistry('TokenizedVaultAdapter');
    });

    it('... should test deposit operation', async () => {
        for (const vaultAddress of vaults) {
            const {
                vault,
                shareTokenAddress,
                shareTokenSymbol,
                shareTokenDecimals,
                assetAddress,
                assetSymbol,
                assetDecimals,
            } = await getVaultData(vaultAddress);

            const assetAmount = Float2BN(
                (+fetchAmountinUSDPrice(assetSymbol, ASSET_DOLLAR_AMOUNT))
                    .toFixed(assetDecimals),
                assetDecimals,
            );

            // in this case represents minOut
            // allow 1bpt slippage because of share appretiation
            const minOutOrMaxIn = await vault.previewDeposit(assetAmount.mul(99_99).div(1_00_00));

            console.log(`- depositing ${(+BN2Float(assetAmount, assetDecimals)).toFixed()} ${assetSymbol} expecting at least ${(+BN2Float(minOutOrMaxIn, shareTokenDecimals)).toFixed()} ${shareTokenSymbol}`);

            await setBalance(assetAddress, senderAddress, assetAmount);
            await setBalance(shareTokenAddress, senderAddress, Float2BN('0'));
            await approve(assetAddress, proxyAddress);
            const { assetsToApprove } = await tokenizedVaultAdapterDeposit({
                proxy,
                amount: assetAmount,
                minOutOrMaxIn,
                vaultAddress,
                from: senderAddress,
                to: senderAddress,
                underlyingAssetAddress: assetAddress,
            });
            expect(assetsToApprove[0].asset).to.be.eq(assetAddress);
            expect(assetsToApprove[0].owner).to.be.eq(senderAddress);

            expect(await balanceOf(shareTokenAddress, senderAddress)).to.be.gte(minOutOrMaxIn);
            expect(await balanceOf(shareTokenAddress, proxyAddress)).to.be.eq(0);
            expect(await balanceOf(assetAddress, proxyAddress)).to.be.eq(0);
        }
    });

    it('... should test mint operation', async () => {
        for (const vaultAddress of vaults) {
            const {
                vault,
                shareTokenAddress,
                shareTokenSymbol,
                shareTokenDecimals,
                assetAddress,
                assetSymbol,
                assetDecimals,
            } = await getVaultData(vaultAddress);

            const minOutOrMaxIn = Float2BN(
                (+fetchAmountinUSDPrice(assetSymbol, ASSET_DOLLAR_AMOUNT))
                    .toFixed(assetDecimals),
                assetDecimals,
            );
            // in this case represents maxIn
            // allow 1bpt slippage because of share appretiation
            const shareAmount = await vault.previewDeposit(minOutOrMaxIn.mul(99_98).div(1_00_00));

            console.log(`- minting ${(+BN2Float(shareAmount, shareTokenDecimals)).toFixed()} ${shareTokenSymbol} depositing at most ${(+BN2Float(minOutOrMaxIn, assetDecimals)).toFixed()} ${assetSymbol}`);

            await setBalance(assetAddress, senderAddress, minOutOrMaxIn);
            await setBalance(shareTokenAddress, senderAddress, Float2BN('0'));
            await approve(assetAddress, proxyAddress);
            const { assetsToApprove } = await tokenizedVaultAdapterMint({
                proxy,
                amount: shareAmount,
                minOutOrMaxIn,
                vaultAddress,
                from: senderAddress,
                to: senderAddress,
                underlyingAssetAddress: assetAddress,
            });
            expect(assetsToApprove[0].asset).to.be.eq(assetAddress);
            expect(assetsToApprove[0].owner).to.be.eq(senderAddress);

            expect(await balanceOf(shareTokenAddress, senderAddress)).to.be.eq(shareAmount);
            expect(await balanceOf(shareTokenAddress, proxyAddress)).to.be.eq(0);
            expect(await balanceOf(assetAddress, proxyAddress)).to.be.eq(0);
        }
    });

    it('... should test withdraw operation', async () => {
        for (const vaultAddress of vaults) {
            const {
                vault,
                shareTokenAddress,
                shareTokenSymbol,
                shareTokenDecimals,
                assetAddress,
                assetSymbol,
                assetDecimals,
            } = await getVaultData(vaultAddress);

            // in this case represents maxIn
            const minOutOrMaxIn = await vault.previewDeposit(Float2BN(
                (+fetchAmountinUSDPrice(assetSymbol, ASSET_DOLLAR_AMOUNT))
                    .toFixed(assetDecimals),
                assetDecimals,
            ));

            const assetAmount = await vault.previewRedeem(minOutOrMaxIn);

            console.log(`- withdrawing ${(+BN2Float(assetAmount, assetDecimals)).toFixed()} ${assetSymbol} burning at most ${(+BN2Float(minOutOrMaxIn, shareTokenDecimals)).toFixed()} ${shareTokenSymbol}`);

            await setBalance(shareTokenAddress, senderAddress, minOutOrMaxIn);
            await setBalance(assetAddress, senderAddress, Float2BN('0'));
            await approve(shareTokenAddress, proxyAddress);
            const { assetsToApprove } = await tokenizedVaultAdapterWithdraw({
                proxy,
                amount: assetAmount,
                minOutOrMaxIn,
                vaultAddress,
                from: senderAddress,
                to: senderAddress,
            });
            expect(assetsToApprove[0].asset).to.be.eq(shareTokenAddress);
            expect(assetsToApprove[0].owner).to.be.eq(senderAddress);

            expect(await balanceOf(assetAddress, senderAddress)).to.be.eq(assetAmount);
            expect(await balanceOf(shareTokenAddress, proxyAddress)).to.be.eq(0);
            expect(await balanceOf(assetAddress, proxyAddress)).to.be.eq(0);
        }
    });

    it('... should test redeem operation', async () => {
        for (const vaultAddress of vaults) {
            const {
                vault,
                shareTokenAddress,
                shareTokenSymbol,
                shareTokenDecimals,
                assetAddress,
                assetSymbol,
                assetDecimals,
            } = await getVaultData(vaultAddress);

            // in this case represents minOut
            const shareAmount = await vault.previewDeposit(Float2BN(
                (+fetchAmountinUSDPrice(assetSymbol, ASSET_DOLLAR_AMOUNT))
                    .toFixed(assetDecimals),
                assetDecimals,
            ));

            const minOutOrMaxIn = await vault.previewRedeem(shareAmount);

            console.log(`- redeeming ${(+BN2Float(shareAmount, shareTokenDecimals)).toFixed()} ${shareTokenSymbol} expecting at least ${(+BN2Float(minOutOrMaxIn, assetDecimals)).toFixed()} ${assetSymbol}`);

            await setBalance(shareTokenAddress, senderAddress, shareAmount);
            await setBalance(assetAddress, senderAddress, Float2BN('0'));
            await approve(shareTokenAddress, proxyAddress);
            const { assetsToApprove } = await tokenizedVaultAdapterRedeem({
                proxy,
                amount: shareAmount,
                minOutOrMaxIn,
                vaultAddress,
                from: senderAddress,
                to: senderAddress,
            });
            expect(assetsToApprove[0].asset).to.be.eq(shareTokenAddress);
            expect(assetsToApprove[0].owner).to.be.eq(senderAddress);

            expect(await balanceOf(assetAddress, senderAddress)).to.be.gte(minOutOrMaxIn);
            expect(await balanceOf(shareTokenAddress, proxyAddress)).to.be.eq(0);
            expect(await balanceOf(assetAddress, proxyAddress)).to.be.eq(0);
        }
    });
});

tokenizedVaultAdapterTest();

module.exports = {
    tokenizedVaultAdapterTest,
};
