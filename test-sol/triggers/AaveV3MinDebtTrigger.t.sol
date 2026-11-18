// SPDX-License-Identifier: MIT
pragma solidity =0.8.24;

import { AaveV3MinDebtTrigger } from "../../contracts/triggers-additional/AaveV3MinDebtTrigger.sol";
import { IPoolV3 } from "../../contracts/interfaces/protocols/aaveV3/IPoolV3.sol";
import {
    IPoolAddressesProvider
} from "../../contracts/interfaces/protocols/aaveV3/IPoolAddressesProvider.sol";
import {
    IPriceOracleGetter
} from "../../contracts/interfaces/protocols/aaveV3/IPriceOracleGetter.sol";
import { IERC20 } from "../../contracts/interfaces/token/IERC20.sol";

import { Test } from "forge-std/Test.sol";

contract TestAaveV3MinDebtTrigger is Test {
    /*//////////////////////////////////////////////////////////////////////////
                                CONTRACT UNDER TEST
    //////////////////////////////////////////////////////////////////////////*/
    AaveV3MinDebtTrigger internal cut;

    /*//////////////////////////////////////////////////////////////////////////
                                    CONSTANTS
    //////////////////////////////////////////////////////////////////////////*/
    address internal constant MARKET = address(0x1000);
    address internal constant POOL = address(0x2000);
    address internal constant USER = address(0x3000);
    address internal constant ORACLE = address(0x4000);
    address internal constant ASSET = address(0x5000);
    address internal constant DEBT_TOKEN = address(0x6000);

    /*//////////////////////////////////////////////////////////////////////////
                                   SETUP FUNCTION
    //////////////////////////////////////////////////////////////////////////*/
    function setUp() public {
        cut = new AaveV3MinDebtTrigger();

        vm.mockCall(MARKET, abi.encodeCall(IPoolAddressesProvider.getPool, ()), abi.encode(POOL));
        vm.mockCall(
            MARKET, abi.encodeCall(IPoolAddressesProvider.getPriceOracle, ()), abi.encode(ORACLE)
        );
        vm.mockCall(
            POOL, abi.encodeWithSelector(IPoolV3.getReserveAddressById.selector), abi.encode(ASSET)
        );
        vm.mockCall(
            POOL,
            abi.encodeWithSelector(IPoolV3.getReserveVariableDebtToken.selector),
            abi.encode(DEBT_TOKEN)
        );
        vm.mockCall(
            DEBT_TOKEN, abi.encodeCall(IERC20.balanceOf, (USER)), abi.encode(uint256(5000e18))
        );
        vm.mockCall(
            ORACLE, abi.encodeCall(IPriceOracleGetter.getAssetPrice, (ASSET)), abi.encode(1e8)
        );
        vm.mockCall(ASSET, abi.encodeCall(IERC20.decimals, ()), abi.encode(uint8(18)));
    }

    /*//////////////////////////////////////////////////////////////////////////
                                      TESTS
    //////////////////////////////////////////////////////////////////////////*/
    function test_fetches_pool_and_user_configuration_once() public {
        mockUserConfiguration(9);

        vm.expectCall(MARKET, abi.encodeCall(IPoolAddressesProvider.getPool, ()), 1);
        vm.expectCall(POOL, abi.encodeCall(IPoolV3.getUserConfiguration, (USER)), 1);

        assertTrue(isTriggered(5000));
    }

    function testFuzz_same_asset_position_does_not_trigger(uint8 _reserveId) public {
        uint256 configuration = uint256(3) << (uint256(_reserveId % 128) * 2);
        mockUserConfiguration(configuration);

        assertFalse(isTriggered(5000));
        assertFalse(isTriggered(0));
    }

    function test_different_assets_respect_minimum_debt() public {
        // Borrow reserve 0, collateral reserve 1.
        mockUserConfiguration(9);

        assertTrue(isTriggered(5000));
        assertFalse(isTriggered(5001));
    }

    function test_additional_collateral_allows_trigger() public {
        mockUserConfiguration(11);

        assertTrue(isTriggered(5000));
    }

    function test_additional_debt_is_included() public {
        mockUserConfiguration(7);

        assertTrue(isTriggered(10_000));
        assertFalse(isTriggered(10_001));
    }

    function test_empty_position_preserves_minimum_debt_behavior() public {
        mockUserConfiguration(0);

        assertTrue(isTriggered(0));
        assertFalse(isTriggered(1));
    }

    function test_parse_call_inputs_decodes_params() public view {
        AaveV3MinDebtTrigger.CalldataParams memory expected =
            AaveV3MinDebtTrigger.CalldataParams({ user: USER, market: MARKET, minDebt: 5000 });

        AaveV3MinDebtTrigger.CalldataParams memory decoded =
            cut.parseCallInputs(abi.encode(expected));

        assertEq(decoded.user, expected.user);
        assertEq(decoded.market, expected.market);
        assertEq(decoded.minDebt, expected.minDebt);
    }

    function test_not_changeable() public view {
        assertFalse(cut.isChangeable());
        assertEq(cut.changedSubData(""), bytes(""));
    }

    /*//////////////////////////////////////////////////////////////////////////
                                     HELPERS
    //////////////////////////////////////////////////////////////////////////*/
    function isTriggered(uint256 _minDebt) internal view returns (bool) {
        AaveV3MinDebtTrigger.CalldataParams memory params =
            AaveV3MinDebtTrigger.CalldataParams({ user: USER, market: MARKET, minDebt: _minDebt });

        return cut.isTriggered(abi.encode(params), bytes(""));
    }

    function mockUserConfiguration(uint256 _configuration) internal {
        vm.mockCall(
            POOL, abi.encodeCall(IPoolV3.getUserConfiguration, (USER)), abi.encode(_configuration)
        );
    }
}
