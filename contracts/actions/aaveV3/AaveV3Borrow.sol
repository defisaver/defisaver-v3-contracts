// SPDX-License-Identifier: MIT
pragma solidity =0.8.24;

import { TokenUtils } from "../../utils/TokenUtils.sol";
import { ActionBase } from "../ActionBase.sol";
import { AaveV3Helper } from "./helpers/AaveV3Helper.sol";
import { IPoolV3 } from "../../interfaces/aaveV3/IPoolV3.sol";
import { DFSLib } from "../../utils/DFSLib.sol";

/// @title Borrow a token from AaveV3 market
contract AaveV3Borrow is ActionBase, AaveV3Helper {
    using TokenUtils for address;

    /// @param amount Amount of tokens to borrow.
    /// @param to Address to send the borrowed tokens to.
    /// @param rateMode Rate mode.
    /// @param assetId Asset id.
    /// @param useDefaultMarket Whether to use the default market.
    /// @param useOnBehalf Whether to use on behalf.
    /// @param market Aave Market address.
    /// @param onBehalf Address to send the borrowed tokens on behalf of. Defaults to the user's wallet.
    struct Params {
        uint256 amount;
        address to;
        uint8 rateMode;
        uint16 assetId;
        bool useDefaultMarket;
        bool useOnBehalf;
        address market;
        address onBehalf;
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
        params.to = _parseParamAddr(params.to, _paramMapping[1], _subData, _returnValues);
        params.rateMode = uint8(_parseParamUint(uint8(params.rateMode), _paramMapping[2], _subData, _returnValues));
        params.assetId = uint16(_parseParamUint(uint16(params.assetId), _paramMapping[3], _subData, _returnValues));
        params.useDefaultMarket = _parseParamUint(params.useDefaultMarket ? 1 : 0, _paramMapping[4], _subData, _returnValues) == 1;
        params.useOnBehalf = _parseParamUint(params.useOnBehalf ? 1 : 0, _paramMapping[5], _subData, _returnValues) == 1;
        params.market = _parseParamAddr(params.market, _paramMapping[6], _subData, _returnValues);
        params.onBehalf = _parseParamAddr(
            params.onBehalf,
            _paramMapping[7],
            _subData,
            _returnValues
        );

        (uint256 borrowAmount, bytes memory logData) = _borrow(
            params.market,
            params.assetId,
            params.amount,
            params.rateMode,
            params.to,
            params.onBehalf
        );
        emit ActionEvent("AaveV3Borrow", logData);
        return bytes32(borrowAmount);
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes memory _callData) public payable override {
        Params memory params = parseInputs(_callData);

        if (params.useDefaultMarket) {
            params.market = DEFAULT_AAVE_MARKET;
        }
        if (!params.useOnBehalf) {
            params.onBehalf = address(0);
        }

        (, bytes memory logData) = _borrow(
            params.market,
            params.assetId,
            params.amount,
            params.rateMode,
            params.to,
            params.onBehalf
        );
        logger.logActionDirectEvent("AaveV3Borrow", logData);
    }

    function executeActionDirectL2() public payable {
        Params memory params = decodeInputs(msg.data[4:]);
        (, bytes memory logData) = _borrow(
            params.market,
            params.assetId,
            params.amount,
            params.rateMode,
            params.to,
            params.onBehalf
        );
        logger.logActionDirectEvent("AaveV3Borrow", logData);
    }

    /// @inheritdoc ActionBase
    function actionType() public pure virtual override returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    //////////////////////////// ACTION LOGIC ////////////////////////////

    /// @notice User borrows tokens from the Aave protocol
    /// @param _market Address provider for specific market
    /// @param _assetId The id of the token to be borrowed
    /// @param _amount Amount of tokens to be borrowed
    /// @param _rateMode Type of borrow debt [Stable: 1, Variable: 2]
    /// @param _to The address we are sending the borrowed tokens to
    /// @param _onBehalf On whose behalf we borrow the tokens, defaults to user's wallet
    function _borrow(
        address _market,
        uint16 _assetId,
        uint256 _amount,
        uint256 _rateMode,
        address _to,
        address _onBehalf
    ) internal returns (uint256, bytes memory) {
        IPoolV3 lendingPool = getLendingPool(_market);

        address tokenAddr = lendingPool.getReserveAddressById(_assetId);
        // defaults to onBehalf of user's wallet
        if (_onBehalf == address(0)) {
            _onBehalf = address(this);
        }
        lendingPool.borrow(tokenAddr, _amount, _rateMode, AAVE_REFERRAL_CODE, _onBehalf);
        _amount = tokenAddr.withdrawTokens(_to, _amount);

        bytes memory logData = abi.encode(_market, tokenAddr, _amount, _rateMode, _to, _onBehalf);
        return (_amount, logData);
    }

    function parseInputs(bytes memory _callData) public pure returns (Params memory params) {
        params = abi.decode(_callData, (Params));
        if (params.useDefaultMarket) {
            params.market = DEFAULT_AAVE_MARKET;
        }
        if (!params.useOnBehalf) {
            params.onBehalf = address(0);
        }
    }

    function encodeInputs(Params memory _params) public pure returns (bytes memory encodedInput) {
        encodedInput = bytes.concat(this.executeActionDirectL2.selector);
        encodedInput = bytes.concat(encodedInput, bytes32(_params.amount));
        encodedInput = bytes.concat(encodedInput, bytes20(_params.to));
        encodedInput = bytes.concat(encodedInput, bytes1(_params.rateMode));
        encodedInput = bytes.concat(encodedInput, bytes2(_params.assetId));
        encodedInput = bytes.concat(encodedInput, DFSLib.boolToBytes(_params.useDefaultMarket));
        encodedInput = bytes.concat(encodedInput, DFSLib.boolToBytes(_params.useOnBehalf));
        if (!_params.useDefaultMarket) {
            encodedInput = bytes.concat(encodedInput, bytes20(_params.market));
        }
        if (_params.useOnBehalf) {
            encodedInput = bytes.concat(encodedInput, bytes20(_params.onBehalf));
        }
    }

    function decodeInputs(bytes calldata _encodedInput) public pure returns (Params memory params) {
        params.amount = uint256(bytes32(_encodedInput[0:32]));
        params.to = address(bytes20(_encodedInput[32:52]));
        params.rateMode = uint8(bytes1(_encodedInput[52:53]));
        params.assetId = uint16(bytes2(_encodedInput[53:55]));
        params.useDefaultMarket = DFSLib.bytesToBool(bytes1(_encodedInput[55:56]));
        params.useOnBehalf = DFSLib.bytesToBool(bytes1(_encodedInput[56:57]));
        uint256 mark = 57;

        if (params.useDefaultMarket) {
            params.market = DEFAULT_AAVE_MARKET;
        } else {
            params.market = address(bytes20(_encodedInput[mark:mark + 20]));
            mark += 20;
        }

        if (params.useOnBehalf) {
            params.onBehalf = address(bytes20(_encodedInput[mark:mark + 20]));
        } else {
            params.onBehalf = address(0);
        }
    }
}
