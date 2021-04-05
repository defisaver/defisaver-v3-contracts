// SPDX-License-Identifier: MIT

pragma solidity =0.7.6;
pragma experimental ABIEncoderV2;

import "../../interfaces/mcd/IManager.sol";
import "../../interfaces/mcd/IVat.sol";
import "../../interfaces/mcd/IDaiJoin.sol";
import "../../utils/TokenUtils.sol";
import "../ActionBase.sol";
import "./helpers/McdHelper.sol";

/// @title Payback dai debt for a Maker vault
contract McdPayback is ActionBase, McdHelper {
    using TokenUtils for address;

    /// @inheritdoc ActionBase
    function executeAction(
        bytes[] memory _callData,
        bytes[] memory _subData,
        uint8[] memory _paramMapping,
        bytes32[] memory _returnValues
    ) public payable override returns (bytes32) {
        (uint256 vaultId, uint256 amount, address from, address mcdManager) =
            parseInputs(_callData);

        vaultId = _parseParamUint(vaultId, _paramMapping[0], _subData, _returnValues);
        amount = _parseParamUint(amount, _paramMapping[1], _subData, _returnValues);
        from = _parseParamAddr(from, _paramMapping[2], _subData, _returnValues);

        amount = _mcdPayback(vaultId, amount, from, mcdManager);

        return bytes32(amount);
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes[] memory _callData) public payable override {
        (uint256 vaultId, uint256 amount, address from, address mcdManager) =
            parseInputs(_callData);

        _mcdPayback(vaultId, amount, from, mcdManager);
    }

    /// @inheritdoc ActionBase
    function actionType() public pure override returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    //////////////////////////// ACTION LOGIC ////////////////////////////

    /// @notice Paybacks the debt for a specified vault
    /// @param _vaultId Id of the vault
    /// @param _amount Amount of dai to be payed back
    /// @param _from Where the Dai is pulled from
    /// @param _mcdManager The manager address we are using
    function _mcdPayback(
        uint256 _vaultId,
        uint256 _amount,
        address _from,
        address _mcdManager
    ) internal returns (uint256) {
        IManager mcdManager = IManager(_mcdManager);

        address urn = mcdManager.urns(_vaultId);
        bytes32 ilk = mcdManager.ilks(_vaultId);

        // if amount type(uint256).max payback the whole vault debt
        if (_amount == type(uint256).max) {
            _amount = getAllDebt(address(vat), urn, urn, ilk);
        }

        // pull Dai from user and join the maker pool
        DAI_ADDR.pullTokens(_from, _amount);
        DAI_ADDR.approveToken(DAI_JOIN_ADDR, _amount);
        IDaiJoin(DAI_JOIN_ADDR).join(urn, _amount);

        // decrease the vault debt
        mcdManager.frob(_vaultId, 0, normalizePaybackAmount(address(vat), urn, ilk));

        logger.Log(
            address(this),
            msg.sender,
            "McdPayback",
            abi.encode(_vaultId, _amount, _from, _mcdManager)
        );

        return _amount;
    }

    function parseInputs(bytes[] memory _callData)
        internal
        pure
        returns (
            uint256 vaultId,
            uint256 amount,
            address from,
            address mcdManager
        )
    {
        vaultId = abi.decode(_callData[0], (uint256));
        amount = abi.decode(_callData[1], (uint256));
        from = abi.decode(_callData[2], (address));
        mcdManager = abi.decode(_callData[3], (address));
    }
}
