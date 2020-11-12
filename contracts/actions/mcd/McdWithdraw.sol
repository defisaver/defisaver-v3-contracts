// SPDX-License-Identifier: MIT

pragma solidity ^0.7.0;
pragma experimental ABIEncoderV2;

import "../../interfaces/mcd/IManager.sol";
import "../../interfaces/mcd/IVat.sol";
import "../../interfaces/mcd/IJoin.sol";
import "../../DS/DSMath.sol";
import "../ActionBase.sol";
import "./helpers/McdHelper.sol";

contract McdWithdraw is ActionBase, McdHelper {
    address public constant MANAGER_ADDRESS = 0x5ef30b9986345249bc32d8928B7ee64DE9435E39;
    address public constant VAT_ADDRESS = 0x35D1b3F3D7966A1DFe207aa4514C12a259A0492B;
    address public constant ETH_ADDRESS = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;

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
        address to = abi.decode(_callData[3], (address));

        cdpId = _parseParamUint(cdpId, _paramMapping[0], _subData, _returnValues);
        amount = _parseParamUint(amount, _paramMapping[1], _subData, _returnValues);
        joinAddr = _parseParamAddr(joinAddr, _paramMapping[2], _subData, _returnValues);
        to = _parseParamAddr(to, _paramMapping[3], _subData, _returnValues);

        amount = mcdWithdraw(cdpId, amount, joinAddr);

        withdrawTokens(joinAddr, to, amount);

        logger.Log(address(this), msg.sender, "McdWithdraw", abi.encode(cdpId, amount, joinAddr));

        return bytes32(amount);
    }

    function actionType() override public pure returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    function mcdWithdraw(uint _cdpId, uint _amount, address _joinAddr) internal returns (uint) {
        uint frobAmount = _amount;

        if (IJoin(_joinAddr).dec() != 18) {
            frobAmount = _amount * (10 ** (18 - IJoin(_joinAddr).dec()));
        }

        manager.frob(_cdpId, -toPositiveInt(frobAmount), 0);
        manager.flux(_cdpId, address(this), frobAmount);

        IJoin(_joinAddr).exit(address(this), _amount);

        if (isEthJoinAddr(_joinAddr)) {
            IJoin(_joinAddr).gem().withdraw(_amount); // Weth -> Eth
        }

        return _amount;
    }

    function withdrawTokens(address _joinAddr, address _to, uint _amount) internal {
        if (_to != address(0) || _to != address(this)) {
            if (!isEthJoinAddr(_joinAddr)) {
                address tokenAddr = address(IJoin(_joinAddr).gem());
                IERC20(tokenAddr).safeTransfer(_to, _amount);
            } else {
                payable(_to).transfer(_amount);
            }
        }
    }
}
