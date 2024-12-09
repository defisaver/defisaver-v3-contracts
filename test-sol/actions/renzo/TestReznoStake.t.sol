// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { RenzoStake } from "../../../contracts/actions/renzo/RenzoStake.sol";
import { RenzoHelper } from "../../../contracts/actions/renzo/helpers/RenzoHelper.sol";

import { SmartWallet } from "../../utils/SmartWallet.sol";
import { BaseTest } from "../../utils/BaseTest.sol";
import { ActionsUtils } from "../../utils/ActionsUtils.sol";
import { TokenAddresses } from "../../TokenAddresses.sol";

contract TestRenzoStake is BaseTest, ActionsUtils, RenzoHelper {

    /*//////////////////////////////////////////////////////////////////////////
                                CONTRACT UNDER TEST
    //////////////////////////////////////////////////////////////////////////*/
    RenzoStake cut;

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

        cut = new RenzoStake();
    }

    /*//////////////////////////////////////////////////////////////////////////
                                      TESTS
    //////////////////////////////////////////////////////////////////////////*/
    function test_should_stake() public {
        bool isDirect = false;
        bool isMaxUint256 = false;
        uint256 amount = 4325454352333;
        _baseTest(isDirect, isMaxUint256, amount);
    }

    function test_should_stake_max_uint256() public {
        bool isDirect = false;
        bool isMaxUint256 = true;
        uint256 amount = 20 ether;
        _baseTest(isDirect, isMaxUint256, amount);
    }

    function test_should_stake_action_direct() public {
        bool isDirect = true;
        bool isMaxUint256 = false;
        uint256 amount = 1 ether;
        _baseTest(isDirect, isMaxUint256, amount);
    }

    function _baseTest(
        bool _isDirect,
        bool _isMaxUint256,
        uint256 _amount
    ) internal {
        give(TokenAddresses.WETH_ADDR, sender, _amount);
        approveAsSender(sender, TokenAddresses.WETH_ADDR, walletAddr, _amount);

        bytes memory executeActionCallData = executeActionCalldata(
            renzoStakeEncode(
                _isMaxUint256 ? type(uint256).max : _amount,
                sender,
                sender
            ),
            _isDirect
        );

        uint256 senderWethBalanceBefore = balanceOf(TokenAddresses.WETH_ADDR, sender);
        uint256 senderEzethBalanceBefore = balanceOf(EZETH_ADDR, sender);

        wallet.execute(address(cut), executeActionCallData, 0);

        uint256 senderWethBalanceAfter = balanceOf(TokenAddresses.WETH_ADDR, sender);
        uint256 senderEzethBalanceAfter = balanceOf(EZETH_ADDR, sender);

        if (_isMaxUint256) {
            assertEq(0, senderWethBalanceAfter);
        } else {
            assertEq(senderWethBalanceBefore - _amount, senderWethBalanceAfter);
        }
        assertGt(senderEzethBalanceAfter, senderEzethBalanceBefore);
    }
}