// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { ISpoke } from "../../interfaces/protocols/aaveV4/ISpoke.sol";
import { IGiverPositionManager } from "../../interfaces/protocols/aaveV4/IGiverPositionManager.sol";
import {
    IConfigPositionManager
} from "../../interfaces/protocols/aaveV4/IConfigPositionManager.sol";
import { ActionBase } from "../ActionBase.sol";
import { TokenUtils } from "../../utils/token/TokenUtils.sol";
import { AaveV4Helper } from "./helpers/AaveV4Helper.sol";

/// @title AaveV4Supply
/// @dev When supplying on behalf of another address the GiverPositionManager has to be enabled for 'onBehalf' address.
/// @dev When setting reserve as collateral on behalf of another address:
///      - ConfigPositionManager has to be enabled for 'onBehalf' address.
///      - Wallet itself has to be given approval to set collateral on behalf of 'onBehalf' address.
contract AaveV4Supply is ActionBase, AaveV4Helper {
    using TokenUtils for address;

    /// @param spoke Address of the spoke.
    /// @param onBehalf Address to supply tokens on behalf of. Defaults to the user's wallet if not provided.
    /// @param from Address from which to pull collateral asset.
    /// @param reserveId Reserve id.
    /// @param amount Amount of tokens to supply.
    /// @param useAsCollateral Whether to use the tokens as collateral.
    struct Params {
        address spoke;
        address onBehalf;
        address from;
        uint256 reserveId;
        uint256 amount;
        bool useAsCollateral;
    }

    /// @inheritdoc ActionBase
    function executeAction(
        bytes memory _callData,
        bytes32[] memory _subData,
        uint8[] memory _paramMapping,
        bytes32[] memory _returnValues
    ) public payable virtual override returns (bytes32) {
        Params memory params = parseInputs(_callData);

        params.spoke = _parseParamAddr(params.spoke, _paramMapping[0], _subData, _returnValues);
        params.onBehalf =
            _parseParamAddr(params.onBehalf, _paramMapping[1], _subData, _returnValues);
        params.from = _parseParamAddr(params.from, _paramMapping[2], _subData, _returnValues);
        params.reserveId =
            _parseParamUint(params.reserveId, _paramMapping[3], _subData, _returnValues);
        params.amount = _parseParamUint(params.amount, _paramMapping[4], _subData, _returnValues);
        params.useAsCollateral =
            _parseParamUint(
                    params.useAsCollateral ? 1 : 0, _paramMapping[5], _subData, _returnValues
                ) == 1;

        (uint256 amount, bytes memory logData) = _supply(params);
        emit ActionEvent("AaveV4Supply", logData);
        return bytes32(amount);
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes memory _callData) public payable override {
        Params memory params = parseInputs(_callData);
        (, bytes memory logData) = _supply(params);
        logger.logActionDirectEvent("AaveV4Supply", logData);
    }

    /// @inheritdoc ActionBase
    function actionType() public pure virtual override returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    /*//////////////////////////////////////////////////////////////
                            ACTION LOGIC
    //////////////////////////////////////////////////////////////*/
    function _supply(Params memory _params) internal returns (uint256, bytes memory) {
        ISpoke spoke = ISpoke(_params.spoke);
        address underlying = spoke.getReserve(_params.reserveId).underlying;

        address onBehalf = _params.onBehalf == address(0) ? address(this) : _params.onBehalf;
        uint256 amount = underlying.pullTokensIfNeeded(_params.from, _params.amount);

        bool supplyForSmartWallet = onBehalf == address(this);

        // Supply tokens.
        // -------------------------------
        if (supplyForSmartWallet) {
            underlying.approveToken(address(spoke), amount);
            (, amount) = spoke.supply(_params.reserveId, amount, onBehalf);
        } else {
            underlying.approveToken(GIVER_POSITION_MANAGER, amount);
            (, amount) = IGiverPositionManager(GIVER_POSITION_MANAGER)
                .supplyOnBehalfOf(address(spoke), _params.reserveId, amount, onBehalf);
        }

        // Enable as collateral if needed.
        // -------------------------------
        (bool isUsingAsCollateral,) = spoke.getUserReserveStatus(_params.reserveId, onBehalf);

        if (_params.useAsCollateral && !isUsingAsCollateral) {
            if (supplyForSmartWallet) {
                spoke.setUsingAsCollateral(_params.reserveId, true, onBehalf);
            } else {
                IConfigPositionManager(CONFIG_POSITION_MANAGER)
                    .setUsingAsCollateralOnBehalfOf(
                        address(spoke), _params.reserveId, true, onBehalf
                    );
            }
        }

        bytes memory logData = abi.encode(
            address(spoke), onBehalf, _params.from, underlying, amount, _params.useAsCollateral
        );

        return (amount, logData);
    }

    function parseInputs(bytes memory _callData) public pure returns (Params memory params) {
        params = abi.decode(_callData, (Params));
    }
}
