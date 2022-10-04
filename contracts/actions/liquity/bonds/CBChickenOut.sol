// SPDX-License-Identifier: MIT

pragma solidity =0.8.10;

import "../helpers/LiquityHelper.sol";
import "../../../utils/TokenUtils.sol";
import "../../ActionBase.sol";

/// @title CBChickenOut Withdraws backing lusd from a pending bond
contract CBChickenOut is ActionBase, LiquityHelper {
    using TokenUtils for address;

    /// @param bondID NFT token id of the bond
    /// @param minLUSD Minimum amount of LUSD to be returned if the full amount is not avail.
    /// @param to Address where to send LUSD returned
    struct Params {
        uint256 bondID;
        uint256 minLUSD;
        address to;
    }

    /// @inheritdoc ActionBase
    function executeAction(
        bytes memory _callData,
        bytes32[] memory _subData,
        uint8[] memory _paramMapping,
        bytes32[] memory _returnValues
    ) public payable virtual override returns (bytes32) {
        Params memory params = parseInputs(_callData);

        params.bondID = _parseParamUint(
            params.bondID,
            _paramMapping[0],
            _subData,
            _returnValues
        );
        params.minLUSD = _parseParamUint(
            params.minLUSD,
            _paramMapping[1],
            _subData,
            _returnValues
        );
        params.to = _parseParamAddr(params.to, _paramMapping[2], _subData, _returnValues);

        (uint256 lusdAmount, bytes memory logData) = _cbChickenOut(params);
        emit ActionEvent("CBChickenOut", logData);
        return bytes32(lusdAmount);
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes memory _callData) public payable virtual override {
        Params memory params = parseInputs(_callData);
        (, bytes memory logData) = _cbChickenOut(params);
        logger.logActionDirectEvent("CBChickenOut", logData);
    }

    /// @inheritdoc ActionBase
    function actionType() public pure virtual override returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    //////////////////////////// ACTION LOGIC ////////////////////////////

    function _cbChickenOut(Params memory _params) internal returns (uint256, bytes memory) {
        require(_params.to != address(0), "Don't send to 0x0");

        IChickenBondManager.BondData memory bond = CBManager.getBondData(_params.bondID);
        require(bond.lusdAmount > 0, "Must have non 0 amount of LUSD to chicken out");

        CBManager.chickenOut(_params.bondID, _params.minLUSD);

        LUSD_TOKEN_ADDRESS.withdrawTokens(_params.to, bond.lusdAmount);

        bytes memory logData = abi.encode(bond.lusdAmount, _params.bondID, _params.to);
        return (bond.lusdAmount, logData);
    }

    function parseInputs(bytes memory _callData) public pure returns (Params memory params) {
        params = abi.decode(_callData, (Params));
    }
}
