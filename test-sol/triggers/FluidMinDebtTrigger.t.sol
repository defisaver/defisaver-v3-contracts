// SPDX-License-Identifier: MIT
pragma solidity =0.8.24;

import { FluidMinDebtTrigger } from "../../contracts/triggers/FluidMinDebtTrigger.sol";
import { FluidVaultT1Open } from "../../contracts/actions/fluid/vaultT1/FluidVaultT1Open.sol";
import {
    IFluidVaultResolver
} from "../../contracts/interfaces/protocols/fluid/resolvers/IFluidVaultResolver.sol";
import { PriceLib } from "../../contracts/utils/PriceLib.sol";
import { IERC20 } from "../../contracts/interfaces/token/IERC20.sol";
import { IFluidVaultT1 } from "../../contracts/interfaces/protocols/fluid/vaults/IFluidVaultT1.sol";
import { TokenUtils } from "../../contracts/utils/token/TokenUtils.sol";

import { FluidTestBase } from "../actions/fluid/FluidTestBase.t.sol";
import { SmartWallet } from "../utils/SmartWallet.sol";
import { console } from "forge-std/console.sol";

contract TestFluidMinDebtTrigger is FluidTestBase {
    using PriceLib for address;

    /*//////////////////////////////////////////////////////////////////////////
                                CONTRACT UNDER TEST
    //////////////////////////////////////////////////////////////////////////*/
    FluidMinDebtTrigger cut;

    /*//////////////////////////////////////////////////////////////////////////
                                    VARIABLES
    //////////////////////////////////////////////////////////////////////////*/
    FluidVaultT1Open openAction;
    SmartWallet wallet;
    address[] vaults;

    /*//////////////////////////////////////////////////////////////////////////
                                    CONSTANTS
    //////////////////////////////////////////////////////////////////////////*/
    /// @dev minDebt is denominated in whole USD (no decimals), so 5000 USD == 5000.
    uint256 internal constant MIN_DEBT = 5000;

    /// @dev getPriceInUSD returns prices with 8 decimals; scale MIN_DEBT by this to compare.
    uint256 internal constant PRECISION = 1e8;

    /*//////////////////////////////////////////////////////////////////////////
                                   SETUP FUNCTION
    //////////////////////////////////////////////////////////////////////////*/
    function setUp() public override {
        forkFromEnv("FluidMinDebtTrigger");

        cut = new FluidMinDebtTrigger();
        openAction = new FluidVaultT1Open();
        wallet = new SmartWallet(bob);

        vaults = getT1Vaults();

        /// @dev getT1Vaults() always returns 8 entries, padded with FLUID_VAULT_NOT_FOUND on
        ///      chains where a vault does not exist, so emptiness has to be read from the contents.
        bool anyVaultOnThisChain;
        for (uint256 i = 0; i < vaults.length; ++i) {
            if (!isMissingVault(vaults[i])) {
                anyVaultOnThisChain = true;
                break;
            }
        }

        if (!anyVaultOnThisChain) {
            vm.skip(true, "No Fluid T1 vaults on the selected network");
        }
    }

    /*//////////////////////////////////////////////////////////////////////////
                                      TESTS
    //////////////////////////////////////////////////////////////////////////*/
    function test_should_trigger_when_debt_is_a_lot_over_min() public {
        _baseTestAllVaults(50_000);
    }

    function test_should_trigger_when_debt_is_a_bit_over_min() public {
        _baseTestAllVaults(5001);
    }

    function test_should_not_trigger_when_debt_is_a_bit_under_min() public {
        _baseTestAllVaults(4999);
    }

    function test_should_not_trigger_when_user_has_no_debt() public {
        _baseTestAllVaults(0);
    }

    /// @notice When the debt token has no usable price (Chainlink returns 0), the trigger
    ///         should always return true, even if the user has no debt.
    function test_should_trigger_when_price_is_zero_even_with_no_debt() public {
        // Open a supply-only (zero debt) position on the first usable vault.
        (address vault, bool found) = _firstUsableVault();
        if (!found) {
            vm.skip(true, "No usable Fluid T1 vault on the selected network");
        }
        uint256 nftId = executeFluidVaultT1Open(vault, 30_000, 0, wallet, address(openAction));
        assertFalse(nftId == 0, "failed to open fluid position");

        // Baseline: with a real price and no debt, the trigger must not fire.
        assertFalse(_isTriggered(nftId, MIN_DEBT), "no debt should not trigger with real price");

        // Force the debt token's USD price to 0 on every price source PriceLib uses.
        mockZeroTokenPrices();

        assertTrue(_isTriggered(nftId, MIN_DEBT), "zero price must return true");

        vm.clearMockedCalls();
    }

    /*//////////////////////////////////////////////////////////////////////////
                                    BASE TEST
    //////////////////////////////////////////////////////////////////////////*/
    function _baseTestAllVaults(uint256 _targetDebtUsd) internal {
        for (uint256 i = 0; i < vaults.length; ++i) {
            if (isMissingVault(vaults[i])) {
                logVaultNotFound(vaults[i]);
                continue;
            }
            /// @dev Opening the position sizes both legs in USD, so a vault holding a token we
            ///      cannot price has to be skipped.
            if (!_isVaultPriced(vaults[i])) {
                console.log("SKIPPED, vault has no usable prices:", vaults[i]);
                continue;
            }
            uint256 snapshotId = vm.snapshotState();
            _baseTest(vaults[i], _targetDebtUsd);
            vm.revertToState(snapshotId);
        }
    }

    /// @notice Opens a fresh T1 position with ~`_targetDebtUsd` of debt on `_vault`
    ///         and asserts the trigger fires iff the resulting debt is >= MIN_DEBT.
    /// @param _vault Fluid T1 vault to open the position on.
    /// @param _targetDebtUsd Debt to create, in whole USD (0 == supply-only position).
    function _baseTest(address _vault, uint256 _targetDebtUsd) internal {
        (, address debtToken) = _vaultTokens(_vault);

        /// @dev The trigger short-circuits to true when the debt token has no Chainlink price, so
        ///      for those vaults that branch is all there is to assert. Opened supply-only, since
        ///      the borrow leg cannot be sized without a price.
        if (debtToken.getPriceInUSD() == 0) {
            console.log("SKIPPED debt math, debt token has no chainlink price:", _vault);
            uint256 supplyOnlyNftId =
                executeFluidVaultT1Open(_vault, 30_000, 0, wallet, address(openAction));
            assertFalse(supplyOnlyNftId == 0, "failed to open fluid position");
            assertTrue(
                _isTriggered(supplyOnlyNftId, MIN_DEBT), "unpriced debt token must return true"
            );
            return;
        }

        // Over-collateralize 3x so the borrow always goes through. Supply-only when no debt.
        uint256 collUsd = _targetDebtUsd == 0 ? 30_000 : _targetDebtUsd * 3;
        uint256 nftId =
            executeFluidVaultT1Open(_vault, collUsd, _targetDebtUsd, wallet, address(openAction));
        assertFalse(nftId == 0, "failed to open fluid position");

        uint256 actualDebtUsd = _getDebtUsd(nftId);
        uint256 minDebtScaled = MIN_DEBT * PRECISION;
        bool expectTriggered = _targetDebtUsd >= MIN_DEBT;
        console.log("vault:", _vault);
        console.log("target debt USD:", _targetDebtUsd);
        console.log("actual debt USD (8 dec):", actualDebtUsd);

        // Sanity: the created position landed on the intended side of the threshold.
        assertEq(
            actualDebtUsd >= minDebtScaled,
            expectTriggered,
            "position not created on the intended side of min debt"
        );

        assertEq(
            _isTriggered(nftId, MIN_DEBT),
            actualDebtUsd >= minDebtScaled,
            "trigger must fire iff debt >= minDebt"
        );
    }

    /*//////////////////////////////////////////////////////////////////////////
                                     HELPERS
    //////////////////////////////////////////////////////////////////////////*/
    function _isTriggered(uint256 _nftId, uint256 _minDebt) internal view returns (bool) {
        FluidMinDebtTrigger.CallDataParams memory params =
            FluidMinDebtTrigger.CallDataParams({ nftId: _nftId, minDebt: _minDebt });

        return cut.isTriggered(abi.encode(params), bytes(""));
    }

    /// @dev First vault that exists on this chain, can be sized, and whose debt token the trigger
    ///      can price. The last part matters because the zero price test needs a real price as its
    ///      baseline before mocking the feed to 0.
    function _firstUsableVault() internal returns (address vault, bool found) {
        for (uint256 i = 0; i < vaults.length; ++i) {
            if (isMissingVault(vaults[i])) continue;
            if (!_isVaultPriced(vaults[i])) continue;

            (, address debtToken) = _vaultTokens(vaults[i]);
            if (debtToken.getPriceInUSD() != 0) return (vaults[i], true);
        }
    }

    /// @dev Vault tokens as executeFluidVaultT1Open sizes them, so native ETH is read as WETH.
    function _vaultTokens(address _vault)
        internal
        view
        returns (address supplyToken, address debtToken)
    {
        IFluidVaultT1.ConstantViews memory constants = IFluidVaultT1(_vault).constantsView();

        supplyToken = constants.supplyToken == TokenUtils.ETH_ADDR
            ? TokenUtils.WETH_ADDR
            : constants.supplyToken;
        debtToken = constants.borrowToken == TokenUtils.ETH_ADDR
            ? TokenUtils.WETH_ADDR
            : constants.borrowToken;
    }

    /// @dev Both legs need a price for amountInUSDPrice to be able to size the position.
    function _isVaultPriced(address _vault) internal returns (bool) {
        (address supplyToken, address debtToken) = _vaultTokens(_vault);
        return getTokenPriceInUSD(supplyToken) != 0 && getTokenPriceInUSD(debtToken) != 0;
    }

    /// @dev Mirrors the trigger's debt math: borrow * price(8dec) / scale -> USD (8dec).
    function _getDebtUsd(uint256 _nftId) internal view returns (uint256) {
        (
            IFluidVaultResolver.UserPosition memory userPosition,
            IFluidVaultResolver.VaultEntireData memory vaultData
        ) = IFluidVaultResolver(FLUID_VAULT_RESOLVER).positionByNftId(_nftId);

        address debtToken = vaultData.constantVariables.borrowToken.token0;
        uint256 scale = debtToken == NATIVE_TOKEN_ADDR ? 1e18 : 10 ** IERC20(debtToken).decimals();

        return userPosition.borrow * debtToken.getPriceInUSD() / scale;
    }
}
