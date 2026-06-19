// SPDX-License-Identifier: MIT
pragma solidity =0.8.24;

import { CompV3MinDebtTrigger } from "../../contracts/triggers/CompV3MinDebtTrigger.sol";
import { IComet } from "../../contracts/interfaces/protocols/compoundV3/IComet.sol";
import { ChainlinkPriceLib } from "../../contracts/utils/ChainlinkPriceLib.sol";
import { IFeedRegistry } from "../../contracts/interfaces/protocols/chainlink/IFeedRegistry.sol";

import { CompUser } from "../utils/compV3/CompUser.sol";
import { Addresses } from "../utils/helpers/MainnetAddresses.sol";
import { BaseTest } from "../utils/BaseTest.sol";
import { console } from "forge-std/console.sol";

contract TestCompV3MinDebtTrigger is BaseTest {
    using ChainlinkPriceLib for address;

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

    /// @dev Chainlink Feed Registry on mainnet, used by ChainlinkPriceLib for USD prices.
    address internal constant CHAINLINK_FEED_REGISTRY = 0x47Fb2585D2C56Fe188D0E6ec628a38b74fCeeeDf;

    /// @dev CompV3 markets (Comets) to run every case against.
    address[6] internal markets = [
        Addresses.COMET_WETH,
        Addresses.COMET_USDS,
        Addresses.COMET_USDC,
        Addresses.COMET_USDT,
        Addresses.COMET_WBTC,
        Addresses.COMET_WSTETH
    ];

    /*//////////////////////////////////////////////////////////////////////////
                                   SETUP FUNCTION
    //////////////////////////////////////////////////////////////////////////*/
    function setUp() public override {
        forkFromEnv("");

        if (isL2NetworkSelected()) vm.skip(true, "CompV3MinDebtTrigger test is mainnet only");

        cut = new CompV3MinDebtTrigger();
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
        address market = Addresses.COMET_USDC;
        address user = address(0xBEEF); // fresh address, no position -> 0 debt

        // Baseline: with a real price and no debt, the trigger must not fire.
        assertFalse(
            _isTriggered(market, user, MIN_DEBT), "no debt should not trigger with real price"
        );

        // Force the base token's USD price to 0 for all Chainlink registry lookups.
        vm.mockCall(
            CHAINLINK_FEED_REGISTRY,
            abi.encodeWithSelector(IFeedRegistry.latestRoundData.selector),
            abi.encode(uint80(0), int256(0), uint256(0), uint256(0), uint80(0))
        );

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
        CompUser user = new CompUser();
        address position = user.proxyAddr();

        if (_targetDebtUsd > 0) {
            IComet comet = IComet(_market);
            address collateral = _collateralFor(_market);

            // Over-collateralize 3x so the borrow always goes through.
            uint256 collateralAmount = amountInUSDPrice(collateral, _targetDebtUsd * 3);
            gibTokens(position, collateral, collateralAmount);
            user.supply(false, _market, collateral, collateralAmount);

            uint256 borrowAmount = amountInUSDPrice(comet.baseToken(), _targetDebtUsd);
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

    /// @dev WETH is not an accepted collateral on COMET_WETH COMET_WBTC,
    ///      so use USDC there; WETH works as collateral on every other market.
    function _collateralFor(address _market) internal pure returns (address) {
        if (_market == Addresses.COMET_WETH || _market == Addresses.COMET_WBTC) {
            return Addresses.USDC_ADDR;
        }
        return Addresses.WETH_ADDR;
    }

    /// @dev Mirrors the trigger's debt math: debt(base) * basePrice(8dec) / baseScale -> USD (8dec).
    function _getDebtUsd(address _market, address _user) internal view returns (uint256) {
        IComet comet = IComet(_market);
        uint256 totalDebt = comet.borrowBalanceOf(_user);
        return totalDebt * comet.baseToken().getPriceInUSD() / comet.baseScale();
    }
}
