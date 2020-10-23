// SPDX-License-Identifier: MIT
pragma solidity ^0.7.0;

import "hardhat/console.sol";

contract Test {
    function test() public view returns (string memory) {
        console.log("Sender is %s", msg.sender);
        return "Test";
    }
}
