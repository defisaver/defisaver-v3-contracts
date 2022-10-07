// SPDX-License-Identifier: MIT
pragma solidity =0.8.10;

import "ds-test/test.sol";
import "forge-std/console.sol";
import "../../contracts/triggers/LiquityDebtInFrontTrigger.sol";

contract TestLiquityDebtInFront is DSTest, LiquityHelper {

    LiquityDebtInFrontTrigger trigger;

    function setUp() public {
        trigger = new LiquityDebtInFrontTrigger();
    }

    function testDebtInFrontTriggerForLargestTrove() public  view{
        // fetch head of list, largest TCR
        address lastTrove = SortedTroves.getFirst();

        bytes memory subData = abi.encode(LiquityDebtInFrontTrigger.SubParams({
            troveOwner: lastTrove,
            debtInFrontMin: 500_000 * 1e18
        }));

        bool isTriggered = trigger.isTriggered("", subData);

        console.log(isTriggered);

        assert(isTriggered == false);
    }

    function testDebtInFrontTriggerForLargestTroveToBeTrue() public view {
        // fetch head of list, largest TCR
        address lastTrove = SortedTroves.getFirst();

        bytes memory subData = abi.encode(LiquityDebtInFrontTrigger.SubParams({
            troveOwner: lastTrove,
            debtInFrontMin: 500_000_000 * 1e18
        }));

        bool isTriggered = trigger.isTriggered("", subData);

        assert(isTriggered == true);
    }

}