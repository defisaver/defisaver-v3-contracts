// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { IEVC } from "../../../contracts/interfaces/eulerV2/IEVC.sol";
import { EulerV2TestHelper } from "./EulerV2TestHelper.t.sol";
import {EulerV2CollateralSwitch} from "../../../contracts/actions/eulerV2/EulerV2CollateralSwitch.sol";

import { SmartWallet } from "../../utils/SmartWallet.sol";

contract TestEulerV2CollateralSwitch is EulerV2TestHelper {
    
    /*//////////////////////////////////////////////////////////////////////////
                                CONTRACT UNDER TEST
    //////////////////////////////////////////////////////////////////////////*/
    EulerV2CollateralSwitch cut;

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
        initTestPairs("EulerV2");

        wallet = new SmartWallet(bob);
        sender = wallet.owner();
        walletAddr = wallet.walletAddr();

        cut = new EulerV2CollateralSwitch();
    }

    /*//////////////////////////////////////////////////////////////////////////
                                      TESTS
    //////////////////////////////////////////////////////////////////////////*/
    function test_should_enable_collateral_on_main_account() public revertToSnapshot {
        address account = walletAddr;
        address collateralVault = E_USDC_2_GOVERNED;
        bool enableAsColl = true;
        bool isDirect = false;

        _baseTest(account, collateralVault, enableAsColl, isDirect);
    }

    function test_should_disable_collateral_on_default_account() public revertToSnapshot{
        address account = address(0);
        address collateralVault = E_USDC_2_GOVERNED;
        bool isDirect = false;

        _baseTest(account, collateralVault, true, isDirect);
        _baseTest(account, collateralVault, false, isDirect);
    }

    function test_should_enable_collateral_with_action_direct() public revertToSnapshot {
        address account = walletAddr;
        address collateralVault = E_USDC_2_GOVERNED;
        bool enableAsColl = true;
        bool isDirect = true;

        _baseTest(account, collateralVault, enableAsColl, isDirect);
    }

    function test_should_enable_two_collaterals_and_disable_last() public revertToSnapshot {
        address account = walletAddr;
        address firstCollateralVault = E_USDC_2_GOVERNED;
        address secondCollateralVault = E_WETH_2_GOVERNED;
        bool isDirect = true;

        _baseTest(account, firstCollateralVault, true, isDirect);
        _baseTest(account, secondCollateralVault, true, isDirect);
        _baseTest(account, secondCollateralVault, false, isDirect);

        address[] memory accountCollaterals = IEVC(EVC_ADDR).getCollaterals(account);
        assertEq(accountCollaterals.length, 1);
        assertEq(accountCollaterals[0], firstCollateralVault);
    }

    function test_should_enable_collateral_on_sub_account() public revertToSnapshot {
        address account = getSubAccount(walletAddr, 0x01);
        address collateralVault = E_USDC_2_GOVERNED;
        bool enableAsColl = true;
        bool isDirect = true;

        _baseTest(account, collateralVault, enableAsColl, isDirect);
    }

    function _baseTest(
        address _account,
        address _vault,
        bool _enableAsColl,
        bool _isDirect
    ) internal {
        bytes memory executeActionCallData = executeActionCalldata(
            eulerV2CollateralSwitchEncode(
                _vault,
                _account,
                _enableAsColl
            ),
            _isDirect
        );

        address account = _account == address(0) ? walletAddr : _account;

        wallet.execute(address(cut), executeActionCallData, 0);

        assertEq(IEVC(EVC_ADDR).isCollateralEnabled(account, _vault), _enableAsColl);
    }
}
