// SPDX-License-Identifier: MIT

pragma solidity =0.8.10;

import "../../interfaces/mcd/IManager.sol";
import "../../interfaces/mcd/ISpotter.sol";
import "../../interfaces/mcd/IVat.sol";
import "../../interfaces/mcd/IDaiJoin.sol";
import "../../interfaces/mcd/IJug.sol";
import "../../utils/TokenUtils.sol";
import "../ActionBase.sol";
import "./helpers/McdHelper.sol";

/// @title Generate dai from a Maker Vault
contract McdGenerate is ActionBase, McdHelper {
    using TokenUtils for address;

    ISpotter public constant spotter = ISpotter(SPOTTER_ADDRESS);

    struct Params {
        uint256 vaultId;
        uint256 amount;
        address to;
        address mcdManager;
    }

    /// @inheritdoc ActionBase
    function executeAction(
        bytes memory _callData,
        bytes32[] memory _subData,
        uint8[] memory _paramMapping,
        bytes32[] memory _returnValues
    ) public payable override returns (bytes32) {
        Params memory inputData = parseInputs(_callData);

        inputData.vaultId = _parseParamUint(inputData.vaultId, _paramMapping[0], _subData, _returnValues);
        inputData.amount = _parseParamUint(inputData.amount, _paramMapping[1], _subData, _returnValues);
        inputData.to = _parseParamAddr(inputData.to, _paramMapping[2], _subData, _returnValues);
        inputData.mcdManager = _parseParamAddr(inputData.mcdManager, _paramMapping[3], _subData, _returnValues);

        (uint256 borrowedAmount, bytes memory logData) = _mcdGenerate(inputData.vaultId, inputData.amount, inputData.to, inputData.mcdManager);
        emit ActionEvent("McdGenerate", logData);
        return bytes32(borrowedAmount);
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes memory _callData) public payable override {
        Params memory inputData = parseInputs(_callData);
        (, bytes memory logData) = _mcdGenerate(inputData.vaultId, inputData.amount, inputData.to, inputData.mcdManager);
        logger.logActionDirectEvent("McdGenerate", logData);
    }

    /// @inheritdoc ActionBase
    function actionType() public pure override returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    //////////////////////////// ACTION LOGIC ////////////////////////////

    /// @notice Generates dai from a specified vault
    /// @param _vaultId Id of the vault
    /// @param _amount Amount of dai to be generated
    /// @param _to Address which will receive the dai
    /// @param _mcdManager The manager address we are using [mcd, b.protocol]
    function _mcdGenerate(
        uint256 _vaultId,
        uint256 _amount,
        address _to,
        address _mcdManager
    ) internal returns (uint256, bytes memory) {
        IManager mcdManager = IManager(_mcdManager);

        uint256 rate = IJug(JUG_ADDRESS).drip(mcdManager.ilks(_vaultId));
        uint256 daiVatBalance = vat.dai(mcdManager.urns(_vaultId));

        // Generate dai and move to proxy balance
        mcdManager.frob(
            _vaultId,
            int256(0),
            normalizeDrawAmount(_amount, rate, daiVatBalance)
        );
        mcdManager.move(_vaultId, address(this), toRad(_amount));

        // add auth so we can exit the dai
        if (vat.can(address(this), address(DAI_JOIN_ADDR)) == 0) {
            vat.hope(DAI_JOIN_ADDR);
        }

        // exit dai from join and send _to if needed
        IDaiJoin(DAI_JOIN_ADDR).exit(_to, _amount);

        bytes memory logData = abi.encode(_vaultId, _amount, _to, _mcdManager);
        return (_amount, logData);
    }

    function parseInputs(bytes memory _callData) public pure returns (Params memory params) {
        params = abi.decode(_callData, (Params));
    }
}
