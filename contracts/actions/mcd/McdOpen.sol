// SPDX-License-Identifier: MIT

pragma solidity ^0.7.0;
pragma experimental ABIEncoderV2;

import "../../interfaces/mcd/IJoin.sol";
import "../../interfaces/mcd/IManager.sol";
import "../../utils/GasBurner.sol";
import "../ActionBase.sol";

/// @title Open a new Maker vault
contract McdOpen is ActionBase, GasBurner {
    address public constant MANAGER_ADDRESS = 0x5ef30b9986345249bc32d8928B7ee64DE9435E39;
    IManager public constant manager = IManager(MANAGER_ADDRESS);

    /// @inheritdoc ActionBase
    function executeAction(
        bytes[] memory _callData,
        bytes[] memory _subData,
        uint8[] memory _paramMapping,
        bytes32[] memory _returnValues
    ) public virtual override payable returns (bytes32) {
        address joinAddr = parseInputs(_callData);

        joinAddr = _parseParamAddr(joinAddr, _paramMapping[0], _subData, _returnValues);

        uint256 newVaultId = _mcdOpen(joinAddr);

        return bytes32(newVaultId);
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes[] memory _callData) public override payable burnGas {
        address joinAddr = parseInputs(_callData);

        _mcdOpen(joinAddr);
    }

    /// @inheritdoc ActionBase
    function actionType() public virtual override pure returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }


    //////////////////////////// ACTION LOGIC ////////////////////////////

    function _mcdOpen(address _joinAddr) internal returns (uint256 vaultId) {
        bytes32 ilk = IJoin(_joinAddr).ilk();
        vaultId = manager.open(ilk, address(this));

        logger.Log(address(this), msg.sender, "McdOpen", abi.encode(vaultId));
    }

    function parseInputs(bytes[] memory _callData) internal pure returns (address joinAddr) {
        joinAddr = abi.decode(_callData[0], (address));
    }
}
