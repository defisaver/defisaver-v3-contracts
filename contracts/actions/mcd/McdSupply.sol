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

    function executeAction(uint, bytes memory _callData, bytes32[] memory _returnValues) override public payable returns (bytes32) {
        int convertAmount = 0;

        (uint cdpId, uint amount, address joinAddr, address from) = parseParamData(_callData, _returnValues);

        pullTokens(joinAddr, from, amount);

        if (isEthJoinAddr(joinAddr)) {
            IJoin(joinAddr).gem().deposit{value: amount}();
            convertAmount = toPositiveInt(amount);
        } else {
            convertAmount = toPositiveInt(convertTo18(joinAddr, amount));
        }

        IJoin(joinAddr).gem().approve(joinAddr, amount);
        IJoin(joinAddr).join(address(this), amount);

        vat.frob(
            manager.ilks(cdpId),
            manager.urns(cdpId),
            address(this),
            address(this),
            convertAmount,
            0
        );

        logger.Log(address(this), msg.sender, "McdSupply", abi.encode(cdpId, amount, joinAddr, from));

        return bytes32(convertAmount);
    }

    function actionType() override public pure returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    function parseParamData(
        bytes memory _data,
        bytes32[] memory _returnValues
    ) public pure returns (uint cdpId,uint amount, address joinAddr, address from) {
        uint8[] memory inputMapping;

        (cdpId, amount, joinAddr, from, inputMapping) = abi.decode(_data, (uint256,uint256,address,address,uint8[]));

        // mapping return values to new inputs
        if (inputMapping.length > 0 && _returnValues.length > 0) {
            for (uint i = 0; i < inputMapping.length; i += 2) {
                bytes32 returnValue = _returnValues[inputMapping[i + 1]];

                if (inputMapping[i] == 0) {
                    cdpId = uint(returnValue);
                } else if (inputMapping[i] == 1) {
                    amount = uint(returnValue);
                } else if (inputMapping[i] == 2) {
                    joinAddr = address(bytes20(returnValue));
                } else if (inputMapping[i] == 3) {
                    from = address(bytes20(returnValue));
                }
            }
        }
    }

    function pullTokens(address _joinAddr, address _from, uint _amount) internal {
        if (_from != address(0) && !isEthJoinAddr(_joinAddr)) {
            IERC20(address(IJoin(_joinAddr).gem())).safeTransferFrom(_from, address(this), _amount);
        }
    }
}
