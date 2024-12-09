// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { ILiquidityPool } from "../../../contracts/interfaces/etherFi/ILiquidityPool.sol";
import { EtherFiWrap } from "../../../contracts/actions/etherfi/EtherFiWrap.sol";
import { EtherFiHelper } from "../../../contracts/actions/etherfi/helpers/EtherFiHelper.sol";

import { SmartWallet } from "../../utils/SmartWallet.sol";
import { BaseTest } from "../../utils/BaseTest.sol";
import { ActionsUtils } from "../../utils/ActionsUtils.sol";
import { TokenAddresses } from "../../TokenAddresses.sol";

import { console } from "forge-std/console.sol";

contract TestEtherFiWrap is BaseTest, ActionsUtils, EtherFiHelper {

    /*//////////////////////////////////////////////////////////////////////////
                                CONTRACT UNDER TEST
    //////////////////////////////////////////////////////////////////////////*/
    EtherFiWrap cut;

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

        cut = new EtherFiWrap();

    }

    /*//////////////////////////////////////////////////////////////////////////
                                      TESTS
    //////////////////////////////////////////////////////////////////////////*/
    function test_should_wrap() public {
        bool isDirect = false;
        bool isMaxUint256 = false;
        uint256 amount = 54543543554353455435334;
        _baseTest(isDirect, isMaxUint256, amount);
    }

    function test_should_wrap_max_uint256() public {
        bool isDirect = false;
        bool isMaxUint256 = true;
        uint256 amount = 20 ether;
        _baseTest(isDirect, isMaxUint256, amount);
    }

    function test_should_wrap_action_direct() public {
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
        _giveEethTokens(_amount*2);

        bytes memory executeActionCallData = executeActionCalldata(
            etherFiWrapEncode(
                _isMaxUint256 ? type(uint256).max : _amount,
                sender,
                sender),
            _isDirect
        );


        uint256 senderEethBalanceBefore = balanceOf(EETH_ADDR, sender);
        uint256 senderWeEthBalanceBefore = balanceOf(WEETH_ADDR, sender);

        approveAsSender(
            sender,
            EETH_ADDR,
            walletAddr,
            _isMaxUint256 ? balanceOf(EETH_ADDR, sender) : _amount
        );

        wallet.execute(address(cut), executeActionCallData, 0);

        uint256 senderEethBalanceAfter = balanceOf(EETH_ADDR, sender);
        uint256 senderWeEthBalanceAfter = balanceOf(WEETH_ADDR, sender);

        console.log("senderEethBalanceBefore: %d", senderEethBalanceBefore);
        console.log("senderEethBalanceAfter: %d", senderEethBalanceAfter);
        console.log("senderWeEthBalanceBefore: %d", senderWeEthBalanceBefore);
        console.log("senderWeEthBalanceAfter: %d", senderWeEthBalanceAfter);
        console.log("amount: %d", _amount);

        /// @dev When reading EETH balance, there can be up to 1 wei offset error. Account for this in asserts
        uint256 WEI_OFFSET = 1;
        if (_isMaxUint256) {
            assertGe(senderEethBalanceAfter, 0);
            assertLe(senderEethBalanceAfter, WEI_OFFSET);
        } else {
            // senderEethBalanceAfter can have up to 1 wei offset error
            assertGe(senderEethBalanceAfter, senderEethBalanceBefore - _amount);
            assertLe(senderEethBalanceAfter, senderEethBalanceBefore - _amount + WEI_OFFSET);
        }
        assertGt(senderWeEthBalanceAfter, senderWeEthBalanceBefore);
    }

    function _giveEethTokens(uint256 _amount) internal {
        vm.deal(sender, _amount);
        vm.startPrank(sender);
        ILiquidityPool(ETHER_FI_LIQUIDITY_POOL).deposit{value: _amount}();
        vm.stopPrank();
    }
}
