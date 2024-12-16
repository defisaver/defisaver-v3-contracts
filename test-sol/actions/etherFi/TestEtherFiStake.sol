// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { EtherFiStake } from "../../../contracts/actions/etherfi/EtherFiStake.sol";
import { EtherFiHelper } from "../../../contracts/actions/etherfi/helpers/EtherFiHelper.sol";

import { SmartWallet } from "../../utils/SmartWallet.sol";
import { BaseTest } from "../../utils/BaseTest.sol";
import { ActionsUtils } from "../../utils/ActionsUtils.sol";
import { TokenAddresses } from "../../TokenAddresses.sol";

contract TestEtherFiStake is BaseTest, ActionsUtils, EtherFiHelper {

    /*//////////////////////////////////////////////////////////////////////////
                                CONTRACT UNDER TEST
    //////////////////////////////////////////////////////////////////////////*/
    EtherFiStake cut;

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

        cut = new EtherFiStake();
    }

    /*//////////////////////////////////////////////////////////////////////////
                                      TESTS
    //////////////////////////////////////////////////////////////////////////*/
    function test_should_stake() public {
        bool isDirect = false;
        bool isMaxUint256 = false;
        bool shouldWrap = false;
        uint256 amount = 10 ether;
        _baseTest(isDirect, isMaxUint256, amount, shouldWrap);
    }

    function test_should_stake_max_uint256() public {
        bool isDirect = false;
        bool isMaxUint256 = true;
        bool shouldWrap = false;
        uint256 amount = 20 ether;
        _baseTest(isDirect, isMaxUint256, amount, shouldWrap);
    }

    function test_should_stake_action_direct() public {
        bool isDirect = true;
        bool isMaxUint256 = false;
        bool shouldWrap = false;
        uint256 amount = 1 ether;
        _baseTest(isDirect, isMaxUint256, amount, shouldWrap);
    }

    function test_should_stake_action_direct_with_wrapping() public {
        bool isDirect = false;
        bool isMaxUint256 = false;
        bool shouldWrap = true;
        uint256 amount = 10 ether;
        _baseTest(isDirect, isMaxUint256, amount, shouldWrap);
    }

    function _baseTest(
        bool _isDirect,
        bool _isMaxUint256,
        uint256 _amount,
        bool _shouldWrap
    ) internal {
        give(TokenAddresses.WETH_ADDR, sender, _amount);
        approveAsSender(sender, TokenAddresses.WETH_ADDR, walletAddr, _amount);

        bytes memory executeActionCallData = executeActionCalldata(
            etherFiStakeEncode(
                _isMaxUint256 ? type(uint256).max : _amount,
                sender,
                sender,
                _shouldWrap
            ),
            _isDirect
        );

        uint256 senderWethBalanceBefore = balanceOf(TokenAddresses.WETH_ADDR, sender);
        uint256 senderEethBalanceBefore = balanceOf(EETH_ADDR, sender);
        uint256 senderWeEthBalanceBefore = balanceOf(WEETH_ADDR, sender);

        wallet.execute(address(cut), executeActionCallData, 0);

        uint256 senderWethBalanceAfter = balanceOf(TokenAddresses.WETH_ADDR, sender);
        uint256 senderEethBalanceAfter = balanceOf(EETH_ADDR, sender);
        uint256 senderWeEthBalanceAfter = balanceOf(WEETH_ADDR, sender);

        if (_isMaxUint256) {
            assertEq(0, senderWethBalanceAfter);
        } else {
            assertEq(senderWethBalanceBefore - _amount, senderWethBalanceAfter);
        }
        if (_shouldWrap) {
            assertEq(senderEethBalanceBefore, senderEethBalanceAfter);
            assertGt(senderWeEthBalanceAfter, senderWeEthBalanceBefore);
        } else {
            assertEq(senderWeEthBalanceAfter, senderWeEthBalanceBefore);
            assertGt(senderEethBalanceAfter, senderEethBalanceBefore);
        }
    }
}
