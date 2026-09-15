// SPDX-License-Identifier: MIT
pragma solidity =0.8.24;

import { Test } from "forge-std/Test.sol";
import { MorphoBlueMinDebtTrigger } from
    "../../contracts/triggers-additional/MorphoBlueMinDebtTrigger.sol";
import {
    IMorphoBlue,
    Id,
    Market,
    MarketParams
} from "../../contracts/interfaces/protocols/morpho-blue/IMorphoBlue.sol";

contract MorphoBlueMinDebtTriggerUnitTest is Test {
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

    function test_morphoNonzeroDebtUnknownPriceStillPasses() public {
        mockUnknownPrice();
        MorphoBlueMinDebtTrigger checker = new MorphoBlueMinDebtTrigger();
        address morpho = address(checker.morphoBlue());
        MarketParams memory params;
        params.loanToken = address(0x1234);
        Id id = Id.wrap(keccak256(abi.encode(params)));
        Market memory market;
        market.lastUpdate = uint128(block.timestamp);
        market.totalBorrowAssets = 1;
        market.totalBorrowShares = 1;
        bytes32[] memory slots = new bytes32[](1);
        slots[0] = bytes32(uint256(1));
        vm.mockCall(morpho, abi.encodeCall(IMorphoBlue.idToMarketParams, (id)), abi.encode(params));
        vm.mockCall(morpho, abi.encodeCall(IMorphoBlue.market, (id)), abi.encode(market));
        vm.mockCall(
            morpho,
            abi.encodeWithSelector(bytes4(keccak256("extSloads(bytes32[])"))),
            abi.encode(slots)
        );
        assertTrue(checker.isTriggered(abi.encode(address(0x2345), id, uint256(5000)), ""));
    }

    // Unsupported price chain deliberately proves zero debt returns before consulting prices.

    function test_morphoEmptyDoesNotNeedPrice() public {
        vm.chainId(999);
        MorphoBlueMinDebtTrigger checker = new MorphoBlueMinDebtTrigger();
        address morpho = address(checker.morphoBlue());
        MarketParams memory params;
        params.loanToken = address(0x1234);
        Id id = Id.wrap(keccak256(abi.encode(params)));
        Market memory market;
        market.lastUpdate = uint128(block.timestamp);
        bytes32[] memory slots = new bytes32[](1);
        vm.mockCall(morpho, abi.encodeCall(IMorphoBlue.idToMarketParams, (id)), abi.encode(params));
        vm.mockCall(morpho, abi.encodeCall(IMorphoBlue.market, (id)), abi.encode(market));
        vm.mockCall(
            morpho,
            abi.encodeWithSelector(bytes4(keccak256("extSloads(bytes32[])"))),
            abi.encode(slots)
        );
        assertFalse(checker.isTriggered(abi.encode(address(0x2345), id, uint256(5000)), ""));
        assertFalse(checker.isTriggered(abi.encode(address(0x2345), id, uint256(0)), ""));
    }
}
