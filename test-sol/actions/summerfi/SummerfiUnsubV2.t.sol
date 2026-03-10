// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { BaseTest } from "test-sol/utils/BaseTest.sol";
import { ActionsUtils } from "test-sol/utils/ActionsUtils.sol";
import { RegistryUtils } from "test-sol/utils/RegistryUtils.sol";
import { SFProxyUtils } from "test-sol/utils/summerfi/SFProxyUtils.sol";
import { SummerfiUnsubV2 } from "contracts/actions/summerfi/SummerfiUnsubV2.sol";
import { RecipeExecutor } from "contracts/core/RecipeExecutor.sol";
import { StrategyModel } from "contracts/core/strategy/StrategyModel.sol";
import { SFProxyEntryPoint } from "contracts/actions/summerfi/SFProxyEntryPoint.sol";
import {
    IAccountImplementation
} from "contracts/interfaces/protocols/summerfi/IAccountImplementation.sol";

contract SummerfiUnsubV2Test is BaseTest, ActionsUtils, RegistryUtils, SFProxyUtils {
    /*//////////////////////////////////////////////////////////////////////////
                               CONTRACT UNDER TEST
    //////////////////////////////////////////////////////////////////////////*/
    SummerfiUnsubV2 cut;

    /*//////////////////////////////////////////////////////////////////////////
                                    VARIABLES
    //////////////////////////////////////////////////////////////////////////*/
    IAccountImplementation sfProxy;
    address owner;
    address sfProxyEntryPoint;
    RecipeExecutor recipeExecutor;

    uint256[][] triggerIds;
    bytes[][] triggerData;
    bool[] removeAllowance;

    /*//////////////////////////////////////////////////////////////////////////
                                  SETUP FUNCTION
    //////////////////////////////////////////////////////////////////////////*/
    function setUp() public override {
        forkMainnet("SummerfiUnsubV2");

        cut = new SummerfiUnsubV2();
        recipeExecutor = new RecipeExecutor();

        redeploy("RecipeExecutor", address(recipeExecutor));
        redeploy("SFProxyEntryPoint", address(new SFProxyEntryPoint()));
        redeploy("SummerfiUnsubV2", address(cut));
        sfProxyEntryPoint = getAddr("SFProxyEntryPoint");

        owner = 0xDDc68f9dE415ba2fE2FD84bc62Be2d2CFF1098dA;
        sfProxy = IAccountImplementation(0xce049ff57d4146d5bE3a55E60Ef4523bB70798b6);

        _whitelistSFProxyEntryPoint();

        // Initialize triggerIds: 4 arrays, each with 1 element
        triggerIds = new uint256[][](4);
        triggerIds[0] = new uint256[](1);
        triggerIds[0][0] = 10_000_000_304;
        triggerIds[1] = new uint256[](1);
        triggerIds[1][0] = 10_000_000_795;
        triggerIds[2] = new uint256[](1);
        triggerIds[2][0] = 10_000_000_794;
        triggerIds[3] = new uint256[](1);
        triggerIds[3][0] = 10_000_000_672;

        // Initialize triggerData: 4 arrays, each with 1 element
        triggerData = new bytes[][](4);
        triggerData[0] = new bytes[](1);
        triggerData[0][0] =
            hex"000000000000000000000000ce049ff57d4146d5be3a55e60ef4523bb70798b6000000000000000000000000000000000000000000000000000000000000007f0000000000000000000000000000000000000000000000000000000059681628000000000000000000000000a0b86991c6218b36c1d19d4a2e9eb0ce3606eb480000000000000000000000002260fac5e5542a773aa44fbcfedf7c193bc2c599436c6f7365416e6452656d61696e414156455633506f736974696f6e0000000000000000000000000000000000000000000000000000000000000000000010ca";
        triggerData[1] = new bytes[](1);
        triggerData[1][0] =
            hex"000000000000000000000000ce049ff57d4146d5be3a55e60ef4523bb70798b6000000000000000000000000000000000000000000000000000000000000008600000000000000000000000000000000000000000000005150ae84a8cdf000000000000000000000000000006b175474e89094c44da98b954eedeac495271d0f0000000000000000000000007f39c581f595b53c5cb19bd0b3f8da6c935e2ca0537061726b5769746864726177546f446562745f6175746f0000000000000000000000000000000000000000000000000000000000000000000000000000038e0000000000000000000000000000000000000000000000000000000000000582000000000000000000000000000000000000000000000000000000d18c2e280000000000000000000000000000000000000000000000000000000000000000640000000000000000000000000000000000000000000000000000000000000001";
        triggerData[2] = new bytes[](1);
        triggerData[2][0] =
            hex"000000000000000000000000ce049ff57d4146d5be3a55e60ef4523bb70798b6000000000000000000000000000000000000000000000000000000000000008300000000000000000000000000000000000000000000005150ae84a8cdf000000000000000000000000000006b175474e89094c44da98b954eedeac495271d0f0000000000000000000000007f39c581f595b53c5cb19bd0b3f8da6c935e2ca0537061726b41646a7573745269736b55705f4175746f5f340000000000000000000000000000000000000000000000000000000000000000000000000000044c00000000000000000000000000000000000000000000000000000000000008fc000000000000000000000000000000000000000000000000000000ba43b740000000000000000000000000000000000000000000000000000000000000000064000000000000000000000000000000000000000000000000000000000000012c";
        triggerData[3] = new bytes[](1);
        triggerData[3][0] =
            hex"000000000000000000000000ce049ff57d4146d5be3a55e60ef4523bb70798b600000000000000000000000000000000000000000000000000000000000027190000000000000000000000000000000000000000000000000214e8348c4f0000000000000000000000000000a0b86991c6218b36c1d19d4a2e9eb0ce3606eb480000000000000000000000002260fac5e5542a773aa44fbcfedf7c193bc2c5994d6f7270686f426c7565436c6f7365416e6452656d61696e5f6175746f0000003a85e619751152991742810df6ec69ce473daef99e28a64ab2340d7b7ccfee49000000000000000000000000f4030086522a5beea4988f8ca5b36dbc97bee88c00000000000000000000000000000000000000000000000600000000000052150000000000000000000000008fffffd4afb6115b954bd326cbe7b4ba576818f6000000000000000000000000000000000000000000000003000000000000004d000000000000000000000000000000000000000000000000000002f7072458000000000000000000000000000000000000000000000000000000000000000001";

        // Initialize removeAllowance: 4 elements (one for each trigger)
        removeAllowance = new bool[](4);
        removeAllowance[0] = false;
        removeAllowance[1] = false;
        removeAllowance[2] = false;
        removeAllowance[3] = false;
    }

    /*//////////////////////////////////////////////////////////////////////////
                                     TESTS
    //////////////////////////////////////////////////////////////////////////*/
    function test_UnsubV2() public {
        bytes memory paramsCallData =
            SummerfiUnsubV2Encode(triggerIds, triggerData, removeAllowance);

        bytes[] memory actionsCalldata = new bytes[](1);
        actionsCalldata[0] = paramsCallData;

        bytes4[] memory actionIds = new bytes4[](1);
        actionIds[0] = bytes4(keccak256("SummerfiUnsubV2"));

        StrategyModel.Recipe memory recipe = StrategyModel.Recipe({
            name: "SummerfiUnsubV2",
            callData: actionsCalldata,
            subData: new bytes32[](0),
            actionIds: actionIds,
            paramMapping: new uint8[][](1)
        });

        vm.prank(owner);
        sfProxy.execute(
            sfProxyEntryPoint, abi.encodeWithSelector(RecipeExecutor.executeRecipe.selector, recipe)
        );
    }

    function test_UnsubV2_Fail() public {
        // Create invalid trigger data (non-existent trigger IDs)
        uint256[][] memory invalidTriggerIds = new uint256[][](1);
        invalidTriggerIds[0] = new uint256[](1);
        invalidTriggerIds[0][0] = 999_999; // Non-existent trigger ID

        bytes[][] memory invalidTriggerData = new bytes[][](1);
        invalidTriggerData[0] = new bytes[](1);
        invalidTriggerData[0][0] = ""; // Empty trigger data

        bool[] memory invalidRemoveAllowance = new bool[](1);
        invalidRemoveAllowance[0] = false;

        bytes memory paramsCallData =
            SummerfiUnsubV2Encode(invalidTriggerIds, invalidTriggerData, invalidRemoveAllowance);

        // Create Recipe for single action
        bytes[] memory actionsCalldata = new bytes[](1);
        actionsCalldata[0] = paramsCallData;

        bytes4[] memory actionIds = new bytes4[](1);
        actionIds[0] = bytes4(keccak256("SummerfiUnsubV2"));

        StrategyModel.Recipe memory recipe = StrategyModel.Recipe({
            name: "SummerfiUnsubV2",
            callData: actionsCalldata,
            subData: new bytes32[](0),
            actionIds: actionIds,
            paramMapping: new uint8[][](1)
        });

        vm.prank(owner);
        vm.expectRevert();
        sfProxy.execute(
            sfProxyEntryPoint, abi.encodeWithSelector(RecipeExecutor.executeRecipe.selector, recipe)
        );
    }
}
