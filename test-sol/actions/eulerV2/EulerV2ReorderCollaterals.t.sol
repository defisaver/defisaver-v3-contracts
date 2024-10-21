// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { IEVC } from "../../../contracts/interfaces/eulerV2/IEVC.sol";
import { EulerV2TestHelper } from "./EulerV2TestHelper.t.sol";
import {EulerV2CollateralSwitch} from "../../../contracts/actions/eulerV2/EulerV2CollateralSwitch.sol";
import {EulerV2ReorderCollaterals} from "../../../contracts/actions/eulerV2/EulerV2ReorderCollaterals.sol";

import { SmartWallet } from "../../utils/SmartWallet.sol";

contract TestEulerV2ReorderCollaterals is EulerV2TestHelper {
    
    /*//////////////////////////////////////////////////////////////////////////
                                CONTRACT UNDER TEST
    //////////////////////////////////////////////////////////////////////////*/
    EulerV2ReorderCollaterals cut;

    /*//////////////////////////////////////////////////////////////////////////
                                    VARIABLES
    //////////////////////////////////////////////////////////////////////////*/
    EulerV2CollateralSwitch collateralSwitch;
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

        collateralSwitch = new EulerV2CollateralSwitch();
        cut = new EulerV2ReorderCollaterals();
    }

    /*//////////////////////////////////////////////////////////////////////////
                                      TESTS
    //////////////////////////////////////////////////////////////////////////*/
    function test_should_reorder_collaterals_on_main_account() public  revertToSnapshot {
        address account = walletAddr;
        bool isDirect = false;
        address firstCollateral = E_USDC_2_GOVERNED;
        address secondCollateral = E_USDC_1_ESCROWED;

        _enableCollateral(account, firstCollateral);
        _enableCollateral(account, secondCollateral);

        uint8[] memory switchIndexes = new uint8[](2);
        switchIndexes[0] = 0;
        switchIndexes[1] = 1;

        uint8[][] memory indexes = new uint8[][](1);
        indexes[0] = switchIndexes;

        address[] memory expectedOrderedCollaterals = new address[](2);
        expectedOrderedCollaterals[0] = secondCollateral;
        expectedOrderedCollaterals[1] = firstCollateral;

        _baseTest(account, indexes, expectedOrderedCollaterals, isDirect);
    }

    function test_should_reorder_collaterals_on_default_account_with_action_direct() public revertToSnapshot {
        address account = address(0);
        bool isDirect = true;
        address firstCollateral = E_USDC_2_GOVERNED;
        address secondCollateral = E_USDC_1_ESCROWED;
        address thirdCollateral = E_WETH_2_GOVERNED;

        _enableCollateral(account, firstCollateral);
        _enableCollateral(account, secondCollateral);
        _enableCollateral(account, thirdCollateral);

        uint8[] memory switchIndexes = new uint8[](2);
        switchIndexes[0] = 1;
        switchIndexes[1] = 2;

        uint8[][] memory indexes = new uint8[][](1);
        indexes[0] = switchIndexes;

        address[] memory expectedOrderedCollaterals = new address[](3);
        expectedOrderedCollaterals[0] = firstCollateral;
        expectedOrderedCollaterals[1] = thirdCollateral;
        expectedOrderedCollaterals[2] = secondCollateral;

        _baseTest(account, indexes, expectedOrderedCollaterals, isDirect);
    }

    function test_should_reorder_collaterals_on_sub_account() public revertToSnapshot {
        address account = getSubAccount(walletAddr, 0x01);
        bool isDirect = true;
        address A = E_USDC_2_GOVERNED;
        address B = E_USDC_1_ESCROWED;
        address C = E_WETH_2_GOVERNED;
        address D = E_WSTETH_1_ESCROWED;

        _enableCollateral(account, A);
        _enableCollateral(account, B);
        _enableCollateral(account, C);
        _enableCollateral(account, D);

        // Before => A - B - C - D
        // Goal => B - D - C - A
        // Steps:
        // 1. Switch A with D: D - B - C - A
        // 2. Switch D with B: B - D - C - A

        uint8[] memory firstSwitch = new uint8[](2);
        firstSwitch[0] = 0;
        firstSwitch[1] = 3;

        uint8[] memory secondSwitch = new uint8[](2);
        secondSwitch[0] = 0;
        secondSwitch[1] = 1;

        uint8[][] memory indexes = new uint8[][](2);
        indexes[0] = firstSwitch;
        indexes[1] = secondSwitch;

        address[] memory expectedOrderedCollaterals = new address[](4);
        expectedOrderedCollaterals[0] = B;
        expectedOrderedCollaterals[1] = D;
        expectedOrderedCollaterals[2] = C;
        expectedOrderedCollaterals[3] = A;

        _baseTest(account, indexes, expectedOrderedCollaterals, isDirect);
    }

    function _baseTest(
        address _account,
        uint8[][] memory _indexes,
        address[] memory _expectedOrderedCollaterals,
        bool _isDirect
    ) internal {
        bytes memory executeActionCallData = executeActionCalldata(
            eulerV2ReorderCollaterals(
                _account,
                _indexes
            ),
            _isDirect
        );

        address account = _account == address(0) ? walletAddr : _account;

        wallet.execute(address(cut), executeActionCallData, 0);

        address[] memory accountCollaterals = IEVC(EVC_ADDR).getCollaterals(account);

        for (uint256 i = 0; i < accountCollaterals.length; i++) {
            assertEq(accountCollaterals[i], _expectedOrderedCollaterals[i]);
        }
    }

    function _enableCollateral(address _account, address _vault) internal {
        bytes memory executeActionCallData = executeActionCalldata(
            eulerV2CollateralSwitchEncode(
                _vault,
                _account,
                true
            ),
            true
        );
        wallet.execute(address(collateralSwitch), executeActionCallData, 0);
    }
}
