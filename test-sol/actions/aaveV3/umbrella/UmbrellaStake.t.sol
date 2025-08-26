// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { IERC20 } from "../../../../contracts/interfaces/IERC20.sol";
import { IERC4626 } from "../../../../contracts/interfaces/IERC4626.sol";
import { IStaticATokenV2 } from "../../../../contracts/interfaces/aaveV3/IStaticATokenV2.sol";
import { UmbrellaStake } from "../../../../contracts/actions/aaveV3/umbrella/UmbrellaStake.sol";
import { SmartWallet } from "../../../utils/SmartWallet.sol";
import { Addresses } from "../../../utils/Addresses.sol";

import { TestUmbrellaCommon } from "./UmbrellaCommon.t.sol";

contract TestUmbrellaStake is TestUmbrellaCommon {
    /*//////////////////////////////////////////////////////////////////////////
                               CONTRACT UNDER TEST
    //////////////////////////////////////////////////////////////////////////*/
    UmbrellaStake cut;

    /*//////////////////////////////////////////////////////////////////////////
                                  SETUP FUNCTION
    //////////////////////////////////////////////////////////////////////////*/
    function setUp() public override {
        forkMainnet("UmbrellaStake");

        wallet = new SmartWallet(bob);
        sender = wallet.owner();
        walletAddr = wallet.walletAddr();

        cut = new UmbrellaStake();

        stkTokens = getStkTokens();
    }

    /*//////////////////////////////////////////////////////////////////////////
                                     TESTS
    //////////////////////////////////////////////////////////////////////////*/
    function test_stake() public {
        bool isDirect = false;
        bool useATokens = true;
        _baseTest(isDirect, useATokens);
    }

    function test_stake_action_direct() public {
        bool isDirect = true;
        bool useATokens = true;
        _baseTest(isDirect, useATokens);
    }

    function test_stake_with_underlying() public {
        bool isDirect = false;
        bool useATokens = false;
        _baseTest(isDirect, useATokens);
    }

    function _baseTest(bool _isDirect, bool _useATokens) internal {
        for (uint256 i = 0; i < stkTokens.length; ++i) {
            uint256 amount = 1000 * 10 ** IERC20(stkTokens[i]).decimals();

            address waTokenOrGHO = IERC4626(stkTokens[i]).asset();
            address supplyToken = waTokenOrGHO;

            if (supplyToken == Addresses.GHO_TOKEN) {
                give(supplyToken, sender, amount);
            } else if (_useATokens) {
                supplyToken = IStaticATokenV2(supplyToken).aToken();
                giveATokens(supplyToken, amount);
            } else {
                supplyToken = IERC4626(supplyToken).asset();
                give(supplyToken, sender, amount);
            }

            approveAsSender(sender, supplyToken, walletAddr, amount);

            uint256 minSharesOut = getMinSharesOut(stkTokens[i], waTokenOrGHO, amount);

            bytes memory executeActionCallData = executeActionCalldata(
                umbrellaStakeEncode(stkTokens[i], sender, sender, amount, _useATokens, minSharesOut), _isDirect
            );

            Snapshot memory snapshotBefore = takeSnapshot(stkTokens[i], waTokenOrGHO, supplyToken);
            wallet.execute(address(cut), executeActionCallData, 0);
            Snapshot memory snapshotAfter = takeSnapshot(stkTokens[i], waTokenOrGHO, supplyToken);

            _assertSnapshot(snapshotBefore, snapshotAfter, amount);
        }
    }

    function _assertSnapshot(Snapshot memory _snapshotBefore, Snapshot memory _snapshotAfter, uint256 _amount)
        internal
    {
        assertEq(_snapshotAfter.walletStkTokenBalance, 0);
        assertEq(_snapshotAfter.walletWaTokenBalance, 0);
        assertEq(_snapshotAfter.walletSupplyTokenBalance, 0);
        assertGt(_snapshotAfter.senderStkTokenBalance, _snapshotBefore.senderStkTokenBalance);
        assertEq(_snapshotAfter.senderWaTokenBalance, 0);
        assertEq(_snapshotAfter.senderSupplyTokenBalance, _snapshotBefore.senderSupplyTokenBalance - _amount);
    }
}
