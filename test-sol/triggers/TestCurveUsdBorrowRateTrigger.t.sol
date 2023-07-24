// SPDX-License-Identifier: MIT
pragma solidity =0.8.10;

import "ds-test/test.sol";
import "../CheatCodes.sol";

import "../../contracts/triggers/CurveUsdBorrowRateTrigger.sol";
import "../utils/Tokens.sol";
import "../utils/CompUser.sol";
import "../TokenAddresses.sol";


contract TestCurveUsdBorrowRateTrigger is DSTest, DSMath, Tokens {
    CurveUsdBorrowRateTrigger trigger;

    address WSTETH_MARKET = 0x100dAa78fC509Db39Ef7D04DE0c1ABD299f4C6CE;

    function setUp() public {
        trigger = new CurveUsdBorrowRateTrigger();
    }

    function testGetSafetyRatio() public {
        console.log("OKEEEE");

        uint256 rate = trigger._calcBorrowRate(WSTETH_MARKET);

        console.log(rate);
    }

}