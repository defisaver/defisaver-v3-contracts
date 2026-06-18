// SPDX-License-Identifier: MIT
pragma solidity =0.8.24;

import { MorphoBlueMinDebtTrigger } from "../../contracts/triggers/MorphoBlueMinDebtTrigger.sol";
import {
    IMorphoBlue,
    MarketParams
} from "../../contracts/interfaces/protocols/morpho-blue/IMorphoBlue.sol";
import {
    MarketParamsLib,
    MorphoBalancesLib
} from "../../contracts/actions/morpho-blue/helpers/MorphoBlueLib.sol";
import { ChainlinkPriceLib } from "../../contracts/utils/ChainlinkPriceLib.sol";
import { IERC20 } from "../../contracts/interfaces/token/IERC20.sol";

import { BaseTest } from "../utils/BaseTest.sol";
import { console } from "forge-std/console.sol";

contract TestMorphoBlueMinDebtTrigger is BaseTest {
    using ChainlinkPriceLib for address;
    using MarketParamsLib for MarketParams;

    /*//////////////////////////////////////////////////////////////////////////
                                CONTRACT UNDER TEST
    //////////////////////////////////////////////////////////////////////////*/
    MorphoBlueMinDebtTrigger cut;

    /*//////////////////////////////////////////////////////////////////////////
                                    CONSTANTS
    //////////////////////////////////////////////////////////////////////////*/
    IMorphoBlue internal constant morphoBlue =
        IMorphoBlue(0xBBBBBbbBBb9cC5e90e3b3Af64bdAF62C37EEFFCb);

    /// @dev minDebt is denominated in USD with 8 decimals, so 5000 USD == 5000e8.
    uint256 internal constant MIN_DEBT = 5000e8;

    /// @dev EOA that owns the MorphoBlue position we run the trigger against.
    address internal constant USER = address(0xdeAD);

    /// @dev MorphoBlue markets to run every case against, keyed by their params.
    MarketParams[] internal markets;

    /*//////////////////////////////////////////////////////////////////////////
                                   SETUP FUNCTION
    //////////////////////////////////////////////////////////////////////////*/
    function setUp() public override {
        forkFromEnv("");

        if (isL2NetworkSelected()) vm.skip(true, "MorphoBlueMinDebtTrigger test is mainnet only");

        cut = new MorphoBlueMinDebtTrigger();

        // wstETH/WETH market
        markets.push(
            MarketParams({
                loanToken: 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2,
                collateralToken: 0x7f39C581F595B53c5cb19bD0b3f8dA6c935E2Ca0,
                oracle: 0xbD60A6770b27E084E8617335ddE769241B0e71D8,
                irm: 0x870aC11D48B15DB9a138Cf899d20F13F79Ba00BC,
                lltv: 965_000_000_000_000_000
            })
        );
        // wstETH/USDC market
        markets.push(
            MarketParams({
                loanToken: 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48,
                collateralToken: 0x7f39C581F595B53c5cb19bD0b3f8dA6c935E2Ca0,
                oracle: 0x48F7E36EB6B826B2dF4B2E630B62Cd25e89E40e2,
                irm: 0x870aC11D48B15DB9a138Cf899d20F13F79Ba00BC,
                lltv: 860_000_000_000_000_000
            })
        );
        // WBTC/USDC market
        markets.push(
            MarketParams({
                loanToken: 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48,
                collateralToken: 0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599,
                oracle: 0xDddd770BADd886dF3864029e4B377B5F6a2B6b83,
                irm: 0x870aC11D48B15DB9a138Cf899d20F13F79Ba00BC,
                lltv: 860_000_000_000_000_000
            })
        );
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
    /// @notice Opens a fresh MorphoBlue position with ~`_targetDebtUsd` of debt on `_market`
    ///         and asserts the trigger fires iff the resulting debt is >= MIN_DEBT.
    /// @param _market MorphoBlue market params to open the position on.
    /// @param _targetDebtUsd Debt to create, in whole USD (0 == no borrow).
    function _baseTest(MarketParams memory _market, uint256 _targetDebtUsd) internal {
        if (_targetDebtUsd > 0) {
            _openPosition(_market, _targetDebtUsd);
        }

        uint256 actualDebtUsd = _getDebtUsd(_market, USER);
        bool expectTriggered = _targetDebtUsd * 1e8 >= MIN_DEBT;
        console.log("loan token:", _market.loanToken);
        console.log("target debt USD:", _targetDebtUsd);
        console.log("actual debt USD (8 dec):", actualDebtUsd);

        // Sanity: the created position landed on the intended side of the threshold.
        assertEq(
            actualDebtUsd >= MIN_DEBT,
            expectTriggered,
            "position not created on the intended side of min debt"
        );

        assertEq(
            _isTriggered(_market, USER, MIN_DEBT),
            actualDebtUsd >= MIN_DEBT,
            "trigger must fire iff debt >= minDebt"
        );
    }

    /// @dev Seeds the market with loan liquidity, then opens an over-collateralized
    ///      borrow of ~`_targetDebtUsd` for USER directly on the MorphoBlue singleton.
    function _openPosition(MarketParams memory _market, uint256 _targetDebtUsd) internal {
        // Supply loan token liquidity so the borrow always has something to draw from.
        uint256 supplyAmount = amountInUSDPrice(_market.loanToken, _targetDebtUsd * 2);
        gibTokens(address(this), _market.loanToken, supplyAmount);
        approve(_market.loanToken, address(morphoBlue), supplyAmount);
        morphoBlue.supply(_market, supplyAmount, 0, address(this), "");

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
}
