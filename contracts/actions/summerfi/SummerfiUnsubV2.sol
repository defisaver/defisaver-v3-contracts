// SPDX-License-Identifier: MIT
pragma solidity =0.8.24;

import { ActionBase } from "../ActionBase.sol";
import { IAutomationBotV2 } from "../../interfaces/protocols/summerfi/IAutomationBotV2.sol";
import { SFHelper } from "./helpers/SFHelper.sol";

/// @title Remove automation triggers
/// @notice Removes automation triggers from AutomationBotV2
contract SummerfiUnsubV2 is ActionBase, SFHelper {
    error SummerfiUnsubV2_DelegatecallFailed();

    /// @param triggerIds Array of trigger ID arrays to remove
    /// @param triggerData Array of trigger data arrays (must match triggerIds length)
    /// @param removeAllowance Array of booleans indicating whether to remove allowance for each trigger group
    struct Params {
        uint256[][] triggerIds;
        bytes[][] triggerData;
        bool[] removeAllowance;
    }

    /// @inheritdoc ActionBase
    function executeAction(
        bytes memory _callData,
        bytes32[] memory,
        uint8[] memory,
        bytes32[] memory
    ) public payable virtual override returns (bytes32) {
        Params memory params = parseInputs(_callData);
        _removeTriggers(params);
        emit ActionEvent("SummerfiUnsubV2", _callData);
        return bytes32(0);
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes memory _callData) public payable virtual override {
        Params memory params = parseInputs(_callData);
        _removeTriggers(params);
        logger.logActionDirectEvent("SummerfiUnsubV2", _callData);
    }

    /// @inheritdoc ActionBase
    function actionType() public pure virtual override returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    /// @dev Removes triggers via delegatecall to AutomationBotV2
    function _removeTriggers(Params memory params) internal {
        for (uint256 i = 0; i < params.triggerIds.length; ++i) {
            bytes memory callData = abi.encodeWithSelector(
                IAutomationBotV2.removeTriggers.selector,
                params.triggerIds[i],
                params.triggerData[i],
                params.removeAllowance[i]
            );

            (bool success, bytes memory returnData) =
                address(SF_AUTOMATION_BOT_V2).delegatecall(callData);
            if (!success) {
                if (returnData.length > 0) {
                    assembly {
                        let returndata_size := mload(returnData)
                        revert(add(32, returnData), returndata_size)
                    }
                } else {
                    revert SummerfiUnsubV2_DelegatecallFailed();
                }
            }
        }
    }

    function parseInputs(bytes memory _callData) public pure returns (Params memory params) {
        params = abi.decode(_callData, (Params));
    }
}
