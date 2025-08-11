// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { TokenUtils } from "../../utils/TokenUtils.sol";
import { ActionBase } from "../ActionBase.sol";
import { AaveV3Helper } from "./helpers/AaveV3Helper.sol";
import { IPoolV3 } from "../../interfaces/aaveV3/IPoolV3.sol";
import { DFSLib } from "../../utils/DFSLib.sol";

/// @title Withdraw a token from an Aave market
contract AaveV3Withdraw is ActionBase, AaveV3Helper {
    using TokenUtils for address;

    /// @param assetId Asset id.
    /// @param useDefaultMarket Whether to use the default market.
    /// @param amount Amount of tokens to withdraw.
    /// @param to Address to send the withdrawn tokens to.
    /// @param market Aave Market address.

    struct Params {
        uint16 assetId;
        bool useDefaultMarket;
        uint256 amount;
        address to;
        address market;
    }

    /// @inheritdoc ActionBase
    function executeAction(
        bytes memory callData,
        bytes32[] memory _subData,
        uint8[] memory _paramMapping,
        bytes32[] memory _returnValues
    ) public payable virtual override returns (bytes32) {
        Params memory params = parseInputs(callData);

        params.assetId = uint16(_parseParamUint(uint16(params.assetId), _paramMapping[0], _subData, _returnValues));
        params.useDefaultMarket = _parseParamUint(params.useDefaultMarket ? 1 : 0, _paramMapping[1], _subData, _returnValues) == 1;
        params.amount = _parseParamUint(params.amount, _paramMapping[2], _subData, _returnValues);
        params.to = _parseParamAddr(params.to, _paramMapping[3], _subData, _returnValues);
        params.market = _parseParamAddr(params.market, _paramMapping[4], _subData, _returnValues);

        (uint256 withdrawnAmount, bytes memory logData) = _withdraw(
            params.market,
            params.assetId,
            params.amount,
            params.to
        );
        emit ActionEvent("AaveV3Withdraw", logData);
        return bytes32(withdrawnAmount);
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes memory _callData) public payable override {
        Params memory params = parseInputs(_callData);
        (, bytes memory logData) = _withdraw(
            params.market,
            params.assetId,
            params.amount,
            params.to
        );
        logger.logActionDirectEvent("AaveV3Withdraw", logData);
    }

    function executeActionDirectL2() public payable {
        Params memory params = decodeInputs(msg.data[4:]);
        (, bytes memory logData) = _withdraw(
            params.market,
            params.assetId,
            params.amount,
            params.to
        );
        logger.logActionDirectEvent("AaveV3Withdraw", logData);
    }

    /// @inheritdoc ActionBase
    function actionType() public pure virtual override returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    //////////////////////////// ACTION LOGIC ////////////////////////////

    /// @notice User withdraws tokens from the Aave protocol.
    /// @notice Send type(uint).max to withdraw whole amount.
    /// @param _market Address provider for specific market
    /// @param _assetId The id of the token to be deposited
    /// @param _amount Amount of tokens to be withdrawn
    /// @param _to Where the withdrawn tokens will be sent
    function _withdraw(
        address _market,
        uint16 _assetId,
        uint256 _amount,
        address _to
    ) internal returns (uint256, bytes memory) {
        IPoolV3 lendingPool = getLendingPool(_market);
        address tokenAddr = lendingPool.getReserveAddressById(_assetId);

        uint256 tokenBefore;

        // only need to remember this is _amount is max, no need to waste gas otherwise
        if (_amount == type(uint256).max) {
            tokenBefore = tokenAddr.getBalance(_to);
        }

        // withdraw underlying tokens from aave and send _to address
        lendingPool.withdraw(tokenAddr, _amount, _to);

        // if the input amount is max calc. what was the exact _amount
        if (_amount == type(uint256).max) {
            _amount = tokenAddr.getBalance(_to) - tokenBefore;
        }

        bytes memory logData = abi.encode(_market, tokenAddr, _amount, _to);
        return (_amount, logData);
    }

    function parseInputs(bytes memory _callData) public pure returns (Params memory params) {
        params = abi.decode(_callData, (Params));
        if (params.useDefaultMarket) {
            params.market = DEFAULT_AAVE_MARKET;
        }
    }

    function encodeInputs(Params memory _params) public pure returns (bytes memory encodedInput) {
        encodedInput = bytes.concat(this.executeActionDirectL2.selector);
        encodedInput = bytes.concat(encodedInput, bytes2(_params.assetId));
        encodedInput = bytes.concat(encodedInput, DFSLib.boolToBytes(_params.useDefaultMarket));
        encodedInput = bytes.concat(encodedInput, bytes32(_params.amount));
        encodedInput = bytes.concat(encodedInput, bytes20(_params.to));
        if (!_params.useDefaultMarket) {
            encodedInput = bytes.concat(encodedInput, bytes20(_params.market));
        }
    }

    function decodeInputs(bytes calldata _encodedInput) public pure returns (Params memory params) {
        params.assetId = uint16(bytes2(_encodedInput[0:2]));
        params.useDefaultMarket = DFSLib.bytesToBool(bytes1(_encodedInput[2:3]));
        params.amount = uint256(bytes32(_encodedInput[3:35]));
        params.to = address(bytes20(_encodedInput[35:55]));
        if (params.useDefaultMarket) {
            params.market = DEFAULT_AAVE_MARKET;
        } else {
            params.market = address(bytes20(_encodedInput[55:75]));
        }
    }
}
