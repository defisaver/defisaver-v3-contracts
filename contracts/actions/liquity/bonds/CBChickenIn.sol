// SPDX-License-Identifier: MIT

pragma solidity =0.8.10;

import "../helpers/LiquityHelper.sol";
import "../../../utils/TokenUtils.sol";
import "../../ActionBase.sol";

/// @title Chickens in a bond and gets back bLUSD
contract CBChickenIn is ActionBase, LiquityHelper {
    using TokenUtils for address;

    /// @param bondID NFT token id of the bond
    /// @param to Address where to send bLUSD returned
    struct Params {
        uint256 bondID;
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

        params.bondID = _parseParamUint(
            params.bondID,
            _paramMapping[0],
            _subData,
            _returnValues
        );
        params.to = _parseParamAddr(params.to, _paramMapping[1], _subData, _returnValues);

        (uint256 bLusdAmountReceived, bytes memory logData) = _cbChickenIn(params);
        emit ActionEvent("CBChickenIn", logData);
        return bytes32(bLusdAmountReceived);
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes memory _callData) public payable virtual override {
        Params memory params = parseInputs(_callData);
        (, bytes memory logData) = _cbChickenIn(params);
        logger.logActionDirectEvent("CBChickenIn", logData);
    }

    /// @inheritdoc ActionBase
    function actionType() public pure virtual override returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    //////////////////////////// ACTION LOGIC ////////////////////////////

    function _cbChickenIn(Params memory _params) internal returns (uint256, bytes memory) {
        require(_params.to != address(0), "Don't send to 0x0");

        uint256 balanceBefore = BLUSD_ADDRESS.getBalance(address(this));
        CBManager.chickenIn(_params.bondID);
        uint256 balanceAfter = BLUSD_ADDRESS.getBalance(address(this));

        uint256 bLusdAmountReceived = balanceAfter - balanceBefore;

        BLUSD_ADDRESS.withdrawTokens(_params.to, bLusdAmountReceived);

        bytes memory logData = abi.encode(bLusdAmountReceived, _params.bondID, _params.to);
        return (bLusdAmountReceived, logData);
    }

    function parseInputs(bytes memory _callData) public pure returns (Params memory params) {
        params = abi.decode(_callData, (Params));
    }
}
