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
        forkMainnet("UmbrellaUnstake");
        
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
        bool useATokens = true;
        _baseTest(isDirect, isMaxAmount, useATokens);
    }

    function test_unstake_partial_to_underlying() public {
        bool isDirect = false;
        bool isMaxAmount = false;
        bool useATokens = false;
        _baseTest(isDirect, isMaxAmount, useATokens);
    }

    function test_unstake_action_direct() public {
        bool isDirect = true;
        bool isMaxAmount = false;
        bool useATokens = true;
        _baseTest(isDirect, isMaxAmount, useATokens);
    }

    function test_unstake_max_amount() public {
        bool isDirect = false;
        bool isMaxAmount = true;
        bool useATokens = true;
        _baseTest(isDirect, isMaxAmount, useATokens);
    }

    function test_unstake_max_amount_to_underlying() public {
        bool isDirect = false;
        bool isMaxAmount = true;
        bool useATokens = false;
        _baseTest(isDirect, isMaxAmount, useATokens);
    }

    function _baseTest(
        bool _isDirect,
        bool _isMaxAmount,
        bool _useATokens
    ) internal {
        for (uint256 i = 0; i < stkTokens.length; ++i) {
            uint256 amount = 1000 * 10 ** IERC20(stkTokens[i]).decimals();
            
            _stake(stkTokens[i], amount, _isDirect);
            _startCooldown(stkTokens[i]);
            _passCooldownPeriod();

            uint256 totalStkShares = IERC4626(stkTokens[i]).balanceOf(walletAddr);
            uint256 unstakeAmount = _isMaxAmount ? totalStkShares : totalStkShares / 2;
            uint256 minAmountOut = _getMinAmountOut(stkTokens[i], unstakeAmount);
            
            bytes memory unstakeCallData = executeActionCalldata(
                umbrellaUnstakeEncode(
                    stkTokens[i],
                    sender,
                    _isMaxAmount ? type(uint256).max : unstakeAmount,
                    _useATokens,
                    minAmountOut
                ),
                _isDirect
            );

            address waTokenOrGHO = IERC4626(stkTokens[i]).asset();

            Snapshot memory snapshotBefore = takeSnapshot(
                stkTokens[i],
                waTokenOrGHO,
                _getSupplyToken(stkTokens[i], _useATokens)
            );
            
            wallet.execute(address(cut), unstakeCallData, 0);
            
            Snapshot memory snapshotAfter = takeSnapshot(
                stkTokens[i],
                waTokenOrGHO,
                _getSupplyToken(stkTokens[i], _useATokens)
            );
            
            _assertSnapshot(
                snapshotBefore,
                snapshotAfter,
                unstakeAmount,
                _isMaxAmount,
                waTokenOrGHO
            );
        }
    }

    function _startCooldown(address _stkToken) internal {
        bytes memory startCooldownCallData = executeActionCalldata(
            umbrellaUnstakeEncode(
                _stkToken,
                sender,
                0,
                false,
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
        address supplyToken = _getSupplyToken(_stkToken, true);

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
                true, /* useATokens */
                1 /* minSharesOut */
            ),
            _isDirect
        );

        wallet.execute(address(stakeAction), stakeCallData, 0);
    }

    function _getSupplyToken(address _stkToken, bool _useATokens) internal view returns (address) {
        address waTokenOrGHO = IERC4626(_stkToken).asset();
        if (waTokenOrGHO == Addresses.GHO_TOKEN) {
            return waTokenOrGHO;
        }
        if (_useATokens) {
            return IStaticATokenV2(waTokenOrGHO).aToken();
        }
        return IERC4626(waTokenOrGHO).asset();
    }

    function _getMinAmountOut(address _stkToken, uint256 _shares) internal view returns (uint256) {
        address waTokenOrGHO = IERC4626(_stkToken).asset();
        uint256 minWithdraw = IERC4626(_stkToken).previewRedeem(_shares);

        if (waTokenOrGHO != Addresses.GHO_TOKEN) {
            minWithdraw = IERC4626(waTokenOrGHO).previewRedeem(minWithdraw);
        }

        return minWithdraw * 1000 / 1001;
    }

    function _assertSnapshot(
        Snapshot memory _snapshotBefore,
        Snapshot memory _snapshotAfter,
        uint256 _unstakeAmount,
        bool _isMaxAmount,
        address _waTokenOrGHO
    ) internal {
        assertEq(_snapshotAfter.walletWaTokenBalance, 0, "walletWaTokenBalance should be 0");
        assertEq(_snapshotAfter.walletSupplyTokenBalance, 0, "walletSupplyTokenBalance should be 0");
        if (_waTokenOrGHO != Addresses.GHO_TOKEN) {
            assertEq(_snapshotAfter.senderWaTokenBalance, 0, "senderWaTokenBalance should be 0");
        }
        assertEq(_snapshotAfter.senderStkTokenBalance, 0, "senderStkTokenBalance should be 0");
        assertGe(
            _snapshotAfter.senderSupplyTokenBalance,
            _snapshotBefore.senderSupplyTokenBalance + _unstakeAmount,
            "senderSupplyTokenBalance should be greater or equal than before"
        );

        if (_isMaxAmount) {
            assertEq(_snapshotAfter.walletStkTokenBalance, 0);
        } else {
            assertLt(_snapshotAfter.walletStkTokenBalance, _snapshotBefore.walletStkTokenBalance);
        }
    }
} 