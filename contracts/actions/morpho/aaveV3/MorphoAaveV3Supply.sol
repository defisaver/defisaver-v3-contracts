// SPDX-License-Identifier: MIT
pragma solidity =0.8.10;

import "../../../interfaces/morpho/IMorphoAaveV3.sol";
import "../../ActionBase.sol";
import "../../../utils/TokenUtils.sol";
import "./helpers/MorphoAaveV3Helper.sol";

/// @title Supply a token to Morpho AaveV3
contract MorphoAaveV3Supply is ActionBase, MorphoAaveV3Helper {
    using TokenUtils for address;

    /// @param emodeId Type of emode we are entering in, each one is different deployment on Morpho
    /// @param tokenAddr The address of the token to be deposited
    /// @param amount Amount of tokens to be deposited
    /// @param from Where are we pulling the supply tokens amount from
    /// @param onBehalf For what user we are supplying the tokens, defaults to user's wallet
    /// @param supplyAsColl Whether to supplyAsCollateral or regular supply
    /// @param maxIterations Max number of iterations for p2p matching, 0 will use default num of iterations
    struct Params {
        uint256 emodeId;
        address tokenAddr;
        uint256 amount;
        address from;
        address onBehalf;
        bool supplyAsColl;
        uint256 maxIterations;
    }

    function executeAction(
        bytes memory _callData,
        bytes32[] memory _subData,
        uint8[] memory _paramMapping,
        bytes32[] memory _returnValues
    ) public payable virtual override returns (bytes32) {
        Params memory params = parseInputs(_callData);

        params.emodeId = _parseParamUint(params.emodeId, _paramMapping[0], _subData, _returnValues);
        params.tokenAddr = _parseParamAddr(
            params.tokenAddr,
            _paramMapping[1],
            _subData,
            _returnValues
        );
        params.amount = _parseParamUint(params.amount, _paramMapping[2], _subData, _returnValues);
        params.from = _parseParamAddr(params.from, _paramMapping[3], _subData, _returnValues);
        params.onBehalf = _parseParamAddr(
            params.onBehalf,
            _paramMapping[4],
            _subData,
            _returnValues
        );
        params.supplyAsColl =
            _parseParamUint(
                params.supplyAsColl ? 1 : 0,
                _paramMapping[5],
                _subData,
                _returnValues
            ) ==
            1;

        (uint256 amount, bytes memory logData) = _supply(params);
        emit ActionEvent("MorphoAaveV3Supply", logData);
        return bytes32(amount);
    }

    function executeActionDirect(bytes memory _callData) public payable virtual override {
        Params memory params = parseInputs(_callData);
        (, bytes memory logData) = _supply(params);
        logger.logActionDirectEvent("MorphoAaveV3Supply", logData);
    }

    function actionType() public pure virtual override returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    function _supply(Params memory _params) internal returns (uint256, bytes memory) {
        address morphoAddress = getMorphoAddressByEmode(_params.emodeId);

        _params.amount = _params.tokenAddr.pullTokensIfNeeded(_params.from, _params.amount);
        _params.tokenAddr.approveToken(morphoAddress, _params.amount);

        // default to onBehalf of user's wallet
        if (_params.onBehalf == address(0)) {
            _params.onBehalf = address(this);
        }

        if (_params.supplyAsColl) {
            IMorphoAaveV3(morphoAddress).supplyCollateral(
                _params.tokenAddr,
                _params.amount,
                _params.onBehalf
            );
        } else {
            IMorphoAaveV3(morphoAddress).supply(
                _params.tokenAddr,
                _params.amount,
                _params.onBehalf,
                _params.maxIterations
            );
        }

        bytes memory logData = abi.encode(_params);

        return (_params.amount, logData);
    }

    function parseInputs(bytes memory _callData) public pure returns (Params memory params) {
        params = abi.decode(_callData, (Params));
    }
}
