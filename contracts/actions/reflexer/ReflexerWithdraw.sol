// SPDX-License-Identifier: MIT

pragma solidity =0.8.10;

import "../../utils/TokenUtils.sol";
import "../ActionBase.sol";
import "./helpers/ReflexerHelper.sol";

/// @title Withdraws collateral from a Reflexer safe
contract ReflexerWithdraw is ActionBase, ReflexerHelper {
    using TokenUtils for address;

    struct Params {
        uint256 safeId;
        uint256 amount;
        address adapterAddr;
        address to;
    }

    /// @inheritdoc ActionBase
    function executeAction(
        bytes memory _callData,
        bytes32[] memory _subData,
        uint8[] memory _paramMapping,
        bytes32[] memory _returnValues
    ) public payable override returns (bytes32) {
        Params memory inputData = parseInputs(_callData);

        inputData.safeId = _parseParamUint(inputData.safeId, _paramMapping[0], _subData, _returnValues);
        inputData.amount = _parseParamUint(inputData.amount, _paramMapping[1], _subData, _returnValues);
        inputData.adapterAddr = _parseParamAddr(inputData.adapterAddr, _paramMapping[2], _subData, _returnValues);
        inputData.to = _parseParamAddr(inputData.to, _paramMapping[3], _subData, _returnValues);

        inputData.amount = _reflexerWithdraw(inputData.safeId, inputData.amount, inputData.adapterAddr, inputData.to);

        return bytes32(inputData.amount);
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes memory _callData) public payable override {
        Params memory inputData = parseInputs(_callData);

        _reflexerWithdraw(inputData.safeId, inputData.amount, inputData.adapterAddr, inputData.to);
    }

    /// @inheritdoc ActionBase
    function actionType() public pure override returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    //////////////////////////// ACTION LOGIC ////////////////////////////

    /// @notice Withdraws collateral from the safe
    /// @param _safeId Id of the safe
    /// @param _amount Amount of collateral to withdraw
    /// @param _adapterAddr Adapter address of the reflexer collateral
    /// @param _to Address where to send the collateral we withdrew
    function _reflexerWithdraw(
        uint256 _safeId,
        uint256 _amount,
        address _adapterAddr,
        address _to
    ) internal returns (uint256) {
        // if amount type(uint).max _amount is whole collateral amount
        if (_amount == type(uint256).max) {
            _amount = getAllColl(_safeId);
        }

        // withdraw from safe and move to proxy balance
        safeManager.modifySAFECollateralization(_safeId, -toPositiveInt(_amount), 0);
        safeManager.transferCollateral(_safeId, address(this), _amount);

        // withdraw the tokens from Adapter
        IBasicTokenAdapters(_adapterAddr).exit(address(this), _amount);

        // send the tokens _to address if needed
        getTokenFromAdapter(_adapterAddr).withdrawTokens(_to, _amount);

        logger.Log(
            address(this),
            msg.sender,
            "ReflexerWithdraw",
            abi.encode(_safeId, _amount, _adapterAddr, _to)
        );

        return _amount;
    }

    /// @notice Returns all the collateral of the safe, formatted in the correct decimal
    /// @dev Will fail if token is over 18 decimals
    function getAllColl(uint256 _safeId) internal view returns (uint256 amount) {
        (amount, ) = getSafeInfo(_safeId, safeManager.collateralTypes(_safeId));
    }

    /// @notice Gets Safe info (collateral, debt)
    /// @param _safeId Id of the Safe
    /// @param _collType CollType of the Safe
    function getSafeInfo(uint256 _safeId, bytes32 _collType)
        public
        view
        returns (uint256, uint256)
    {
        (uint256 collateral, uint256 debt) =
            safeEngine.safes(_collType, safeManager.safes(_safeId));
        (, uint256 rate, , , , ) = safeEngine.collateralTypes(_collType);

        return (collateral, rmul(debt, rate));
    }

    function parseInputs(bytes memory _callData) public pure returns (Params memory params) {
        params = abi.decode(_callData, (Params));
    }
}
