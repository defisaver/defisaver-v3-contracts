// SPDX-License-Identifier: MIT

pragma solidity ^0.7.0;

import "../../interfaces/mcd/IJoin.sol";
import "../../interfaces/mcd/IManager.sol";
import "../ActionBase.sol";

contract McdOpen is ActionBase {

    address public constant MANAGER_ADDRESS = 0x5ef30b9986345249bc32d8928B7ee64DE9435E39;
    IManager public constant manager = IManager(MANAGER_ADDRESS);

    function executeAction(
        uint256,
        bytes memory _callData,
        bytes32[] memory _returnValues
    ) public override payable virtual returns (bytes32) {
        // parse call data
        address joinAddr = parseParamData(_callData, _returnValues);

        bytes32 ilk = IJoin(joinAddr).ilk();
        uint cdpId = manager.open(ilk, address(this));

        logger.Log(address(this), msg.sender, "McdOpen", abi.encode(cdpId));

        return bytes32(cdpId);
    }

    function actionType() public override pure virtual returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    function parseParamData(
        bytes memory _data,
        bytes32[] memory _returnValues
    ) public pure returns (address joinAddr) {
        uint8[] memory inputMapping;

        (joinAddr, inputMapping) = abi.decode(_data, (address,uint8[]));

        // mapping return values to new inputs
        if (inputMapping.length > 0 && _returnValues.length > 0) {
            for (uint i = 0; i < inputMapping.length; i += 2) {
                bytes32 returnValue = _returnValues[inputMapping[i + 1]];

                if (inputMapping[i] == 0) {
                    joinAddr = address(bytes20(returnValue));
                }
            }
        }
    }
}