// SPDX-License-Identifier: MIT

pragma solidity =0.8.10;

import { Test } from "forge-std/Test.sol";

import { IERC20 } from "../../contracts/interfaces/IERC20.sol";
import { SafeERC20 } from "../../contracts/utils/SafeERC20.sol";
import { Tokens } from "./Tokens.sol";

/// @notice Base test - root contract for all tests
contract BaseTest is Test, Tokens {
    
    // EOA USERS
    address internal constant bob = address(0xbb);
    address internal constant alice = address(0xaa);

    using SafeERC20 for IERC20;

    modifier bobAsSender() {
        prankBob();
        _;
        stopPrank();
    }

    modifier aliceAsSender() {
        prankAlice();
        _;
        stopPrank();
    }

    function setUp() public virtual {
        vm.label(address(bob), "Bob");
        vm.label(address(alice), "Alice");
    }

    function approve(address _token, address _to, uint256 _amount) internal {
        IERC20(_token).safeApprove(_to, _amount);
    }

    function approveAsBob(address _token, address _to, uint256 _amount) internal bobAsSender() {
        IERC20(_token).safeApprove(_to, _amount);
    }

    function giveBob(address token, uint256 amount) internal {
        deal(token, bob, amount);
    }

    function balanceOf(address token, address who) internal view returns (uint256) {
        return IERC20(token).balanceOf(who);
    }

    function bobBalance(address token) internal view returns (uint256) {
        return balanceOf(token, bob);
    }

    function prankBob() internal {
        vm.prank(bob);
    }

    function prankAlice() internal {
        vm.prank(alice);
    }

    function stopPrank() internal {
        vm.stopPrank();
    }

    function removeSelector(bytes memory _data) internal pure returns (bytes memory) {
        bytes memory result = new bytes(_data.length - 4);
        for (uint i = 4; i < _data.length; i++) {
            result[i - 4] = _data[i];
        }
        return result;
    }
}
