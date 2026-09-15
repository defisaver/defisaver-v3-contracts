// SPDX-License-Identifier: MIT
pragma solidity =0.8.24;

import { Test } from "forge-std/Test.sol";
import { CompV3MinDebtTrigger } from "../../contracts/triggers-additional/CompV3MinDebtTrigger.sol";
import { IComet } from "../../contracts/interfaces/protocols/compoundV3/IComet.sol";

contract CompV3MinDebtTriggerUnitTest is Test {
    function mockUnknownPrice() internal {
        vm.chainId(1);
        vm.mockCall(
            address(0x47Fb2585D2C56Fe188D0E6ec628a38b74fCeeeDf),
            abi.encodeWithSignature("latestRoundData(address,address)"),
            abi.encode(uint80(0), int256(0), uint256(0), uint256(0), uint80(0))
        );
        vm.mockCall(
            address(0x2f39d218133AFaB8F2B819B1066c7E434Ad94E9e),
            abi.encodeWithSignature("getPriceOracle()"),
            abi.encode(address(0x5678))
        );
        vm.mockCall(
            address(0x5678),
            abi.encodeWithSignature("getAssetPrice(address)"),
            abi.encode(uint256(0))
        );
    }

    function test_compNonzeroDebtUnknownPriceStillPasses() public {
        mockUnknownPrice();
        CompV3MinDebtTrigger checker = new CompV3MinDebtTrigger();
        address market = address(0x1234);
        address user = address(0x2345);
        vm.mockCall(market, abi.encodeCall(IComet.baseToken, ()), abi.encode(address(0x3456)));
        vm.mockCall(market, abi.encodeCall(IComet.borrowBalanceOf, (user)), abi.encode(uint256(1)));
        assertTrue(checker.isTriggered(abi.encode(user, market, uint256(5000)), ""));
    }

    // Unsupported price chain deliberately proves zero debt returns before consulting prices.
    function test_compEmptyDoesNotNeedPrice() public {
        vm.chainId(999);
        CompV3MinDebtTrigger checker = new CompV3MinDebtTrigger();
        address market = address(0x1234);
        address user = address(0x2345);
        vm.mockCall(market, abi.encodeCall(IComet.baseToken, ()), abi.encode(address(0x3456)));
        vm.mockCall(market, abi.encodeCall(IComet.borrowBalanceOf, (user)), abi.encode(uint256(0)));
        assertFalse(checker.isTriggered(abi.encode(user, market, uint256(5000)), ""));
        assertFalse(checker.isTriggered(abi.encode(user, market, uint256(0)), ""));
    }
}
