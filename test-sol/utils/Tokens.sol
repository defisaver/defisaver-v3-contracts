
// SPDX-License-Identifier: MIT
pragma solidity =0.8.10;

import "ds-test/test.sol";
import "forge-std/Vm.sol";
import "forge-std/Test.sol";

import "../../contracts/interfaces/IERC20.sol";

contract Tokens is Test {
    using stdStorage for StdStorage;

    function gibTokens(address who, address token, uint256 amt) internal {
        stdstore
            .target(token)
            .sig(IERC20(token).balanceOf.selector)
            .with_key(who)
            .checked_write(amt);
    }
}