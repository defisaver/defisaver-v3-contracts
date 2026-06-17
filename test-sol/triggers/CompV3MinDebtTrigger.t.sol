// SPDX-License-Identifier: MIT
pragma solidity =0.8.24;

import { CompV3MinDebtTrigger } from "../../contracts/triggers/CompV3MinDebtTrigger.sol";
import { IComet } from "../../contracts/interfaces/protocols/compoundV3/IComet.sol";
import { ChainlinkPriceLib } from "../../contracts/utils/ChainlinkPriceLib.sol";

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
    /// @dev totalDebtUSD is denominated in USD with 8 decimals, so 5000 USD == 5000e8.
    uint256 internal constant MIN_DEBT = 5000e8;

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
        bool expectTriggered = _targetDebtUsd * 1e8 >= MIN_DEBT;
        console.log("market:", _market);
        console.log("target debt USD:", _targetDebtUsd);
        console.log("actual debt USD (8 dec):", actualDebtUsd);

        // Sanity: the created position landed on the intended side of the threshold.
        assertEq(
            actualDebtUsd >= MIN_DEBT,
            expectTriggered,
            "position not created on the intended side of min debt"
        );

        assertEq(
            _isTriggered(_market, position, MIN_DEBT),
            actualDebtUsd >= MIN_DEBT,
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
