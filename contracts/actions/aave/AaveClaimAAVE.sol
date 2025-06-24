// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { IStkAave } from "../../interfaces/aave/IStkAave.sol";
import { ActionBase } from "../ActionBase.sol";
import { AaveHelper } from "./helpers/AaveHelper.sol";
import { TokenUtils } from "../../utils/TokenUtils.sol";

/// @title Action to claim AAVE rewards from stkAave token
contract AaveClaimAAVE is ActionBase, AaveHelper {

    using TokenUtils for address;
    
    /// @param amount Amount of AAVE token to claim (uintMax is supported)
    /// @param to Address that will be receiving the rewards
    struct Params {
        uint256 amount;
        address to;
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

        (uint256 claimedAmount, bytes memory logData) = _aaveClaimAAVE(params);
        emit ActionEvent("AaveClaimAAVE", logData);
        return bytes32(claimedAmount);
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes memory _callData) public payable override {
        Params memory params = parseInputs(_callData);
        (, bytes memory logData) = _aaveClaimAAVE(params);
        logger.logActionDirectEvent("AaveClaimAAVE", logData);
    }

    /// @inheritdoc ActionBase
    function actionType() public pure virtual override returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    //////////////////////////// ACTION LOGIC ////////////////////////////

    /// @notice Claims AAVE reward from stkAave token
    function _aaveClaimAAVE(Params memory _params) internal returns (uint256 claimedAmount, bytes memory logData) {
        
        uint256 startingBalance = AAVE_TOKEN_ADDR.getBalance(_params.to);
        IStkAave(STAKED_TOKEN_ADDR).claimRewards(_params.to, _params.amount);
        claimedAmount = AAVE_TOKEN_ADDR.getBalance(_params.to) - startingBalance;

        logData = abi.encode(_params, claimedAmount);
    }

    function parseInputs(bytes memory _callData) public pure returns (Params memory params)
    {
        params = abi.decode(_callData, (Params));
    }
}
