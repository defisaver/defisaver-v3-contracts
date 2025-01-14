// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { IStkAave } from "../../interfaces/aave/IStkAave.sol";
import { ActionBase } from "../ActionBase.sol";
import { AaveV3Helper } from "./helpers/AaveV3Helper.sol";
import { TokenUtils } from "../../utils/TokenUtils.sol";

contract GhoClaimAAVE is ActionBase, AaveV3Helper {

    using TokenUtils for address;

    struct Params {
        uint256 amount;     // Amount of AAVE token to claim (uintMax is supported)
        address to;         // Address that will be receiving the rewards
    }

    /// @inheritdoc ActionBase
    function executeAction(
        bytes memory _callData,
        bytes32[] memory _subData,
        uint8[] memory _paramMapping,
        bytes32[] memory _returnValues
    ) public payable virtual override returns (bytes32) {
        Params memory params = parseInputs(_callData);

        params.amount = _parseParamUint(params.amount, _paramMapping[0], _subData, _returnValues);
        params.to = _parseParamAddr(params.to, _paramMapping[1], _subData, _returnValues);

        (uint256 claimedAmount, bytes memory logData) = _ghoClaimAAVE(params);
        emit ActionEvent("GhoClaimAAVE", logData);
        return bytes32(claimedAmount);
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes memory _callData) public payable override {
        Params memory params = parseInputs(_callData);
        (, bytes memory logData) = _ghoClaimAAVE(params);
        logger.logActionDirectEvent("GhoClaimAAVE", logData);
    }

    /// @inheritdoc ActionBase
    function actionType() public pure virtual override returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    //////////////////////////// ACTION LOGIC ////////////////////////////

    /// @notice Claims AAVE reward from stkGHO token
    function _ghoClaimAAVE(Params memory _params) internal returns (uint256 claimedAmount, bytes memory logData) {
        uint256 startingBalance = AAVE_GOV_TOKEN.getBalance(_params.to);
        IStkAave(STAKED_GHO_TOKEN).claimRewards(_params.to, _params.amount);
        claimedAmount = AAVE_GOV_TOKEN.getBalance(_params.to) - startingBalance;

        logData = abi.encode(_params, claimedAmount);
    }

    function parseInputs(bytes memory _callData) public pure returns (Params memory params)
    {
        params = abi.decode(_callData, (Params));
    }
}
