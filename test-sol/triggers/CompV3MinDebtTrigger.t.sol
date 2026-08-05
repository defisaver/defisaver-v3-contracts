// SPDX-License-Identifier: MIT
pragma solidity =0.8.24;

import { CompV3MinDebtTrigger } from "../../contracts/triggers/CompV3MinDebtTrigger.sol";
import { IComet } from "../../contracts/interfaces/protocols/compoundV3/IComet.sol";
import { PriceLib } from "../../contracts/utils/PriceLib.sol";

import { CompUser } from "../utils/compV3/CompUser.sol";
import { Addresses } from "../utils/helpers/MainnetAddresses.sol";
import { BaseTest } from "../utils/BaseTest.sol";
import { console } from "forge-std/console.sol";

contract TestCompV3MinDebtTrigger is BaseTest {
    using PriceLib for address;

    /*//////////////////////////////////////////////////////////////////////////
                                CONTRACT UNDER TEST
    //////////////////////////////////////////////////////////////////////////*/
    CompV3MinDebtTrigger cut;

    /*//////////////////////////////////////////////////////////////////////////
                                    CONSTANTS
    //////////////////////////////////////////////////////////////////////////*/
    /// @dev minDebt is denominated in whole USD (no decimals), so 5000 USD == 5000.
    uint256 internal constant MIN_DEBT = 5000;

    /// @dev totalDebtUSD is reported in USD with 8 decimals; scale MIN_DEBT by this to compare.
    uint256 internal constant PRECISION = 1e8;

    /// @dev Mainnet Comets
    address internal constant COMET_WETH = 0xA17581A9E3356d9A858b789D68B4d866e593aE94;
    address internal constant COMET_USDS = 0x5D409e56D886231aDAf00c8775665AD0f9897b56;
    address internal constant COMET_USDC = 0xc3d688B66703497DAA19211EEdff47f25384cdc3;
    address internal constant COMET_USDT = 0x3Afdc9BCA9213A35503b077a6072F3D0d5AB0840;
    address internal constant COMET_WBTC = 0xe85Dc543813B8c2CFEaAc371517b925a166a9293;
    address internal constant COMET_WSTETH = 0x3D0bb1ccaB520A66e607822fC55BC921738fAFE3;

    /*//////////////////////////////////////////////////////////////////////////
                                    VARIABLES
    //////////////////////////////////////////////////////////////////////////*/
    /// @dev CompV3 markets (Comets) of the selected network to run every case against.
    address[] internal markets;

    /*//////////////////////////////////////////////////////////////////////////
                                   SETUP FUNCTION
    //////////////////////////////////////////////////////////////////////////*/
    function setUp() public override {
        forkFromEnv("");

        cut = new CompV3MinDebtTrigger();

        markets = _getComets();

        if (markets.length == 0) {
            vm.skip(true, "No CompV3 Comets supported on the selected network");
        }
    }

    /*//////////////////////////////////////////////////////////////////////////
                                      TESTS
    //////////////////////////////////////////////////////////////////////////*/
    function test_should_trigger_when_debt_is_a_lot_over_min() public {
        _baseTestAllMarkets(50_000);
    }

    function test_should_trigger_when_debt_is_a_bit_over_min() public {
        _baseTestAllMarkets(5001);
    }

    function test_should_not_trigger_when_debt_is_a_bit_under_min() public {
        _baseTestAllMarkets(4999);
    }

    function test_should_not_trigger_when_user_has_no_debt() public {
        _baseTestAllMarkets(0);
    }

    /// @notice When the base token has no usable price (Chainlink returns 0), the trigger
    ///         should always return true, even if the user has no debt.
    function test_should_trigger_when_price_is_zero_even_with_no_debt() public {
        (address market, bool found) = _firstMarketWithPricedBaseToken();
        if (!found) {
            vm.skip(true, "No Comet with a Chainlink priced base token on the selected network");
        }

        address user = address(0xBEEF); // fresh address, no position -> 0 debt

        // Baseline: with a real price and no debt, the trigger must not fire.
        assertFalse(
            _isTriggered(market, user, MIN_DEBT), "no debt should not trigger with real price"
        );

        // Force the base token's USD price to 0 on every price source PriceLib uses.
        mockZeroTokenPrices();

        assertTrue(_isTriggered(market, user, MIN_DEBT), "zero price must return true");

        vm.clearMockedCalls();
    }

    function _baseTestAllMarkets(uint256 _targetDebtUsd) internal {
        for (uint256 i = 0; i < markets.length; ++i) {
            uint256 snapshotId = vm.snapshotState();
            _baseTest(markets[i], _targetDebtUsd);
            vm.revertToState(snapshotId);
        }
    }

    /*//////////////////////////////////////////////////////////////////////////
                                    BASE TEST
    //////////////////////////////////////////////////////////////////////////*/
    /// @notice Opens a fresh CompV3 position with ~`_targetDebtUsd` of debt on `_market`
    ///         and asserts the trigger fires iff the resulting debt is >= MIN_DEBT.
    /// @param _market CompV3 market (Comet) to open the position on.
    /// @param _targetDebtUsd Debt to create, in whole USD (0 == no borrow).
    function _baseTest(address _market, uint256 _targetDebtUsd) internal {
        IComet comet = IComet(_market);
        address baseToken = comet.baseToken();

        CompUser user = new CompUser();
        address position = user.proxyAddr();

        /// @dev The trigger short-circuits to true when the base token has no Chainlink price,
        ///      so for those markets that branch is all there is to assert.
        if (baseToken.getPriceInUSD() == 0) {
            console.log("SKIPPED debt math, base token has no chainlink price:", _market);
            assertTrue(_isTriggered(_market, position, MIN_DEBT), "unpriced base must return true");
            return;
        }

        if (_targetDebtUsd > 0) {
            address collateral = _collateralFor(_market);

            /// @dev Sizing the position needs a price for both sides, so a market without a usable
            ///      collateral asset or an unpriceable base token has to be skipped.
            if (collateral == address(0) || getTokenPriceInUSD(baseToken) == 0) {
                console.log("SKIPPED, no usable collateral or base price:", _market);
                return;
            }

            // Over-collateralize 3x so the borrow always goes through.
            uint256 collateralAmount = amountInUSDPrice(collateral, _targetDebtUsd * 3);
            gibTokens(position, collateral, collateralAmount);
            user.supply(false, _market, collateral, collateralAmount);

            uint256 borrowAmount = amountInUSDPrice(baseToken, _targetDebtUsd);
            user.borrow(false, _market, borrowAmount);
        }

        uint256 actualDebtUsd = _getDebtUsd(_market, position);
        uint256 minDebtScaled = MIN_DEBT * PRECISION;
        bool expectTriggered = _targetDebtUsd >= MIN_DEBT;
        console.log("market:", _market);
        console.log("target debt USD:", _targetDebtUsd);
        console.log("actual debt USD (8 dec):", actualDebtUsd);

        // Sanity: the created position landed on the intended side of the threshold.
        assertEq(
            actualDebtUsd >= minDebtScaled,
            expectTriggered,
            "position not created on the intended side of min debt"
        );

        assertEq(
            _isTriggered(_market, position, MIN_DEBT),
            actualDebtUsd >= minDebtScaled,
            "trigger must fire iff debt >= minDebt"
        );
    }

    /*//////////////////////////////////////////////////////////////////////////
                                     HELPERS
    //////////////////////////////////////////////////////////////////////////*/
    function _isTriggered(address _market, address _user, uint256 _minDebt)
        internal
        view
        returns (bool)
    {
        CompV3MinDebtTrigger.CalldataParams memory params = CompV3MinDebtTrigger.CalldataParams({
            user: _user, market: _market, minDebt: _minDebt
        });

        return cut.isTriggered(abi.encode(params), bytes(""));
    }

    /// @notice Comets DFS supports on the selected network.
    function _getComets() internal view returns (address[] memory comets) {
        if (isMainnetSelected()) {
            comets = new address[](6);
            comets[0] = COMET_WETH;
            comets[1] = COMET_USDS;
            comets[2] = COMET_USDC;
            comets[3] = COMET_USDT;
            comets[4] = COMET_WBTC;
            comets[5] = COMET_WSTETH;
        } else if (isBaseSelected()) {
            comets = new address[](2);
            comets[0] = 0x46e6b214b524310239732D51387075E0e70970bf; // WETH
            comets[1] = 0xb125E6687d4313864e53df431d5425969c15Eb2F; // USDC
        } else if (isArbitrumSelected()) {
            comets = new address[](2);
            comets[0] = 0x9c4ec768c28520B50860ea7a15bd7213a9fF58bf; // USDC, native
            comets[1] = 0xA5EDBDD9646f8dFF606d7448e414884C7d905dCA; // USDC.e, bridged
        } else if (isOptimismSelected()) {
            comets = new address[](1);
            comets[0] = 0x2e44e174f7D53F0212823acC11C01A11d58c5bCB; // USDC
        }
        // Linea and Plasma have no CompV3 deployment, so the list stays empty there.
    }

    /// @dev Picks a collateral asset the Comet actually accepts and that can be priced.
    ///      WETH and USDC are preferred so mainnet keeps using the same assets as before; a Comet
    ///      never accepts its own base token, which is why WETH falls through to USDC on the WETH
    ///      Comet. Returns address(0) when nothing usable is listed, so the caller can skip.
    function _collateralFor(address _market) internal returns (address) {
        IComet comet = IComet(_market);
        uint8 numAssets = comet.numAssets();

        address[2] memory preferred = [Addresses.WETH_ADDR, Addresses.USDC_ADDR];
        for (uint256 p = 0; p < preferred.length; ++p) {
            for (uint8 i = 0; i < numAssets; ++i) {
                address asset = comet.getAssetInfo(i).asset;
                if (asset == preferred[p] && getTokenPriceInUSD(asset) != 0) return asset;
            }
        }

        // No preferred asset listed on this Comet, fall back to any collateral we can price.
        for (uint8 i = 0; i < numAssets; ++i) {
            address asset = comet.getAssetInfo(i).asset;
            if (getTokenPriceInUSD(asset) != 0) return asset;
        }

        return address(0);
    }

    /// @dev First Comet whose base token the trigger can actually price, if any.
    function _firstMarketWithPricedBaseToken() internal view returns (address market, bool found) {
        for (uint256 i = 0; i < markets.length; ++i) {
            if (IComet(markets[i]).baseToken().getPriceInUSD() != 0) {
                return (markets[i], true);
            }
        }
    }

    /// @dev Mirrors the trigger's debt math: debt(base) * basePrice(8dec) / baseScale -> USD (8dec).
    function _getDebtUsd(address _market, address _user) internal view returns (uint256) {
        IComet comet = IComet(_market);
        uint256 totalDebt = comet.borrowBalanceOf(_user);
        return totalDebt * comet.baseToken().getPriceInUSD() / comet.baseScale();
    }
}
