// SPDX-License-Identifier: MIT

pragma solidity ^0.7.0;
pragma experimental ABIEncoderV2;

import "../../interfaces/mcd/IManager.sol";
import "../../interfaces/mcd//IVat.sol";
import "../../interfaces/mcd//IJoin.sol";
import "../../utils/TokenUtils.sol";
import "../../utils/GasBurner.sol";
import "../ActionBase.sol";
import "./helpers/McdHelper.sol";

/// @title Supply collateral to a Maker vault
contract McdSupply is ActionBase, McdHelper, TokenUtils, GasBurner {
    address public constant MANAGER_ADDRESS = 0x5ef30b9986345249bc32d8928B7ee64DE9435E39;
    address public constant VAT_ADDRESS = 0x35D1b3F3D7966A1DFe207aa4514C12a259A0492B;

    IManager public constant manager = IManager(MANAGER_ADDRESS);
    IVat public constant vat = IVat(VAT_ADDRESS);

    /// @inheritdoc ActionBase
    function executeAction(
        bytes[] memory _callData,
        bytes[] memory _subData,
        uint8[] memory _paramMapping,
        bytes32[] memory _returnValues
    ) public override payable returns (bytes32) {
        (uint256 vaultId, uint256 amount, address joinAddr, address from) = parseInputs(_callData);

        vaultId = _parseParamUint(vaultId, _paramMapping[0], _subData, _returnValues);
        amount = _parseParamUint(amount, _paramMapping[1], _subData, _returnValues);
        joinAddr = _parseParamAddr(joinAddr, _paramMapping[2], _subData, _returnValues);
        from = _parseParamAddr(from, _paramMapping[3], _subData, _returnValues);

        uint256 returnAmount = _mcdSupply(vaultId, amount, joinAddr, from);

        return bytes32(returnAmount);
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes[] memory _callData) public override payable burnGas {
        (uint256 vaultId, uint256 amount, address joinAddr, address from) = parseInputs(_callData);

        _mcdSupply(vaultId, amount, joinAddr, from);
    }

    /// @inheritdoc ActionBase
    function actionType() public override pure returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }


    //////////////////////////// ACTION LOGIC ////////////////////////////


    /// @dev Will not work if _joinAddr is Dai or invalid
    function _mcdSupply(
        uint256 _vaultId,
        uint256 _amount,
        address _joinAddr,
        address _from
    ) internal returns (uint256) {
        address tokenAddr = address(IJoin(_joinAddr).gem());

        pullTokens(tokenAddr, _from, _amount);

        // if amount -1, pull current proxy balance
        if (_amount == uint(-1)) {
            _amount = getBalance(tokenAddr, address(this));
        }

        int256 convertAmount = 0;

        if (isEthJoinAddr(_joinAddr)) {
            convertAndDepositToWeth(ETH_ADDR, _amount);
            convertAmount = toPositiveInt(_amount);
        } else {
            convertAmount = toPositiveInt(convertTo18(_joinAddr, _amount));
        }

        approveToken(tokenAddr, _joinAddr, uint(-1));

        IJoin(_joinAddr).join(address(this), _amount);

        vat.frob(
            manager.ilks(_vaultId),
            manager.urns(_vaultId),
            address(this),
            address(this),
            convertAmount,
            0
        );

        logger.Log(
            address(this),
            msg.sender,
            "McdSupply",
            abi.encode(_vaultId, _amount, _joinAddr, _from)
        );

        return _amount;
    }

    function parseInputs(bytes[] memory _callData)
        internal
        pure
        returns (
            uint256 vaultId,
            uint256 amount,
            address joinAddr,
            address from
        )
    {
        vaultId = abi.decode(_callData[0], (uint256));
        amount = abi.decode(_callData[1], (uint256));
        joinAddr = abi.decode(_callData[2], (address));
        from = abi.decode(_callData[3], (address));
    }
}
