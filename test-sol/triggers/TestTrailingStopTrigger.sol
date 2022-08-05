// SPDX-License-Identifier: MIT
pragma solidity =0.8.10;

import "ds-test/test.sol";
// import "forge-std/console.sol";
import "../../contracts/triggers/TrailingStopTrigger.sol";

contract TestTrailingStopTrigger is DSTest, MainnetTriggerAddresses {

    TrailingStopTrigger trigger;

    function setUp() public {
        trigger = new TrailingStopTrigger();
    }

    function testPercentageDiffWithFixedEthPrices() public {
       uint256 currPrice = 1000 * 10**8;
       uint256 maxPrice = 1112 * 10**8;
       uint256 percentage = 10 * 10**8;

       bool isDiff = trigger.checkPercentageDiff(currPrice, maxPrice, percentage);

       assert(isDiff);
    }

    function testPercentageDiffWithFixedWbtcPrices() public {
       uint256 currPrice = 22_000 * 10**8;
       uint256 maxPrice = 25_000 * 10**8;
       uint256 percentage = 10 * 10**8;

       bool isDiff = trigger.checkPercentageDiff(currPrice, maxPrice, percentage);

       console.log(isDiff);
    }

    // TODO: test with fetching roundId

}