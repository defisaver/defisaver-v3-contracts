// SPDX-License-Identifier: MIT

pragma solidity =0.8.10;

import "../../interfaces/mcd/IJoin.sol";
import "../../interfaces/mcd/IManager.sol";
import "../ActionBase.sol";

/// @title Open a new Maker vault
contract McdOpen is ActionBase {

    struct Params {
        address joinAddr;
        address mcdManager;
    }

    /// @inheritdoc ActionBase
    function executeAction(
        bytes memory _callData,
        bytes32[] memory _subData,
        uint8[] memory _paramMapping,
        bytes32[] memory _returnValues
    ) public payable virtual override returns (bytes32) {
        Params memory inputData = parseInputs(_callData);

        inputData.joinAddr = _parseParamAddr(inputData.joinAddr, _paramMapping[0], _subData, _returnValues);

        (uint256 newVaultId, bytes memory logData) = _mcdOpen(inputData.joinAddr, inputData.mcdManager);
        emit ActionEvent("McdOpen", logData);
        return bytes32(newVaultId);
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes memory _callData) public payable override {
        Params memory inputData = parseInputs(_callData);
        (, bytes memory logData) = _mcdOpen(inputData.joinAddr, inputData.mcdManager);
        logger.logActionDirectEvent("McdOpen", logData);
    }

    /// @inheritdoc ActionBase
    function actionType() public pure virtual override returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    //////////////////////////// ACTION LOGIC ////////////////////////////

    /// @notice Opens up an empty vault
    /// @param _joinAddr Join address of the maker collateral
    /// @param _mcdManager The manager address we are using
    function _mcdOpen(address _joinAddr, address _mcdManager) internal returns (uint256 vaultId, bytes memory logData) {
        bytes32 ilk = IJoin(_joinAddr).ilk();
        vaultId = IManager(_mcdManager).open(ilk, address(this));
        logData = abi.encode(vaultId, _joinAddr, _mcdManager);
    }

    function parseInputs(bytes memory _callData) public pure returns (Params memory params) {
        params = abi.decode(_callData, (Params));
    }
}
