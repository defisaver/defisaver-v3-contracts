// SPDX-License-Identifier: MIT
pragma solidity =0.8.24;

import { MorphoBlueMinDebtTrigger } from "../../contracts/triggers/MorphoBlueMinDebtTrigger.sol";
import { MarketParams } from "../../contracts/interfaces/protocols/morpho-blue/IMorphoBlue.sol";
import {
    MarketParamsLib,
    MorphoBalancesLib
} from "../../contracts/actions/morpho-blue/helpers/MorphoBlueLib.sol";
import { PriceLib } from "../../contracts/utils/PriceLib.sol";
import { IERC20 } from "../../contracts/interfaces/token/IERC20.sol";

import { BaseTest } from "../utils/BaseTest.sol";
import { MorphoBlueTestHelper } from "../utils/morphoBlue/MorphoBlueTestHelper.sol";
import { console } from "forge-std/console.sol";

contract TestMorphoBlueMinDebtTrigger is BaseTest, MorphoBlueTestHelper {
    using PriceLib for address;
    using MarketParamsLib for MarketParams;

    /*//////////////////////////////////////////////////////////////////////////
                                CONTRACT UNDER TEST
    //////////////////////////////////////////////////////////////////////////*/
    MorphoBlueMinDebtTrigger cut;

    /*//////////////////////////////////////////////////////////////////////////
                                    CONSTANTS
    //////////////////////////////////////////////////////////////////////////*/
    /// @dev minDebt is denominated in whole USD (no decimals), so 5000 USD == 5000.
    uint256 internal constant MIN_DEBT = 5000;

    /// @dev totalDebtUSD is reported in USD with 8 decimals; scale MIN_DEBT by this to compare.
    uint256 internal constant PRECISION = 1e8;

    /// @dev EOA that owns the MorphoBlue position we run the trigger against.
    address internal constant USER = address(0xdeAD);

    /*//////////////////////////////////////////////////////////////////////////
                                    VARIABLES
    //////////////////////////////////////////////////////////////////////////*/
    /// @dev MorphoBlue markets of the selected network to run every case against.
    MarketParams[] internal markets;

    /*//////////////////////////////////////////////////////////////////////////
                                   SETUP FUNCTION
    //////////////////////////////////////////////////////////////////////////*/
    function setUp() public override {
        forkFromEnv("");

        cut = new MorphoBlueMinDebtTrigger();

        /// @dev pass true to run every market DFS supports on the selected network.
        MarketParams[] memory selectedMarkets = getMarkets();
        for (uint256 i = 0; i < selectedMarkets.length; ++i) {
            markets.push(selectedMarkets[i]);
        }

        if (markets.length == 0) {
            vm.skip(true, "No MorphoBlue markets supported on the selected network");
        }
    }

    /*//////////////////////////////////////////////////////////////////////////
                                      TESTS
    //////////////////////////////////////////////////////////////////////////*/
    function test_should_trigger_when_debt_is_a_lot_over_min() public {
        _baseTestAllMarkets(111_111);
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

    /// @notice When the loan token has no usable price (Chainlink returns 0), the trigger
    ///         should always return true, even if the user has no debt.
    function test_should_trigger_when_price_is_zero_even_with_no_debt() public {
        (MarketParams memory market, bool found) = _firstMarketWithPricedLoanToken();
        if (!found) {
            vm.skip(true, "No market with a Chainlink priced loan token on the selected network");
        }

        address user = address(0xBEEF); // fresh address, no position -> 0 debt

        // Baseline: with a real price and no debt, the trigger must not fire.
        assertFalse(
            _isTriggered(market, user, MIN_DEBT), "no debt should not trigger with real price"
        );

        // Force the loan token's USD price to 0 on every price source PriceLib uses.
        mockZeroTokenPrices();

        assertTrue(_isTriggered(market, user, MIN_DEBT), "zero price must return true");

        vm.clearMockedCalls();
    }

    function _baseTestAllMarkets(uint256 _targetDebtUsd) internal {
        for (uint256 i = 0; i < markets.length; ++i) {
            MarketParams memory market = markets[i];

            console.log("--- market index:", i);
            console.log("collateral / loan token:", market.collateralToken, market.loanToken);

            /// @dev Without a price for both tokens we can't size the position, so skip the market.
            if (!_isMarketPriced(market)) {
                console.log("SKIPPED, market has no usable prices");
                continue;
            }

            uint256 snapshotId = vm.snapshotState();
            _baseTest(market, _targetDebtUsd);
            vm.revertToState(snapshotId);
        }
    }

    /*//////////////////////////////////////////////////////////////////////////
                                    BASE TEST
    //////////////////////////////////////////////////////////////////////////*/
    /// @notice Opens a fresh MorphoBlue position with ~`_targetDebtUsd` of debt on `_market`
    ///         and asserts the trigger fires iff the resulting debt is >= MIN_DEBT.
    /// @param _market MorphoBlue market params to open the position on.
    /// @param _targetDebtUsd Debt to create, in whole USD (0 == no borrow).
    function _baseTest(MarketParams memory _market, uint256 _targetDebtUsd) internal {
        /// @dev The trigger short-circuits to true when the loan token has no Chainlink price,
        ///      so for those markets that branch is all there is to assert.
        if (_market.loanToken.getPriceInUSD() == 0) {
            console.log("SKIPPED debt math, loan token has no chainlink price");
            assertTrue(
                _isTriggered(_market, USER, MIN_DEBT), "unpriced loan token must return true"
            );
            return;
        }

        if (_targetDebtUsd > 0) {
            _openPosition(_market, _targetDebtUsd);
        }

        uint256 actualDebtUsd = _getDebtUsd(_market, USER);
        uint256 minDebtScaled = MIN_DEBT * PRECISION;
        bool expectTriggered = _targetDebtUsd >= MIN_DEBT;
        console.log("target debt USD:", _targetDebtUsd);
        console.log("actual debt USD (8 dec):", actualDebtUsd);

        // Sanity: the created position landed on the intended side of the threshold.
        assertEq(
            actualDebtUsd >= minDebtScaled,
            expectTriggered,
            "position not created on the intended side of min debt"
        );

        assertEq(
            _isTriggered(_market, USER, MIN_DEBT),
            actualDebtUsd >= minDebtScaled,
            "trigger must fire iff debt >= minDebt"
        );
    }

    /// @dev Seeds the market with loan liquidity, then opens an over-collateralized
    ///      borrow of ~`_targetDebtUsd` for USER directly on the MorphoBlue singleton.
    function _openPosition(MarketParams memory _market, uint256 _targetDebtUsd) internal {
        // Supply loan token liquidity so the borrow always has something to draw from.
        supplyMarketLiquidity(_market, _targetDebtUsd * 2);

        // Over-collateralize 3x so the borrow always goes through.
        uint256 collateralAmount = amountInUSDPrice(_market.collateralToken, _targetDebtUsd * 3);
        gibTokens(USER, _market.collateralToken, collateralAmount);
        uint256 borrowAmount = amountInUSDPrice(_market.loanToken, _targetDebtUsd);

        startPrank(USER);
        approve(_market.collateralToken, address(morphoBlue), collateralAmount);
        morphoBlue.supplyCollateral(_market, collateralAmount, USER, "");
        morphoBlue.borrow(_market, borrowAmount, 0, USER, USER);
        stopPrank();
    }

    /*//////////////////////////////////////////////////////////////////////////
                                     HELPERS
    //////////////////////////////////////////////////////////////////////////*/
    function _isTriggered(MarketParams memory _market, address _user, uint256 _minDebt)
        internal
        view
        returns (bool)
    {
        MorphoBlueMinDebtTrigger.CalldataParams memory params =
            MorphoBlueMinDebtTrigger.CalldataParams({
                user: _user, marketId: _market.id(), minDebt: _minDebt
            });

        return cut.isTriggered(abi.encode(params), bytes(""));
    }

    /// @dev Mirrors the trigger's debt math: debt(loan) * loanPrice(8dec) / 10**loanDecimals -> USD (8dec).
    function _getDebtUsd(MarketParams memory _market, address _user)
        internal
        view
        returns (uint256)
    {
        uint256 totalDebt = MorphoBalancesLib.expectedBorrowAssets(morphoBlue, _market, _user);
        uint256 loanTokenPrice = _market.loanToken.getPriceInUSD();
        return totalDebt * loanTokenPrice / (10 ** IERC20(_market.loanToken).decimals());
    }

    /// @dev Both tokens need a price for amountInUSDPrice to be able to size the position.
    function _isMarketPriced(MarketParams memory _market) internal returns (bool) {
        return getTokenPriceInUSD(_market.loanToken) != 0
            && getTokenPriceInUSD(_market.collateralToken) != 0;
    }

    /// @dev First market whose loan token the trigger can actually price, if any.
    function _firstMarketWithPricedLoanToken()
        internal
        view
        returns (MarketParams memory market, bool found)
    {
        for (uint256 i = 0; i < markets.length; ++i) {
            if (markets[i].loanToken.getPriceInUSD() != 0) {
                return (markets[i], true);
            }
        }
    }
}
