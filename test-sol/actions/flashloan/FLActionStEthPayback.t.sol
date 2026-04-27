// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { FLAction } from "../../../contracts/actions/flashloan/FLAction.sol";
import { BaseTest } from "../../utils/BaseTest.sol";
import { Addresses } from "../../utils/helpers/MainnetAddresses.sol";

contract FLActionPaybackHarness is FLAction {
    function verifyPaybackAmount(address _token, uint256 _expectedBalance) external {
        _verifyPaybackAmount(_token, _expectedBalance);
    }

    function stEthAddr() external pure returns (address) {
        return ST_ETH_ADDR;
    }

    function faucetAddr() external pure returns (address) {
        return DYDX_FL_FEE_FAUCET;
    }
}

contract MockFLToken {
    mapping(address => uint256) public balanceOf;

    function mint(address _to, uint256 _amount) external {
        balanceOf[_to] += _amount;
    }

    function transfer(address _to, uint256 _amount) external returns (bool) {
        balanceOf[msg.sender] -= _amount;
        balanceOf[_to] += _amount;

        return true;
    }
}

contract TestFLActionStEthPayback is BaseTest {
    FLActionPaybackHarness internal harness;

    address internal stEth;
    address internal faucet;

    function setUp() public override {
        forkFromEnv("");

        harness = new FLActionPaybackHarness();
        stEth = harness.stEthAddr();
        faucet = harness.faucetAddr();

        MockFLToken mockStEth = new MockFLToken();
        vm.etch(stEth, address(mockStEth).code);
    }

    function test_should_accept_exact_payback_amount() public {
        if (isL2NetworkSelected()) vm.skip(true);

        uint256 expectedBalance = 100 ether;

        _setMockBalance(address(harness), expectedBalance);

        harness.verifyPaybackAmount(stEth, expectedBalance);

        assertEq(MockFLToken(stEth).balanceOf(address(harness)), expectedBalance);
    }

    function test_should_cover_steth_two_wei_deficit_from_faucet() public {
        if (isL2NetworkSelected()) vm.skip(true);

        uint256 expectedBalance = 100 ether;
        uint256 faucetBalance = 10;

        _setMockBalance(address(harness), expectedBalance - 2);
        _setMockBalance(faucet, faucetBalance);

        harness.verifyPaybackAmount(stEth, expectedBalance);

        assertEq(MockFLToken(stEth).balanceOf(address(harness)), expectedBalance);
        assertEq(MockFLToken(stEth).balanceOf(faucet), faucetBalance - 2);
    }

    function test_should_cover_steth_one_wei_deficit_and_return_faucet_surplus() public {
        if (isL2NetworkSelected()) vm.skip(true);

        uint256 expectedBalance = 100 ether;
        uint256 faucetBalance = 10;

        _setMockBalance(address(harness), expectedBalance - 1);
        _setMockBalance(faucet, faucetBalance);

        harness.verifyPaybackAmount(stEth, expectedBalance);

        assertEq(MockFLToken(stEth).balanceOf(address(harness)), expectedBalance);
        assertEq(MockFLToken(stEth).balanceOf(faucet), faucetBalance - 1);
    }

    function test_should_revert_steth_deficit_greater_than_two_wei() public {
        if (isL2NetworkSelected()) vm.skip(true);

        uint256 expectedBalance = 100 ether;

        _setMockBalance(address(harness), expectedBalance - 3);
        _setMockBalance(faucet, 10);

        vm.expectRevert(FLAction.WrongPaybackAmountError.selector);
        harness.verifyPaybackAmount(stEth, expectedBalance);
    }

    function test_should_revert_steth_surplus() public {
        if (isL2NetworkSelected()) vm.skip(true);

        uint256 expectedBalance = 100 ether;

        _setMockBalance(address(harness), expectedBalance + 1);

        vm.expectRevert(FLAction.WrongPaybackAmountError.selector);
        harness.verifyPaybackAmount(stEth, expectedBalance);
    }

    function test_should_revert_non_steth_deficit() public {
        if (isL2NetworkSelected()) vm.skip(true);

        uint256 expectedBalance = 100 ether;

        MockFLToken dai = new MockFLToken();
        dai.mint(address(harness), expectedBalance - 1);

        vm.expectRevert(FLAction.WrongPaybackAmountError.selector);
        harness.verifyPaybackAmount(address(dai), expectedBalance);
    }

    function test_should_revert_non_steth_surplus() public {
        if (isL2NetworkSelected()) vm.skip(true);

        uint256 expectedBalance = 100 ether;

        MockFLToken dai = new MockFLToken();
        dai.mint(address(harness), expectedBalance + 1);

        vm.expectRevert(FLAction.WrongPaybackAmountError.selector);
        harness.verifyPaybackAmount(address(dai), expectedBalance);
    }

    function _setMockBalance(address _account, uint256 _balance) internal {
        bytes32 balanceSlot = keccak256(abi.encode(_account, uint256(0)));
        vm.store(stEth, balanceSlot, bytes32(_balance));
    }
}
