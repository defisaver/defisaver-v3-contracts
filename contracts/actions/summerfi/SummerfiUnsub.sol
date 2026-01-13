// SPDX-License-Identifier: MIT
pragma solidity =0.8.24;

import { ActionBase } from "../ActionBase.sol";
import { IAutomationBot } from "../../interfaces/protocols/summerfi/IAutomationBot.sol";

/// @title Remove automation approval for CDPs
/// @notice Removes approval for AutomationBot on specified CDPs, preventing automations from executing
contract SummerfiUnsub is ActionBase {
    IAutomationBot constant SF_AUTOMATION_BOT =
        IAutomationBot(0x6E87a7A0A03E51A741075fDf4D1FCce39a4Df01b);

    error SummerfiUnsub_DelegatecallFailed();

    /// @param cdpIds Array of CDP IDs to remove approval for
    /// @param triggerIds Array of Trigger IDs that correspond to CDP IDs
    struct Params {
        uint256[] cdpIds;
        uint256[] triggerIds;
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
        emit ActionEvent("SummerfiUnsub", _callData);
        return bytes32(0);
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes memory _callData) public payable virtual override {
        Params memory params = parseInputs(_callData);
        _removeTriggers(params);
        logger.logActionDirectEvent("SummerfiUnsub", _callData);
    }

    /// @inheritdoc ActionBase
    function actionType() public pure virtual override returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    /// @dev Removes approval for each CDP via delegatecall to AutomationBot
    function _removeTriggers(Params memory params) internal {
        for (uint256 i = 0; i < params.cdpIds.length; ++i) {
            bytes memory callData = abi.encodeWithSelector(
                IAutomationBot.removeTrigger.selector, params.cdpIds[i], params.triggerIds[i], true
            );

            (bool success, bytes memory returnData) =
                address(SF_AUTOMATION_BOT).delegatecall(callData);

            if (!success) {
                if (returnData.length > 0) {
                    assembly {
                        let returndata_size := mload(returnData)
                        revert(add(32, returnData), returndata_size)
                    }
                } else {
                    revert SummerfiUnsub_DelegatecallFailed();
                }
            }
        }
    }

    function parseInputs(bytes memory _callData) public pure returns (Params memory params) {
        params = abi.decode(_callData, (Params));
    }
}
