// SPDX-License-Identifier: MIT

pragma solidity ^0.7.0;
pragma experimental ABIEncoderV2;

import "../core/DFSRegistry.sol";

abstract contract ActionBase {
    address public constant REGISTRY_ADDR = 0x5FbDB2315678afecb367f032d93F642f64180aa3;
    DFSRegistry public constant registry = DFSRegistry(REGISTRY_ADDR);

    DefisaverLogger public constant logger = DefisaverLogger(
        0x5c55B921f590a89C1Ebe84dF170E655a82b62126
    );

    enum ActionType {FL_ACTION, STANDARD_ACTION, CUSTOM_ACTION}

    function executeAction(
        bytes[] memory,
        bytes[] memory,
        uint8[] memory,
        bytes32[] memory
    ) public payable virtual returns (bytes32);

    function actionType() public pure virtual returns (uint8);

    function isReplacable(uint8 _type) internal pure returns (bool) {
        return _type != 0;
    }

    function isReturnInjection(uint8 _type) internal pure returns (bool) {
        return _type >= 1 && _type < 128;
    }

    function getReturnIndex(uint8 _type) internal pure returns (uint8) {
        require(_type >= 1 && _type < 128, "Wrong return index value");
        return _type - 1;
    }

    function getSubIndex(uint8 _type) internal pure returns (uint8) {
        require(_type >= 128, "Wrong sub index value");
        return _type - 128;
    }

    function _parseParamUint(
        uint _param,
        uint8 _mapType,
        bytes[] memory _subData,
        bytes32[] memory _returnValues
    ) internal pure returns (uint) {
        if (isReplacable(_mapType)) {
            if (isReturnInjection(_mapType)) {
                _param = uint(_returnValues[getReturnIndex(_mapType)]);
            } else {
                _param = abi.decode(_subData[getSubIndex(_mapType)], (uint));
            }
        }

        return _param;
    }

    function _parseParamAddr(
        address _param,
        uint8 _mapType,
        bytes[] memory _subData,
        bytes32[] memory _returnValues
    ) internal pure returns (address) {
        if (isReplacable(_mapType)) {
            if (isReturnInjection(_mapType)) {
                _param = address(bytes20((_returnValues[getReturnIndex(_mapType)])));
            } else {
                _param = abi.decode(_subData[getSubIndex(_mapType)], (address));
            }
        }

        return _param;
    }

    function _parseParamABytes32(
        bytes32 _param,
        uint8 _mapType,
        bytes[] memory _subData,
        bytes32[] memory _returnValues
    ) internal pure returns (bytes32) {
        if (isReplacable(_mapType)) {
            if (isReturnInjection(_mapType)) {
                _param = (_returnValues[getReturnIndex(_mapType)]);
            } else {
                _param = abi.decode(_subData[getSubIndex(_mapType)], (bytes32));
            }
        }

        return _param;
    }

}
