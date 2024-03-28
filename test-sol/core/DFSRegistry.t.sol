// SPDX-License-Identifier: MIT

pragma solidity =0.8.10;

import { DFSRegistry } from "../../contracts/core/DFSRegistry.sol";
import { AdminAuth } from "../../contracts/auth/AdminAuth.sol";

import { BaseTest } from "../utils/BaseTest.sol";
import { Const } from "../Const.sol";

contract TestCore_DFSRegistry is DFSRegistry, BaseTest {

    /*//////////////////////////////////////////////////////////////////////////
                               CONTRACT UNDER TEST
    //////////////////////////////////////////////////////////////////////////*/
    DFSRegistry cut;

    /*//////////////////////////////////////////////////////////////////////////
                                    VARIABLES
    //////////////////////////////////////////////////////////////////////////*/
    bytes4 constant TEST_ID = 0x11111111;

    /*//////////////////////////////////////////////////////////////////////////
                                  SETUP FUNCTION
    //////////////////////////////////////////////////////////////////////////*/
    function setUp() public override {
        forkMainnetLatest();
        cut = new DFSRegistry();
    }

    /*//////////////////////////////////////////////////////////////////////////
                                     TESTS
    //////////////////////////////////////////////////////////////////////////*/

    function test_add_new_contract_when_caller_not_owner() public {
        vm.expectRevert(abi.encodeWithSelector(AdminAuth.SenderNotOwner.selector));
        cut.addNewContract(TEST_ID, address(this), 0);
    }

    function test_revert_to_previous_address_when_caller_not_owner() public {
        vm.expectRevert(abi.encodeWithSelector(AdminAuth.SenderNotOwner.selector));
        cut.revertToPreviousAddress(TEST_ID);
    }

    function test_start_contract_change_when_caller_not_owner() public {
        vm.expectRevert(abi.encodeWithSelector(AdminAuth.SenderNotOwner.selector));
        cut.startContractChange(TEST_ID, address(this));
    }

    function test_approve_contract_change_when_caller_not_owner() public {
        vm.expectRevert(abi.encodeWithSelector(AdminAuth.SenderNotOwner.selector));
        cut.approveContractChange(TEST_ID);
    }

    function test_cancel_contract_change_when_caller_not_owner() public {
        vm.expectRevert(abi.encodeWithSelector(AdminAuth.SenderNotOwner.selector));
        cut.cancelContractChange(TEST_ID);
    }

    function test_start_wait_period_change_when_caller_not_owner() public {
        vm.expectRevert(abi.encodeWithSelector(AdminAuth.SenderNotOwner.selector));
        cut.startWaitPeriodChange(TEST_ID, 0);
    }

    function test_approve_wait_period_change_when_caller_not_owner() public {
        vm.expectRevert(abi.encodeWithSelector(AdminAuth.SenderNotOwner.selector));
        cut.approveWaitPeriodChange(TEST_ID);
    }

    function test_cancel_wait_period_change_when_caller_not_owner() public {
        vm.expectRevert(abi.encodeWithSelector(AdminAuth.SenderNotOwner.selector));
        cut.cancelWaitPeriodChange(TEST_ID);
    }

    function test_add_new_contract() public {
        address newContractAddr = address(this);
        uint256 _waitPeriod = 0;
        
        prank(Const.OWNER_ACC);
        vm.expectEmit(false, false, false, true, address(cut));
        emit AddNewContract(Const.OWNER_ACC, TEST_ID, newContractAddr, _waitPeriod);
        cut.addNewContract(TEST_ID, newContractAddr, _waitPeriod);

        address storedNewAddress = cut.getAddr(TEST_ID);
        assertEq(storedNewAddress, newContractAddr);
        assertTrue(cut.isRegistered(TEST_ID));

        (
            address contractAddr,
            uint256 waitPeriod,
            uint256 changeStartTime,
            bool inContractChange,
            bool inWaitPeriodChange,
            bool exists
        ) = cut.entries(TEST_ID);

        assertEq(contractAddr, newContractAddr);
        assertEq(waitPeriod, waitPeriod);
        assertEq(changeStartTime, 0);
        assertEq(inContractChange, false);
        assertEq(inWaitPeriodChange, false);
        assertEq(exists, true);
    }

    function test_add_new_contract_when_entry_already_exist() public {
        address newContractAddr = address(this);
        uint256 _waitPeriod = 0;
        
        prank(Const.OWNER_ACC);
        cut.addNewContract(TEST_ID, newContractAddr, _waitPeriod);

        prank(Const.OWNER_ACC);
        vm.expectRevert(abi.encodeWithSelector(EntryAlreadyExistsError.selector, TEST_ID));
        cut.addNewContract(TEST_ID, newContractAddr, _waitPeriod);
    }

    function test_should_revert_to_previous_address() public {
        startPrank(Const.OWNER_ACC);

        address previousContractAddr = address(0xaa);
        cut.addNewContract(TEST_ID, previousContractAddr, 0);

        address newContractAddr = address(0xbb);
        cut.startContractChange(TEST_ID, newContractAddr);

        cut.approveContractChange(TEST_ID);

        vm.expectEmit(false, false, false, true, address(cut));
        emit RevertToPreviousAddress(Const.OWNER_ACC, TEST_ID, newContractAddr, previousContractAddr);
        cut.revertToPreviousAddress(TEST_ID);

        address storedPreviousAddress = cut.getAddr(TEST_ID);
        assertEq(storedPreviousAddress, previousContractAddr);

        stopPrank();
    }

    function test_revert_to_previous_address_when_entry_does_not_exist() public {
        prank(Const.OWNER_ACC);
        vm.expectRevert(abi.encodeWithSelector(EntryNonExistentError.selector, TEST_ID));
        cut.revertToPreviousAddress(TEST_ID);
    }

    function test_revert_to_previous_address_when_previous_address_is_empty() public {
        startPrank(Const.OWNER_ACC);

        address previousContractAddr = address(0);
        cut.addNewContract(TEST_ID, previousContractAddr, 0);

        address newContractAddr = address(0xbb);
        cut.startContractChange(TEST_ID, newContractAddr);

        cut.approveContractChange(TEST_ID);

        vm.expectRevert(abi.encodeWithSelector(EmptyPrevAddrError.selector, TEST_ID));
        cut.revertToPreviousAddress(TEST_ID);

        stopPrank();
    }

    function test_should_start_contract_change() public {
        startPrank(Const.OWNER_ACC);

        address firstContractAddr = address(0xaa);
        cut.addNewContract(TEST_ID, firstContractAddr, 0);

        address newContractAddr = address(0xbb);
        vm.expectEmit(false, false, false, false, address(cut));
        emit StartContractChange(Const.OWNER_ACC, TEST_ID, firstContractAddr, newContractAddr);
        cut.startContractChange(TEST_ID, newContractAddr);

        (,,uint256 changeStartTime,bool inContractChange,,) = cut.entries(TEST_ID);
        assertEq(changeStartTime, block.timestamp);
        assertEq(inContractChange, true);

        assertEq(cut.pendingAddresses(TEST_ID), newContractAddr);

        stopPrank();
    }

    function test_start_contract_change_when_entry_does_not_exist() public {
        address newContractAddr = address(this);
        prank(Const.OWNER_ACC);
        vm.expectRevert(abi.encodeWithSelector(EntryNonExistentError.selector, TEST_ID));
        cut.startContractChange(TEST_ID, newContractAddr);
    }

    function test_start_contract_change_when_entry_already_in_wait_period_change() public {
        startPrank(Const.OWNER_ACC);

        address firstContractAddr = address(0xaa);
        cut.addNewContract(TEST_ID, firstContractAddr, 0);

        cut.startWaitPeriodChange(TEST_ID, 1);

        address newContractAddr = address(0xbb);
        vm.expectRevert(abi.encodeWithSelector(AlreadyInWaitPeriodChangeError.selector, TEST_ID));
        cut.startContractChange(TEST_ID, newContractAddr);
    }

    function test_approve_contract_change() public {
        startPrank(Const.OWNER_ACC);

        address firstContractAddr = address(0xaa);
        uint256 waitPeriod = 604800;
        cut.addNewContract(TEST_ID, firstContractAddr, waitPeriod);

        address newContractAddr = address(0xbb);
        cut.startContractChange(TEST_ID, newContractAddr);

        vm.warp(block.timestamp + waitPeriod);

        vm.expectEmit(false, false, false, true, address(cut));
        emit ApproveContractChange(Const.OWNER_ACC, TEST_ID, firstContractAddr, newContractAddr);
        cut.approveContractChange(TEST_ID);

        address storedPreviousAddress = cut.previousAddresses(TEST_ID);
        assertEq(storedPreviousAddress, firstContractAddr);

        address storedPendingAddress = cut.pendingAddresses(TEST_ID);
        assertEq(storedPendingAddress, address(0));

        (address contractAddr,,uint256 changeStartTime,bool inContractChange,,) = cut.entries(TEST_ID);
        assertEq(contractAddr, newContractAddr);
        assertEq(changeStartTime, 0);
        assertEq(inContractChange, false);

        stopPrank();
    }

    function test_approve_contract_change_when_entry_does_not_exist() public {
        prank(Const.OWNER_ACC);
        vm.expectRevert(abi.encodeWithSelector(EntryNonExistentError.selector, TEST_ID));
        cut.approveContractChange(TEST_ID);
    }

    function test_approve_contract_change_when_entry_not_in_contract_change() public {
        startPrank(Const.OWNER_ACC);

        address firstContractAddr = address(0xaa);
        cut.addNewContract(TEST_ID, firstContractAddr, 0);

        vm.expectRevert(abi.encodeWithSelector(EntryNotInChangeError.selector, TEST_ID));
        cut.approveContractChange(TEST_ID);

        stopPrank();
    }

    function test_approve_contract_change_when_change_not_ready() public {
        startPrank(Const.OWNER_ACC);

        address firstContractAddr = address(0xaa);
        uint256 waitPeriod = 604800;
        cut.addNewContract(TEST_ID, firstContractAddr, waitPeriod);

        address newContractAddr = address(0xbb);
        cut.startContractChange(TEST_ID, newContractAddr);

        vm.expectRevert(
            abi.encodeWithSelector(
                ChangeNotReadyError.selector,
                block.timestamp,
                (block.timestamp + waitPeriod)
            )
        );
        cut.approveContractChange(TEST_ID);

        stopPrank();
    }

    function test_cancel_contract_change() public {
        startPrank(Const.OWNER_ACC);

        address firstContractAddr = address(0xaa);
        cut.addNewContract(TEST_ID, firstContractAddr, 0);

        address newContractAddr = address(0xbb);
        cut.startContractChange(TEST_ID, newContractAddr);

        vm.expectEmit(false, false, false, true, address(cut));
        emit CancelContractChange(Const.OWNER_ACC, TEST_ID, newContractAddr, firstContractAddr);
        cut.cancelContractChange(TEST_ID);

        address storedPendingAddress = cut.pendingAddresses(TEST_ID);
        assertEq(storedPendingAddress, address(0));

        (address contractAddr,,uint256 changeStartTime,bool inContractChange,,) = cut.entries(TEST_ID);
        assertEq(contractAddr, firstContractAddr);
        assertEq(changeStartTime, 0);
        assertEq(inContractChange, false);

        stopPrank();
    }

    function test_cancel_contract_change_when_entry_does_not_exist() public {
        prank(Const.OWNER_ACC);
        vm.expectRevert(abi.encodeWithSelector(EntryNonExistentError.selector, TEST_ID));
        cut.cancelContractChange(TEST_ID);
    }

    function test_cancel_contract_change_when_entry_not_in_contract_change() public {
        startPrank(Const.OWNER_ACC);

        address firstContractAddr = address(0xaa);
        cut.addNewContract(TEST_ID, firstContractAddr, 0);

        vm.expectRevert(abi.encodeWithSelector(EntryNotInChangeError.selector, TEST_ID));
        cut.cancelContractChange(TEST_ID);

        stopPrank();
    }

    function test_start_wait_period_change() public {
        startPrank(Const.OWNER_ACC);

        address firstContractAddr = address(0xaa);
        cut.addNewContract(TEST_ID, firstContractAddr, 0);

        uint256 waitPeriod = 604800;
        vm.expectEmit(false, false, false, false, address(cut));
        emit StartWaitPeriodChange(Const.OWNER_ACC, TEST_ID, waitPeriod);
        cut.startWaitPeriodChange(TEST_ID, waitPeriod);

        (,,uint256 changeStartTime,bool inContractChange,bool inWaitPeriodChange,) = cut.entries(TEST_ID);
        assertEq(changeStartTime, block.timestamp);
        assertEq(inContractChange, false);
        assertEq(inWaitPeriodChange, true);

        assertEq(cut.pendingWaitTimes(TEST_ID), waitPeriod);

        stopPrank();
    }

    function test_start_wait_period_change_when_entry_does_not_exist() public {
        uint256 waitPeriod = 604800;
        prank(Const.OWNER_ACC);
        vm.expectRevert(abi.encodeWithSelector(EntryNonExistentError.selector, TEST_ID));
        cut.startWaitPeriodChange(TEST_ID, waitPeriod);
    }

    function test_start_wait_period_change_when_entry_already_in_contract_change() public {
        startPrank(Const.OWNER_ACC);

        address firstContractAddr = address(0xaa);
        cut.addNewContract(TEST_ID, firstContractAddr, 0);

        address newContractAddr = address(0xbb);
        cut.startContractChange(TEST_ID, newContractAddr);

        uint256 waitPeriod = 604800;
        vm.expectRevert(abi.encodeWithSelector(AlreadyInContractChangeError.selector, TEST_ID));
        cut.startWaitPeriodChange(TEST_ID, waitPeriod);
    }

    function test_approve_wait_period_change() public {
        startPrank(Const.OWNER_ACC);

        address firstContractAddr = address(0xaa);
        uint256 waitPeriod = 604800;
        cut.addNewContract(TEST_ID, firstContractAddr, waitPeriod);

        uint256 newWaitPeriod = 1209600;
        cut.startWaitPeriodChange(TEST_ID, newWaitPeriod);

        vm.warp(block.timestamp + waitPeriod);

        vm.expectEmit(false, false, false, true, address(cut));
        emit ApproveWaitPeriodChange(Const.OWNER_ACC, TEST_ID, waitPeriod, newWaitPeriod);
        cut.approveWaitPeriodChange(TEST_ID);

        (
            ,
            uint256 _waitPeriod,
            uint256 changeStartTime,
            bool inContractChange,
            bool inWaitPeriodChange
            ,
        ) = cut.entries(TEST_ID);

        assertEq(_waitPeriod, newWaitPeriod);
        assertEq(changeStartTime, 0);
        assertEq(inContractChange, false);
        assertEq(inWaitPeriodChange, false);

        assertEq(cut.pendingWaitTimes(TEST_ID), 0);

        stopPrank();
    }

    function test_approve_wait_period_change_when_entry_does_not_exist() public {
        prank(Const.OWNER_ACC);
        vm.expectRevert(abi.encodeWithSelector(EntryNonExistentError.selector, TEST_ID));
        cut.approveWaitPeriodChange(TEST_ID);
    }

    function test_approve_wait_period_change_when_entry_not_in_wait_period_change() public {
        startPrank(Const.OWNER_ACC);

        address firstContractAddr = address(0xaa);
        cut.addNewContract(TEST_ID, firstContractAddr, 0);

        vm.expectRevert(abi.encodeWithSelector(EntryNotInChangeError.selector, TEST_ID));
        cut.approveWaitPeriodChange(TEST_ID);

        stopPrank();
    }

    function test_approve_wait_period_change_when_change_not_ready() public {
        startPrank(Const.OWNER_ACC);

        address firstContractAddr = address(0xaa);
        uint256 waitPeriod = 604800;
        cut.addNewContract(TEST_ID, firstContractAddr, waitPeriod);

        uint256 newWaitPeriod = 1209600;
        uint256 changeStartTime = block.timestamp;
        cut.startWaitPeriodChange(TEST_ID, newWaitPeriod);

        uint256 momentJustBeforeChangeIsReady = changeStartTime + waitPeriod - 1;
        vm.warp(momentJustBeforeChangeIsReady);

        vm.expectRevert(
            abi.encodeWithSelector(
                ChangeNotReadyError.selector,
                momentJustBeforeChangeIsReady,
                (changeStartTime + waitPeriod)
            )
        );
        cut.approveWaitPeriodChange(TEST_ID);

        stopPrank();
    }

    function test_cancel_wait_period_change() public {
        startPrank(Const.OWNER_ACC);

        address firstContractAddr = address(0xaa);
        uint256 oldWaitPeriod = 0;
        cut.addNewContract(TEST_ID, firstContractAddr, oldWaitPeriod);

        uint256 newWaitPeriod = 604800;
        cut.startWaitPeriodChange(TEST_ID, newWaitPeriod);

        vm.expectEmit(false, false, false, true, address(cut));
        emit CancelWaitPeriodChange(Const.OWNER_ACC, TEST_ID, newWaitPeriod, oldWaitPeriod);
        cut.cancelWaitPeriodChange(TEST_ID);

        (,,uint256 changeStartTime,bool inContractChange,bool inWaitPeriodChange,) = cut.entries(TEST_ID);
        assertEq(changeStartTime, 0);
        assertEq(inContractChange, false);
        assertEq(inWaitPeriodChange, false);

        assertEq(cut.pendingWaitTimes(TEST_ID), 0);

        stopPrank();
    }

    function test_cancel_wait_period_change_when_entry_does_not_exist() public {
        prank(Const.OWNER_ACC);
        vm.expectRevert(abi.encodeWithSelector(EntryNonExistentError.selector, TEST_ID));
        cut.cancelWaitPeriodChange(TEST_ID);
    }

    function test_cancel_wait_period_change_when_entry_not_in_wait_period_change() public {
        startPrank(Const.OWNER_ACC);

        address firstContractAddr = address(0xaa);
        cut.addNewContract(TEST_ID, firstContractAddr, 0);

        vm.expectRevert(abi.encodeWithSelector(EntryNotInChangeError.selector, TEST_ID));
        cut.cancelWaitPeriodChange(TEST_ID);

        stopPrank();
    }
}
