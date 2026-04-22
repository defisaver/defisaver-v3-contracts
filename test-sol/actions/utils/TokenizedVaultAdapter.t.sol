// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { TokenizedVaultAdapter } from "../../../contracts/actions/utils/TokenizedVaultAdapter.sol";
import { IERC4626 } from "../../../contracts/interfaces/token/IERC4626.sol";
import { IERC20 } from "../../../contracts/interfaces/token/IERC20.sol";
import { BaseTest } from "test-sol/utils/BaseTest.sol";
import { SmartWallet } from "test-sol/utils/SmartWallet.sol";
import { ActionsUtils } from "test-sol/utils/ActionsUtils.sol";

contract TestTokenizedVaultAdapter is BaseTest, ActionsUtils {
    /*//////////////////////////////////////////////////////////////////////////
                               CONTRACT UNDER TEST
    //////////////////////////////////////////////////////////////////////////*/
    TokenizedVaultAdapter cut;

    /*//////////////////////////////////////////////////////////////////////////
                                    VARIABLES
    //////////////////////////////////////////////////////////////////////////*/
    SmartWallet wallet;
    address walletAddr;
    address sender;

    address[] vaults;

    /*//////////////////////////////////////////////////////////////////////////
                                  SETUP FUNCTION
    //////////////////////////////////////////////////////////////////////////*/
    function setUp() public override {
        forkFromEnv("");

        wallet = new SmartWallet(bob);
        sender = wallet.owner();
        walletAddr = wallet.walletAddr();

        cut = new TokenizedVaultAdapter();

        vaults.push(0xac3E018457B222d93114458476f3E3416Abbe38F); // sfrxETH
        vaults.push(0x83F20F44975D03b1b09e64809B757c47f942BEeA); // sDAI
        // ----------------------------- Fluid -----------------------------
        vaults.push(0x9Fb7b4477576Fe5B32be4C1843aFB1e55F251B33); // Fluid USDC
        vaults.push(0x2411802D8BEA09be0aF8fD8D08314a63e706b29C); // Fluid wstETH
        vaults.push(0x6A29A46E21C730DcA1d8b23d637c101cec605C5B); // Fluid GHO
        vaults.push(0x90551c1795392094FE6D29B758EcCD233cFAa260); // Fluid WETH
        vaults.push(0x5C20B550819128074FD538Edf79791733ccEdd18); // Fluid USDT
        // ----------------------------- AAVE V4 -----------------------------
        vaults.push(0x486415fb1F8b062c89ED548f871cf64304AACb31); // USDC_PRIME
    }

    /*//////////////////////////////////////////////////////////////////////////
                                     TESTS
    //////////////////////////////////////////////////////////////////////////*/
    function test_deposit() public {
        for (uint256 i = 0; i < vaults.length; i++) {
            _testDeposit(vaults[i]);
        }
    }

    function test_mint() public {
        for (uint256 i = 0; i < vaults.length; i++) {
            _testMint(vaults[i]);
        }
    }

    function test_withdraw() public {
        for (uint256 i = 0; i < vaults.length; i++) {
            _testWithdraw(vaults[i]);
        }
    }

    function test_redeem() public {
        for (uint256 i = 0; i < vaults.length; i++) {
            _testRedeem(vaults[i]);
        }
    }

    /*//////////////////////////////////////////////////////////////////////////
                                     HELPERS
    //////////////////////////////////////////////////////////////////////////*/
    function _testDeposit(address _vaultAddr) internal revertToSnapshot {
        IERC4626 vault = IERC4626(_vaultAddr);
        address assetAddr = vault.asset();

        uint256 assetAmount = _getTestAmount(assetAddr);
        uint256 minSharesOut = vault.previewDeposit(assetAmount * 9999 / 10_000);

        give(assetAddr, sender, assetAmount);
        approveAsSender(sender, assetAddr, walletAddr, assetAmount);

        wallet.execute(
            address(cut),
            executeActionCalldata(
                tokenizedVaultAdapterEncode(
                    assetAmount,
                    minSharesOut,
                    _vaultAddr,
                    sender,
                    sender,
                    TokenizedVaultAdapter.OperationId.DEPOSIT
                ),
                false
            ),
            0
        );

        assertGe(balanceOf(_vaultAddr, sender), minSharesOut);
        assertEq(balanceOf(_vaultAddr, walletAddr), 0);
        assertEq(balanceOf(assetAddr, walletAddr), 0);
    }

    function _testMint(address _vaultAddr) internal revertToSnapshot {
        IERC4626 vault = IERC4626(_vaultAddr);
        address assetAddr = vault.asset();

        uint256 maxAssetIn = _getTestAmount(assetAddr);
        uint256 shareAmount = vault.previewDeposit(maxAssetIn * 9998 / 10_000);

        give(assetAddr, sender, maxAssetIn);
        approveAsSender(sender, assetAddr, walletAddr, maxAssetIn);

        wallet.execute(
            address(cut),
            executeActionCalldata(
                tokenizedVaultAdapterEncode(
                    shareAmount,
                    maxAssetIn,
                    _vaultAddr,
                    sender,
                    sender,
                    TokenizedVaultAdapter.OperationId.MINT
                ),
                false
            ),
            0
        );

        assertEq(balanceOf(_vaultAddr, sender), shareAmount);
        assertEq(balanceOf(_vaultAddr, walletAddr), 0);
        assertEq(balanceOf(assetAddr, walletAddr), 0);
    }

    function _testWithdraw(address _vaultAddr) internal revertToSnapshot {
        IERC4626 vault = IERC4626(_vaultAddr);
        address assetAddr = vault.asset();
        uint256 sharesReceived = _depositAndGetShares(_vaultAddr, assetAddr);
        uint256 assetAmount = vault.previewRedeem(sharesReceived);

        approveAsSender(sender, _vaultAddr, walletAddr, sharesReceived);
        _executeVaultAction(
            _vaultAddr, assetAmount, sharesReceived, TokenizedVaultAdapter.OperationId.WITHDRAW
        );

        assertEq(balanceOf(assetAddr, sender), assetAmount);
        assertEq(balanceOf(_vaultAddr, walletAddr), 0);
        assertEq(balanceOf(assetAddr, walletAddr), 0);
    }

    function _testRedeem(address _vaultAddr) internal revertToSnapshot {
        IERC4626 vault = IERC4626(_vaultAddr);
        address assetAddr = vault.asset();
        uint256 shareAmount = _depositAndGetShares(_vaultAddr, assetAddr);
        uint256 minAssetsOut = vault.previewRedeem(shareAmount);

        approveAsSender(sender, _vaultAddr, walletAddr, shareAmount);
        _executeVaultAction(
            _vaultAddr, shareAmount, minAssetsOut, TokenizedVaultAdapter.OperationId.REDEEM
        );

        assertGe(balanceOf(assetAddr, sender), minAssetsOut);
        assertEq(balanceOf(_vaultAddr, walletAddr), 0);
        assertEq(balanceOf(assetAddr, walletAddr), 0);
    }

    function _depositAndGetShares(address _vaultAddr, address _assetAddr)
        internal
        returns (uint256 shareAmount)
    {
        uint256 assetValue = _getTestAmount(_assetAddr);
        give(_assetAddr, sender, assetValue);
        approveAsSender(sender, _assetAddr, walletAddr, assetValue);
        _executeVaultAction(_vaultAddr, assetValue, 0, TokenizedVaultAdapter.OperationId.DEPOSIT);

        shareAmount = balanceOf(_vaultAddr, sender);
    }

    function _executeVaultAction(
        address _vaultAddr,
        uint256 _amount,
        uint256 _minOutOrMaxIn,
        TokenizedVaultAdapter.OperationId _op
    ) internal {
        wallet.execute(
            address(cut),
            executeActionCalldata(
                tokenizedVaultAdapterEncode(
                    _amount, _minOutOrMaxIn, _vaultAddr, sender, sender, _op
                ),
                false
            ),
            0
        );
    }

    function _getTestAmount(address _asset) internal view returns (uint256) {
        uint256 decimals = IERC20(_asset).decimals();
        return 100 * (10 ** decimals);
    }
}
