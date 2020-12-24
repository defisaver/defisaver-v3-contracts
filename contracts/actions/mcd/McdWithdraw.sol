// SPDX-License-Identifier: MIT

pragma solidity ^0.7.0;
pragma experimental ABIEncoderV2;

import "../../interfaces/mcd/IManager.sol";
import "../../interfaces/mcd/IVat.sol";
import "../../interfaces/mcd/IJoin.sol";
import "../../utils/GasBurner.sol";
import "../../utils/TokenUtils.sol";
import "../ActionBase.sol";
import "./helpers/McdHelper.sol";

/// @title Withdraws collateral from a Maker vault
contract McdWithdraw is ActionBase, McdHelper, TokenUtils, GasBurner {
    address public constant VAT_ADDRESS = 0x35D1b3F3D7966A1DFe207aa4514C12a259A0492B;

    IVat public constant vat = IVat(VAT_ADDRESS);

    /// @inheritdoc ActionBase
    function executeAction(
        bytes[] memory _callData,
        bytes[] memory _subData,
        uint8[] memory _paramMapping,
        bytes32[] memory _returnValues
    ) public override payable returns (bytes32) {
        (uint256 vaultId, uint256 amount, address joinAddr, address to, address mcdManager) = parseInputs(_callData);

        vaultId = _parseParamUint(vaultId, _paramMapping[0], _subData, _returnValues);
        amount = _parseParamUint(amount, _paramMapping[1], _subData, _returnValues);
        joinAddr = _parseParamAddr(joinAddr, _paramMapping[2], _subData, _returnValues);
        to = _parseParamAddr(to, _paramMapping[3], _subData, _returnValues);

        amount = _mcdWithdraw(vaultId, amount, joinAddr, to, mcdManager);

        return bytes32(amount);
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes[] memory _callData) public override payable burnGas {
        (uint256 vaultId, uint256 amount, address joinAddr, address to, address mcdManager) = parseInputs(_callData);

        _mcdWithdraw(vaultId, amount, joinAddr, to, mcdManager);
    }

    /// @inheritdoc ActionBase
    function actionType() public override pure returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }


    //////////////////////////// ACTION LOGIC ////////////////////////////


    function _mcdWithdraw(
        uint256 _vaultId,
        uint256 _amount,
        address _joinAddr,
        address _to,
        address _mcdManager
    ) internal returns (uint256) {

        // if amount uint(-1) _amount is whole collateral amount
        if (_amount == uint(-1)) {
            (_amount, ) = getCdpInfo(IManager(_mcdManager), _vaultId, IManager(_mcdManager).ilks(_vaultId));
        }

        uint256 frobAmount = _amount;

        // convert to 18 decimals for maker frob
        if (IJoin(_joinAddr).dec() != 18) {
            frobAmount = _amount * (10**(18 - IJoin(_joinAddr).dec()));
        }

        IManager(_mcdManager).frob(_vaultId, -toPositiveInt(frobAmount), 0);
        IManager(_mcdManager).flux(_vaultId, address(this), frobAmount);

        IJoin(_joinAddr).exit(address(this), _amount);

        // withdraw from weth if needed
        if (isEthJoinAddr(_joinAddr)) {
            withdrawWeth(_amount); // Weth -> Eth
        }

        withdrawTokens(getTokenFromJoin(_joinAddr), _to, _amount);

        logger.Log(
            address(this),
            msg.sender,
            "McdWithdraw",
            abi.encode(_vaultId, _amount, _joinAddr)
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
            address to,
            address mcdManager
        )
    {
        vaultId = abi.decode(_callData[0], (uint256));
        amount = abi.decode(_callData[1], (uint256));
        joinAddr = abi.decode(_callData[2], (address));
        to = abi.decode(_callData[3], (address));
        mcdManager = abi.decode(_callData[4], (address));
    }
}
