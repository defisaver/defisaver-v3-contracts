// SPDX-License-Identifier: MIT
pragma solidity =0.8.10;

import "ds-test/test.sol";
import "forge-std/console.sol";
import "../CheatCodes.sol";

import "../../contracts/mocks/MockChainlinkFeedRegistry.sol";
import "../../contracts/triggers/TrailingStopTrigger.sol";

contract TestTrailingStopTrigger is DSTest, MainnetTriggerAddresses {
    CheatCodes vm = CheatCodes(0x7109709ECfa91a80626fF3989D68f67F5b1DD12D);

    address internal constant ETH_ADDR = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;

    TrailingStopTrigger trigger;
    MockChainlinkFeedRegistry mockPriceFeed;

    function setUp() public {
        trigger = new TrailingStopTrigger();
        mockPriceFeed = new MockChainlinkFeedRegistry();

        vm.etch(CHAINLINK_FEED_REGISTRY, address(mockPriceFeed).code);

        mockPriceFeed = MockChainlinkFeedRegistry(CHAINLINK_FEED_REGISTRY);
    }

    function testPercentageDiffWithFixedEthPrices() public view {
       uint256 currPrice = 1000 * 10**8;
       uint256 maxPrice = 1112 * 10**8;
       uint256 percentage = 10 * 10**8;

       bool isDiff = trigger.checkPercentageDiff(currPrice, maxPrice, percentage);

       assert(isDiff);
    }

    function testPercentageDiffWithFixedWbtcPrices() public view {
       uint256 currPrice = 22_000 * 10**8;
       uint256 maxPrice = 25_000 * 10**8;
       uint256 percentage = 10 * 10**8;

       bool isDiff = trigger.checkPercentageDiff(currPrice, maxPrice, percentage);

        assert(isDiff);
    }

    function testSmallPercentageDiffWithFixedWbtcPrices() public view {
       uint256 currPrice = 22_000 * 10**8;
       uint256 maxPrice = 22_023 * 10**8;
       uint256 percentage = 1 * 10**7; // 0.1%

       bool isDiff = trigger.checkPercentageDiff(currPrice, maxPrice, percentage);

       assert(isDiff);
    }

    function testExactPercentageDiffWithFixedWbtcPrices() public view {
       uint256 currPrice = 21999_978 * 10**5; // 21,999.978
       uint256 maxPrice = 22_022 * 10**8; // 21,999.978
       uint256 percentage = 1 * 10**7; // 0.1%

       bool isDiff = trigger.checkPercentageDiff(currPrice, maxPrice, percentage);

       assert(isDiff);
    }

    function testPercentageDiffWithFixedEthPricesReturnsFalse() public view {
       uint256 currPrice = 1000 * 10**8;
       uint256 maxPrice = 1109 * 10**8;
       uint256 percentage = 10 * 10**8;

       bool isDiff = trigger.checkPercentageDiff(currPrice, maxPrice, percentage);

       assert(!isDiff);
    }

   // Test with fetching roundId
   function testGetRoundInfoForEth() public {
       int256 chainLinkPrice = 10_000; // ide gas
       uint80 roundId = 0;

       mockPriceFeed.setRoundData(ETH_ADDR, Denominations.USD, roundId, chainLinkPrice);

       (uint256 price, uint256 timestamp) = trigger.getRoundInfo(ETH_ADDR, roundId);
       
       assert(price == uint256(chainLinkPrice));
       assert(timestamp == block.timestamp);
    }

}