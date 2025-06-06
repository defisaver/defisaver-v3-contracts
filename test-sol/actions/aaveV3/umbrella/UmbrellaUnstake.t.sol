// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { IERC20 } from "../../../../contracts/interfaces/IERC20.sol";
import { IERC4626 } from "../../../../contracts/interfaces/IERC4626.sol";
import { IStaticATokenV2 } from "../../../../contracts/interfaces/aaveV3/IStaticATokenV2.sol";
import { UmbrellaStake } from "../../../../contracts/actions/aaveV3/umbrella/UmbrellaStake.sol";
import { UmbrellaUnstake } from "../../../../contracts/actions/aaveV3/umbrella/UmbrellaUnstake.sol";
import { SmartWallet } from "../../../utils/SmartWallet.sol";
import { Addresses } from "../../../utils/Addresses.sol";
import { TestUmbrellaCommon } from "./UmbrellaCommon.t.sol";

contract TestUmbrellaUnstake is TestUmbrellaCommon {
    
    /*//////////////////////////////////////////////////////////////////////////
                               CONTRACTS UNDER TEST
    //////////////////////////////////////////////////////////////////////////*/
    UmbrellaUnstake cut;

    /*//////////////////////////////////////////////////////////////////////////
                                    VARIABLES
    //////////////////////////////////////////////////////////////////////////*/
    uint256 constant COOLDOWN_SECONDS = 20 days;

    UmbrellaStake stakeAction;


    /*//////////////////////////////////////////////////////////////////////////
                                  SETUP FUNCTION
    //////////////////////////////////////////////////////////////////////////*/
    function setUp() public override {
        forkMainnetLatest();
        
        wallet = new SmartWallet(bob);
        sender = wallet.owner();
        walletAddr = wallet.walletAddr();

        cut = new UmbrellaUnstake();

        stakeAction = new UmbrellaStake();
        stkTokens = getStkTokens();
    }

    /*//////////////////////////////////////////////////////////////////////////
                                     TESTS
    //////////////////////////////////////////////////////////////////////////*/
    function test_unstake_partial() public {
        bool isDirect = false;
        bool isMaxAmount = false;
        _baseTest(isDirect, isMaxAmount);
    }

    function test_unstake_action_direct() public {
        bool isDirect = true;
        bool isMaxAmount = false;
        _baseTest(isDirect, isMaxAmount);
    }

    function test_unstake_max_amount() public {
        bool isDirect = false;
        bool isMaxAmount = true;
        _baseTest(isDirect, isMaxAmount);
    }

    function _baseTest(bool _isDirect, bool _isMaxAmount) internal {
        for (uint256 i = 0; i < stkTokens.length; ++i) {
            uint256 amount = 1000 * 10 ** IERC20(stkTokens[i]).decimals();
            
            _stake(stkTokens[i], amount, _isDirect);
            _startCooldown(stkTokens[i]);
            _passCooldownPeriod();

            uint256 unstakeAmount = _isMaxAmount ? amount : amount / 2;
            uint256 minOutOrMaxBurn = _isMaxAmount
                ? _getMinWithdraw(stkTokens[i])
                : _getMaxBurnShares(stkTokens[i], unstakeAmount);
            
            bytes memory unstakeCallData = executeActionCalldata(
                umbrellaUnstakeEncode(
                    stkTokens[i],
                    sender,
                    _isMaxAmount ? type(uint256).max : unstakeAmount,
                    minOutOrMaxBurn
                ),
                _isDirect
            );

            Snapshot memory snapshotBefore = takeSnapshot(
                stkTokens[i],
                IERC4626(stkTokens[i]).asset(),
                _getSupplyToken(stkTokens[i])
            );
            
            wallet.execute(address(cut), unstakeCallData, 0);
            
            Snapshot memory snapshotAfter = takeSnapshot(
                stkTokens[i],
                IERC4626(stkTokens[i]).asset(),
                _getSupplyToken(stkTokens[i])
            );
            
            _assertSnapshot(
                snapshotBefore,
                snapshotAfter,
                unstakeAmount,
                _isMaxAmount
            );
        }
    }

    function _startCooldown(address _stkToken) internal {
        bytes memory startCooldownCallData = executeActionCalldata(
            umbrellaUnstakeEncode(
                _stkToken,
                sender,
                0,
                0
            ),
            true
        );
        wallet.execute(address(cut), startCooldownCallData, 0);
    }

    function _passCooldownPeriod() internal {
        vm.warp(block.timestamp + COOLDOWN_SECONDS);
    }

    function _stake(address _stkToken, uint256 _amount, bool _isDirect) internal {
        address supplyToken = _getSupplyToken(_stkToken);

        if (supplyToken != Addresses.GHO_TOKEN) {
            giveATokens(supplyToken, _amount);
        } else {
            give(supplyToken, sender, _amount);
        }

        approveAsSender(sender, supplyToken, walletAddr, _amount);

        bytes memory stakeCallData = executeActionCalldata(
            umbrellaStakeEncode(
                _stkToken,
                sender,
                walletAddr, // keep stake on the wallet so we can call unstake later
                _amount,
                1 /* minSharesOut */
            ),
            _isDirect
        );

        wallet.execute(address(stakeAction), stakeCallData, 0);
    }

    function _getSupplyToken(address _stkToken) internal view returns (address) {
        address waTokenOrGHO = IERC4626(_stkToken).asset();
        if (waTokenOrGHO == Addresses.GHO_TOKEN) {
            return waTokenOrGHO;
        }
        return IStaticATokenV2(waTokenOrGHO).aToken();
    }

    function _getMaxBurnShares(address _stkToken, uint256 _amount) internal view returns (uint256) {
        return IERC4626(_stkToken).previewWithdraw(_amount) * 1001 / 1000; // 0.1% slippage tolerance
    }

    function _getMinWithdraw(address _stkToken) internal view returns (uint256) {
        address waTokenOrGHO = IERC4626(_stkToken).asset();
        uint256 senderShares = IERC4626(_stkToken).balanceOf(sender);
        uint256 minWithdraw = IERC4626(_stkToken).previewRedeem(senderShares);

        if (waTokenOrGHO != Addresses.GHO_TOKEN) {
            minWithdraw = IERC4626(waTokenOrGHO).previewRedeem(minWithdraw);
        }

        return minWithdraw * 1000 / 1001;
    }

    function _assertSnapshot(
        Snapshot memory _snapshotBefore,
        Snapshot memory _snapshotAfter,
        uint256 _unstakeAmount,
        bool _isMaxAmount
    ) internal {
        assertEq(_snapshotAfter.walletWaTokenBalance, 0);
        assertEq(_snapshotAfter.walletSupplyTokenBalance, 0);
        assertEq(_snapshotAfter.senderWaTokenBalance, 0);
        assertEq(_snapshotAfter.senderStkTokenBalance, 0);
        assertGt(_snapshotAfter.senderSupplyTokenBalance, _snapshotBefore.senderSupplyTokenBalance + _unstakeAmount);

        if (_isMaxAmount) {
            assertEq(_snapshotAfter.walletStkTokenBalance, 0);
        } else {
            assertLt(_snapshotAfter.walletStkTokenBalance, _snapshotBefore.walletStkTokenBalance);
        }
    }
} 