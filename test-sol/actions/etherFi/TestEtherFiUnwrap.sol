// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { ILiquidityPool } from "../../../contracts/interfaces/etherFi/ILiquidityPool.sol";
import { IWeEth } from "../../../contracts/interfaces/etherFi/IWeEth.sol";
import { EtherFiUnwrap } from "../../../contracts/actions/etherfi/EtherFiUnwrap.sol";

import { EtherFiHelper } from "../../../contracts/actions/etherfi/helpers/EtherFiHelper.sol";

import { SmartWallet } from "../../utils/SmartWallet.sol";
import { BaseTest } from "../../utils/BaseTest.sol";
import { ActionsUtils } from "../../utils/ActionsUtils.sol";
import { TokenAddresses } from "../../TokenAddresses.sol";

contract TestEtherFiUnwrap is BaseTest, ActionsUtils, EtherFiHelper {

    /*//////////////////////////////////////////////////////////////////////////
                                CONTRACT UNDER TEST
    //////////////////////////////////////////////////////////////////////////*/
    EtherFiUnwrap cut;

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

        cut = new EtherFiUnwrap();
    }

    /*//////////////////////////////////////////////////////////////////////////
                                      TESTS
    //////////////////////////////////////////////////////////////////////////*/
    function test_should_unwrap() public {
        bool isDirect = false;
        bool isMaxUint256 = false;
        uint256 amount = 54543543554353455435334;
        _baseTest(isDirect, isMaxUint256, amount);
    }

    function test_should_unwrap_max_uint256() public {
        bool isDirect = false;
        bool isMaxUint256 = true;
        uint256 amount = 20 ether;
        _baseTest(isDirect, isMaxUint256, amount);
    }

    function test_should_unwrap_action_direct() public {
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
        _giveWeEthTokens(_amount*2);

        bytes memory executeActionCallData = executeActionCalldata(
            etherFiUnwrapEncode(
                _isMaxUint256 ? type(uint256).max : _amount,
                sender,
                sender),
            _isDirect
        );

        uint256 senderEethBalanceBefore = balanceOf(EETH_ADDR, sender);
        uint256 senderWeEthBalanceBefore = balanceOf(WEETH_ADDR, sender);

        approveAsSender(
            sender,
            WEETH_ADDR,
            walletAddr,
            _isMaxUint256 ? balanceOf(WEETH_ADDR, sender) : _amount
        );

        wallet.execute(address(cut), executeActionCallData, 0);

        uint256 senderEethBalanceAfter = balanceOf(EETH_ADDR, sender);
        uint256 senderWeEthBalanceAfter = balanceOf(WEETH_ADDR, sender);

        if (_isMaxUint256) {
            assertEq(senderWeEthBalanceAfter, 0);
        } else {
            assertEq(senderWeEthBalanceAfter, senderWeEthBalanceBefore - _amount);
        }
        assertGt(senderEethBalanceAfter, senderEethBalanceBefore);
    }

    function _giveWeEthTokens(uint256 _amount) internal {
        vm.deal(sender, _amount);
        vm.startPrank(sender);
        ILiquidityPool(ETHER_FI_LIQUIDITY_POOL).deposit{value: _amount}();
        vm.stopPrank();
        uint256 eEthBalance = balanceOf(EETH_ADDR, sender);
        approveAsSender(sender, EETH_ADDR, WEETH_ADDR, eEthBalance);
        vm.startPrank(sender);
        IWeEth(WEETH_ADDR).wrap(eEthBalance);
        vm.stopPrank();
    }
}
