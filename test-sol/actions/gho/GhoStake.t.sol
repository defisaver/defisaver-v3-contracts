// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { BaseTest } from "../../utils/BaseTest.sol";
import { SmartWallet } from "../../utils/SmartWallet.sol";
import { GhoStake } from "../../../contracts/actions/aaveV3/GhoStake.sol";
import { ActionsUtils } from "../../utils/ActionsUtils.sol";
import { AaveV3Helper } from "../../../contracts/actions/aaveV3/helpers/AaveV3Helper.sol";

contract TestGhoStake is BaseTest, ActionsUtils, AaveV3Helper {
    
    /*//////////////////////////////////////////////////////////////////////////
                               CONTRACT UNDER TEST
    //////////////////////////////////////////////////////////////////////////*/
    GhoStake cut;

    /*//////////////////////////////////////////////////////////////////////////
                                    VARIABLES
    //////////////////////////////////////////////////////////////////////////*/
    SmartWallet wallet;
    address walletAddr;
    address sender;

    struct TestConfig {
        address from;
        address to;
        uint256 amount;
        bool isDirect;
    }

    /*//////////////////////////////////////////////////////////////////////////
                                  SETUP FUNCTION
    //////////////////////////////////////////////////////////////////////////*/
    function setUp() public override {
        forkMainnetLatest();
        
        wallet = new SmartWallet(bob);
        sender = wallet.owner();
        walletAddr = wallet.walletAddr();

        cut = new GhoStake();    
    }

    /*//////////////////////////////////////////////////////////////////////////
                                     TESTS
    //////////////////////////////////////////////////////////////////////////*/
    function test_gho_stake() public {
        _baseTest(TestConfig({
            from: sender,
            to: walletAddr,
            amount: 1000e18,
            isDirect: false
        }));
    }

    function test_gho_stake_direct() public {
        _baseTest(TestConfig({
            from: sender,
            to: walletAddr,
            amount: 1000e18,
            isDirect: true
        }));
    }

    /*//////////////////////////////////////////////////////////////////////////
                                     HELPERS
    //////////////////////////////////////////////////////////////////////////*/
    function _baseTest(
        TestConfig memory _config
    ) internal {
        give(GHO_TOKEN, _config.from, _config.amount);
        approveAsSender(_config.from, GHO_TOKEN, walletAddr, _config.amount);

        bytes memory callData = executeActionCalldata(
            ghoStakeEncode(
                _config.from,
                _config.to,
                _config.amount
            ),
            _config.isDirect
        );

        uint256 ghoBalanceBefore = balanceOf(GHO_TOKEN, _config.from);
        uint256 stkGhoBalanceBefore = balanceOf(STAKED_GHO_TOKEN, _config.to);

        wallet.execute(address(cut), callData, 0);

        uint256 ghoBalanceAfter = balanceOf(GHO_TOKEN, _config.from);
        uint256 stkGhoBalanceAfter = balanceOf(STAKED_GHO_TOKEN, _config.to);

        assertEq(ghoBalanceAfter, ghoBalanceBefore - _config.amount);
        assertEq(stkGhoBalanceAfter, stkGhoBalanceBefore + _config.amount);
    }
}
