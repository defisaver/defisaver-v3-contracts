// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { IRewardsToken } from "../../../contracts/interfaces/eulerV2/IRewardsToken.sol";
import { EulerV2ClaimRewards } from "../../../contracts/actions/eulerV2/EulerV2ClaimRewards.sol";
import { EulerV2TestHelper } from "./EulerV2TestHelper.t.sol";

import { SmartWallet } from "../../utils/SmartWallet.sol";
import { console } from "forge-std/console.sol";

contract TestEulerV2ClaimRewards is EulerV2TestHelper {
    
    /*//////////////////////////////////////////////////////////////////////////
                                CONTRACT UNDER TEST
    //////////////////////////////////////////////////////////////////////////*/
    EulerV2ClaimRewards cut;

    /*//////////////////////////////////////////////////////////////////////////
                                    VARIABLES
    //////////////////////////////////////////////////////////////////////////*/
    uint256 public constant WHITELIST_STATUS_ADMIN = 1;
    uint256 public constant TEST_DEPOSIT_AMOUNT = 1 ether;
    uint256 public constant WAIT_FULL_CLAIM_PERIOD = 180 days;

    SmartWallet wallet;
    address sender;
    address walletAddr;

    address rEULOwner;
    address rEULAdmin;
    IRewardsToken rEUL;
    address rEULUnderlying;

    /*//////////////////////////////////////////////////////////////////////////
                                   SETUP FUNCTION
    //////////////////////////////////////////////////////////////////////////*/
    function setUp() public override {
        forkMainnetLatest();
        initTestPairs("EulerV2");

        wallet = new SmartWallet(bob);
        sender = wallet.owner();
        walletAddr = wallet.walletAddr();

        cut = new EulerV2ClaimRewards();
        rEUL = IRewardsToken(REWARDS_EUL_TOKEN);
        rEULOwner = rEUL.owner();
        rEULAdmin = address(0xadadad);
        rEULUnderlying = rEUL.underlying();

        vm.prank(rEULOwner);
        rEUL.setWhitelistStatus(rEULAdmin, WHITELIST_STATUS_ADMIN);
        vm.stopPrank();
    }

    /*//////////////////////////////////////////////////////////////////////////
                                      TESTS
    //////////////////////////////////////////////////////////////////////////*/
    function test_claim_all_rewards_from_particular_lock() public {
        bool singleLock = true;
        bool allowLoss = false;

        _baseTest(singleLock, allowLoss);
    }

    function test_claim_rewards_with_loss_from_particular_lock() public {
        bool singleLock = true;
        bool allowLoss = true;

        _baseTest(singleLock, allowLoss);
    }

    function test_claim_all_rewards_from_all_locks() public {
        bool singleLock = false;
        bool allowLoss = false;

        _baseTest(singleLock, allowLoss);
    }

    function test_claim_rewards_with_loss_from_all_locks() public {
        bool singleLock = false;
        bool allowLoss = true;

        _baseTest(singleLock, allowLoss);
    }

    function _baseTest(bool _singleLock, bool _allowLoss) internal {
        if (_singleLock) {
            _createLock();
        } else {
            _createLock();
            vm.warp(block.timestamp +  7 days);
            _createLock();
        }

        if (_allowLoss) {
            vm.warp(block.timestamp + 10 days);
        } else {
            vm.warp(block.timestamp + WAIT_FULL_CLAIM_PERIOD);
        }

        (uint256[] memory lockTimestamps, uint256[] memory amounts ) = rEUL.getLockedAmounts(walletAddr);
        uint256 totalClaimedAmount;
        for (uint256 i = 0; i < amounts.length; ++i) {
            totalClaimedAmount += amounts[i];
            console.log('lockTimestamps[i]: ', lockTimestamps[i]);
            console.log('amounts[i]: ', amounts[i]);
        }

        uint256[] memory singleLockTimestamps = new uint256[](1);
        if (_singleLock) {
            singleLockTimestamps[0] = lockTimestamps[0];
        }

        bytes memory executeActionCallData = executeActionCalldata(
            eulerV2ClaimRewardsEncode(
                sender,
                !_singleLock,
                _allowLoss,
                _singleLock ? singleLockTimestamps : lockTimestamps
            ),
            true
        );

        uint256 senderAssetBalanceBefore = balanceOf(rEULUnderlying, sender);
        wallet.execute(address(cut), executeActionCallData, 0);
        uint256 senderAssetBalanceAfter = balanceOf(rEULUnderlying, sender);

        if (_singleLock) {
            assertEq(senderAssetBalanceAfter, senderAssetBalanceBefore + amounts[0]);
        } else {
            assertEq(senderAssetBalanceAfter, senderAssetBalanceBefore + totalClaimedAmount);
        }
        if (!_singleLock) {
            (lockTimestamps, ) = rEUL.getLockedAmounts(walletAddr);
            assertEq(lockTimestamps.length, 0);
        }
    }

    function _createLock() internal {
        vm.startPrank(rEULAdmin);
        rEUL.depositFor(walletAddr, TEST_DEPOSIT_AMOUNT);
        vm.stopPrank();
    }
}
