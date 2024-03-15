// SPDX-License-Identifier: MIT

pragma solidity =0.8.10;

import { ICoinJoin } from "../../interfaces/reflexer/ICoinJoin.sol";
import { ReflexerHelper } from "./helpers/ReflexerHelper.sol";
import { TokenUtils } from "../../utils/TokenUtils.sol";
import { ActionBase } from "../ActionBase.sol";

/// @title Withdraws stuck rai from a Reflexer safe
/// @dev Only owner of the safe can withdraw funds
contract ReflexerWithdrawStuckFunds is ActionBase, ReflexerHelper {
    using TokenUtils for address;

    /// @param safeId Id of the reflexer safe
    /// @param to Address where to send stuck rai tokens
    struct Params {
        uint256 safeId;
        address to;
    }

    function executeAction(
        bytes memory _callData,
        bytes32[] memory _subData,
        uint8[] memory _paramMapping,
        bytes32[] memory _returnValues
    ) public payable override returns (bytes32) {
        Params memory inputData = parseInputs(_callData);

        inputData.safeId = _parseParamUint(inputData.safeId, _paramMapping[0], _subData, _returnValues);
        inputData.to = _parseParamAddr(inputData.to, _paramMapping[1], _subData, _returnValues);

        (uint256 withdrawnAmount, bytes memory logData) = _withdrawStuckFunds(inputData.safeId, inputData.to);
        emit ActionEvent("ReflexerWithdrawStuckFunds", logData);
        return bytes32(withdrawnAmount);
    }

    function executeActionDirect(bytes memory _callData) public payable override {
        Params memory inputData = parseInputs(_callData);
        (, bytes memory logData) = _withdrawStuckFunds(inputData.safeId, inputData.to);
        logger.logActionDirectEvent("ReflexerWithdrawStuckFunds", logData);
    }

    function actionType() public pure override returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    //////////////////////////// ACTION LOGIC ////////////////////////////
   
    /// @notice Withdraws stuck funds from the safe
    /// @param _safeId Id of the safe
    /// @param _to Address where to send the withdrawn funds
    function _withdrawStuckFunds(
        uint256 _safeId,
        address _to
    ) internal returns (uint256, bytes memory) {
        address safe = safeManager.safes(_safeId);
        uint256 radAmount = safeEngine.coinBalance(safe);

        // move radAmount of rai in internal balance from reflexer safe to proxy
        safeManager.transferInternalCoins(_safeId, address(this), radAmount);

        // add auth so we can exit the rai
        if (safeEngine.safeRights(address(this), address(RAI_ADAPTER_ADDRESS)) == 0) {
            safeEngine.approveSAFEModification(RAI_ADAPTER_ADDRESS);
        }

        /// @dev Exit function takes wad amount and converts it to rad
        /// @dev This means that up to 1 rai will be left on proxy balance inside reflexer safe due to precision loss
        uint256 wadAmount = radAmount / RAY;

        // exit rai from adapter and send _to if needed
        ICoinJoin(RAI_ADAPTER_ADDRESS).exit(_to, wadAmount);

        bytes memory logData = abi.encode(_safeId, wadAmount, _to);
        return (wadAmount, logData);
    }

    function parseInputs(bytes memory _callData) public pure returns (Params memory params) {
        params = abi.decode(_callData, (Params));
    }
}
