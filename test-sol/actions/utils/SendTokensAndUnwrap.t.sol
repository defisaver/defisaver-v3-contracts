// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { SendTokensAndUnwrap } from "../../../contracts/actions/utils/SendTokensAndUnwrap.sol";
import {Addresses } from "../../utils/Addresses.sol";

import { SmartWallet } from "../../utils/SmartWallet.sol";
import { BaseTest } from "../../utils/BaseTest.sol";
import { ActionsUtils } from "../../utils/ActionsUtils.sol";

contract TestSendTokensAndUnwrap is BaseTest, ActionsUtils {
    
    /*//////////////////////////////////////////////////////////////////////////
                                CONTRACT UNDER TEST
    //////////////////////////////////////////////////////////////////////////*/
    SendTokensAndUnwrap cut;

    /*//////////////////////////////////////////////////////////////////////////
                                    VARIABLES
    //////////////////////////////////////////////////////////////////////////*/
    SmartWallet wallet;
    address sender;
    address walletAddr;

    /*//////////////////////////////////////////////////////////////////////////
                                   SETUP FUNCTION
    //////////////////////////////////////////////////////////////////////////*/
    function setUp() public override {
        forkMainnetLatest();

        wallet = new SmartWallet(bob);
        sender = wallet.owner();
        walletAddr = wallet.walletAddr();

        cut = new SendTokensAndUnwrap();
    }

    /*//////////////////////////////////////////////////////////////////////////
                                      TESTS
    //////////////////////////////////////////////////////////////////////////*/
    function test_should_send_tokens_without_weth() public {
        bool isDirect = false;
        address[] memory tokens = new address[](2);
        address[] memory receivers = new address[](2);
        uint256[] memory amounts = new uint256[](2);
        bool[] memory isMaxUint256 = new bool[](2);
        tokens[0] = Addresses.WBTC_ADDR;
        tokens[1] = Addresses.DAI_ADDR;
        receivers[0] = alice;
        receivers[1] = alice;
        amounts[0] = 10e8;
        amounts[1] = 10e18;
        isMaxUint256[0] = false;
        isMaxUint256[1] = false;

        _baseTest(tokens, receivers, amounts, isMaxUint256, isDirect);
    }

    function test_should_send_tokens_with_weth() public {
        bool isDirect = false;
        address[] memory tokens = new address[](2);
        address[] memory receivers = new address[](2);
        uint256[] memory amounts = new uint256[](2);
        bool[] memory isMaxUint256 = new bool[](2);
        tokens[0] = Addresses.WETH_ADDR;
        tokens[1] = Addresses.USDC_ADDR;
        receivers[0] = alice;
        receivers[1] = bob;
        amounts[0] = 10 ether;
        amounts[1] = 10e6;
        isMaxUint256[0] = false;
        isMaxUint256[1] = false;

        _baseTest(tokens, receivers, amounts, isMaxUint256, isDirect);
    }

    function test_should_send_tokens_direct() public {
        bool isDirect = true;
        address[] memory tokens = new address[](1);
        address[] memory receivers = new address[](1);
        uint256[] memory amounts = new uint256[](1);
        bool[] memory isMaxUint256 = new bool[](1);
        tokens[0] = Addresses.WETH_ADDR;
        receivers[0] = alice;
        amounts[0] = 10 ether;
        isMaxUint256[0] = false;

        _baseTest(tokens, receivers, amounts, isMaxUint256, isDirect);
    }

    function test_should_fail_for_arrays_length_mismatch() public {
        address[] memory tokens = new address[](2);
        address[] memory receivers = new address[](1);
        uint256[] memory amounts = new uint256[](1);
        tokens[0] = Addresses.WETH_ADDR;
        tokens[1] = Addresses.USDC_ADDR;
        receivers[0] = alice;
        amounts[0] = 10 ether;

        bytes memory executeActionCallData = executeActionCalldata(
            sendTokensAndUnwrapEncode(tokens, receivers, amounts),
            false
        );

        vm.expectRevert();
        wallet.execute(address(cut), executeActionCallData, 0);
    }

    function test_should_send_tokens_max_uint256() public {
        bool isDirect = false;
        address[] memory tokens = new address[](3);
        address[] memory receivers = new address[](3);
        uint256[] memory amounts = new uint256[](3);
        bool[] memory isMaxUint256 = new bool[](3);
        tokens[0] = Addresses.WETH_ADDR;
        tokens[1] = Addresses.USDC_ADDR;
        tokens[2] = Addresses.WBTC_ADDR;
        receivers[0] = alice;
        receivers[1] = bob;
        receivers[2] = alice;
        amounts[0] = 10 ether;
        amounts[1] = 1000e6;
        amounts[2] = 10e8;
        isMaxUint256[0] = true;
        isMaxUint256[1] = true;
        isMaxUint256[2] = true;

        _baseTest(tokens, receivers, amounts, isMaxUint256, isDirect);
    }

    function _baseTest(
        address[] memory _tokens,
        address[] memory _receivers,
        uint256[] memory _amounts,
        bool[] memory _isMaxUint256,
        bool _isDirect
    ) internal {
        uint256 size = _tokens.length;
        uint256[] memory adaptedAmounts = new uint256[](size);
        uint256[] memory walletBalancesBefore = new uint256[](size);
        uint256[] memory receiverBalancesBefore = new uint256[](size);

        for (uint256 i = 0; i < size; ++i) {
            adaptedAmounts[i] = _isMaxUint256[i] ? type(uint256).max : _amounts[i];
            
            give(_tokens[i], walletAddr, _amounts[i]);
            
            walletBalancesBefore[i] = balanceOf(_tokens[i], walletAddr);

            receiverBalancesBefore[i] = _tokens[i] == Addresses.WETH_ADDR
                ? address(_receivers[i]).balance
                : balanceOf(_tokens[i], _receivers[i]);
        }

        bytes memory executeActionCallData = executeActionCalldata(
            sendTokensAndUnwrapEncode(_tokens, _receivers, adaptedAmounts),
            _isDirect
        );

        wallet.execute(address(cut), executeActionCallData, 0);

        for (uint256 i = 0; i < size; ++i) {
            uint256 walletBalancesAfter = balanceOf(_tokens[i], walletAddr);

            uint256 receiverBalancesAfter = _tokens[i] == Addresses.WETH_ADDR
                ? address(_receivers[i]).balance
                : balanceOf(_tokens[i], _receivers[i]);

            assertEq(walletBalancesBefore[i] - _amounts[i], walletBalancesAfter);
            assertEq(receiverBalancesBefore[i] + _amounts[i], receiverBalancesAfter);
        }
    }
}
