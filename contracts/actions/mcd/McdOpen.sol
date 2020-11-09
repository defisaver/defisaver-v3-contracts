// SPDX-License-Identifier: MIT

pragma solidity ^0.7.0;
pragma experimental ABIEncoderV2;

import "../../interfaces/mcd/IJoin.sol";
import "../../interfaces/mcd/IManager.sol";
import "../ActionBase2.sol";

contract McdOpen is ActionBase2 {

    address public constant MANAGER_ADDRESS = 0x5ef30b9986345249bc32d8928B7ee64DE9435E39;
    IManager public constant manager = IManager(MANAGER_ADDRESS);

    function executeAction(
        bytes[] memory _callData,
        bytes[] memory _subData,
        uint8[] memory _paramMapping,
        bytes32[] memory _returnValues
    ) public override payable virtual returns (bytes32) {
        address joinAddr = abi.decode(_callData[0], (address));

        joinAddr = _parseParamAddr(joinAddr, _paramMapping[0], _subData, _returnValues);

        uint newCdpId = mcdOpen(joinAddr);

        return bytes32(newCdpId);
    }

    function mcdOpen(address _joinAddr) internal returns (uint cdpId) {
        bytes32 ilk = IJoin(_joinAddr).ilk();
        cdpId = manager.open(ilk, address(this));

        logger.Log(address(this), msg.sender, "McdOpen", abi.encode(cdpId));
    }

    function actionType() public override pure virtual returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }
}