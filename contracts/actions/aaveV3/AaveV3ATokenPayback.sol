// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { TokenUtils } from "../../utils/TokenUtils.sol";
import { ActionBase } from "../ActionBase.sol";
import { AaveV3Helper } from "./helpers/AaveV3Helper.sol";
import { IPoolV3 } from "../../interfaces/aaveV3/IPoolV3.sol";
import { DataTypes } from "../../interfaces/aaveV3/DataTypes.sol";

/// @title Allows user to repay with aTokens of the underlying debt asset eg. Pay DAI debt using aDAI tokens.
contract AaveV3ATokenPayback is ActionBase, AaveV3Helper {
    using TokenUtils for address;

    /// @param amount Amount of tokens to be paid back.
    /// @param from Address to send the payback tokens from.
    /// @param rateMode Rate mode.
    /// @param assetId Asset id.
    /// @param useDefaultMarket Whether to use the default market.
    /// @param market Aave Market address.
    struct Params {
        uint256 amount;
        address from;
        uint8 rateMode;
        uint16 assetId;
        bool useDefaultMarket;
        address market;
    }

    /// @inheritdoc ActionBase
    function executeAction(
        bytes memory _callData,
        bytes32[] memory _subData,
        uint8[] memory _paramMapping,
        bytes32[] memory _returnValues
    ) public payable virtual override returns (bytes32) {
        Params memory params = parseInputs(_callData);

        params.amount = _parseParamUint(params.amount, _paramMapping[0], _subData, _returnValues);
        params.from = _parseParamAddr(params.from, _paramMapping[1], _subData, _returnValues);
        params.market = _parseParamAddr(params.market, _paramMapping[2], _subData, _returnValues);

        (uint256 paybackAmount, bytes memory logData) = _paybackWithATokens(
            params.market,
            params.assetId,
            params.amount,
            params.rateMode,
            params.from
        );
        emit ActionEvent("AaveV3ATokenPayback", logData);
        return bytes32(paybackAmount);
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes memory _callData) public payable override {
        Params memory params = parseInputs(_callData);
        (, bytes memory logData) = _paybackWithATokens(
            params.market,
            params.assetId,
            params.amount,
            params.rateMode,
            params.from
        );
        logger.logActionDirectEvent("AaveV3ATokenPayback", logData);
    }

    function executeActionDirectL2() public payable {
        Params memory params = decodeInputs(msg.data[4:]);
        (, bytes memory logData) = _paybackWithATokens(
            params.market,
            params.assetId,
            params.amount,
            params.rateMode,
            params.from
        );
        logger.logActionDirectEvent("AaveV3ATokenPayback", logData);
    }

    /// @inheritdoc ActionBase
    function actionType() public pure virtual override returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    //////////////////////////// ACTION LOGIC ////////////////////////////

    /// @notice User needs to approve its wallet to pull aTokens
    /// @param _market Address provider for specific market
    /// @param _assetId The id of the underlying asset to be repaid
    /// @param _amount Amount of tokens to be paid back (uint.max for full debt)
    /// @param _rateMode Type of borrow debt [Stable: 1, Variable: 2]
    /// @param _from Where are we pulling the payback aTokens from
    function _paybackWithATokens(
        address _market,
        uint16 _assetId,
        uint256 _amount,
        uint256 _rateMode,
        address _from
    ) internal returns (uint256, bytes memory) {
        IPoolV3 lendingPool = getLendingPool(_market);

        address tokenAddr = lendingPool.getReserveAddressById(_assetId);

        uint256 maxDebt = getWholeDebt(_market, tokenAddr, _rateMode, address(this));
        _amount = _amount > maxDebt ? maxDebt : _amount;

        DataTypes.ReserveData memory reserveData = lendingPool.getReserveData(tokenAddr);
        address aTokenAddr = reserveData.aTokenAddress;

        _amount = aTokenAddr.pullTokensIfNeeded(_from, _amount);

        lendingPool.repayWithATokens(tokenAddr, _amount, _rateMode);

        bytes memory logData = abi.encode(_market, tokenAddr, _amount, _rateMode, _from);
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
        encodedInput = bytes.concat(encodedInput, bytes32(_params.amount));
        encodedInput = bytes.concat(encodedInput, bytes20(_params.from));
        encodedInput = bytes.concat(encodedInput, bytes1(_params.rateMode));
        encodedInput = bytes.concat(encodedInput, bytes2(_params.assetId));
        encodedInput = bytes.concat(encodedInput, boolToBytes(_params.useDefaultMarket));
        if (!_params.useDefaultMarket) {
            encodedInput = bytes.concat(encodedInput, bytes20(_params.market));
        }
    }

    function decodeInputs(bytes calldata _encodedInput) public pure returns (Params memory params) {
        params.amount = uint256(bytes32(_encodedInput[0:32]));
        params.from = address(bytes20(_encodedInput[32:52]));
        params.rateMode = uint8(bytes1(_encodedInput[52:53]));
        params.assetId = uint16(bytes2(_encodedInput[53:55]));
        params.useDefaultMarket = bytesToBool(bytes1(_encodedInput[55:56]));
        if (params.useDefaultMarket) {
            params.market = DEFAULT_AAVE_MARKET;
        } else {
            params.market = address(bytes20(_encodedInput[56:76]));
        }
    }
}
