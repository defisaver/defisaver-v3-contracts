// SPDX-License-Identifier: MIT
pragma solidity =0.8.24;

import { Test } from "forge-std/Test.sol";
import { AaveV3MinDebtTrigger } from "../../contracts/triggers-additional/AaveV3MinDebtTrigger.sol";

contract AaveV3MinDebtPositionUnitTest is Test {
    AaveV3MinDebtTrigger internal trigger;
    address internal constant MARKET = address(0x1000);
    address internal constant POOL = address(0x2000);
    address internal constant USER = address(0x3000);
    address internal constant ORACLE = address(0x4000);
    address internal constant ASSET = address(0x5000);
    address internal constant DEBT = address(0x6000);

    function setUp() public {
        trigger = new AaveV3MinDebtTrigger();
        vm.mockCall(MARKET, abi.encodeWithSignature("getPool()"), abi.encode(POOL));
        vm.mockCall(MARKET, abi.encodeWithSignature("getPriceOracle()"), abi.encode(ORACLE));
        vm.mockCall(POOL, abi.encodeWithSignature("getReserveAddressById(uint16)"), abi.encode(ASSET));
        vm.mockCall(POOL, abi.encodeWithSignature("getReserveVariableDebtToken(address)"), abi.encode(DEBT));
        vm.mockCall(DEBT, abi.encodeWithSignature("balanceOf(address)"), abi.encode(uint256(5000e18)));
        vm.mockCall(ORACLE, abi.encodeWithSignature("getAssetPrice(address)"), abi.encode(uint256(1e8)));
        vm.mockCall(ASSET, abi.encodeWithSignature("decimals()"), abi.encode(uint8(18)));
    }

    function check(uint256 configuration, uint256 minDebt) internal returns (bool) {
        vm.mockCall(
            POOL, abi.encodeWithSignature("getUserConfiguration(address)", USER), abi.encode(configuration)
        );
        return trigger.isTriggered(abi.encode(USER, MARKET, minDebt), "");
    }

    function testFuzz_sameAssetPositionDoesNotTrigger(uint8 reserve) public {
        uint256 configuration = uint256(3) << (uint256(reserve % 128) * 2);
        assertFalse(check(configuration, 5000));
        assertFalse(check(configuration, 0));
    }

    function test_differentAssetsRespectMinimumDebt() public {
        // Borrow reserve 0, collateral reserve 1.
        assertTrue(check(9, 5000));
        assertFalse(check(9, 5001));
    }

    function test_additionalCollateralAllowsTrigger() public {
        assertTrue(check(11, 5000));
    }

    function test_additionalDebtAllowsTrigger() public {
        assertTrue(check(7, 10000));
        assertFalse(check(7, 10001));
    }

    function test_multipleSameAssetPairsAllowTrigger() public {
        assertTrue(check(15, 10000));
    }

    function test_emptyPositionPreservesMinimumDebtBehavior() public {
        assertTrue(check(0, 0));
        assertFalse(check(0, 1));
    }
}
