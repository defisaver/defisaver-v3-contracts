// SPDX-License-Identifier: MIT

pragma solidity ^0.7.0;
pragma experimental ABIEncoderV2;

import "../../interfaces/mcd/IManager.sol";
import "../../interfaces/mcd//IVat.sol";
import "../../interfaces/mcd//IJoin.sol";
import "../../DS/DSMath.sol";
import "../../utils/SafeERC20.sol";
import "../ActionBase.sol";
import "./helpers/McdHelper.sol";

contract McdSupply is ActionBase, McdHelper {
    address public constant MANAGER_ADDRESS = 0x5ef30b9986345249bc32d8928B7ee64DE9435E39;
    address public constant VAT_ADDRESS = 0x35D1b3F3D7966A1DFe207aa4514C12a259A0492B;

    IManager public constant manager = IManager(MANAGER_ADDRESS);
    IVat public constant vat = IVat(VAT_ADDRESS);

    using SafeERC20 for IERC20;

    function executeAction(
        bytes[] memory _callData,
        bytes[] memory _subData,
        uint8[] memory _paramMapping,
        bytes32[] memory _returnValues
    ) override public payable returns (bytes32) {
        uint cdpId = abi.decode(_callData[0], (uint256));
        uint amount = abi.decode(_callData[1], (uint256));
        address joinAddr = abi.decode(_callData[2], (address));
        address from = abi.decode(_callData[3], (address));

        cdpId = _parseParamUint(cdpId, _paramMapping[0], _subData, _returnValues);
        amount = _parseParamUint(amount, _paramMapping[1], _subData, _returnValues);
        joinAddr = _parseParamAddr(joinAddr, _paramMapping[2], _subData, _returnValues);
        from = _parseParamAddr(from, _paramMapping[3], _subData, _returnValues);

        address a = address(IJoin(joinAddr).gem());

        pullTokens(joinAddr, from, amount);

        int returnAmount = mcdSupply(cdpId, amount, joinAddr);

        logger.Log(address(this), msg.sender, "McdSupply", abi.encode(cdpId, amount, joinAddr, from));

        return bytes32(returnAmount);
    }

    function actionType() override public pure returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    function mcdSupply(uint _cdpId, uint _amount, address _joinAddr) internal returns(int) {
        int convertAmount = 0;

        if (isEthJoinAddr(_joinAddr)) {
            IJoin(_joinAddr).gem().deposit{value: _amount}();
            convertAmount = toPositiveInt(_amount);
        } else {
            convertAmount = toPositiveInt(convertTo18(_joinAddr, _amount));
        }

        IJoin(_joinAddr).gem().approve(_joinAddr, _amount);
        IJoin(_joinAddr).join(address(this), _amount);

        vat.frob(
            manager.ilks(_cdpId),
            manager.urns(_cdpId),
            address(this),
            address(this),
            convertAmount,
            0
        );

        return convertAmount;
    }

    function pullTokens(address _joinAddr, address _from, uint _amount) internal {
        if (_from != address(0) && !isEthJoinAddr(_joinAddr)) {
            IERC20(address(IJoin(_joinAddr).gem())).safeTransferFrom(_from, address(this), _amount);
        }
    }
}
